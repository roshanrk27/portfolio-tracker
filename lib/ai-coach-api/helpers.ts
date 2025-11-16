/**
 * AI Coach API Helper Functions
 * Utilities for formatting and response generation
 */

import type { APIResponse, LLMMetadata, FundFactsResponse, FundFactsLLM } from './types'
import { formatIndianNumberWithSuffix, formatDuration } from '../goalSimulator'
import type { FundFactsPromptFund } from './types'

/**
 * Format currency in Indian notation
 */
export function formatCurrency(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '₹0'
  return formatIndianNumberWithSuffix(amount)
}

/**
 * Format percentage with sign
 */
export function formatPercentage(decimal: number): string {
  if (typeof decimal !== 'number' || isNaN(decimal)) return '0%'
  const percentage = decimal * 100
  const sign = percentage >= 0 ? '+' : ''
  return `${sign}${percentage.toFixed(2)}%`
}

/**
 * Format duration from months to human-readable
 */
export function formatMonthsToReadable(months: number): string {
  if (typeof months !== 'number' || isNaN(months)) return '0m'
  return formatDuration(months)
}

/**
 * Format date with relative context
 */
export function formatDateWithContext(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    
    // Calculate months difference
    const monthsDiff = (date.getFullYear() - now.getFullYear()) * 12 + 
                      (date.getMonth() - now.getMonth())
    
    // Format date (e.g., "Dec 2030")
    const formattedDate = date.toLocaleDateString('en-IN', { 
      month: 'short', 
      year: 'numeric' 
    })
    
    // Add relative context
    let relativeContext = ''
    if (monthsDiff > 0) {
      relativeContext = ` (${formatMonthsToReadable(monthsDiff)} away)`
    } else if (monthsDiff < 0) {
      relativeContext = ` (${formatMonthsToReadable(Math.abs(monthsDiff))} ago)`
    } else {
      relativeContext = ' (today)'
    }
    
    return formattedDate + relativeContext
  } catch {
    return dateString
  }
}

/**
 * Generate metadata for LLM context
 */
export function generateMetadata(): LLMMetadata {
  return {
    currency: 'INR',
    units: 'Indian Rupees',
    timestamp: new Date().toISOString(),
    dataFreshness: 'real-time'
  }
}

/**
 * Create success response with summary
 */
export function successResponse<T>(
  data: T,
  summary?: string,
  requestId?: string
): Response {
  const response: APIResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    _metadata: generateMetadata(),
    _summary: summary
  }
  
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (requestId) {
    headers['X-Request-ID'] = requestId
  }
  
  return new Response(
    JSON.stringify(response),
    {
      status: 200,
      headers
    }
  )
}

/**
 * Create error response
 */
export function errorResponse(
  message: string,
  status: number = 400,
  requestId?: string,
  rateLimit?: unknown
): Response {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (requestId) {
    headers['X-Request-ID'] = requestId
  }
  
  const body: { success: false; error: string; timestamp: string; rate_limit?: unknown } = {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  }
  
  if (rateLimit) {
    body.rate_limit = rateLimit
  }
  
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers
    }
  )
}

/**
 * Generate XIRR interpretation
 */
export function generateXIRRInterpretation(xirr: number, converged: boolean, error?: string): {
  interpretation: string
  category: 'High' | 'Medium' | 'Low'
  context?: string
} {
  if (!converged || error) {
    return {
      interpretation: 'Unable to calculate returns',
      category: 'Low'
    }
  }

  const xirrPercent = xirr * 100

  let interpretation = ''
  let category: 'High' | 'Medium' | 'Low' = 'Low'
  let context = ''

  if (xirrPercent >= 15) {
    interpretation = `Excellent ${xirrPercent.toFixed(1)}% annualized return`
    category = 'High'
    context = 'Well above average mutual fund returns'
  } else if (xirrPercent >= 12) {
    interpretation = `Strong ${xirrPercent.toFixed(1)}% annualized return`
    category = 'High'
    context = 'Above average performance'
  } else if (xirrPercent >= 10) {
    interpretation = `Good ${xirrPercent.toFixed(1)}% annualized return`
    category = 'Medium'
    context = 'Competitive with market average'
  } else if (xirrPercent >= 7) {
    interpretation = `Moderate ${xirrPercent.toFixed(1)}% annualized return`
    category = 'Medium'
    context = 'Below average but acceptable'
  } else if (xirrPercent >= 4) {
    interpretation = `Below average ${xirrPercent.toFixed(1)}% annualized return`
    category = 'Low'
    context = 'May consider rebalancing'
  } else {
    interpretation = `Poor ${xirrPercent.toFixed(1)}% annualized return`
    category = 'Low'
    context = 'Needs immediate attention'
  }

  return { interpretation, category, context }
}

