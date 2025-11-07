/**
 * GET /api/ai-coach/portfolio/[userId]/xirr
 * Calculate overall portfolio XIRR and per-scheme breakdown
 */

import { validateAICoachRequest } from '@/lib/ai-coach-api/auth'
import { successResponse, errorResponse, formatCurrency, generateXIRRInterpretation } from '@/lib/ai-coach-api/helpers'
import type { PortfolioXIRRResponse } from '@/lib/ai-coach-api/types'
import { getPortfolioXIRR, getSchemeXIRRs } from '@/lib/portfolioUtils'
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

    // Fetch XIRR data
    const [overallXIRR, schemeXIRRs] = await Promise.all([
      getPortfolioXIRR(userId),
      getSchemeXIRRs(userId)
    ])

    if (!overallXIRR) {
      return successResponse<PortfolioXIRRResponse>(
        {
          overall: {
            xirr: 0,
            xirrPercentage: 0,
            formattedXIRR: '0%',
            converged: false,
            error: 'No transactions found',
            xirr_interpretation: 'Unable to calculate returns',
            performance_category: 'Low',
            comparison_context: 'Insufficient transaction history'
          }
        },
        'No transaction history available for XIRR calculation'
      )
    }

    // Enhance overall XIRR
    const overallInterpretation = generateXIRRInterpretation(
      overallXIRR.xirr,
      overallXIRR.converged,
      overallXIRR.error
    )

    const enhancedOverall = {
      xirr: overallXIRR.xirr,
      xirrPercentage: overallXIRR.xirrPercentage,
      formattedXIRR: overallXIRR.formattedXIRR,
      converged: overallXIRR.converged,
      error: overallXIRR.error,
      xirr_interpretation: overallInterpretation.interpretation,
      performance_category: overallInterpretation.category,
      comparison_context: overallInterpretation.context,
      current_value: overallXIRR.totalCurrentValue,
      current_value_formatted: formatCurrency(overallXIRR.totalCurrentValue)
    }

    // Enhance scheme XIRRs
    const enhancedSchemes = (schemeXIRRs || []).map((scheme) => ({
      scheme_name: scheme.scheme_name,
      folio: scheme.folio,
      xirr: scheme.xirr,
      xirrPercentage: scheme.xirrPercentage,
      formattedXIRR: scheme.formattedXIRR,
      current_value: scheme.current_value,
      current_value_formatted: formatCurrency(scheme.current_value)
    }))

    // Find top and worst performers
    const validSchemes = enhancedSchemes.filter(s => s.xirr > 0 && s.current_value > 0)
    let topPerformer, worstPerformer
    if (validSchemes.length > 0) {
      validSchemes.sort((a, b) => b.xirr - a.xirr)
      topPerformer = {
        scheme_name: validSchemes[0].scheme_name,
        xirr_formatted: validSchemes[0].formattedXIRR
      }
      worstPerformer = {
        scheme_name: validSchemes[validSchemes.length - 1].scheme_name,
        xirr_formatted: validSchemes[validSchemes.length - 1].formattedXIRR
      }
    }

    // Determine portfolio health
    let portfolioHealth: 'Healthy' | 'Needs attention' | 'At risk' = 'Healthy'
    if (overallXIRR.xirr < 0.07) portfolioHealth = 'At risk'
    else if (overallXIRR.xirr < 0.10) portfolioHealth = 'Needs attention'

    const response: PortfolioXIRRResponse = {
      overall: enhancedOverall,
      schemes: enhancedSchemes,
      top_performer: topPerformer,
      worst_performer: worstPerformer,
      portfolio_health: portfolioHealth
    }

    // Generate summary
    const schemesCount = enhancedSchemes.length
    const topPerfText = topPerformer ? ` with best performer at ${topPerformer.xirr_formatted}` : ''
    const worstPerfText = worstPerformer && worstPerformer.scheme_name !== topPerformer?.scheme_name
      ? ` and weakest at ${worstPerformer.xirr_formatted}`
      : ''
    const summary = overallXIRR.converged
      ? `Portfolio generating ${overallXIRR.formattedXIRR} annualized returns${topPerfText}${worstPerfText}. ${overallInterpretation.interpretation}. ${schemesCount} scheme${schemesCount > 1 ? 's' : ''} analyzed.`
      : 'Unable to calculate portfolio returns'

    return successResponse(response, summary)

  } catch (error) {
    console.error('Error in GET /api/ai-coach/portfolio/[userId]/xirr:', error)
    return errorResponse('Internal server error while calculating portfolio XIRR', 500)
  }
}

