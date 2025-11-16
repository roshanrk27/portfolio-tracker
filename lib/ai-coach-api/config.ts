/**
 * Centralized configuration for AI Coach features.
 * Always prefer reading values here instead of touching process.env directly.
 */

type ConfidenceLevel = 'high' | 'medium'

function getEnv(name: string): string | undefined {
  const value = process.env[name]
  return value !== undefined && value !== '' ? value : undefined
}

function parseBoolean(name: string, fallback: boolean): boolean {
  const raw = getEnv(name)
  if (!raw) return fallback
  if (/^(true|1|yes)$/i.test(raw)) return true
  if (/^(false|0|no)$/i.test(raw)) return false
  console.warn(`[ai-coach-config] Invalid boolean for ${name}: ${raw}. Using ${fallback}.`)
  return fallback
}

function parseConfidence(name: string, fallback: ConfidenceLevel): ConfidenceLevel {
  const raw = getEnv(name)?.toLowerCase()
  if (!raw) return fallback
  if (raw === 'high' || raw === 'medium') return raw
  console.warn(`[ai-coach-config] Invalid confidence for ${name}: ${raw}. Using ${fallback}.`)
  return fallback
}

function parseInteger(name: string, fallback: number): number {
  const raw = getEnv(name)
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  if (Number.isFinite(parsed) && parsed > 0) return parsed
  console.warn(`[ai-coach-config] Invalid integer for ${name}: ${raw}. Using ${fallback}.`)
  return fallback
}

export const aiCoachConfig = {
  perplexityApiKey: getEnv('PERPLEXITY_API_KEY'),
  fundFacts: {
    useLLM: parseBoolean('FUND_FACTS_USE_LLM', false),
    minConfidence: parseConfidence('FUND_FACTS_MIN_CONFIDENCE', 'medium'),
    ttlDays: parseInteger('FUND_FACTS_TTL_DAYS', 30),
    maxDailyCalls: parseInteger('FUND_FACTS_MAX_DAILY_CALLS', 100),
    maxBatchSize: parseInteger('FUND_FACTS_MAX_BATCH_SIZE', 10)
  }
} as const

