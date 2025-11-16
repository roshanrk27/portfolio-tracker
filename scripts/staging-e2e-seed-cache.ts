/**
 * Staging E2E: Seed Cache for Funds
 * 
 * Reads fund list from staging-e2e-funds.json and seeds the cache
 * by calling the /api/ai-coach/funds/{id}/facts endpoint for each fund.
 * 
 * Prerequisites:
 *   - Run staging-e2e-find-funds.ts first
 *   - Set FUND_FACTS_USE_LLM=true
 *   - Set PERPLEXITY_API_KEY
 *   - Set AI_COACH_API_KEY
 * 
 * Usage:
 *   npx tsx scripts/staging-e2e-seed-cache.ts
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

interface SeedingResult {
  fund_id: string
  scheme_name: string
  success: boolean
  error?: string
  latency_ms?: number
  confidence?: 'high' | 'medium' | 'low'
  cached?: boolean
}

const API_BASE_URL = process.env.NEXTJS_BASE_URL || 'http://localhost:3000'
const API_KEY = process.env.AI_COACH_API_KEY

if (!API_KEY) {
  console.error('❌ Missing AI_COACH_API_KEY environment variable')
  process.exit(1)
}

// At this point API_KEY is guaranteed to be defined
const API_KEY_STR: string = API_KEY

async function seedCacheForFund(fund: FundInfo): Promise<SeedingResult> {
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

    if (!response.ok) {
      return {
        fund_id: fund.fund_id,
        scheme_name: fund.scheme_name,
        success: false,
        error: data.error || `HTTP ${response.status}`,
        latency_ms
      }
    }

    // Check if response has LLM data
    const hasLLMData = data.data?.provenance === 'llm+cited'
    const confidence = data.data?.llm_confidence

    return {
      fund_id: fund.fund_id,
      scheme_name: fund.scheme_name,
      success: true,
      latency_ms,
      confidence: confidence || undefined,
      cached: !hasLLMData // If not llm+cited, might be from cache or deterministic
    }
  } catch (error) {
    return {
      fund_id: fund.fund_id,
      scheme_name: fund.scheme_name,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      latency_ms: Date.now() - startTime
    }
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

  console.log(`🌱 Seeding cache for ${funds.length} funds...\n`)
  console.log(`API Base URL: ${API_BASE_URL}\n`)

  const results: SeedingResult[] = []
  let successCount = 0
  let errorCount = 0

  // Seed funds one at a time (with small delay to avoid rate limits)
  for (let i = 0; i < funds.length; i++) {
    const fund = funds[i]
    console.log(`[${i + 1}/${funds.length}] Seeding ${fund.scheme_name} (${fund.fund_id})...`)

    const result = await seedCacheForFund(fund)
    results.push(result)

    if (result.success) {
      successCount++
      const status = result.cached ? 'cached' : 'fresh'
      const conf = result.confidence ? ` (${result.confidence})` : ''
      console.log(`  ✅ Success - ${status}${conf} (${result.latency_ms}ms)`)
    } else {
      errorCount++
      console.log(`  ❌ Failed - ${result.error}`)
    }

    // Small delay between requests (except for last one)
    if (i < funds.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay
    }
  }

  console.log('\n📊 Seeding Summary:')
  console.log(`   Total: ${funds.length}`)
  console.log(`   ✅ Success: ${successCount}`)
  console.log(`   ❌ Errors: ${errorCount}`)

  // Write results to file
  const outputPath = path.join(process.cwd(), 'scripts', 'staging-e2e-seeded.json')
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))
  console.log(`\n📄 Results saved to: ${outputPath}`)

  if (errorCount > 0) {
    console.log('\n⚠️  Some funds failed to seed. Check the results file for details.')
    process.exit(1)
  }

  console.log('\n✅ Cache seeding complete!')
}

main().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})

