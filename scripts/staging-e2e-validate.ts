/**
 * Staging E2E: Validate Fund Facts Endpoint
 * 
 * Reads fund list from staging-e2e-funds.json and validates the
 * /api/ai-coach/funds/{id}/facts endpoint for each fund.
 * 
 * Validates:
 *   - Response structure
 *   - Confidence meets minimum threshold
 *   - Sources include AMC/AMFI links
 *   - Latency < 500ms (with warm cache)
 * 
 * Usage:
 *   npx tsx scripts/staging-e2e-validate.ts
 */

import * as fs from 'fs'
import * as path from 'path'

interface FundInfo {
  fund_id: string
  scheme_name: string
  scheme_code: string
  goal_id: string
  goal_name: string
  user_id: string
  folio?: string
  allocation_percentage?: number
}

interface ValidationResult {
  fund_id: string
  scheme_name: string
  success: boolean
  errors: string[]
  warnings: string[]
  latency_ms: number
  confidence?: 'high' | 'medium' | 'low'
  has_amc_amfi_sources: boolean
  source_count: number
  provenance: 'deterministic' | 'llm+cited' | 'unknown'
  response_structure_valid: boolean
}

interface ValidationReport {
  timestamp: string
  total_funds: number
  successful: number
  failed: number
  confidence_distribution: {
    high: number
    medium: number
    low: number
    missing: number
  }
  latency_stats: {
    min: number
    max: number
    avg: number
    p95: number
  }
  source_quality: {
    with_amc_amfi: number
    without_amc_amfi: number
    total_sources: number
  }
  results: ValidationResult[]
}

const API_BASE_URL = process.env.NEXTJS_BASE_URL || 'http://localhost:3000'
const API_KEY = process.env.AI_COACH_API_KEY
const MIN_CONFIDENCE = (process.env.FUND_FACTS_MIN_CONFIDENCE || 'medium') as 'high' | 'medium'
const MAX_LATENCY_MS = 500

if (!API_KEY) {
  console.error('❌ Missing AI_COACH_API_KEY environment variable')
  process.exit(1)
}

// At this point API_KEY is guaranteed to be defined
const API_KEY_STR: string = API_KEY

function validateResponse(data: unknown, fund: FundInfo): ValidationResult {
  const result: ValidationResult = {
    fund_id: fund.fund_id,
    scheme_name: fund.scheme_name,
    success: true,
    errors: [],
    warnings: [],
    latency_ms: 0,
    has_amc_amfi_sources: false,
    source_count: 0,
    provenance: 'unknown',
    response_structure_valid: false
  }

  // Check top-level structure
  if (!data || typeof data !== 'object') {
    result.success = false
    result.errors.push('Response is not an object')
    return result
  }

  const response = data as Record<string, unknown>

  // Check success field
  if (response.success !== true) {
    result.success = false
    result.errors.push(`Response indicates failure: ${response.error || 'unknown error'}`)
    return result
  }

  // Check data object
  if (!response.data || typeof response.data !== 'object') {
    result.success = false
    result.errors.push('Missing or invalid data object')
    return result
  }

  const dataObj = response.data as Record<string, unknown>
  result.response_structure_valid = true

  // Check provenance
  if (dataObj.provenance === 'deterministic') {
    result.provenance = 'deterministic'
    result.warnings.push('Response is deterministic-only (no LLM data)')
  } else if (dataObj.provenance === 'llm+cited') {
    result.provenance = 'llm+cited'
  }

  // Check confidence
  const confidence = dataObj.llm_confidence as 'high' | 'medium' | 'low' | undefined
  if (confidence) {
    result.confidence = confidence

    // Validate against minimum confidence
    if (MIN_CONFIDENCE === 'high' && confidence !== 'high') {
      result.errors.push(`Confidence ${confidence} does not meet minimum requirement (high)`)
      result.success = false
    } else if (MIN_CONFIDENCE === 'medium' && confidence === 'low') {
      result.errors.push(`Confidence ${confidence} does not meet minimum requirement (medium)`)
      result.success = false
    }
  } else {
    if (result.provenance === 'llm+cited') {
      result.errors.push('Missing llm_confidence in response')
      result.success = false
    }
  }

  // Check sources
  const sources = dataObj.sources as Array<{ field: string; url: string; as_of: string | null }> | undefined
  if (sources && Array.isArray(sources)) {
    result.source_count = sources.length

    // Check for AMC/AMFI links
    const amcAmfiPatterns = [
      /amfiindia\.com/i,
      /amfi\.in/i,
      /amc.*website/i,
      /mutualfund.*amc/i
    ]

    const hasAmcAmfi = sources.some(source => {
      const url = source.url?.toLowerCase() || ''
      return amcAmfiPatterns.some(pattern => pattern.test(url))
    })

    result.has_amc_amfi_sources = hasAmcAmfi

    if (!hasAmcAmfi && sources.length > 0) {
      result.warnings.push('No AMC/AMFI sources found in source list')
    }
  } else {
    if (result.provenance === 'llm+cited') {
      result.warnings.push('Missing or invalid sources array')
    }
  }

  return result
}