/**
 * Determine risk profile from allocation
 */
export function determineRiskProfile(allocations: Array<{ category: string; percentage: number }>): string {
  const equity = allocations.find(a => a.category === 'Equity')?.percentage || 0
  const debt = allocations.find(a => a.category === 'Debt')?.percentage || 0

  if (equity >= 70) {
    return 'Aggressive'
  } else if (equity >= 50) {
    return 'Moderately Aggressive'
  } else if (equity >= 30 && debt >= 50) {
    return 'Conservative'
  } else if (equity >= 30) {
    return 'Moderate'
  } else if (equity >= 20) {
    return 'Moderately Conservative'
  } else {
    return 'Very Conservative'
  }
}

/**
 * Assess diversification
 */
export function assessDiversification(allocations: Array<{ category: string; value: number; count: number }>): string {
  const totalValue = allocations.reduce((sum, a) => sum + a.value, 0)
  if (totalValue === 0) return 'No portfolio data'

  const categoryCount = allocations.length
  const totalFundCount = allocations.reduce((sum, a) => sum + a.count, 0)

  if (categoryCount >= 3 && totalFundCount >= 10) {
    return 'Well diversified'
  } else if (categoryCount >= 2 && totalFundCount >= 6) {
    return 'Moderately diversified'
  } else if (categoryCount >= 2) {
    return 'Basic diversification'
  } else {
    return 'Under-diversified'
  }
}

/**
 * Generate category description
 */
export function getCategoryDescription(category: string): string {
  const descriptions: Record<string, string> = {
    'Equity': 'Growth-oriented investments in stocks with higher volatility',
    'Debt': 'Stable fixed-income investments with lower risk',
    'Hybrid': 'Balanced mix of equity and debt for moderate risk-return'
  }
  return descriptions[category] || 'Investment allocation category'
}

/**
 * Format scenario description
 */
export function formatScenarioDescription(
  stepUpPercent: number,
  monthlySIP: number,
  monthlySIPFormatted: string
): string {
  if (stepUpPercent === 0) {
    return `Fixed SIP of ${monthlySIPFormatted} per month`
  } else {
    return `Start with ${monthlySIPFormatted}/month, increase by ${stepUpPercent}% yearly`
  }
}

/**
 * Calculate scenario rating
 */
export function calculateScenarioRating(
  stepUpPercent: number,
  monthlySIP: number,
  scenarios: Array<{ stepUpPercent: number; monthlySIP: number }>
): number {
  // Base score: 0% step-up gets 1, higher step-ups get better scores
  if (scenarios.length === 0) return 3
  
  // Rating based on balance between affordability and savings
  if (stepUpPercent === 0) return 1 // Fixed SIP
  if (stepUpPercent <= 5) return 2
  if (stepUpPercent <= 10) return 5 // Sweet spot
  if (stepUpPercent <= 15) return 4
  return 3 // Higher step-ups can be harder to sustain
}

/**
 * Add LLM context to data
 */
export function addLLMContext<T extends Record<string, unknown>>(
  data: T,
  summaryGenerator: (data: T) => string
): T & { _summary: string } {
  return {
    ...data,
    _summary: summaryGenerator(data)
  }
}

interface FundMappingInput {
  scheme_name: string | null
  fund_id?: string | null
  isin?: string | null
  current_value?: number | null
  latest_nav?: number | null
}

/**
 * Normalize fund mappings for Fund Facts prompt generation.
 * Deduplicates entries by (fund_id || isin || scheme_name) and fills defaults.
 */
export function normalizeFundMappings(
  mappings: FundMappingInput[]
): FundFactsPromptFund[] {
  const deduped: Map<string, FundFactsPromptFund> = new Map()

  for (const mapping of mappings) {
    const schemeName = (mapping.scheme_name || '').trim()
    if (!schemeName) continue

    const fundId = mapping.fund_id?.trim() || null
    const isin = mapping.isin?.trim() || null
    const key = (fundId || isin || schemeName).toLowerCase()

    if (!deduped.has(key)) {
      deduped.set(key, {
        scheme_name: schemeName,
        fund_id: fundId,
        isin,
        latest_nav: mapping.latest_nav ?? null,
        current_value: mapping.current_value ?? null
      })
      continue
    }

    const existing = deduped.get(key)!
    if (!existing.fund_id && fundId) existing.fund_id = fundId
    if (!existing.isin && isin) existing.isin = isin
    if (existing.latest_nav === null && mapping.latest_nav != null) {
      existing.latest_nav = mapping.latest_nav
    }
    if (existing.current_value === null && mapping.current_value != null) {
      existing.current_value = mapping.current_value
    }
  }

  return Array.from(deduped.values())
}


