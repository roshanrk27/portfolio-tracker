/**
 * AI Coach API Helper Functions
 * Utilities for formatting and response generation
 */

import type { APIResponse, LLMMetadata } from './types'
import { formatIndianNumberWithSuffix, formatDuration } from '../goalSimulator'

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
  summary?: string
): Response {
  const response: APIResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    _metadata: generateMetadata(),
    _summary: summary
  }
  
  return new Response(
    JSON.stringify(response),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

/**
 * Create error response
 */
export function errorResponse(
  message: string,
  status: number = 400
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
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

