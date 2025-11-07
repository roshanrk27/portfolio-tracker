/**
 * GET /api/ai-coach/goals/[goalId]/details
 * Get detailed information for a specific goal
 */

import { validateAICoachRequest } from '@/lib/ai-coach-api/auth'
import { successResponse, errorResponse, formatCurrency } from '@/lib/ai-coach-api/helpers'
import type { GoalWithDetailsResponse } from '@/lib/ai-coach-api/types'
import { getGoalWithAllAssets, getGoalMappings } from '@/lib/portfolioUtils'
import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

// Create server-side Supabase client (same as portfolioUtils uses)
const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

    // Fetch goal details
    const goalData = await getGoalWithAllAssets(goalId)

    if (!goalData) {
      return errorResponse('Goal not found', 404)
    }

    // Fetch goal mappings to get mutual fund details
    const mappings = await getGoalMappings(goalId)
    
    // Build mappedMutualFunds array with full scheme details
    const mappedMutualFunds = []
    for (const mapping of mappings) {
      // Only process mutual fund mappings
      if (mapping.source_type !== 'mutual_fund') continue
      
      // Query current_portfolio for this scheme+folio combination
      const { data: portfolioEntry } = await supabaseServer
        .from('current_portfolio')
        .select('current_value, latest_unit_balance, current_nav, total_invested, return_amount, return_percentage')
        .eq('user_id', goalData.user_id)
        .eq('scheme_name', mapping.scheme_name)
        .eq('folio', mapping.folio || '')
        .single()
      
      if (portfolioEntry) {
        const currentValue = parseFloat(portfolioEntry.current_value || '0')
        mappedMutualFunds.push({
          mapping_id: mapping.id,
          scheme_name: mapping.scheme_name,
          folio: mapping.folio,
          allocation_percentage: parseFloat(mapping.allocation_percentage?.toString() || '100'),
          current_value: currentValue,
          current_value_formatted: formatCurrency(currentValue),
          balance_units: parseFloat(portfolioEntry.latest_unit_balance || '0'),
          current_nav: parseFloat(portfolioEntry.current_nav || '0'),
          total_invested: portfolioEntry.total_invested ? parseFloat(portfolioEntry.total_invested.toString()) : undefined,
          return_amount: portfolioEntry.return_amount ? parseFloat(portfolioEntry.return_amount.toString()) : undefined,
          return_percentage: portfolioEntry.return_percentage ? parseFloat(portfolioEntry.return_percentage.toString()) : undefined
        })
      }
    }

    // Enhance with LLM-friendly fields
    const mfValue = goalData.mutual_fund_value || 0
    const stockValue = goalData.stock_value || 0
    const npsValue = goalData.nps_value || 0
    const totalValue = mfValue + stockValue + npsValue

    // Generate asset summary
    const assetParts: string[] = []
    if (mfValue > 0) assetParts.push(`${formatCurrency(mfValue)} in mutual funds`)
    if (stockValue > 0) assetParts.push(`${formatCurrency(stockValue)} in stocks`)
    if (npsValue > 0) assetParts.push(`${formatCurrency(npsValue)} in NPS`)
    const assetSummary = assetParts.length > 0
      ? assetParts.join(', ')
      : 'No assets currently mapped'

    // Generate mapping description with mutual fund details
    let mappingDescription = ''
    if (goalData.mappedStocks && goalData.mappedStocks.length > 0) {
      const stockNames = goalData.mappedStocks.map((s: { stock_code: string }) => s.stock_code).join(', ')
      mappingDescription = `Stocks: ${stockNames}`
    }
    if (mappedMutualFunds.length > 0) {
      if (mappingDescription) mappingDescription += ' | '
      const mfNames = mappedMutualFunds.map((mf: { scheme_name: string }) => mf.scheme_name).join(', ')
      mappingDescription += `Mutual funds: ${mfNames}`
    } else if (mfValue > 0) {
      if (mappingDescription) mappingDescription += ' | '
      mappingDescription += 'Mutual funds mapped'
    }
    if (npsValue > 0) {
      if (mappingDescription) mappingDescription += ' | '
      mappingDescription += 'NPS holdings mapped'
    }
    if (!mappingDescription) {
      mappingDescription = 'No mappings yet'
    }

    const enhancedGoal: GoalWithDetailsResponse = {
      id: goalData.id,
      name: goalData.name,
      description: goalData.description,
      target_amount: parseFloat(goalData.target_amount?.toString() || '0'),
      target_date: goalData.target_date,
      user_id: goalData.user_id,
      
      // Formatted amounts
      target_amount_formatted: formatCurrency(parseFloat(goalData.target_amount?.toString() || '0')),
      current_amount: totalValue,
      current_amount_formatted: formatCurrency(totalValue),
      gap_amount: Math.max(0, parseFloat(goalData.target_amount?.toString() || '0') - totalValue),
      gap_amount_formatted: formatCurrency(Math.max(0, parseFloat(goalData.target_amount?.toString() || '0') - totalValue)),
      
      // Dates (minimal for details endpoint)
      target_date_formatted: new Date(goalData.target_date).toLocaleDateString('en-IN'),
      time_remaining_formatted: '',
      months_remaining: 0,
      days_remaining: 0,
      
      // Progress
      progress_percentage: goalData.target_amount > 0
        ? (totalValue / parseFloat(goalData.target_amount?.toString() || '1')) * 100
        : 0,
      progress_description: '',
      
      // Asset breakdown
      mutual_fund_value: mfValue,
      mutual_fund_value_formatted: formatCurrency(mfValue),
      stock_value: stockValue,
      stock_value_formatted: formatCurrency(stockValue),
      nps_value: npsValue,
      nps_value_formatted: formatCurrency(npsValue),
      allocation_breakdown: assetSummary,
      
      // Additional context
      mappedStocks: goalData.mappedStocks,
      mappedMutualFunds: mappedMutualFunds.length > 0 ? mappedMutualFunds : undefined
    }

    // Generate summary
    const targetAmount = parseFloat(goalData.target_amount?.toString() || '0')
    const summary = `Goal "${goalData.name}" has target of ${formatCurrency(targetAmount)} with ${formatCurrency(totalValue)} currently invested (${assetSummary}). ${mappingDescription}.`

    return successResponse(enhancedGoal, summary)

  } catch (error) {
    console.error('Error in GET /api/ai-coach/goals/[goalId]/details:', error)
    return errorResponse('Internal server error while fetching goal details', 500)
  }
}