async function validateFund(fund: FundInfo): Promise<ValidationResult> {
  const startTime = Date.now()
  const url = `${API_BASE_URL}/api/ai-coach/funds/${fund.fund_id}/facts`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-AI-Coach-API-Key': API_KEY_STR,
        'Content-Type': 'application/json'
      }
    })

    const latency_ms = Date.now() - startTime
    const data = await response.json()

    const result = validateResponse(data, fund)
    result.latency_ms = latency_ms

    // Check latency
    if (latency_ms > MAX_LATENCY_MS) {
      result.warnings.push(`Latency ${latency_ms}ms exceeds target ${MAX_LATENCY_MS}ms`)
    }

    return result
  } catch (error) {
    return {
      fund_id: fund.fund_id,
      scheme_name: fund.scheme_name,
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      warnings: [],
      latency_ms: Date.now() - startTime,
      has_amc_amfi_sources: false,
      source_count: 0,
      provenance: 'unknown',
      response_structure_valid: false
    }
  }
}

function generateReport(results: ValidationResult[]): ValidationReport {
  const successful = results.filter(r => r.success).length
  const failed = results.length - successful

  const confidenceDist = {
    high: 0,
    medium: 0,
    low: 0,
    missing: 0
  }

  const latencies: number[] = []
  let withAmcAmfi = 0
  let withoutAmcAmfi = 0
  let totalSources = 0

  for (const result of results) {
    if (result.confidence) {
      confidenceDist[result.confidence]++
    } else {
      confidenceDist.missing++
    }

    if (result.latency_ms > 0) {
      latencies.push(result.latency_ms)
    }

    if (result.provenance === 'llm+cited') {
      if (result.has_amc_amfi_sources) {
        withAmcAmfi++
      } else if (result.source_count > 0) {
        withoutAmcAmfi++
      }
      totalSources += result.source_count
    }
  }

  latencies.sort((a, b) => a - b)
  const p95Index = Math.floor(latencies.length * 0.95)

  return {
    timestamp: new Date().toISOString(),
    total_funds: results.length,
    successful,
    failed,
    confidence_distribution: confidenceDist,
    latency_stats: {
      min: latencies[0] || 0,
      max: latencies[latencies.length - 1] || 0,
      avg: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
      p95: latencies[p95Index] || 0
    },
    source_quality: {
      with_amc_amfi: withAmcAmfi,
      without_amc_amfi: withoutAmcAmfi,
      total_sources: totalSources
    },
    results
  }
}

