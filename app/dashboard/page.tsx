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
  const [portfolioLoading, setPortfolioLoading] = useState(true)
  const [stockLoading, setStockLoading] = useState(true)
  const [goalsLoading, setGoalsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [latestNavDate, setLatestNavDate] = useState<string | null>(null)
  const [isNavUpToDateState, setIsNavUpToDateState] = useState(false)
  const [npsValue, setNpsValue] = useState<number | null>(null)
  const [npsLoading, setNpsLoading] = useState(true)
  const [stockPrices, setStockPrices] = useState<Record<string, number>>({})
  const router = useRouter()
  
//  console.log('[DEBUG_ROSHAN] Dashboard mounted')
  // Compute a stable dependency for mapped stocks
  const mappedStocksKey = JSON.stringify(
    goals
      .flatMap(goal => (goal.mappedStocks || []).map(stock => ({ symbol: stock.stock_code, exchange: stock.exchange })))
      .sort((a, b) => (a.symbol + a.exchange).localeCompare(b.symbol + b.exchange))
  )

  useEffect(() => {
 //   console.log('[DEBUG_ROSHAN] useEffect called')
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
      } else {
        setLoading(false)
        try {
          const [summaryData, goalsData] = await Promise.all([
            getPortfolioSummary(session.user.id),
            getGoals(session.user.id),
           // console.log('[DEBUG_ROSHAN] Goals & Summary collected:')
          ])

          // --- Batch fetch all mappings for all goals ---
          // 1. Gather all mappings for all goals
          const allMappings = await Promise.all(goalsData.map(goal => getGoalMappings(goal.id)))
          // 2. Collect all unique stock IDs and (scheme_name, folio) pairs
          const allStockIds: string[] = [];
          const allPortfolioPairs: { scheme_name: string; folio: string }[] = [];
          goalsData.forEach((goal, i) => {
            for (const mapping of allMappings[i]) {
              if (mapping.source_type === 'stock' && mapping.source_id) {
                allStockIds.push(mapping.source_id);
              } else if (mapping.source_type === 'mutual_fund') {
                allPortfolioPairs.push({ scheme_name: mapping.scheme_name, folio: mapping.folio || '' });
              }
            }
          });
         // console.log('[DEBUG_ROSHAN] All mappings collected:', allMappings)
          // Remove duplicates
          const uniqueStockIds = Array.from(new Set(allStockIds));
          const uniquePortfolioPairs = Array.from(new Set(allPortfolioPairs.map((p: { scheme_name: string; folio: string }) => `${p.scheme_name}|${p.folio}`)))
            .map((key: string) => {
              const [scheme_name, folio] = key.split('|');
              return { scheme_name, folio };
            });
          // 3. Batch fetch all stocks and portfolios
         // console.log('[DEBUG_ROSHAN] Fetching uniquestocks:', uniqueStockIds)
         // console.log('[DEBUG_ROSHAN] Fetching unique portfolios:', uniquePortfolioPairs)
          let stocks: any[] = [];
          if (uniqueStockIds.length > 0) {
            const { data } = await supabase
              .from('stocks')
              .select('*')
              .eq('user_id', session.user.id)
              .in('id', uniqueStockIds)
            stocks = data || [];
          }
          let portfolios: any[] = [];
          if (uniquePortfolioPairs.length > 0) {
            /* const orFilters = uniquePortfolioPairs
              .map(({ scheme_name, folio }: { scheme_name: string; folio: string }) =>
                `(scheme_name.eq.${scheme_name}&folio.eq.${folio})`
              )
              .join(',');*/
           /*   const orFilters = uniquePortfolioPairs
              .map(({ scheme_name, folio }) => {
                const safeScheme = `"${scheme_name.replace(/"/g, '\\"')}"`;
                const safeFolio = `"${folio.replace(/"/g, '\\"')}"`;
                return `(scheme_name.eq.${safeScheme}&folio.eq.${safeFolio})`;
              })
              .join(',');
              //console.log('[DEBUG_ROSHAN] orFilters:', orFilters);
            
            /*  const { data } = await supabase
              .from('current_portfolio')
              .select('scheme_name, folio, current_value')
              .eq('user_id', session.user.id)
              .or(orFilters)*/
              const { data } = await supabase
              .from('current_portfolio')
              .select('scheme_name, folio, current_value')
              .eq('user_id', session.user.id);
              if (error) {
                console.error('[SUPABASE ERROR]', error);
              } else {
                portfolios = data || [];
                //console.log('[DEBUG_ROSHAN] portfolios fetched:', portfolios);
              }
           // console.log('[DEBUG_ROSHAN] Portfolios:', portfolios.map(p => ({ scheme: p.scheme_name, folio: p.folio, value: p.current_value })));
          }
          // 4. For each goal, fetch XIRR and mutual fund value using pre-fetched data
          const goalsWithDetails = await Promise.all(goalsData.map(async (goal, i): Promise<Goal> => {
            const xirrData = await getGoalXIRR(goal.id)
            const mappings = allMappings[i]
            console.log('[DEBUG_ROSHAN] GoalID, mappings:', goal.id, mappings)
            let mutualFundValue = 0
            let mappedStocks: { stock_code: string; quantity: number; exchange: string; source_id: string }[] = [];
            let npsValue = 0
            for (const mapping of mappings) {
              if (mapping.source_type === 'mutual_fund') {
                // Use pre-fetched portfolios, match scheme_name and folio (with fallback to empty string), ignore case and trim
                const mappingScheme = (mapping.scheme_name || '').trim().toLowerCase();
                const mappingFolio = (mapping.folio || '').trim().toLowerCase();
                const portfolioData = portfolios.filter(
                  (p: any) =>
                    (p.scheme_name || '').trim().toLowerCase() === mappingScheme &&
                    ((p.folio || '').trim().toLowerCase() === mappingFolio)
                );
                const mfValue = (portfolioData || []).reduce((sum: number, item: any) => sum + (parseFloat(item.current_value || '0') || 0), 0);
                //console.log('[MF DEBUG]', { mapping, portfolioData, mfValue });
                mutualFundValue += mfValue;
              } else if (mapping.source_type === 'stock' && mapping.source_id) {
                // Use pre-fetched stocks
                const stockData = stocks.find((s: any) => s.id === mapping.source_id);
                if (stockData) {
                  //console.log('[DEBUG_ROSHAN_MAPPED_STOCKS] stockData:',i, stockData)
                  mappedStocks.push({
                    stock_code: stockData.stock_code,
                    quantity: stockData.quantity,
                    exchange: stockData.exchange,
                    source_id: stockData.id
                  })
                 // console.log('[DEBUG_ROSHAN_MAPPED_STOCKS] mapped stock:',i, mappedStocks)
                }
              } else if (mapping.source_type === 'nps') {
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
          setPortfolioLoading(false)
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

    // Fetch all unique mapped stock prices for all goals
    async function fetchAllMappedStockPrices() {
    //  console.log('[DEBUG_ROSHAN] fetchAllMappedStockPrices called')
      // Collect all unique mapped stocks from goals
      const uniqueStocks: { symbol: string; exchange: string }[] = []
      const seen = new Set<string>()
      for (const goal of goals) {
        if (goal.mappedStocks) {
          //console.log('[DEBUG_ROSHAN_MAPPED_STOCKS] mapped stocks found for goal:', goal.id, goal.mappedStocks)
          for (const stock of goal.mappedStocks) {
            const key = `${stock.stock_code}|${stock.exchange}`
            console.log('[DEBUG_ROSHAN_MAPPED_STOCKS] key:', key)
            if (!seen.has(key)) {
              seen.add(key)
              uniqueStocks.push({ symbol: stock.stock_code, exchange: stock.exchange })
            //  console.log('[DEBUG_ROSHAN_MAPPED_STOCKS] unique stock pushed:', stock.stock_code, stock.exchange)
            }
          }
        }
      }
     // console.log('[DEBUG_ROSHAN_MAPPED_STOCKS] unique stocks:', uniqueStocks)
      if (uniqueStocks.length === 0) {
        console.log('[DEBUG_ROSHAN_MAPPED_STOCKS] no unique stocks found')
        setStockPrices({})
        return {}
      }
      // Batch requests (max 5 per batch)
      const prices: Record<string, number> = {}
      for (let i = 0; i < uniqueStocks.length; i += 5) {
        const batch = uniqueStocks.slice(i, i + 5)
        try {
          const res = await fetch('/api/stock-prices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              symbols: batch.map(s => s.symbol),
              exchanges: batch.map(s => s.exchange === 'US' ? 'NASDAQ' : s.exchange)
            })
          })
          if (res.ok) {
            const data = await res.json()
            if (data.prices) {
              for (const [symbol, priceObjRaw] of Object.entries(data.prices)) {
                const priceObj = priceObjRaw as any;
                // Find the exchange for this symbol in the batch
                const idx = batch.findIndex(s => s.symbol === symbol)
                if (idx !== -1) {
                  const key = `${symbol}|${batch[idx].exchange}`
                  if (priceObj && typeof priceObj.price === 'number') {
                    prices[key] = priceObj.price
                  }
                }
              }
            }
          }
        } catch {}
      }
     // console.log('[DEBUG_ROSHAN_MAPPED_STOCKS] prices:', prices)
      setStockPrices(prices)
      return prices;
    }

 /*   if (goals.length > 0) {
      fetchAllMappedStockPrices()
    }*/

    const loadDashboardData = async (stockPricesOverride?: Record<string, number>) => {
      console.log('[DEBUG_ROSHAN] loadDashboardData called')
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        setStockLoading(true)
        console.log('[DEBUG_ROSHAN_LOAD_STOCK_SUMMARY] loading stock data')
        const stockData = await loadStockSummary(session.user.id, stockPricesOverride || stockPrices)
        console.log('[DEBUG_ROSHAN_STOCK_SUMMARY] stockData:', stockData)
        setStockSummary(stockData)
        setStockLoading(false)
      } catch (err: any) {
        setError(err.message)
        console.log('[DEBUG_ROSHAN] error in loadDashboardData:', err)
        setStockLoading(false)
      }
    }
  

   // loadDashboardData() 

    const loadData = async () => {
      if (goals.length > 0) {
        console.log('[DEBUG_ROSHAN] goals found, fetching stock prices> Goal Length:', goals.length)
        const prices = await fetchAllMappedStockPrices()  // Wait for this to complete and get prices
        console.log('[DEBUG_ROSHAN] stock prices fetched : ', prices)
        loadDashboardData(prices)
      } /*else {
        console.log('[DEBUG_ROSHAN] no goals found, loading dashboard data')
        loadDashboardData()
      } */             // Then call this with populated stockPrices
    }
    loadData()

  }, [mappedStocksKey])

  const loadStockSummary = async (userId: string, existingStockPrices?: Record<string, number>): Promise<StockSummary> => {
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

      // Use existing prices when available, fetch only missing ones
      for (const stock of stocks) {
        const key = `${stock.stock_code}|${stock.exchange}`
        let price = null
        
        // Check if we already have this price
        if (existingStockPrices && existingStockPrices[key]) {
          price = existingStockPrices[key]
          console.log('[DEBUG_ROSHAN_STOCK_SUMMARY] price exists for :', key, price)
        } else {
          // Only fetch if we don't have it
          try {
            console.log('[DEBUG_ROSHAN_STOCK_SUMMARY] fetching price for :', key)
            const response = await fetch(`/api/stock-prices?symbol=${stock.stock_code}&exchange=${stock.exchange === 'US' ? 'NASDAQ' : stock.exchange}`)
            if (response.ok) {
              const priceData = await response.json()
              if (priceData.success && priceData.price) {
                price = priceData.price
              }
            }
          } catch (err) {
            console.error(`Error fetching price for ${stock.stock_code}:`, err)
          }
        }
        
        if (price) {
          const currentValue = stock.quantity * price
          totalStockValue += currentValue
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
          loadStockSummary(session.user.id, stockPrices)
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* MF Value Card */}
          {portfolioLoading ? (
            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg shadow p-6 relative">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <div className="w-6 h-6 bg-blue-200 rounded animate-pulse"></div>
                </div>
                <div className="ml-4 flex-1">
                  <div className="h-4 bg-blue-200 rounded w-20 mb-2 animate-pulse"></div>
                  <div className="h-8 bg-blue-200 rounded w-24 animate-pulse"></div>
                  <div className="h-3 bg-blue-100 rounded w-24 mt-2 animate-pulse"></div>
                </div>
              </div>
              <div className="absolute top-2 right-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full animate-pulse" />
              </div>
            </div>
          ) : portfolioSummary ? (
            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg shadow p-6 relative">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className={`p-2 rounded-full border border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    isNavUpToDateState
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                      : 'bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700'
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
          ) : null}

          {/* Stock Value Card */}
          {stockLoading ? (
            <div className="bg-purple-50 border-l-4 border-purple-500 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <div className="w-6 h-6 bg-purple-200 rounded animate-pulse"></div>
                </div>
                <div className="ml-4 flex-1">
                  <div className="h-4 bg-purple-200 rounded w-20 mb-2 animate-pulse"></div>
                  <div className="h-8 bg-purple-200 rounded w-24 animate-pulse"></div>
                </div>
              </div>
            </div>
          ) : stockSummary ? (
            <div className="bg-purple-50 border-l-4 border-purple-500 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Stock Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stockLoading
                      ? <span className="inline-block w-16 h-6 bg-gray-200 rounded animate-pulse" />
                      : (typeof stockSummary?.totalStockValue === 'number'
                          ? formatCurrency(stockSummary.totalStockValue)
                          : '-')}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* NPS Value Card */}
          {npsLoading ? (
            <div className="bg-green-50 border-l-4 border-green-500 rounded-lg shadow p-6 flex-1 min-w-[250px]">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <div className="w-6 h-6 bg-green-200 rounded animate-pulse"></div>
                </div>
                <div className="ml-4 flex-1">
                  <div className="h-4 bg-green-200 rounded w-20 mb-2 animate-pulse"></div>
                  <div className="h-8 bg-green-200 rounded w-24 animate-pulse"></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border-l-4 border-green-500 rounded-lg shadow p-6 flex-1 min-w-[250px] cursor-pointer hover:shadow-lg transition" onClick={() => router.push('/dashboard/nps')}>
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  {/* Unique NPS icon: shield/retirement */}
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l8 4v5c0 5.25-3.5 9.75-8 11-4.5-1.25-8-5.75-8-11V7l8-4z" />
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
          )}
        </div>

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
                return (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    stockPrices={stockPrices}
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