'use client'

import { useState, useEffect, useRef } from 'react'
import GoalSimulatorForm, { SimulationFormData } from '@/components/GoalSimulatorForm'
import RequiredSIPCalculator from '@/components/RequiredSIPCalculator'
import GoalProjectionChart from '@/components/GoalProjectionChart'
import StepUpEffectChart from '@/components/StepUpEffectChart'
import SimulationSummaryTable from '@/components/SimulationSummaryTable'
import { calculateCorpusWithStepUp, adjustForInflation, formatIndianNumberWithSuffix, formatDuration } from '@/lib/goalSimulator'
import Link from 'next/link'

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

type SimulatorMode = 'future-value' | 'required-sip'

// Sample data for guest users
const GUEST_SAMPLE_DATA = {
  targetAmount: 1000000, // ₹10L example
  existingCorpus: 50000,  // ₹50K example
  monthlySIP: 10000,     // ₹10K example
  xirr: 12,              // 12% example
  stepUp: 0,             // 0% example
  months: 60             // 5 years example
}

export default function GuestGoalSimulatorPage() {
  const [activeTab, setActiveTab] = useState<SimulatorMode>('future-value')
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFormData, setLastFormData] = useState<SimulationFormData | null>(null)
  const [inflationAdjusted, setInflationAdjusted] = useState(false)
  const [showConversionPrompt, setShowConversionPrompt] = useState(false)
  const firstCardRef = useRef<HTMLDivElement>(null)

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
      setShowConversionPrompt(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Focus on first card when simulation completes
  useEffect(() => {
    if (simulationResult && firstCardRef.current) {
      setTimeout(() => {
        firstCardRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        })
        
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

  const handleFormChange = (formData: SimulationFormData) => {
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
    
    const xirrLevels = [base.xirr - 1, base.xirr, base.xirr + 1]
    const stepUpLevels = [0, 5, 10]
    
    xirrLevels.forEach(xirr => {
      stepUpLevels.forEach(stepUp => {
        const monthsToUse = base.targetAmount ? undefined : lastFormData.months
        
        const res = calculateCorpusWithStepUp(
          base.monthlySIP,
          xirr,
          stepUp,
          base.targetAmount,
          monthsToUse,
          lastFormData.existingCorpus
        )
        
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
    
    return scenarios.sort((a, b) => {
      if (a.xirr !== b.xirr) {
        return a.xirr - b.xirr
      }
      return a.stepUp - b.stepUp
    })
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Goal Simulator</h1>
        <p className="text-gray-600">
          Try our goal simulator with sample data. See how your investments could grow over time.
        </p>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-800">
                <Link href="/auth/signup" className="font-medium underline hover:text-blue-600 ml-1">
                  Create an account
                </Link> to set up your investment goals and get personalized insights.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('future-value')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'future-value'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Future Value Calculator
            </button>
            <button
              onClick={() => setActiveTab('required-sip')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'required-sip'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Required SIP Calculator
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'future-value' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Simulation Parameters</h2>
            <GoalSimulatorForm
              initialData={GUEST_SAMPLE_DATA}
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
        )}

        {activeTab === 'required-sip' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Required SIP Calculator</h2>
            <p className="text-gray-600 mb-4">
              Calculate the monthly SIP amount required to reach your target goal with different step-up scenarios.
            </p>
            <RequiredSIPCalculator
              initialData={GUEST_SAMPLE_DATA}
              onSubmit={() => {}} // No API call needed for this calculator
              onChange={() => {}} // No change handler needed
            />
          </div>
        )}
      </div>

      {/* Loading State - Only show for Future Value tab */}
      {activeTab === 'future-value' && isLoading && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Simulating goal...</span>
          </div>
        </div>
      )}

      {/* Error State - Only show for Future Value tab */}
      {activeTab === 'future-value' && error && (
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

      {/* Results - Only show for Future Value tab */}
      {activeTab === 'future-value' && simulationResult && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Simulation Results</h2>
          
          {/* Conversion Prompt */}
          {showConversionPrompt && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-blue-900 mb-2">
                    Ready to track your actual goals?
                  </h3>
                  <div className="text-blue-800 space-y-2">
                    <p className="text-sm">
                      <strong>🎯 Set up your goals:</strong> Create and track your real investment goals with progress monitoring
                    </p>
                    <p className="text-sm">
                      <strong>📊 Get personalized insights:</strong> See projections based on your actual portfolio data and investment patterns
                    </p>
                  </div>
                  <div className="mt-4 flex flex-col sm:flex-row gap-3">
                    <Link
                      href="/auth/signup"
                      className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Create Free Account
                    </Link>
                    <Link
                      href="/auth/login"
                      className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Sign In
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

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