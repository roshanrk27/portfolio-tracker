/**
 * GET /api/ai-coach/portfolio/[userId]/allocation
 * Get asset allocation breakdown
 */

import { validateAICoachRequest } from '@/lib/ai-coach-api/auth'
import {
  successResponse,
  errorResponse,
  formatCurrency,
  determineRiskProfile,
  assessDiversification,
  getCategoryDescription
} from '@/lib/ai-coach-api/helpers'
import type { AssetAllocationResponse } from '@/lib/ai-coach-api/types'
import { getCurrentPortfolio } from '@/lib/portfolioUtils'
import { calculateAssetAllocation } from '@/lib/assetAllocation'
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

    // Fetch portfolio
    const portfolio = await getCurrentPortfolio(userId)

    if (!portfolio || portfolio.length === 0) {
      return successResponse<AssetAllocationResponse>(
        {
          allocations: [],
          totalValue: 0,
          allocation_summary: 'No assets allocated',
          risk_profile: 'Not available',
          diversification_score: 'No portfolio data',
          timestamp: new Date().toISOString()
        },
        'No portfolio holdings found'
      )
    }

    // Calculate allocation
    const allocation = calculateAssetAllocation(portfolio)

    if (!allocation || allocation.length === 0) {
      return successResponse<AssetAllocationResponse>(
        {
          allocations: [],
          totalValue: 0,
          allocation_summary: 'No assets allocated',
          risk_profile: 'Not available',
          diversification_score: 'No portfolio data',
          timestamp: new Date().toISOString()
        },
        'Unable to calculate asset allocation'
      )
    }

    // Enhance with LLM-friendly fields
    const enhancedAllocations = allocation.map((item) => ({
      category: item.category,
      value: item.value,
      value_formatted: formatCurrency(item.value),
      percentage: item.percentage,
      percentage_formatted: `${item.percentage.toFixed(1)}%`,
      count: item.count,
      count_description: `${item.count} ${item.category.toLowerCase()} ${item.count === 1 ? 'scheme' : 'schemes'}`,
      color: item.color,
      risk_level: item.category === 'Equity' ? 'High' : item.category === 'Hybrid' ? 'Medium' : 'Low' as 'High' | 'Medium' | 'Low',
      category_description: getCategoryDescription(item.category)
    }))

    // Determine risk profile
    const riskProfile = determineRiskProfile(allocation)

    // Assess diversification
    const diversificationScore = assessDiversification(allocation)

    // Generate allocation summary
    const allocationSummary = allocation
      .map(a => `${a.percentage.toFixed(0)}% ${a.category}`)
      .join(', ')

    // Optional rebalancing suggestion
    let rebalancingSuggestion = ''
    const equityAllocation = allocation.find(a => a.category === 'Equity')?.percentage || 0
    const debtAllocation = allocation.find(a => a.category === 'Debt')?.percentage || 0
    
    if (equityAllocation > 75) {
      rebalancingSuggestion = 'Consider reducing equity exposure by 10-15% and adding to debt for better balance'
    } else if (debtAllocation > 70) {
      rebalancingSuggestion = 'Consider increasing equity exposure to 30-40% for better long-term growth potential'
    }

    const response: AssetAllocationResponse = {
      allocations: enhancedAllocations,
      totalValue: allocation.reduce((sum, a) => sum + a.value, 0),
      allocation_summary: allocationSummary,
      risk_profile: riskProfile,
      diversification_score: diversificationScore,
      rebalancing_suggestion: rebalancingSuggestion || undefined,
      timestamp: new Date().toISOString()
    }

    // Generate summary
    const totalValueFormatted = formatCurrency(response.totalValue)
    const summary = `${riskProfile} allocation: ${allocationSummary}. Portfolio valued at ${totalValueFormatted}. ${diversificationScore}.`

    return successResponse(response, summary)

  } catch (error) {
    console.error('Error in GET /api/ai-coach/portfolio/[userId]/allocation:', error)
    return errorResponse('Internal server error while fetching allocation', 500)
  }
}

