'use client'

import { useState, useEffect, useRef } from 'react'
import GoalSimulatorForm, { SimulationFormData } from '@/components/GoalSimulatorForm'
import GoalProjectionChart from '@/components/GoalProjectionChart'
import StepUpEffectChart from '@/components/StepUpEffectChart'
import SimulationSummaryTable from '@/components/SimulationSummaryTable'
import { calculateCorpusWithStepUp, adjustForInflation, formatIndianNumberWithSuffix, formatDuration } from '@/lib/goalSimulator'
//import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { supabase } from '@/lib/supabaseClient'
import { getGoals, getAverageMonthlyInvestmentByGoal, getGoalWithProgress } from '@/lib/portfolioUtils'

// Utility to format large numbers as 1K, 1M, 1B, etc.
// function formatLargeNumber(n: number | undefined): string {
//   if (typeof n !== 'number' || isNaN(n)) return '-'
//   if (n >= 1_000_000_000) return `₹${(n / 1_000_000_000).toFixed(2)}B`
//   if (n >= 1_000_000) return `₹${(n / 1_000_000).toFixed(2)}M`
//   if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`
//   return `₹${n.toLocaleString('en-IN')}`
// }

interface Goal {
  id: string
  name: string
  target_amount: number
  current_amount: number
}

interface SimulationResult {
  projection: Array<{
    date: string
    corpus: number
    months: number
  }>
  summary: {
    finalCorpus: number
    totalMonths: number
    monthlySIP: number
    xirr: number
    stepUp: number
    targetAmount?: number
    goalId?: string
    totalInvested: number
  }
}

