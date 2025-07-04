'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { getPortfolioSummary, getGoals, getGoalXIRR, getGoalMappings, getLatestNavDate } from '@/lib/portfolioUtils'
import GoalForm from '@/components/GoalForm'
import GoalCard from '@/components/GoalCard'
import { useQuery } from '@tanstack/react-query'



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

interface Stock {
  id: string
  stock_code: string
  quantity: number
  exchange: string
  user_id: string
}

interface PortfolioQueryResult {
  scheme_name: string
  folio: string
  current_value: string
}

interface NpsHoldingQueryResult {
  id: string
  fund_code: string
  units: string
}

interface NpsNav {
  fund_code: string
  nav: string
}

interface PriceData {
  price: number
  currency: string
  exchangeRate?: number
  originalPrice?: number
  originalCurrency?: string
  error?: string
}

async function getNpsValue(userId: string): Promise<number> {
  // Fetch holdings
  const { data: holdings, error: holdingsError } = await supabase
    .from('nps_holdings')
    .select('id, fund_code, units')
    .eq('user_id', userId);
  if (holdingsError) throw holdingsError;
  // Fetch NAVs
  const { data: navs, error: navsError } = await supabase
    .from('nps_nav')
    .select('fund_code, nav');
  if (navsError) throw navsError;
  const navMap: Record<string, number> = {};
  for (const row of navs || []) {
    navMap[row.fund_code] = parseFloat(row.nav);
  }
  let total = 0;
  for (const h of holdings || []) {
    const nav = navMap[h.fund_code] || 0;
    total += nav * (parseFloat(h.units) || 0);
  }
  return total;
}

