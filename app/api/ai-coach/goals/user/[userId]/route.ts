/**
 * GET /api/ai-coach/goals/user/[userId]
 * Fetch all goals with LLM-friendly details
 */

import { validateAICoachRequest } from '@/lib/ai-coach-api/auth'
import { successResponse, errorResponse } from '@/lib/ai-coach-api/helpers'
import type { GoalWithDetailsResponse, GoalsListResponse } from '@/lib/ai-coach-api/types'
import { fetchGoalsWithDetails } from '@/lib/portfolioUtils'
import {
  formatCurrency,
  formatDateWithContext,
  formatMonthsToReadable,
  generateXIRRInterpretation
} from '@/lib/ai-coach-api/helpers'
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const startTime = Date.now()
  let userId: string | undefined
  
  console.log('[AI-COACH] GET /api/ai-coach/goals/user/[userId] - Request received')
  console.log('[AI-COACH] Request URL:', request.url)
  console.log('[AI-COACH] Request method:', request.method)
  
  try {
    // Validate API key
    console.log('[AI-COACH] Validating API key...')
    const authError = validateAICoachRequest(request.headers)
    if (authError) {
      console.log('[AI-COACH] ❌ Authentication failed')
      return authError
    }
    console.log('[AI-COACH] ✅ Authentication passed')

    // Await params (required in Next.js 15)
    console.log('[AI-COACH] Extracting params...')
    const resolvedParams = await params
    userId = resolvedParams.userId
    console.log('[AI-COACH] Extracted userId:', userId)
    console.log('[AI-COACH] userId type:', typeof userId)
    console.log('[AI-COACH] userId length:', userId?.length)
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const isValidUuid = userId && uuidRegex.test(userId)
    console.log('[AI-COACH] UUID validation result:', isValidUuid)
    
    if (!userId || !isValidUuid) {
      console.log('[AI-COACH] ❌ Invalid userId format:', userId)
      return errorResponse('Invalid userId format', 400)
    }
    console.log('[AI-COACH] ✅ userId format valid')

    // Fetch goals with details
    console.log('[AI-COACH] Calling fetchGoalsWithDetails for userId:', userId)
    const goalsData = await fetchGoalsWithDetails(userId)
    console.log('[AI-COACH] fetchGoalsWithDetails returned:', {
      isNull: goalsData === null,
      isUndefined: goalsData === undefined,
      isArray: Array.isArray(goalsData),
      length: Array.isArray(goalsData) ? goalsData.length : 'N/A',
      data: goalsData
    })

    if (!goalsData || goalsData.length === 0) {
      console.log('[AI-COACH] ⚠️ No goals found for userId:', userId)
      const emptyResponse = successResponse<GoalsListResponse>(
        {
          goals: [],
          total_goals: 0
        },
        'User has no financial goals configured'
      )
      console.log('[AI-COACH] Returning empty goals response, status:', emptyResponse.status)
      return emptyResponse
    }

    console.log('[AI-COACH] ✅ Found', goalsData.length, 'goal(s) for userId:', userId)
    console.log('[AI-COACH] Goal IDs:', goalsData.map(g => g.id))

    // Enhance each goal with LLM-friendly fields
    console.log('[AI-COACH] Enhancing goals with LLM-friendly fields...')
    const enhancedGoals: GoalWithDetailsResponse[] = goalsData.map((goal) => {
      const targetAmount = parseFloat(goal.target_amount?.toString() || '0')
      const currentAmount = goal.current_amount || 0
      const gapAmount = Math.max(0, targetAmount - currentAmount)
      const progressPercentage = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0

      // Calculate time remaining
      const now = new Date()
      const targetDate = new Date(goal.target_date)
      const daysDiff = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      const monthsDiff = daysDiff / 30

      // Generate allocation breakdown
      const mfValue = goal.mutual_fund_value || 0
      const stockValue = goal.stock_value || 0
      const npsValue = goal.nps_value || 0
      const totalValue = mfValue + stockValue + npsValue

      let allocationBreakdown = ''
      if (totalValue > 0) {
        const parts: string[] = []
        if (mfValue > 0) parts.push(`${Math.round((mfValue / totalValue) * 100)}% MF`)
        if (stockValue > 0) parts.push(`${Math.round((stockValue / totalValue) * 100)}% Stocks`)
        if (npsValue > 0) parts.push(`${Math.round((npsValue / totalValue) * 100)}% NPS`)
        allocationBreakdown = parts.join(', ')
      } else {
        allocationBreakdown = 'No assets mapped'
      }

      // Generate XIRR interpretation if available
      let xirrInterpretation = undefined
      if (goal.formattedXIRR && goal.xirrConverged && goal.formattedXIRR !== 'Error') {
        const xirr = goal.xirr || 0
        const interpretation = generateXIRRInterpretation(xirr, true)
        xirrInterpretation = interpretation.interpretation
      }

      // Determine progress description
      let progressDesc = ''
      if (progressPercentage >= 100) progressDesc = 'Goal achieved! 🎉'
      else if (progressPercentage >= 75) progressDesc = `${Math.round(progressPercentage)}% completed - Almost there!`
      else if (progressPercentage >= 50) progressDesc = `${Math.round(progressPercentage)}% completed - Halfway through`
      else if (progressPercentage >= 25) progressDesc = `${Math.round(progressPercentage)}% completed - Good progress`
      else progressDesc = `${Math.round(progressPercentage)}% completed - Early stage`

      const enhancedGoal: GoalWithDetailsResponse = {
        ...goal,
        // Formatted amounts
        target_amount_formatted: formatCurrency(targetAmount),
        current_amount_formatted: formatCurrency(currentAmount),
        gap_amount: gapAmount,
        gap_amount_formatted: formatCurrency(gapAmount),
        
        // Formatted dates
        target_date_formatted: formatDateWithContext(goal.target_date),
        time_remaining_formatted: formatMonthsToReadable(monthsDiff),
        months_remaining: Math.round(monthsDiff),
        days_remaining: daysDiff,
        
        // Progress
        progress_percentage: Math.round(progressPercentage * 10) / 10,
        progress_description: progressDesc,
        
        // XIRR
        xirr_interpretation: xirrInterpretation,
        
        // Asset breakdown
        mutual_fund_value_formatted: formatCurrency(mfValue),
        stock_value_formatted: formatCurrency(stockValue),
        nps_value_formatted: formatCurrency(npsValue),
        allocation_breakdown: allocationBreakdown
      }

      return enhancedGoal
    })

    // Generate overall summary
    const totalGoals = enhancedGoals.length
    const totalValue = enhancedGoals.reduce((sum, g) => sum + (g.current_amount || 0), 0)
    const totalTarget = enhancedGoals.reduce((sum, g) => sum + parseFloat(g.target_amount?.toString() || '0'), 0)
    const avgProgress = totalTarget > 0 ? (totalValue / totalTarget) * 100 : 0
    
    const summary = totalGoals === 0
      ? 'User has no financial goals configured'
      : `User has ${totalGoals} financial goal${totalGoals > 1 ? 's' : ''} worth ₹${formatCurrency(totalTarget)}, with ₹${formatCurrency(totalValue)} currently invested (${avgProgress.toFixed(1)}% overall progress).`

    const response: GoalsListResponse = {
      goals: enhancedGoals,
      total_goals: totalGoals
    }

    console.log('[AI-COACH] ✅ Successfully processed', totalGoals, 'goal(s)')
    console.log('[AI-COACH] Total value:', formatCurrency(totalValue))
    console.log('[AI-COACH] Total target:', formatCurrency(totalTarget))
    console.log('[AI-COACH] Average progress:', avgProgress.toFixed(1) + '%')
    
    const finalResponse = successResponse(response, summary)
    const duration = Date.now() - startTime
    console.log('[AI-COACH] ✅ Returning success response, status:', finalResponse.status, 'Duration:', duration + 'ms')
    
    return finalResponse

  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[AI-COACH] ❌ Error in GET /api/ai-coach/goals/user/[userId] after', duration + 'ms')
    console.error('[AI-COACH] Error type:', error instanceof Error ? error.constructor.name : typeof error)
    console.error('[AI-COACH] Error message:', error instanceof Error ? error.message : String(error))
    console.error('[AI-COACH] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('[AI-COACH] Error occurred for userId:', userId || 'userId not extracted')
    
    return errorResponse('Internal server error while fetching goals', 500)
  }
}