function printReport(report: ValidationReport) {
  console.log('\n' + '='.repeat(60))
  console.log('📊 VALIDATION REPORT')
  console.log('='.repeat(60))
  console.log(`Timestamp: ${report.timestamp}`)
  console.log(`Total Funds: ${report.total_funds}`)
  console.log(`✅ Successful: ${report.successful}`)
  console.log(`❌ Failed: ${report.failed}`)
  console.log('\n📈 Confidence Distribution:')
  console.log(`   High: ${report.confidence_distribution.high}`)
  console.log(`   Medium: ${report.confidence_distribution.medium}`)
  console.log(`   Low: ${report.confidence_distribution.low}`)
  console.log(`   Missing: ${report.confidence_distribution.missing}`)
  console.log('\n⏱️  Latency Statistics:')
  console.log(`   Min: ${report.latency_stats.min}ms`)
  console.log(`   Max: ${report.latency_stats.max}ms`)
  console.log(`   Avg: ${Math.round(report.latency_stats.avg)}ms`)
  console.log(`   P95: ${report.latency_stats.p95}ms`)
  console.log('\n🔗 Source Quality:')
  console.log(`   With AMC/AMFI: ${report.source_quality.with_amc_amfi}`)
  console.log(`   Without AMC/AMFI: ${report.source_quality.without_amc_amfi}`)
  console.log(`   Total Sources: ${report.source_quality.total_sources}`)

  // Detailed results
  console.log('\n📋 Detailed Results:')
  console.log('-'.repeat(60))
  for (const result of report.results) {
    const status = result.success ? '✅' : '❌'
    console.log(`${status} ${result.scheme_name} (${result.fund_id})`)
    console.log(`   Provenance: ${result.provenance}`)
    if (result.confidence) {
      console.log(`   Confidence: ${result.confidence}`)
    }
    console.log(`   Latency: ${result.latency_ms}ms`)
    console.log(`   Sources: ${result.source_count} (AMC/AMFI: ${result.has_amc_amfi_sources ? 'Yes' : 'No'})`)
    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.join(', ')}`)
    }
    if (result.warnings.length > 0) {
      console.log(`   Warnings: ${result.warnings.join(', ')}`)
    }
    console.log('')
  }
}

async function main() {
  const fundsPath = path.join(process.cwd(), 'scripts', 'staging-e2e-funds.json')

  if (!fs.existsSync(fundsPath)) {
    console.error(`❌ Fund list not found: ${fundsPath}`)
    console.error('   Please run staging-e2e-find-funds.ts first')
    process.exit(1)
  }

  const funds: FundInfo[] = JSON.parse(fs.readFileSync(fundsPath, 'utf-8'))

  if (funds.length === 0) {
    console.error('❌ No funds found in fund list')
    process.exit(1)
  }

  console.log(`🔍 Validating ${funds.length} funds...\n`)
  console.log(`API Base URL: ${API_BASE_URL}`)
  console.log(`Min Confidence: ${MIN_CONFIDENCE}`)
  console.log(`Max Latency: ${MAX_LATENCY_MS}ms\n`)

  const results: ValidationResult[] = []

  for (let i = 0; i < funds.length; i++) {
    const fund = funds[i]
    console.log(`[${i + 1}/${funds.length}] Validating ${fund.scheme_name}...`)

    const result = await validateFund(fund)
    results.push(result)

    const status = result.success ? '✅' : '❌'
    console.log(`  ${status} ${result.latency_ms}ms`)

    // Small delay between requests
    if (i < funds.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  const report = generateReport(results)
  printReport(report)

  // Write report to file
  const outputPath = path.join(process.cwd(), 'scripts', 'staging-e2e-results.json')
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2))
  console.log(`\n📄 Full report saved to: ${outputPath}`)

  // Check acceptance criteria
  const confidenceThreshold = report.confidence_distribution.high + report.confidence_distribution.medium
  const confidencePercentage = (confidenceThreshold / report.total_funds) * 100
  const sourcePercentage = report.source_quality.with_amc_amfi / Math.max(1, report.source_quality.with_amc_amfi + report.source_quality.without_amc_amfi) * 100

  console.log('\n📊 Acceptance Criteria:')
  console.log(`   Confidence ≥ ${MIN_CONFIDENCE}: ${confidencePercentage.toFixed(1)}% (${confidenceThreshold}/${report.total_funds})`)
  console.log(`   Sources with AMC/AMFI: ${sourcePercentage.toFixed(1)}% (${report.source_quality.with_amc_amfi}/${report.source_quality.with_amc_amfi + report.source_quality.without_amc_amfi})`)
  console.log(`   Avg Latency < ${MAX_LATENCY_MS}ms: ${report.latency_stats.avg < MAX_LATENCY_MS ? '✅' : '❌'} (${Math.round(report.latency_stats.avg)}ms)`)

  if (report.failed > 0 || confidencePercentage < 70 || sourcePercentage < 80 || report.latency_stats.avg >= MAX_LATENCY_MS) {
    console.log('\n⚠️  Some acceptance criteria not met. See report for details.')
    process.exit(1)
  }

  console.log('\n✅ All acceptance criteria met!')
}

main().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})

