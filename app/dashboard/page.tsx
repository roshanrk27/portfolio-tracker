'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { getPortfolioSummary, getGoals, getGoalXIRR, getGoalMappings, getLatestNavDate, isNavUpToDate, getPortfolioXIRR } from '@/lib/portfolioUtils'
import GoalForm from '@/components/GoalForm'
import GoalCard from '@/components/GoalCard'
import RefreshNavButton from '@/components/RefreshNavButton'

interface PortfolioSummary {
  totalHoldings: number
  totalInvested: number
  totalCurrentValue: number
  totalReturn: number
  totalReturnPercentage: number
  totalNavValue: number
  entriesWithNav: number
}

interface StockSummary {
  totalStocks: number
  totalStockValue: number
  totalInvested: number
  totalReturn: number
  totalReturnPercentage: number
}

interface Goal {
  id: string
  name: string
  description: string | null
  target_amount: number
  target_date: string
  current_amount: number
  created_at: string
  updated_at: string
  xirr?: number
  xirrPercentage?: number
  formattedXIRR?: string
  xirrConverged?: boolean
  xirrError?: string
  mutual_fund_value?: number
  mappedStocks?: { stock_code: string; quantity: number; exchange: string; source_id: string }[]
  nps_value?: number
}

export default function Dashboard() {
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null)
  const [stockSummary, setStockSummary] = useState<StockSummary | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [portfolioXIRR, setPortfolioXIRR] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [portfolioLoading, setPortfolioLoading] = useState(false)
  const [stockLoading, setStockLoading] = useState(false)
  const [goalsLoading, setGoalsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [latestNavDate, setLatestNavDate] = useState<string | null>(null)
  const [isNavUpToDateState, setIsNavUpToDateState] = useState(false)
  const [npsValue, setNpsValue] = useState<number | null>(null)
  const [npsLoading, setNpsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
      } else {
        setLoading(false)
        try {
          const [summaryData, goalsData] = await Promise.all([
            getPortfolioSummary(session.user.id),
            getGoals(session.user.id)
          ])
          
          // Load stock summary data
          const stockData = await loadStockSummary(session.user.id)
          setStockSummary(stockData)
          
          // For each goal, fetch XIRR and mutual fund value
          const goalsWithDetails = await Promise.all(goalsData.map(async (goal) => {
            const xirrData = await getGoalXIRR(goal.id)
            const mappings = await getGoalMappings(goal.id)
            let mutualFundValue = 0
            let mappedStocks = []
            let npsValue = 0
            for (const mapping of mappings) {
              if (mapping.source_type === 'mutual_fund') {
                const { data: portfolioData } = await supabase
                  .from('current_portfolio')
                  .select('current_value')
                  .eq('user_id', session.user.id)
                  .eq('scheme_name', mapping.scheme_name)
                  .eq('folio', mapping.folio || '')
                mutualFundValue += (portfolioData || []).reduce((sum: number, item: { current_value: string }) => sum + (parseFloat(item.current_value || '0') || 0), 0)
              } else if (mapping.source_type === 'stock' && mapping.source_id) {
                const { data: stockData } = await supabase
                  .from('stocks')
                  .select('*')
                  .eq('id', mapping.source_id)
                  .eq('user_id', session.user.id)
                  .single()
                if (stockData) {
                  mappedStocks.push({
                    stock_code: stockData.stock_code,
                    quantity: stockData.quantity,
                    exchange: stockData.exchange,
                    source_id: stockData.id
                  })
                }
              } else if (mapping.source_type === 'nps') {
                // NPS value calculation can be added here
                npsValue += 0
              }
            }
            return {
              ...goal,
              ...xirrData,
              mutual_fund_value: mutualFundValue,
              mappedStocks,
              nps_value: npsValue,
              current_amount: mutualFundValue + npsValue // stock value will be added client-side
            }
          }))
          setPortfolioSummary(summaryData)
          setGoals(goalsWithDetails)
          setGoalsLoading(false)
        } catch (err: any) {
          setError(err.message)
        }
      }
    }
    checkAuth()

    // Fetch NPS value
    const fetchNpsValue = async () => {
      setNpsLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        // Fetch holdings
        const { data: holdings, error: holdingsError } = await supabase
          .from('nps_holdings')
          .select('id, fund_code, units')
          .eq('user_id', session.user.id)
        if (holdingsError) throw holdingsError
        // Fetch NAVs
        const { data: navs, error: navsError } = await supabase
          .from('nps_nav')
          .select('fund_code, nav')
        if (navsError) throw navsError
        const navMap: Record<string, number> = {}
        for (const row of navs || []) {
          navMap[row.fund_code] = parseFloat(row.nav)
        }
        let total = 0
        for (const h of holdings || []) {
          const nav = navMap[h.fund_code] || 0
          total += nav * (parseFloat(h.units) || 0)
        }
        setNpsValue(total)
      } catch {
        setNpsValue(null)
      } finally {
        setNpsLoading(false)
      }
    }
    fetchNpsValue()
  }, [router])

  const loadDashboardData = async (userId: string) => {
    try {
      setPortfolioLoading(true)
      setStockLoading(true)
      setGoalsLoading(true)
      
      // Load portfolio data first (faster)
      const [summaryData, xirrData] = await Promise.all([
        getPortfolioSummary(userId),
        getPortfolioXIRR(userId)
      ])
      
      setPortfolioSummary(summaryData)
      setPortfolioXIRR(xirrData)
      setPortfolioLoading(false)
      
      // Load stock data
      const stockData = await loadStockSummary(userId)
      setStockSummary(stockData)
      setStockLoading(false)
      
      // Load goals data (slower due to XIRR calculations)
      const goalsData = await getGoals(userId)
      setGoals(goalsData)
      setGoalsLoading(false)

      // Load latest NAV date
      const latestNavDateData = await getLatestNavDate()
      setLatestNavDate(latestNavDateData)

      // Check if NAV is up to date
      const navUpToDate = await isNavUpToDate()
      setIsNavUpToDateState(navUpToDate)
    } catch (err: any) {
      setError(err.message)
      setPortfolioLoading(false)
      setStockLoading(false)
      setGoalsLoading(false)
    }
  }

  const loadStockSummary = async (userId: string): Promise<StockSummary> => {
    try {
      // Get all stocks for the user
      const { data: stocks, error } = await supabase
        .from('stocks')
        .select('*')
        .eq('user_id', userId)

      if (error) {
        console.error('Error loading stocks:', error)
        return {
          totalStocks: 0,
          totalStockValue: 0,
          totalInvested: 0,
          totalReturn: 0,
          totalReturnPercentage: 0
        }
      }

      if (!stocks || stocks.length === 0) {
        return {
          totalStocks: 0,
          totalStockValue: 0,
          totalInvested: 0,
          totalReturn: 0,
          totalReturnPercentage: 0
        }
      }

      let totalStockValue = 0
      let totalInvested = 0

      // Fetch current prices for all stocks
      for (const stock of stocks) {
        try {
          const response = await fetch(`/api/stock-prices?symbol=${stock.stock_code}&exchange=${stock.exchange === 'US' ? 'NASDAQ' : stock.exchange}`)
          if (response.ok) {
            const priceData = await response.json()
            if (priceData.success && priceData.price) {
              const currentValue = stock.quantity * priceData.price
              totalStockValue += currentValue
            }
          }
        } catch (err) {
          console.error(`Error fetching price for ${stock.stock_code}:`, err)
        }
      }

      const totalReturn = totalStockValue - totalInvested
      const totalReturnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0

      return {
        totalStocks: stocks.length,
        totalStockValue,
        totalInvested,
        totalReturn,
        totalReturnPercentage
      }
    } catch (err) {
      console.error('Error in loadStockSummary:', err)
      return {
        totalStocks: 0,
        totalStockValue: 0,
        totalInvested: 0,
        totalReturn: 0,
        totalReturnPercentage: 0
      }
    }
  }

  const handleGoalAdded = async () => {
    setShowGoalForm(false)
    setGoalsLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const goalsData = await getGoals(session.user.id)
      setGoals(goalsData)
      setGoalsLoading(false)
    }
  }

  const handleGoalDeleted = async (goalId: string) => {
    try {
      setGoalsLoading(true)
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId)

      if (error) {
        console.error('Error deleting goal:', error)
        setGoalsLoading(false)
        return
      }

      // Refresh goals list
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const goalsData = await getGoals(session.user.id)
        setGoals(goalsData)
        setGoalsLoading(false)
      }
    } catch (err: any) {
      console.error('Error in handleGoalDeleted:', err)
      setGoalsLoading(false)
    }
  }

  const handleMappingChanged = async () => {
    try {
      setGoalsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const goalsData = await getGoals(session.user.id)
        setGoals(goalsData)
        setGoalsLoading(false)
      }
    } catch (err: any) {
      console.error('Error in handleMappingChanged:', err)
      setGoalsLoading(false)
    }
  }

  const handleGoalEdit = async (updatedGoal: Goal) => {
    try {
      setGoalsLoading(true)
      const { error } = await supabase
        .from('goals')
        .update({
          name: updatedGoal.name,
          description: updatedGoal.description,
          target_amount: updatedGoal.target_amount,
          target_date: updatedGoal.target_date
        })
        .eq('id', updatedGoal.id)

      if (error) {
        console.error('Error updating goal:', error)
        setGoalsLoading(false)
        return
      }

      // Refresh goals list
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const goalsData = await getGoals(session.user.id)
        setGoals(goalsData)
        setGoalsLoading(false)
      }
    } catch (err: any) {
      console.error('Error in handleGoalEdit:', err)
      setGoalsLoading(false)
    }
  }

  const handleNavRefresh = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        // Refresh portfolio and stock data
        const [summaryData, stockData] = await Promise.all([
          getPortfolioSummary(session.user.id),
          loadStockSummary(session.user.id)
        ])
        setPortfolioSummary(summaryData)
        setStockSummary(stockData)
      }
    } catch (err: any) {
      console.error('Error refreshing data:', err)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error loading dashboard</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Track your portfolio and financial goals</p>
        </div>

        {/* Portfolio Summary Cards */}
        {portfolioLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 border-l-4 border-gray-300">
                <div className="flex items-center">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-20 mb-2 animate-pulse"></div>
                    <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : portfolioSummary ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">MF Holdings</p>
                  <p className="text-2xl font-bold text-gray-900">{portfolioSummary.totalHoldings}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500 relative">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">MF Value</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(portfolioSummary.totalCurrentValue)}</p>
                  {latestNavDate && (
                    <p className="text-xs text-gray-500 mt-1">
                      Last updated: {new Date(latestNavDate).toLocaleDateString('en-IN')}
                    </p>
                  )}
                </div>
              </div>
              <div className="absolute top-2 right-2">
                <button
                  onClick={isNavUpToDateState ? undefined : handleNavRefresh}
                  disabled={isNavUpToDateState}
                  className={`p-2 rounded-full border border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                    isNavUpToDateState
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                      : 'bg-green-100 text-green-600 hover:bg-green-200 hover:text-green-700'
                  }`}
                  title={isNavUpToDateState ? 'NAV is up to date' : 'Refresh NAV'}
                  aria-label="Refresh NAV"
                >
                  <svg className={`w-5 h-5 ${!isNavUpToDateState ? 'hover:animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Stock Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stockLoading ? 'Loading...' : formatCurrency(stockSummary?.totalStockValue || 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* NPS Card */}
            <div className="bg-green-50 border-l-4 border-green-500 rounded-lg shadow p-6 flex-1 min-w-[250px] cursor-pointer hover:shadow-lg transition" onClick={() => router.push('/dashboard/nps')}>
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">NPS Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {npsLoading ? '...' : (npsValue !== null ? formatCurrency(npsValue) : '-')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Goals Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Financial Goals</h2>
            <button
              onClick={() => setShowGoalForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Goal
            </button>
          </div>

          {goalsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                  {/* Skeleton content */}
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                  <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                </div>
              ))}
            </div>
          ) : goals.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No goals yet</h3>
              <p className="text-gray-600 mb-4">Create your first financial goal to start tracking your progress.</p>
              <button
                onClick={() => setShowGoalForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Create Your First Goal
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {goals.map((goal) => {
                // Debug log for XIRR fields
                console.log('Goal XIRR debug:', goal.name, goal.formattedXIRR, goal.xirrPercentage, goal.xirr, goal.xirrConverged, goal.xirrError)
                return (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={handleGoalEdit}
                    onDelete={handleGoalDeleted}
                    onMappingChanged={handleMappingChanged}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Goal Form Modal */}
      {showGoalForm && (
        <GoalForm
          onGoalAdded={handleGoalAdded}
          onCancel={() => setShowGoalForm(false)}
        />
      )}
    </div>
  )
} 