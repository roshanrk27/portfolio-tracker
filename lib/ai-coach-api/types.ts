/**
 * AI Coach API Type Definitions
 * LLM-optimized interfaces with formatted fields and metadata
 */

export interface LLMMetadata {
  currency: string
  units: string
  timestamp: string
  dataFreshness: 'real-time' | 'cached' | 'stale'
}

export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
  _metadata?: LLMMetadata
  _summary?: string
}

// Base goal response structure
export interface GoalBase {
  id: string
  name: string
  description: string | null
  target_amount: number
  target_date: string
  user_id: string
}

// Enhanced goal response with LLM-friendly fields
export interface GoalWithDetailsResponse extends GoalBase {
  // Formatted amounts
  target_amount_formatted: string
  current_amount: number
  current_amount_formatted: string
  gap_amount: number
  gap_amount_formatted: string

  // Formatted dates
  target_date_formatted: string
  time_remaining_formatted: string
  months_remaining: number
  days_remaining: number

  // Progress
  progress_percentage: number
  progress_description: string

  // XIRR data
  xirr?: number
  xirrPercentage?: number
  formattedXIRR?: string | null
  xirr_interpretation?: string
  xirrConverged?: boolean
  xirrError?: string | null

  // Asset breakdown
  mutual_fund_value?: number
  mutual_fund_value_formatted?: string
  stock_value?: number
  stock_value_formatted?: string
  nps_value?: number
  nps_value_formatted?: string
  allocation_breakdown?: string

  // Mapped stocks (for client-side price fetching)
  mappedStocks?: Array<{
    stock_code: string
    quantity: number
    exchange: string
    source_id: string
  }>
  
  // Mapped mutual funds with full details
  mappedMutualFunds?: Array<{
    mapping_id: string
    scheme_name: string
    folio: string | null
    allocation_percentage: number
    current_value: number
    current_value_formatted: string
    balance_units: number
    current_nav: number
    total_invested?: number
    return_amount?: number
    return_percentage?: number
  }>
}

// Goals list response
export interface GoalsListResponse {
  goals: GoalWithDetailsResponse[]
  total_goals: number
}

// Portfolio summary response
export interface PortfolioSummaryResponse {
  totalHoldings: number
  holdings_description: string
  totalCurrentValue: number
  totalCurrentValue_formatted: string
  totalNavValue: number
  entriesWithNav: number
  nav_status?: string
  performance_summary?: string
}

// XIRR response
export interface XIRRResponse {
  xirr: number
  xirrPercentage: number
  formattedXIRR: string
  converged: boolean
  error?: string
  xirr_interpretation: string
  performance_category: 'High' | 'Medium' | 'Low'
  comparison_context?: string
  current_value?: number
  current_value_formatted?: string
}

// Portfolio XIRR response
export interface PortfolioXIRRResponse {
  overall: XIRRResponse
  schemes?: Array<{
    scheme_name: string
    folio: string
    xirr: number
    xirrPercentage: number
    formattedXIRR: string
    current_value: number
    current_value_formatted: string
  }>
  top_performer?: {
    scheme_name: string
    xirr_formatted: string
  }
  worst_performer?: {
    scheme_name: string
    xirr_formatted: string
  }
  portfolio_health?: 'Healthy' | 'Needs attention' | 'At risk'
}

// Asset allocation response
export interface AssetAllocationItem {
  category: string
  value: number
  value_formatted: string
  percentage: number
  percentage_formatted: string
  count: number
  count_description: string
  color: string
  risk_level: 'High' | 'Medium' | 'Low'
  category_description: string
}

export interface AssetAllocationResponse {
  allocations: AssetAllocationItem[]
  totalValue: number
  allocation_summary: string
  risk_profile: string
  diversification_score: string
  rebalancing_suggestion?: string
  timestamp: string
}

// Average investment response
export interface AverageInvestmentResponse {
  goalId: string
  averageMonthlyInvestment: number
  averageMonthlyInvestment_formatted: string
  periodMonths: number
  trend?: 'increasing' | 'stable' | 'decreasing'
  trend_description?: string
}

// Simulation request
export interface SimulationRequest {
  goalId?: string
  targetAmount: number
  months: number
  xirrPercent: number
  existingCorpus?: number
  stepUpPercent?: number
  includeScenarios?: boolean
}

// Simulation scenario
export interface SimulationScenario {
  stepUpPercent: number
  stepUpPercent_formatted: string
  monthlySIP: number
  monthlySIP_formatted: string
  totalInvested: number
  totalInvested_formatted: string
  finalCorpus: number
  finalCorpus_formatted: string
  scenario_description: string
  savings_vs_baseline?: string
  recommendation_score: number
  yearColumns: Array<{
    year: number
    sip: number
    sip_formatted: string
  }>
}

// Simulation response
export interface SimulationResponse {
  input: SimulationRequest & {
    targetAmount_formatted: string
    months_formatted: string
    existingCorpus_formatted?: string
  }
  base_calculation: {
    requiredMonthlySIP: number
    requiredMonthlySIP_formatted: string
    totalInvested: number
    totalInvested_formatted: string
    finalCorpus: number
    finalCorpus_formatted: string
    investment_description: string
  }
  scenarios?: SimulationScenario[]
  best_scenario?: {
    stepUpPercent: number
    reasoning: string
  }
  comparison_summary?: string
  _action_items?: string[]
}

