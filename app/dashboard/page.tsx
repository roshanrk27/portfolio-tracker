'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { getPortfolioSummary, getGoals, getGoalMappings, getLatestNavDate, fetchGoalsWithDetails, batchCalculateXIRR } from '@/lib/portfolioUtils'
import GoalForm from '@/components/GoalForm'
import GoalCard from '@/components/GoalCard'
import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react';

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



interface GoalXirrResult {
  xirr: number;
  xirrPercentage: number;
  formattedXIRR: string;
  converged: boolean;
  error?: string;
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

async function getLatestNpsNavDate(): Promise<string | null> {
  const { data, error } = await supabase
    .from('nps_nav')
    .select('nav_date')
    .order('nav_date', { ascending: false })
    .limit(1)
    .single();
  
  if (error || !data) return null;
  return data.nav_date;
}

async function getStockSummary(userId: string): Promise<StockSummary> {
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

    // Convert stocks to Yahoo Finance symbols
    const yahooSymbols = stocks.map(stock => {
      const suffix = stock.exchange === 'NSE' ? '.NS' : 
                   stock.exchange === 'BSE' ? '.BO' : 
                   stock.exchange === 'NASDAQ' || stock.exchange === 'NYSE' ? '' : ''
      return stock.stock_code + suffix
    })

    // Get prices from stock_prices_cache using price_inr
    const { data: cachedPrices, error: cacheError } = await supabase
      .from('stock_prices_cache')
      .select('symbol, price_inr')
      .in('symbol', yahooSymbols)

    if (cacheError) {
      console.error('Error fetching cached prices:', cacheError)
      return {
        totalStocks: stocks.length,
        totalStockValue: 0,
        totalInvested: 0,
        totalReturn: 0,
        totalReturnPercentage: 0
      }
    }

    // Calculate total value using price_inr
    let totalStockValue = 0
    let totalInvested = 0

    for (const stock of stocks) {
      const yahooSymbol = stock.exchange === 'NSE' ? stock.stock_code + '.NS' : 
                         stock.exchange === 'BSE' ? stock.stock_code + '.BO' : 
                         stock.stock_code
      
      const cachedPrice = cachedPrices?.find(p => p.symbol === yahooSymbol)
      
      if (cachedPrice?.price_inr) {
        const currentValue = stock.quantity * cachedPrice.price_inr
        totalStockValue += currentValue
        // For now, use current value as invested amount since we don't track purchase price
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
  const [loading, setLoading] = useState(true)
  const [stockLoading, setStockLoading] = useState(true)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [latestNavDate, setLatestNavDate] = useState<string | null>(null)
  const [latestNpsNavDate, setLatestNpsNavDate] = useState<string | null>(null)
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
      const npsNavDate = await getLatestNpsNavDate();
      setLatestNpsNavDate(npsNavDate);
    };
    fetchSessionAndNavDate();
  }, [router]);

  // React Query for MF Value (Portfolio Summary)
  const {
    data: portfolioSummary,
    isLoading: portfolioLoadingRQ
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
    isLoading: npsLoading
  } = useQuery<number, Error>({
    queryKey: ['npsValue', userId, latestNavDate],
    queryFn: async () => {
      if (!userId || !latestNavDate) throw new Error('No user ID or NAV date');
      return await getNpsValue(userId);
    },
    enabled: !!userId && !!latestNavDate,
    staleTime: 1000 * 60 * 60 * 12, // 12 hours
  });

  // React Query for Goals with Details
  const {
    data: goals = [],
    isLoading: goalsLoading,
    refetch: refetchGoals
  } = useQuery<Goal[]>({
    queryKey: ['goals', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID');
      return await fetchGoalsWithDetails(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // React Query for XIRR calculations (separate cache for better performance)
  const {
    refetch: refetchXIRR
  } = useQuery<Record<string, GoalXirrResult>>({
    queryKey: ['xirr', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID');
      
      // Get basic goals and mappings
      const goalsData = await getGoals(userId);
      if (!goalsData || goalsData.length === 0) return {};
      
      const allMappings = await Promise.all(goalsData.map(goal => getGoalMappings(goal.id)));
      const xirrResults = await batchCalculateXIRR(userId, goalsData, allMappings);
      
      // Create a map of goal ID to XIRR data
      const xirrMap: Record<string, GoalXirrResult> = {};
      goalsData.forEach((goal, index) => {
        xirrMap[goal.id] = xirrResults[index];
      });
      
      return xirrMap;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 10, // 10 minutes for XIRR (less frequent updates)
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
      } else {
        setLoading(false)
      }
    }
    checkAuth()
  }, [router])

  const loadDashboardData = useCallback(async () => {
    console.log('[DEBUG_ROSHAN] loadDashboardData called')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setStockLoading(true)
      console.log('[DEBUG_ROSHAN_LOAD_STOCK_SUMMARY] loading stock data')
      const stockData = await getStockSummary(session.user.id)
      console.log('[DEBUG_ROSHAN_STOCK_SUMMARY] stockData:', stockData)
      setStockSummary(stockData)
      setStockLoading(false)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.log('[DEBUG_ROSHAN] error in loadDashboardData:', errorMessage)
      setStockLoading(false)
    }
  }, []);

  // useEffect for loading dashboard data when user is available
  useEffect(() => {
    if (userId) {
      console.log('[DEBUG_ROSHAN] user available, loading dashboard data')
      loadDashboardData()
    }
  }, [userId, loadDashboardData])

  const handleGoalAdded = async () => {
    setShowGoalForm(false)
    await Promise.all([refetchGoals(), refetchXIRR()])
  }

  const handleGoalDeleted = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId)

      if (error) {
        console.error('Error deleting goal:', error)
        return
      }

      // Refresh goals and XIRR data using React Query
      await Promise.all([refetchGoals(), refetchXIRR()])
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error in handleGoalDeleted:', errorMessage)
    }
  }

  const handleMappingChanged = async () => {
    try {
      // Refresh goals and XIRR data using React Query
      await Promise.all([refetchGoals(), refetchXIRR()])
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error in handleMappingChanged:', errorMessage)
    }
  }

  const handleGoalEdit = async (updatedGoal: Goal) => {
    try {
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
        return
      }

      // Refresh goals list using React Query (XIRR doesn't need refresh for goal edits)
      await refetchGoals()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error in handleGoalEdit:', errorMessage)
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

  // Removed unused handleNavRefresh function

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
                  <p className="text-xs text-gray-500 mt-1">
                    Delayed by 30 minutes
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
                  {latestNpsNavDate && (
                    <p className="text-xs text-gray-500 mt-1">
                      Last updated: {new Date(latestNpsNavDate).toLocaleDateString('en-IN')}
                    </p>
                  )}
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