export default function GoalSimulatorPage() {
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFormData, setLastFormData] = useState<SimulationFormData | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [selectedGoalId, setSelectedGoalId] = useState<string>('')
  const [isLoadingGoals, setIsLoadingGoals] = useState(false)
  const [isLoadingGoalData, setIsLoadingGoalData] = useState(false)
  const [formInitialData, setFormInitialData] = useState<{
    monthlySIP?: number
    xirr?: number
    stepUp?: number
    targetAmount?: number
    existingCorpus?: number
  } | undefined>(undefined)
  const [inflationAdjusted, setInflationAdjusted] = useState(false)
  const [isPageLoading, setIsPageLoading] = useState(true)
  const firstCardRef = useRef<HTMLDivElement>(null)
  // const supabase = createClientComponentClient()

  const handleSimulationSubmit = async (formData: SimulationFormData) => {
    setIsLoading(true)
    setError(null)
    setSimulationResult(null)
    setLastFormData(formData)

    try {
      const response = await fetch('/api/simulate-goal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to simulate goal')
      }

      const result = await response.json()
      setSimulationResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Focus on first card when simulation completes
  useEffect(() => {
    if (simulationResult && firstCardRef.current) {
      // Add a small delay to ensure the DOM is updated
      setTimeout(() => {
        firstCardRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        })
        
        // Add a brief highlight effect
        if (firstCardRef.current) {
          firstCardRef.current.style.transition = 'box-shadow 0.3s ease'
          firstCardRef.current.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.3)'
          setTimeout(() => {
            if (firstCardRef.current) {
              firstCardRef.current.style.boxShadow = ''
            }
          }, 1000)
        }
      }, 100)
    }
  }, [simulationResult])

  // Fetch user goals
  useEffect(() => {
    const fetchGoals = async () => {
      setIsLoadingGoals(true)
      try {
        // Get user directly
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.id) {
          console.log('FETCH_GOALS No user found')
          setIsLoadingGoals(false)
          setIsPageLoading(false)
          return
        }

        const userId = user.id
        console.log('Using user ID from getUser:', userId)

        // Use the existing getGoals function from portfolioUtils
        const goalsData = await getGoals(userId)
        console.log('Fetched goals using getGoals:', goalsData)
        console.log('Goals count:', goalsData?.length || 0)
        
        // Transform the data to match our interface
        const transformedGoals = goalsData.map(goal => ({
          id: goal.id,
          name: goal.name,
          target_amount: goal.target_amount,
          current_amount: goal.current_amount || 0
        }))

        // Add a test goal if no goals are found
        if (transformedGoals.length === 0) {
          console.log('No goals found, adding test goal')
          transformedGoals.push({
            id: 'test-goal-1',
            name: 'Test Goal',
            target_amount: 1000000,
            current_amount: 50000
          })
        }

        console.log('Final goals array:', transformedGoals)
        setGoals(transformedGoals)
      } catch (error) {
        console.error('Error fetching goals:', error)
      } finally {
        setIsLoadingGoals(false)
        setIsPageLoading(false)
      }
    }

    fetchGoals()
  }, [])

  const handleGoalSelect = async (goalId: string) => {
    console.log('Goal selected:', goalId)
    setSelectedGoalId(goalId)
    
    // If a goal is selected, populate the form with goal data
    if (goalId) {
      setIsLoadingGoalData(true)
      try {
        console.log('Fetching goal with progress for ID:', goalId)
        // Get goal with progress (MF only for now)
        const goalWithProgress = await getGoalWithProgress(goalId)
        console.log('Goal with progress result:', goalWithProgress)
        if (goalWithProgress) {
          // Get average monthly investment for this goal
          const avgMonthlySIP = await getAverageMonthlyInvestmentByGoal(goalId)
          
          // Create initial data for the form
          const initialData = {
            targetAmount: goalWithProgress.target_amount,
            existingCorpus: goalWithProgress.current_amount, // Includes MF only
            monthlySIP: avgMonthlySIP, // Use average monthly SIP
            xirr: 12, // Default XIRR
            stepUp: 0, // Default step-up
          }
          
          // Log the breakdown for debugging
          console.log('Goal corpus breakdown:', {
            total: goalWithProgress.current_amount,
            target: goalWithProgress.target_amount
          })
          
          // Set the initial data for the form
          setFormInitialData(initialData)
        }
      } catch (error) {
        console.error('Error fetching goal data:', error)
        // Fallback to basic goal data
        const selectedGoal = goals.find(goal => goal.id === goalId)
        if (selectedGoal) {
          const initialData = {
            targetAmount: selectedGoal.target_amount,
            existingCorpus: selectedGoal.current_amount,
            monthlySIP: 0,
            xirr: 12,
            stepUp: 0,
          }
          setFormInitialData(initialData)
        }
      } finally {
        setIsLoadingGoalData(false)
      }
    } else {
      // Clear initial data when no goal is selected
      setFormInitialData(undefined)
      setIsLoadingGoalData(false)
    }
  }

  const handleFormChange = (formData: SimulationFormData) => {
    // Optional: Handle real-time form changes
    // Save for use in StepUpEffectChart
    setLastFormData(formData)
  }

  // Generate what-if scenarios for the summary table
  const getScenarios = () => {
    if (!simulationResult || !lastFormData) return []
    const base = simulationResult.summary
    
    interface Scenario {
      xirr: number
      sip: number
      stepUp: number
      totalInvested: number
      goalDate: string
      finalCorpus: number
    }
    
    const scenarios: Scenario[] = []
    
    // Generate 9 scenarios: 3 XIRR levels (base-1%, base, base+1%) × 3 step-up levels (0%, 5%, 10%)
    const xirrLevels = [base.xirr - 1, base.xirr, base.xirr + 1]
    const stepUpLevels = [0, 5, 10]
    
    xirrLevels.forEach(xirr => {
      stepUpLevels.forEach(stepUp => {
        // If target amount is provided, ignore duration and calculate months needed
        // If no target amount, use the provided duration
        const monthsToUse = base.targetAmount ? undefined : lastFormData.months
        
        const res = calculateCorpusWithStepUp(
          base.monthlySIP,
          xirr,
          stepUp,
          base.targetAmount,
          monthsToUse,
          lastFormData.existingCorpus
        )
        
        // Calculate total invested with step-up
        let totalInvested = 0
        let currentSIP = base.monthlySIP
        const stepUpRate = stepUp / 100
        
        for (let m = 0; m < res.months; m++) {
          if (m > 0 && m % 12 === 0) {
            currentSIP *= (1 + stepUpRate)
          }
          totalInvested += currentSIP
        }
        
        scenarios.push({
          xirr,
          sip: base.monthlySIP,
          stepUp,
          totalInvested: Math.round(totalInvested),
          goalDate: new Date(Date.now() + res.months * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' }),
          finalCorpus: res.corpus,
        })
      })
    })
    
    // Sort by XIRR first, then by step-up % in ascending order
    return scenarios.sort((a, b) => {
      if (a.xirr !== b.xirr) {
        return a.xirr - b.xirr
      }
      return a.stepUp - b.stepUp
    })
  }

  // Page loading skeleton
  if (isPageLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
        </div>
        
        {/* Goal Selector Skeleton */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="h-6 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Form Skeleton */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="h-6 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Goal Simulator</h1>
        <p className="text-gray-600">
          Simulate your investment goals with different SIP amounts, expected returns, and step-up scenarios.
        </p>
      </div>

      {/* Goal Selector */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Goal (Optional)</h2>
        <div className="mb-4">
          <label htmlFor="goalSelect" className="block text-sm font-medium text-gray-700 mb-2">
            Choose a goal to prefill simulation data
          </label>
          <div className="relative">
            <select
              id="goalSelect"
              value={selectedGoalId}
              onChange={(e) => handleGoalSelect(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoadingGoals}
            >
              <option value="">-- Select a goal or start fresh --</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.name} (Target: ₹{goal.target_amount.toLocaleString()})
                </option>
              ))}
            </select>
            {isLoadingGoalData && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
              </div>
            )}
          </div>
          {isLoadingGoals && (
            <div className="mt-2 flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
              <p className="text-sm text-gray-500">Loading goals...</p>
            </div>
          )}
          {!isLoadingGoals && goals.length === 0 && (
            <p className="mt-2 text-sm text-gray-500">No goals found. Create a goal first to use this feature.</p>
          )}
          {!isLoadingGoals && goals.length > 0 && (
            <p className="mt-2 text-sm text-green-600">Found {goals.length} goal(s)</p>
          )}
          {isLoadingGoalData && (
            <div className="mt-2 flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
              <p className="text-sm text-gray-500">Loading goal data...</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Simulation Parameters</h2>
        <GoalSimulatorForm
          goalId={selectedGoalId}
          initialData={formInitialData}
          onSubmit={handleSimulationSubmit}
          onChange={handleFormChange}
        />
        
        {/* Inflation Adjustment Toggle */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <label htmlFor="inflationToggle" className="text-sm font-medium text-gray-700">
                Show Inflation-Adjusted Values
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="inflationToggle"
                  checked={inflationAdjusted}
                  onChange={(e) => setInflationAdjusted(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-xs text-gray-500">(6% annual inflation)</span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Adjusts values for purchasing power over time
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Simulating goal...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Simulation Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {simulationResult && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Simulation Results</h2>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div ref={firstCardRef} className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800">
                Final Corpus{inflationAdjusted ? ' (Real)' : ''}
              </h3>
              <div className="text-lg font-mono font-bold text-blue-900 text-center">
                {formatIndianNumberWithSuffix(
                  inflationAdjusted
                    ? adjustForInflation(
                        simulationResult.summary.finalCorpus,
                        simulationResult.summary.totalMonths,
                        6
                      )
                    : simulationResult.summary.finalCorpus
                )}
              </div>
            </div>
            <div className="bg-cyan-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-cyan-800">Total Invested</h3>
              <div className="text-lg font-mono font-bold text-cyan-900 text-center">
                {formatIndianNumberWithSuffix(simulationResult.summary.totalInvested)}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-green-800">Duration</h3>
              <div className="text-lg font-mono font-bold text-green-900 text-center">
                {formatDuration(simulationResult.summary.totalMonths)}
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-purple-800">Monthly SIP</h3>
              <div className="text-lg font-mono font-bold text-purple-900 text-center">
                {formatIndianNumberWithSuffix(simulationResult.summary.monthlySIP)}
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-orange-800">Expected XIRR</h3>
              <div className="text-lg font-mono font-bold text-orange-900 text-center">
                {simulationResult.summary.xirr}%
              </div>
            </div>
          </div>

          {/* Projection Chart */}
          <GoalProjectionChart 
            data={simulationResult.projection} 
            title="Corpus Projection Over Time"
            totalInvested={simulationResult.summary.totalInvested}
            inflationAdjusted={inflationAdjusted}
          />

          {/* Step-up vs Time-to-goal Chart */}
          {lastFormData && lastFormData.targetAmount && lastFormData.monthlySIP > 0 && lastFormData.xirr >= 0 && (
            <div className="mt-8">
              <StepUpEffectChart
                stepUpPercents={[0, 5, 10, 15, 20, 25, 30]}
                monthlySIP={lastFormData.monthlySIP}
                xirrPercent={lastFormData.xirr}
                targetAmount={lastFormData.targetAmount}
                existingCorpus={lastFormData.existingCorpus}
                inflationAdjusted={inflationAdjusted}
              />
            </div>
          )}

          {/* Simulation Scenario Table */}
          <div className="mt-8">
            <SimulationSummaryTable scenarios={getScenarios()} inflationAdjusted={inflationAdjusted} />
          </div>
        </div>
      )}
    </div>
  )
} 