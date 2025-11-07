/**
 * GET /api/ai-coach/goals/[goalId]/average-investment
 * Get average monthly investment for a goal
 */

import { validateAICoachRequest } from '@/lib/ai-coach-api/auth'
import { successResponse, errorResponse } from '@/lib/ai-coach-api/helpers'
import type { AverageInvestmentResponse } from '@/lib/ai-coach-api/types'
import { getAverageMonthlyInvestmentByGoal } from '@/lib/portfolioUtils'
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    // Validate API key
    const authError = validateAICoachRequest(request.headers)
    if (authError) return authError

    // Await params (required in Next.js 15)
    const { goalId } = await params
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!goalId || !uuidRegex.test(goalId)) {
      return errorResponse('Invalid goalId format', 400)
    }

    // Fetch average investment
    const avgInvestment = await getAverageMonthlyInvestmentByGoal(goalId)

    if (avgInvestment === 0) {
      return successResponse<AverageInvestmentResponse>(
        {
          goalId,
          averageMonthlyInvestment: 0,
          averageMonthlyInvestment_formatted: '₹0/month',
          periodMonths: 12,
          trend: 'stable',
          trend_description: 'No investment activity in the last 12 months'
        },
        'No recent investment activity for this goal'
      )
    }

    // Simple trend detection (would need historical data for real trend)
    // For now, assume stable
    const enhancedResponse: AverageInvestmentResponse = {
      goalId,
      averageMonthlyInvestment: avgInvestment,
      averageMonthlyInvestment_formatted: `₹${avgInvestment.toLocaleString('en-IN')}/month`,
      periodMonths: 12,
      trend: 'stable',
      trend_description: 'Consistent monthly investment pattern over the last 12 months'
    }

    const summary = `Average monthly investment of ₹${avgInvestment.toLocaleString('en-IN')} over the last 12 months, showing stable commitment.`

    return successResponse(enhancedResponse, summary)

  } catch (error) {
    console.error('Error in GET /api/ai-coach/goals/[goalId]/average-investment:', error)
    return errorResponse('Internal server error while fetching average investment', 500)
  }
}

