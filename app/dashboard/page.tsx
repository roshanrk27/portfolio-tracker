'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { getPortfolioSummary, getGoalsWithProgress, getPortfolioXIRR, getGoalsWithProgressAndXIRR } from '@/lib/portfolioUtils'
import GoalForm from '@/components/GoalForm'
import GoalCard from '@/components/GoalCard'

interface PortfolioSummary {
  totalHoldings: number
  totalInvested: number
  totalCurrentValue: number
  totalReturn: number
  totalReturnPercentage: number
  totalNavValue: number
  entriesWithNav: number
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
}

export default function Dashboard() {
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [portfolioXIRR, setPortfolioXIRR] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [portfolioLoading, setPortfolioLoading] = useState(false)
  const [goalsLoading, setGoalsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
      } else {
        setLoading(false)
        loadDashboardData(session.user.id)
      }
    }

    checkAuth()
  }, [router])

  const loadDashboardData = async (userId: string) => {
    try {
      setPortfolioLoading(true)
      setGoalsLoading(true)
      
      // Load portfolio data first (faster)
      const [summaryData, xirrData] = await Promise.all([
        getPortfolioSummary(userId),
        getPortfolioXIRR(userId)
      ])
      
      setPortfolioSummary(summaryData)
      setPortfolioXIRR(xirrData)
      setPortfolioLoading(false)
      
      // Load goals data (slower due to XIRR calculations)
      const goalsData = await getGoalsWithProgressAndXIRR(userId)
      setGoals(goalsData)
      setGoalsLoading(false)
    } catch (err: any) {
      setError(err.message)
      setPortfolioLoading(false)
      setGoalsLoading(false)
    }
  }

  const handleGoalAdded = async () => {
    setShowGoalForm(false)
    setGoalsLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const goalsData = await getGoalsWithProgressAndXIRR(session.user.id)
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
        const goalsData = await getGoalsWithProgressAndXIRR(session.user.id)
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
        const goalsData = await getGoalsWithProgressAndXIRR(session.user.id)
        setGoals(goalsData)
        setGoalsLoading(false)
      }
    } catch (err: any) {
      console.error('Error in handleMappingChanged:', err)
      setGoalsLoading(false)
    }
  }

  const handleGoalEdit = async (updatedGoal: Goal) => {
    setGoalsLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { error } = await supabase
        .from('goals')
        .update({
          target_amount: updatedGoal.target_amount,
          target_date: updatedGoal.target_date
        })
        .eq('id', updatedGoal.id)
        .eq('user_id', session.user.id)
      if (error) {
        setError(error.message)
        setGoalsLoading(false)
        return
      }
      const goalsData = await getGoalsWithProgressAndXIRR(session.user.id)
      setGoals(goalsData)
      setGoalsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
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
                  <p className="text-sm font-medium text-gray-600">Total Holdings</p>
                  <p className="text-2xl font-bold text-gray-900">{portfolioSummary.totalHoldings}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Current Value</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(portfolioSummary.totalCurrentValue)}</p>
                </div>
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
                  <p className="text-sm font-medium text-gray-600">Total Return</p>
                  <p className={`text-2xl font-bold ${portfolioSummary.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(portfolioSummary.totalReturn)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-500">
              <div className="flex items-center">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Portfolio XIRR</p>
                  <p className={`text-2xl font-bold ${portfolioXIRR?.xirrPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {portfolioXIRR?.formattedXIRR || 'Calculating...'}
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
                  {/* Header skeleton */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                    </div>
                    <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                  </div>
                  
                  {/* Progress bar skeleton */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="h-2 bg-gray-300 rounded-full w-1/3 animate-pulse"></div>
                    </div>
                  </div>
                  
                  {/* Financial summary skeleton */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-20 mb-2 animate-pulse"></div>
                      <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                    </div>
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-20 mb-2 animate-pulse"></div>
                      <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                    </div>
                  </div>
                  
                  {/* XIRR skeleton */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
                    </div>
                  </div>
                  
                  {/* Date and status skeleton */}
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-16 mb-1 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                    </div>
                    <div className="text-right">
                      <div className="h-4 bg-gray-200 rounded w-20 mb-1 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                    </div>
                  </div>
                  
                  {/* Button skeleton */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
                  </div>
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
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={handleGoalEdit}
                  onDelete={handleGoalDeleted}
                  onMappingChanged={handleMappingChanged}
                />
              ))}
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