async function getStockSummary(userId: string, stockPrices?: Record<string, number>): Promise<StockSummary> {
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

    // Use cached prices only - no individual fetching
    for (const stock of stocks) {
      // Match the key format used in React Query (US -> NASDAQ conversion)
      const exchangeForKey = stock.exchange === 'US' ? 'NASDAQ' : stock.exchange
      const key = `${stock.stock_code}|${exchangeForKey}`
      const price = stockPrices?.[key]
      
      if (price) {
        const currentValue = stock.quantity * price
        totalStockValue += currentValue
        // For now, use current value as invested amount since we don't have purchase price
        // In a real implementation, you'd want to track purchase price separately
        totalInvested += currentValue
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
    console.error('Error in getStockSummary:', err)
    return {
      totalStocks: 0,
      totalStockValue: 0,
      totalInvested: 0,
      totalReturn: 0,
      totalReturnPercentage: 0
    }
  }
}

export default function Dashboard() {
  const [stockSummary, setStockSummary] = useState<StockSummary | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [stockLoading, setStockLoading] = useState(true)
  const [goalsLoading, setGoalsLoading] = useState(true)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [latestNavDate, setLatestNavDate] = useState<string | null>(null)
  const router = useRouter()
  
  // Fetch user session and NAV date for cache key
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessionAndNavDate = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }
      setUserId(session.user.id);
      const navDate = await getLatestNavDate();
      setLatestNavDate(navDate);
    };
    fetchSessionAndNavDate();
  }, [router]);

  // React Query for MF Value (Portfolio Summary)
  const {
    data: portfolioSummary,
    isLoading: portfolioLoadingRQ,
    refetch: refetchPortfolioSummary
  } = useQuery({
    queryKey: ['portfolioSummary', userId, latestNavDate],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID');
      return await getPortfolioSummary(userId);
    },
    enabled: !!userId && !!latestNavDate,
    staleTime: 1000 * 60 * 60 * 12, // 12 hours
  });

  // Use React Query loading/error states for MF value
  const portfolioLoading = portfolioLoadingRQ || !latestNavDate;

  // React Query for NPS Value
  const {
    data: npsValue,
    isLoading: npsLoading,
    refetch: refetchNpsValue
  } = useQuery<number, Error>({
    queryKey: ['npsValue', userId, latestNavDate],
    queryFn: async () => {
      if (!userId || !latestNavDate) throw new Error('No user ID or NAV date');
      return await getNpsValue(userId);
    },
    enabled: !!userId && !!latestNavDate,
    staleTime: 1000 * 60 * 60 * 12, // 12 hours
  });

  // React Query for Stock Prices (Dashboard)
  const {
    data: dashboardStockPrices = {},
    isLoading: dashboardStockPricesLoading,
    refetch: refetchDashboardStockPrices
  } = useQuery<Record<string, number>>({
    queryKey: ['dashboardStockPrices', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID');
      
      // Get all stocks for the user
      const { data: stocks, error } = await supabase
        .from('stocks')
        .select('*')
        .eq('user_id', userId)
      
      if (error || !stocks || stocks.length === 0) {
        return {}
      }

      // Collect unique stocks for batch fetching
      const uniqueStocks: { symbol: string; exchange: string }[] = []
      const seen = new Set<string>()
      
      for (const stock of stocks) {
        const key = `${stock.stock_code}|${stock.exchange}`
        if (!seen.has(key)) {
          seen.add(key)
          uniqueStocks.push({ 
            symbol: stock.stock_code, 
            exchange: stock.exchange === 'US' ? 'NASDAQ' : stock.exchange 
          })
        }
      }

      if (uniqueStocks.length === 0) {
        return {}
      }

      // Batch fetch prices (max 5 per batch)
      const prices: Record<string, number> = {}
      for (let i = 0; i < uniqueStocks.length; i += 5) {
        const batch = uniqueStocks.slice(i, i + 5)
        try {
          const res = await fetch('/api/stock-prices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              symbols: batch.map(s => s.symbol),
              exchanges: batch.map(s => s.exchange)
            })
          })
          
          if (res.ok) {
            const data = await res.json()
            if (data.prices) {
              for (const [symbol, priceObjRaw] of Object.entries(data.prices)) {
                const priceObj = priceObjRaw as PriceData
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
        } catch (err) {
          console.error('Error fetching stock prices:', err)
        }
      }
      
      return prices
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes for prices
    refetchOnWindowFocus: false,
  });





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
            getGoals(session.user.id),
          ])

          // --- Batch fetch all mappings for all goals ---
          // 1. Gather all mappings for all goals
          const allMappings = await Promise.all(goalsData.map(goal => getGoalMappings(goal.id)))
          // 2. Collect all unique stock IDs, (scheme_name, folio) pairs, and NPS holding IDs
          const allStockIds: string[] = [];
          const allPortfolioPairs: { scheme_name: string; folio: string }[] = [];
          const allNpsIds: string[] = [];
          goalsData.forEach((goal, i) => {
            for (const mapping of allMappings[i]) {
              if (mapping.source_type === 'stock' && mapping.source_id) {
                allStockIds.push(mapping.source_id);
              } else if (mapping.source_type === 'mutual_fund') {
                allPortfolioPairs.push({ scheme_name: mapping.scheme_name, folio: mapping.folio || '' });
              } else if (mapping.source_type === 'nps' && mapping.source_id) {
                allNpsIds.push(mapping.source_id);
              }
            }
          });
          // Remove duplicates
          const uniqueStockIds = Array.from(new Set(allStockIds));
          const uniquePortfolioPairs = Array.from(new Set(allPortfolioPairs.map((p: { scheme_name: string; folio: string }) => `${p.scheme_name}|${p.folio}`)))
            .map((key: string) => {
              const [scheme_name, folio] = key.split('|');
              return { scheme_name, folio };
            });
          const uniqueNpsIds = Array.from(new Set(allNpsIds));
          // 3. Batch fetch all stocks, portfolios, and NPS holdings
          let stocks: Stock[] = [];
          if (uniqueStockIds.length > 0) {
            const { data } = await supabase
              .from('stocks')
              .select('*')
              .eq('user_id', session.user.id)
              .in('id', uniqueStockIds)
            stocks = data || [];
          }
          let portfolios: PortfolioQueryResult[] = [];
          if (uniquePortfolioPairs.length > 0) {
            const { data } = await supabase
              .from('current_portfolio')
              .select('scheme_name, folio, current_value')
              .eq('user_id', session.user.id);
            portfolios = data || [];
          }
          let npsHoldings: NpsHoldingQueryResult[] = [];
          if (uniqueNpsIds.length > 0) {
            const { data } = await supabase
              .from('nps_holdings')
              .select('id, fund_code, units')
              .eq('user_id', session.user.id)
              .in('id', uniqueNpsIds);
            npsHoldings = data || [];
          }
          // Fetch all needed NAVs for NPS holdings
          let npsNavs: NpsNav[] = [];
          if (npsHoldings.length > 0) {
            const fundCodes = Array.from(new Set(npsHoldings.map((h: NpsHoldingQueryResult) => h.fund_code)));
            if (fundCodes.length > 0) {
              const { data } = await supabase
                .from('nps_nav')
                .select('fund_code, nav')
                .in('fund_code', fundCodes);
              npsNavs = data || [];
            }
          }
          const npsNavMap: Record<string, number> = {};
          for (const nav of npsNavs) {
            npsNavMap[nav.fund_code] = parseFloat(nav.nav);
          }
          // 4. For each goal, fetch XIRR and mutual fund value using pre-fetched data
          const goalsWithDetails = await Promise.all(goalsData.map(async (goal, i): Promise<Goal> => {
            const xirrData = await getGoalXIRR(goal.id)
            const mappings = allMappings[i]
            console.log('[DEBUG_ROSHAN] GoalID, mappings:', goal.id, mappings)
            let mutualFundValue = 0
            const mappedStocks: { stock_code: string; quantity: number; exchange: string; source_id: string }[] = [];
            let npsValue = 0
            for (const mapping of mappings) {
              if (mapping.source_type === 'mutual_fund') {
                // Use pre-fetched portfolios, match scheme_name and folio (with fallback to empty string), ignore case and trim
                const mappingScheme = (mapping.scheme_name || '').trim().toLowerCase();
                const mappingFolio = (mapping.folio || '').trim().toLowerCase();
                const portfolioData = portfolios.filter(
                  (p: PortfolioQueryResult) =>
                    (p.scheme_name || '').trim().toLowerCase() === mappingScheme &&
                    ((p.folio || '').trim().toLowerCase() === mappingFolio)
                );
                const mfValue = (portfolioData || []).reduce((sum: number, item: PortfolioQueryResult) => sum + (parseFloat(item.current_value || '0') || 0), 0);
                mutualFundValue += mfValue;
              } else if (mapping.source_type === 'stock' && mapping.source_id) {
                // Use pre-fetched stocks
                const stockData = stocks.find((s: Stock) => s.id === mapping.source_id);
                if (stockData) {
                  mappedStocks.push({
                    stock_code: stockData.stock_code,
                    quantity: stockData.quantity,
                    exchange: stockData.exchange,
                    source_id: stockData.id
                  })
                }
              } else if (mapping.source_type === 'nps' && mapping.source_id) {
                // Use pre-fetched npsHoldings and npsNavMap
                const nps = npsHoldings.find((h: NpsHoldingQueryResult) => h.id === mapping.source_id);
                if (nps) {
                  const nav = npsNavMap[nps.fund_code] || 0;
                  npsValue += nav * (parseFloat(nps.units) || 0);
                }
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
          setGoals(goalsWithDetails)
          setGoalsLoading(false)
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error'
          console.error('Error in checkAuth:', errorMessage)
        }
      }
    }
    checkAuth()

  }, [router])

  // Fetch all unique mapped stock prices for all goals


  const loadDashboardData = async (stockPricesOverride?: Record<string, number>) => {
    console.log('[DEBUG_ROSHAN] loadDashboardData called')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setStockLoading(true)
      console.log('[DEBUG_ROSHAN_LOAD_STOCK_SUMMARY] loading stock data')
      const stockData = await getStockSummary(session.user.id, stockPricesOverride || dashboardStockPrices)
      console.log('[DEBUG_ROSHAN_STOCK_SUMMARY] stockData:', stockData)
      setStockSummary(stockData)
      setStockLoading(false)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.log('[DEBUG_ROSHAN] error in loadDashboardData:', errorMessage)
      setStockLoading(false)
    }
  }

  // useEffect for loading dashboard data when stock prices are available
  useEffect(() => {
    if (dashboardStockPricesLoading === false) {
      console.log('[DEBUG_ROSHAN] stock prices loaded, updating dashboard data')
      loadDashboardData()
    }
  }, [dashboardStockPricesLoading, dashboardStockPrices])

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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error in handleGoalDeleted:', errorMessage)
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error in handleMappingChanged:', errorMessage)
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error in handleGoalEdit:', errorMessage)
      setGoalsLoading(false)
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



  const handleNavRefresh = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await refetchPortfolioSummary(); // Invalidate and refetch MF value
        await refetchNpsValue(); // Invalidate and refetch NPS value
        await refetchDashboardStockPrices(); // Invalidate and refetch stock prices
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error refreshing data:', errorMessage);
    }
  };

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
                  onClick={handleNavRefresh}
                  className="p-2 rounded-full border border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700"
                  title="Refresh NAV"
                  aria-label="Refresh NAV"
                >
                  <svg className="w-5 h-5 hover:animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
          ) : null}

          {/* Stock Value Card */}
          {stockLoading || dashboardStockPricesLoading ? (
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
                    {npsLoading ? '...' : (typeof npsValue === 'number' ? formatCurrency(npsValue) : '-')}
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
                    stockPrices={dashboardStockPrices}
                    stockPricesLoading={dashboardStockPricesLoading}
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