/**
 * GET /api/ai-coach/funds/[fundId]/facts
 * Get fund facts with LLM augmentation
 */

import { validateAICoachRequest } from '@/lib/ai-coach-api/auth'
import { successResponse, errorResponse, mergeFundFactsData, generateFundFactsSummary } from '@/lib/ai-coach-api/helpers'
import { buildPerplexityMessages } from '@/lib/ai-coach-api/promptLoader'
import type { FundFactsResponse } from '@/lib/ai-coach-api/types'
import { aiCoachConfig } from '@/lib/ai-coach-api/config'
import { getFreshFundFacts, upsertFundFacts, type SupabaseLike } from '@/lib/ai-coach-api/fundFactsCache'
import { fetchPerplexityFundFacts } from '@/lib/ai-coach-api/perplexity'
import { generateRequestId, logFundFactsRequest, hashPrompt, type FundFactsLogEntry } from '@/lib/ai-coach-api/logging'
import { validateGuardrails, sanitizeLLMData } from '@/lib/ai-coach-api/guardrails'
import { checkDailyBudget, recordPerplexityCall, createRateLimitError } from '@/lib/ai-coach-api/rateLimiter'
import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

// Create server-side Supabase client
const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
) as unknown as SupabaseLike

// Confidence level comparison
function meetsMinConfidence(confidence: string, minConfidence: 'high' | 'medium'): boolean {
  if (minConfidence === 'high') {
    return confidence === 'high'
  }
  // medium accepts both 'high' and 'medium'
  return confidence === 'high' || confidence === 'medium'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  const startTime = Date.now()
  const requestId = generateRequestId()
  const logEntry: Partial<FundFactsLogEntry> = {
    request_id: requestId,
    fund_id: '',
    cache_status: 'error',
    adapter_status: 'skipped',
    latency_ms: 0
  }

  try {
    // Validate API key
    const authError = validateAICoachRequest(request.headers)
    if (authError) {
      logEntry.latency_ms = Date.now() - startTime
      logEntry.adapter_status = 'error'
      logEntry.error_message = 'Authentication failed'
      logFundFactsRequest(logEntry as FundFactsLogEntry)
      return errorResponse('Unauthorized', 401, requestId)
    }

    // Await params (required in Next.js 15)
    const { fundId } = await params
    logEntry.fund_id = fundId

    // Validate fundId format (AMFI scheme_code is numeric)
    if (!fundId || !/^\d+$/.test(fundId)) {
      logEntry.latency_ms = Date.now() - startTime
      logEntry.adapter_status = 'error'
      logEntry.error_message = 'Invalid fundId format'
      logFundFactsRequest(logEntry as FundFactsLogEntry)
      return errorResponse('Invalid fundId format. Expected AMFI scheme_code (numeric string).', 400, requestId)
    }

    // Lookup fund in nav_data to get scheme_name and isin
    // Note: Using regular Supabase client for nav_data query (not SupabaseLike)
    const regularSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: navData, error: navError } = await regularSupabase
      .from('nav_data')
      .select('scheme_name, isin_div_payout, isin_div_reinvestment, nav_value')
      .eq('scheme_code', fundId)
      .limit(1)
      .maybeSingle()

    if (navError || !navData) {
      logEntry.latency_ms = Date.now() - startTime
      logEntry.adapter_status = 'error'
      logEntry.error_message = 'Fund not found'
      logFundFactsRequest(logEntry as FundFactsLogEntry)
      return errorResponse('Fund not found', 404, requestId)
    }

    const schemeName = (navData as { scheme_name?: string | null }).scheme_name || null
    const isin = (navData as { isin_div_payout?: string | null; isin_div_reinvestment?: string | null }).isin_div_payout ||
                 (navData as { isin_div_payout?: string | null; isin_div_reinvestment?: string | null }).isin_div_reinvestment ||
                 null
    const latestNav = (navData as { nav_value?: number | string | null }).nav_value
      ? parseFloat(String((navData as { nav_value?: number | string | null }).nav_value))
      : null

    // Check feature flag
    if (!aiCoachConfig.fundFacts.useLLM) {
      // Return deterministic-only payload
      logEntry.latency_ms = Date.now() - startTime
      logEntry.cache_status = 'disabled'
      logEntry.adapter_status = 'skipped'
      logFundFactsRequest(logEntry as FundFactsLogEntry)
      
      const deterministicResponse: FundFactsResponse = mergeFundFactsData(fundId, schemeName, null)
      const summary = generateFundFactsSummary(schemeName, fundId, 'deterministic', null, 'disabled')
      return successResponse<FundFactsResponse>(deterministicResponse, summary, requestId)
    }

    // Attempt cache read
    const cached = await getFreshFundFacts(supabaseServer, fundId)
    if (cached && meetsMinConfidence(cached.confidence, aiCoachConfig.fundFacts.minConfidence)) {
      // Extract first fund from cached payload array
      const llmData = Array.isArray(cached.payload) && cached.payload.length > 0
        ? cached.payload[0]
        : null

      if (llmData) {
        logEntry.latency_ms = Date.now() - startTime
        logEntry.cache_status = 'hit'
        logEntry.confidence = cached.confidence as 'high' | 'medium' | 'low'
        logEntry.adapter_status = 'success'
        logFundFactsRequest(logEntry as FundFactsLogEntry)
        
        const merged = mergeFundFactsData(fundId, schemeName, llmData)
        const summary = generateFundFactsSummary(schemeName, fundId, 'llm+cited', cached.confidence as 'high' | 'medium' | 'low', 'cache')
        return successResponse<FundFactsResponse>(merged, summary, requestId)
      }
    }
    
    // Cache miss
    logEntry.cache_status = 'miss'

    // Check daily budget before calling Perplexity
    const budgetCheck = await checkDailyBudget(supabaseServer)
    if (!budgetCheck.allowed) {
      logEntry.latency_ms = Date.now() - startTime
      logEntry.adapter_status = 'error'
      logEntry.error_message = budgetCheck.reason
      logFundFactsRequest(logEntry as FundFactsLogEntry)
      
      const rateLimitError = createRateLimitError(budgetCheck)
      return errorResponse(
        `Daily Perplexity API budget exceeded: ${budgetCheck.callsToday}/${budgetCheck.limit} calls used today. Please try again later.`,
        429,
        requestId,
        rateLimitError
      )
    }

    // Cache miss or low confidence - call Perplexity
    try {
      // Build prompt for hashing (for debugging)
      const promptContext = {
        funds: [
          {
            scheme_name: schemeName || '',
            fund_id: fundId,
            isin: isin,
            latest_nav: latestNav,
            current_value: null
          }
        ]
      }
      const { system, user } = buildPerplexityMessages(promptContext)
      // Hash the combined prompt (system + user) for logging
      const promptHash = hashPrompt(`${system}\n\n${user}`)
      logEntry.prompt_hash = promptHash

      const perplexityResult = await fetchPerplexityFundFacts(promptContext)

      // Log raw Perplexity response (pretty printed)
      console.debug(`[fund-facts] Raw Perplexity Response for fund ${fundId} (request_id: ${requestId}):`)
      console.debug(JSON.stringify(perplexityResult.payload, null, 2))

      // Extract first fund from payload array
      const llmData = perplexityResult.payload && perplexityResult.payload.length > 0
        ? perplexityResult.payload[0]
        : null

      if (!llmData) {
        // Perplexity returned empty array
        logEntry.latency_ms = Date.now() - startTime
        logEntry.adapter_status = 'empty_response'
        logFundFactsRequest(logEntry as FundFactsLogEntry)
        
        const deterministicResponse: FundFactsResponse = mergeFundFactsData(fundId, schemeName, null)
        deterministicResponse.notes = {
          llm: 'Perplexity API returned no data for this fund.'
        }
        const summary = generateFundFactsSummary(schemeName, fundId, 'deterministic', null, null)
        return successResponse<FundFactsResponse>(deterministicResponse, summary, requestId)
      }

      // Check confidence threshold
      if (!meetsMinConfidence(llmData.confidence, aiCoachConfig.fundFacts.minConfidence)) {
        // Low confidence - return deterministic-only
        logEntry.latency_ms = Date.now() - startTime
        logEntry.confidence = llmData.confidence
        logEntry.adapter_status = 'low_confidence'
        logFundFactsRequest(logEntry as FundFactsLogEntry)
        
        const deterministicResponse: FundFactsResponse = mergeFundFactsData(fundId, schemeName, null)
        deterministicResponse.notes = {
          llm: `Perplexity returned data with confidence level '${llmData.confidence}', which is below the minimum threshold (${aiCoachConfig.fundFacts.minConfidence}). Data not included in response.`
        }
        const summary = generateFundFactsSummary(schemeName, fundId, 'deterministic', null, null)
        return successResponse<FundFactsResponse>(deterministicResponse, summary, requestId)
      }

      // Apply guardrails validation
      const guardrailResult = validateGuardrails(llmData)
      if (!guardrailResult.passed) {
        // Guardrail failed - return deterministic-only
        logEntry.latency_ms = Date.now() - startTime
        logEntry.confidence = llmData.confidence
        logEntry.adapter_status = 'error'
        logEntry.error_message = `Guardrail validation failed: ${guardrailResult.reason}`
        logFundFactsRequest(logEntry as FundFactsLogEntry)
        
        const deterministicResponse: FundFactsResponse = mergeFundFactsData(fundId, schemeName, null)
        deterministicResponse.notes = {
          llm: `Perplexity data rejected by guardrails: ${guardrailResult.reason}. Falling back to deterministic data only.`
        }
        const summary = generateFundFactsSummary(schemeName, fundId, 'deterministic', null, null)
        return successResponse<FundFactsResponse>(deterministicResponse, summary, requestId)
      }

      // Sanitize LLM data (strip recommendation language)
      const sanitizedLLMData = sanitizeLLMData(llmData)

      // Record successful Perplexity call (increment daily budget)
      await recordPerplexityCall(supabaseServer)

      // Store in cache (use sanitized data)
      // Get as_of date from performance or risk_metrics (prefer performance)
      const asOfDate = sanitizedLLMData.performance.as_of || sanitizedLLMData.risk_metrics.as_of
      const asOfMonth = asOfDate ? new Date(asOfDate) : new Date()
      asOfMonth.setDate(1) // First day of month
      const asOfMonthStr = asOfMonth.toISOString().split('T')[0]

      await upsertFundFacts(supabaseServer, {
        fund_id: fundId,
        as_of_month: asOfMonthStr,
        payload: [sanitizedLLMData],
        confidence: sanitizedLLMData.confidence,
        sources: sanitizedLLMData.sources
      })

      // Merge and return (use sanitized data)
      logEntry.latency_ms = Date.now() - startTime
      logEntry.confidence = sanitizedLLMData.confidence
      logEntry.adapter_status = 'success'
      logFundFactsRequest(logEntry as FundFactsLogEntry)
      
      const merged = mergeFundFactsData(fundId, schemeName, sanitizedLLMData)
      const summary = generateFundFactsSummary(schemeName, fundId, 'llm+cited', sanitizedLLMData.confidence, 'perplexity')
      return successResponse<FundFactsResponse>(merged, summary, requestId)

    } catch (perplexityError) {
      // Perplexity failed - return deterministic-only with warning
      const errorMessage = perplexityError instanceof Error ? perplexityError.message : 'Unknown error'
      logEntry.latency_ms = Date.now() - startTime
      logEntry.adapter_status = 'error'
      logEntry.error_message = errorMessage
      logFundFactsRequest(logEntry as FundFactsLogEntry)
      
      const deterministicResponse: FundFactsResponse = mergeFundFactsData(fundId, schemeName, null)
      deterministicResponse.notes = {
        llm: `Perplexity API request failed: ${errorMessage}. Falling back to deterministic data only.`
      }
      const summary = generateFundFactsSummary(schemeName, fundId, 'deterministic', null, null)
      return successResponse<FundFactsResponse>(deterministicResponse, summary, requestId)
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logEntry.latency_ms = Date.now() - startTime
    logEntry.adapter_status = 'error'
    logEntry.error_message = errorMessage
    logFundFactsRequest(logEntry as FundFactsLogEntry)
    
    return errorResponse('Internal server error while fetching fund facts', 500, requestId)
  }
}

