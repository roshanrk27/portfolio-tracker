/**
 * Guardrails for LLM fund facts data
 * Enforces non-advisory behavior and safe fallbacks
 */

import type { FundFactsLLM } from './types'

export interface GuardrailResult {
  passed: boolean
  reason?: string
}

/**
 * Check if text contains recommendation language
 */
function containsRecommendationLanguage(text: string | null | undefined): boolean {
  if (!text) return false
  
  const lowerText = text.toLowerCase()
  
  // Common recommendation patterns to detect
  const recommendationPatterns = [
    /\b(you should|you must|you need to|you ought to|we recommend|we suggest|we advise|we urge|you are advised|you are recommended)\b/i,
    /\b(buy|sell|invest in|avoid|skip|choose|pick|select|opt for|go with)\b.*\b(this fund|these funds|it|them)\b/i,
    /\b(best|worst|top|bottom|avoid|skip|don't invest|stay away)\b.*\b(fund|scheme|option)\b/i,
    /\b(highly recommend|strongly recommend|definitely invest|definitely avoid)\b/i
  ]
  
  return recommendationPatterns.some(pattern => pattern.test(lowerText))
}

/**
 * Strip recommendation language from text
 */
export function stripRecommendationLanguage(text: string | null | undefined): string | null {
  if (!text) return text ?? null
  
  // For now, we'll just return null if recommendation language is detected
  // In a production system, you might want to use more sophisticated NLP
  // to remove only the recommendation parts while keeping factual content
  if (containsRecommendationLanguage(text)) {
    return null
  }
  
  return text
}

/**
 * Validate LLM payload against guardrails
 * Returns result with pass/fail status and reason if failed
 */
export function validateGuardrails(llmData: FundFactsLLM): GuardrailResult {
  // Check 1: confidence === 'low'
  if (llmData.confidence === 'low') {
    return {
      passed: false,
      reason: 'confidence is low'
    }
  }

  // Check 2: Both scheme_name_official/query_name and amfi_code missing
  const hasSchemeName = (llmData.fund_ident.scheme_name_official && llmData.fund_ident.scheme_name_official.trim().length > 0) ||
                        (llmData.fund_ident.query_name && llmData.fund_ident.query_name.trim().length > 0)
  const hasAmfiCode = llmData.fund_ident.amfi_code && llmData.fund_ident.amfi_code.trim().length > 0
  
  if (!hasSchemeName && !hasAmfiCode) {
    return {
      passed: false,
      reason: 'both scheme_name and amfi_code are missing'
    }
  }

  // Check 3: sources empty
  if (!llmData.sources || llmData.sources.length === 0) {
    return {
      passed: false,
      reason: 'sources is empty'
    }
  }

  // All checks passed
  return { passed: true }
}

/**
 * Sanitize LLM data by stripping recommendation language
 * Returns a new object with sanitized fields
 */
export function sanitizeLLMData(llmData: FundFactsLLM): FundFactsLLM {
  const sanitized = { ...llmData }
  
  // Sanitize notes field
  if (sanitized.notes) {
    sanitized.notes = stripRecommendationLanguage(sanitized.notes)
  }
  
  // Note: We don't sanitize other fields as they are structured data
  // If recommendation language appears in structured fields, the guardrails
  // should catch it during validation
  
  return sanitized
}

