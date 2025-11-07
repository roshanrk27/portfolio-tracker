/**
 * GET /api/ai-coach/portfolio/[userId]/summary
 * Get overall portfolio summary
 */

import { validateAICoachRequest } from '@/lib/ai-coach-api/auth'
import { successResponse, errorResponse, formatCurrency } from '@/lib/ai-coach-api/helpers'
import type { PortfolioSummaryResponse } from '@/lib/ai-coach-api/types'
import { getPortfolioSummary, getLatestNavDate } from '@/lib/portfolioUtils'
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Validate API key
    const authError = validateAICoachRequest(request.headers)
    if (authError) return authError

    // Await params (required in Next.js 15)
    const { userId } = await params
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!userId || !uuidRegex.test(userId)) {
      return errorResponse('Invalid userId format', 400)
    }

    // Fetch portfolio summary
    const portfolioData = await getPortfolioSummary(userId)

    if (!portfolioData) {
      return errorResponse('User not found', 404)
    }

    // Fetch latest NAV date for status
    const latestNavDate = await getLatestNavDate()

    // Enhance with LLM-friendly fields
    const holdings = portfolioData.totalHoldings || 0

    // Determine holdings description
    let holdingsDesc = ''
    if (holdings === 0) holdingsDesc = 'No holdings'
    else if (holdings === 1) holdingsDesc = '1 mutual fund scheme'
    else holdingsDesc = `${holdings} mutual fund schemes`

    // Determine performance summary based on current value
    const currentValue = portfolioData.totalCurrentValue || 0
    let perfSummary = ''
    if (currentValue > 0) {
      perfSummary = 'Portfolio actively managed with current holdings'
    } else {
      perfSummary = 'No active portfolio holdings'
    }

    // NAV status
    let navStatus = ''
    if (latestNavDate) {
      const navDate = new Date(latestNavDate)
      navStatus = `Latest NAV updated on ${navDate.toLocaleDateString('en-IN')}`
    } else {
      navStatus = 'NAV data not available'
    }

    const enhancedSummary: PortfolioSummaryResponse = {
      totalHoldings: holdings,
      holdings_description: holdingsDesc,
      totalCurrentValue: portfolioData.totalCurrentValue,
      totalCurrentValue_formatted: formatCurrency(portfolioData.totalCurrentValue),
      totalNavValue: portfolioData.totalNavValue,
      entriesWithNav: portfolioData.entriesWithNav,
      nav_status: navStatus,
      performance_summary: perfSummary
    }

    // Generate summary (without totalInvested/totalReturn references)
    const summary = `Portfolio valued at ${formatCurrency(portfolioData.totalCurrentValue)} across ${holdingsDesc}.`

    return successResponse(enhancedSummary, summary)

  } catch (error) {
    console.error('Error in GET /api/ai-coach/portfolio/[userId]/summary:', error)
    return errorResponse('Internal server error while fetching portfolio summary', 500)
  }
}