/**
 * Generate standardized, neutral summary message for fund facts responses
 */
export function generateFundFactsSummary(
  schemeName: string | null,
  fundId: string,
  provenance: 'deterministic' | 'llm+cited',
  confidence?: 'high' | 'medium' | 'low' | null,
  source?: 'cache' | 'perplexity' | 'disabled' | null
): string {
  const fundLabel = schemeName || fundId

  if (provenance === 'deterministic') {
    if (source === 'disabled') {
      return `Fund facts for ${fundLabel}. Data sourced from deterministic calculations only (LLM augmentation disabled).`
    }
    return `Fund facts for ${fundLabel}. Data sourced from deterministic calculations only.`
  }

  // LLM+cited provenance
  const confidenceText = confidence ? ` (confidence: ${confidence})` : ''
  if (source === 'cache') {
    return `Fund facts for ${fundLabel}. Data provided by Perplexity with cited sources${confidenceText}, retrieved from cache.`
  }
  if (source === 'perplexity') {
    return `Fund facts for ${fundLabel}. Data provided by Perplexity with cited sources${confidenceText}.`
  }

  return `Fund facts for ${fundLabel}. Data provided by Perplexity with cited sources${confidenceText}.`
}

/**
 * Merge deterministic and LLM fund facts data
 * Currently deterministic data is empty (per Task 1), so this primarily surfaces LLM data
 * Ensures all metadata fields are always present for consistency
 */
export function mergeFundFactsData(
  fundId: string,
  schemeName: string | null,
  llmData: FundFactsLLM | null
): FundFactsResponse {
  // For now, deterministic data is empty (Task 1 notes)
  const deterministic = {
    risk_return: {},
    fees_aum: {}
  }

  if (!llmData) {
    // Deterministic-only response - ensure all metadata fields are present
    return {
      fund_id: fundId,
      scheme_name: schemeName,
      risk_return: deterministic.risk_return,
      fees_aum: deterministic.fees_aum,
      provenance: 'deterministic',
      llm_confidence: undefined,
      llm_as_of: undefined,
      sources: undefined,
      notes: {
        llm: 'Perplexity data unavailable; deterministic metrics not yet implemented.'
      }
    }
  }

  // Extract top 3 sources
  const topSources = llmData.sources.slice(0, 3)

  // Get as_of date from performance or risk_metrics (prefer performance)
  const llmAsOf = llmData.performance.as_of || llmData.risk_metrics.as_of || undefined

  // Merge: deterministic values win, LLM fills gaps
  // Since deterministic is empty now, we use LLM values directly
  // Ensure all metadata fields are always present
  const merged: FundFactsResponse = {
    fund_id: fundId,
    scheme_name: llmData.fund_ident.scheme_name_official || llmData.fund_ident.query_name || schemeName,
    risk_return: {
      cagr_1y: llmData.performance.cagr_1y,
      cagr_3y: llmData.performance.cagr_3y,
      cagr_5y: llmData.performance.cagr_5y,
      ret_ytd: llmData.performance.ret_ytd,
      ret_1m: llmData.performance.ret_1m,
      ret_3m: llmData.performance.ret_3m,
      ret_6m: llmData.performance.ret_6m,
      // Note: vol_3y_ann and max_dd_5y are not in new schema, but keeping for API compatibility
      vol_3y_ann: llmData.risk_metrics.stddev_pct ?? null,
      max_dd_5y: null // Not available in new schema
    },
    fees_aum: {
      expense_ratio_pct: llmData.facts.expense_ratio_pct,
      aum_cr: llmData.facts.aum_cr
    },
    provenance: 'llm+cited',
    llm_confidence: llmData.confidence,
    llm_as_of: llmAsOf,
    sources: topSources.length > 0 ? topSources : undefined
  }

  if (llmData.notes) {
    merged.notes = { llm: llmData.notes }
  }

  return merged
}

