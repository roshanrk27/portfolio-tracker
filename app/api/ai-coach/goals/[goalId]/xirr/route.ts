/**
 * GET /api/ai-coach/goals/[goalId]/xirr
 * Calculate XIRR for a specific goal
 */

import { validateAICoachRequest } from '@/lib/ai-coach-api/auth'
import { successResponse, errorResponse, generateXIRRInterpretation } from '@/lib/ai-coach-api/helpers'
import type { XIRRResponse } from '@/lib/ai-coach-api/types'
import { getGoalXIRR } from '@/lib/portfolioUtils'
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

    // Fetch XIRR data
    const xirrData = await getGoalXIRR(goalId)

    if (!xirrData) {
      return errorResponse('Goal not found or XIRR calculation failed', 404)
    }

    // Generate interpretation
    const interpretation = generateXIRRInterpretation(
      xirrData.xirr,
      xirrData.converged,
      xirrData.error
    )

    const enhancedXIRR: XIRRResponse = {
      xirr: xirrData.xirr,
      xirrPercentage: xirrData.xirrPercentage,
      formattedXIRR: xirrData.formattedXIRR,
      converged: xirrData.converged,
      error: xirrData.error,
      xirr_interpretation: interpretation.interpretation,
      performance_category: interpretation.category,
      comparison_context: interpretation.context,
      current_value: xirrData.current_value
    }

    // Generate summary
    const summary = interpretation.interpretation
      ? `Goal is generating ${xirrData.formattedXIRR || 'N/A'} annualized returns. ${interpretation.interpretation}. ${interpretation.context || ''}`
      : 'Unable to calculate returns for this goal'

    return successResponse(enhancedXIRR, summary)

  } catch (error) {
    console.error('Error in GET /api/ai-coach/goals/[goalId]/xirr:', error)
    return errorResponse('Internal server error while calculating XIRR', 500)
  }
}

