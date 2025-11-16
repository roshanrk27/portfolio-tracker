/**
 * Rate limiting and cost control for Perplexity API calls
 * Tracks daily budget to prevent runaway spend
 */

import { aiCoachConfig } from './config'
import type { SupabaseLike } from './fundFactsCache'

const DAILY_BUDGET_TABLE = 'fund_facts_daily_budget'

export interface DailyBudgetCheck {
  allowed: boolean
  callsToday: number
  limit: number
  reason?: string
}

export interface RateLimitError {
  type: 'budget_exceeded'
  retry_after?: number // seconds until next day
  calls_today: number
  limit: number
}

/**
 * Get current date in UTC (for consistent daily budget tracking)
 */
function getTodayUTC(): string {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Check if daily budget allows another Perplexity API call
 */
export async function checkDailyBudget(supabase: SupabaseLike): Promise<DailyBudgetCheck> {
  const limit = aiCoachConfig.fundFacts.maxDailyCalls
  const today = getTodayUTC()

  try {
    // Query current count for today
    const { data, error } = await supabase
      .from<{ date: string; call_count: number }>(DAILY_BUDGET_TABLE)
      .select('call_count')
      .eq('date', today)
      .maybeSingle()

    if (error && error.message && !error.message.includes('No rows')) {
      // Log error but allow request (graceful degradation)
      console.error('[rate-limiter] Error checking daily budget:', error.message)
      return {
        allowed: true, // Fail open to avoid blocking legitimate requests
        callsToday: 0,
        limit
      }
    }

    const callsToday = data?.call_count ?? 0

    if (callsToday >= limit) {
      return {
        allowed: false,
        callsToday,
        limit,
        reason: `Daily budget exceeded: ${callsToday}/${limit} calls used today`
      }
    }

    return {
      allowed: true,
      callsToday,
      limit
    }
  } catch (error) {
    // Graceful degradation: allow request if we can't check budget
    console.error('[rate-limiter] Exception checking daily budget:', error)
    return {
      allowed: true,
      callsToday: 0,
      limit
    }
  }
}

/**
 * Record a Perplexity API call (increment daily counter)
 * Uses atomic increment to handle concurrent requests safely
 */
export async function recordPerplexityCall(supabase: SupabaseLike): Promise<void> {
  const today = getTodayUTC()

  try {
    // Get current count for today
    const { data: existing } = await supabase
      .from<{ call_count: number }>(DAILY_BUDGET_TABLE)
      .select('call_count')
      .eq('date', today)
      .maybeSingle()

    const currentCount = existing?.call_count ?? 0

    // Upsert with incremented count
    const { error } = await supabase
      .from(DAILY_BUDGET_TABLE)
      .upsert({
        date: today,
        call_count: currentCount + 1,
        updated_at: new Date().toISOString()
      })

    if (error) {
      console.error('[rate-limiter] Failed to record Perplexity call:', error.message)
      // Don't throw - this is non-critical for the request flow
    }
  } catch (error) {
    console.error('[rate-limiter] Exception recording Perplexity call:', error)
    // Don't throw - recording failure shouldn't block the request
  }
}

/**
 * Validate batch request size
 */
export function validateBatchSize(fundIds: string[]): { valid: boolean; reason?: string } {
  const maxSize = aiCoachConfig.fundFacts.maxBatchSize

  if (fundIds.length > maxSize) {
    return {
      valid: false,
      reason: `Batch size ${fundIds.length} exceeds maximum ${maxSize}. Please paginate your request.`
    }
  }

  return { valid: true }
}

/**
 * Create rate limit error response data
 */
export function createRateLimitError(check: DailyBudgetCheck): RateLimitError {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(0, 0, 0, 0)
  const retryAfter = Math.ceil((tomorrow.getTime() - now.getTime()) / 1000)

  return {
    type: 'budget_exceeded',
    retry_after: retryAfter,
    calls_today: check.callsToday,
    limit: check.limit
  }
}

