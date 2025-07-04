'use client'

import { useState } from 'react'
import GoalSimulatorForm, { SimulationFormData } from '@/components/GoalSimulatorForm'
import GoalProjectionChart from '@/components/GoalProjectionChart'
import StepUpEffectChart from '@/components/StepUpEffectChart'
import SimulationSummaryTable from '@/components/SimulationSummaryTable'
import { calculateCorpusWithStepUp } from '@/lib/goalSimulator'

// Utility to format large numbers as 1K, 1M, 1B, etc.
function formatLargeNumber(n: number | undefined): string {
  if (typeof n !== 'number' || isNaN(n)) return '-'
  if (n >= 1_000_000_000) return `₹${(n / 1_000_000_000).toFixed(2)}B`
  if (n >= 1_000_000) return `₹${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`
  return `₹${n.toLocaleString('en-IN')}`
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
        const res = calculateCorpusWithStepUp(
          base.monthlySIP,
          xirr,
          stepUp,
          base.targetAmount
        )
        scenarios.push({
          xirr,
          sip: base.monthlySIP,
          stepUp,
          totalInvested: base.monthlySIP * res.months,
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Goal Simulator</h1>
        <p className="text-gray-600">
          Simulate your investment goals with different SIP amounts, expected returns, and step-up scenarios.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Simulation Parameters</h2>
        <GoalSimulatorForm
          onSubmit={handleSimulationSubmit}
          onChange={handleFormChange}
        />
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
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800">Final Corpus</h3>
              <div className="text-lg font-mono font-bold text-blue-900 text-center">
                {formatLargeNumber(simulationResult.summary.finalCorpus)}
              </div>
            </div>
            <div className="bg-cyan-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-cyan-800">Total Invested</h3>
              <div className="text-lg font-mono font-bold text-cyan-900 text-center">
                {formatLargeNumber(simulationResult.summary.totalInvested)}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-green-800">Total Months</h3>
              <div className="text-lg font-mono font-bold text-green-900 text-center">
                {simulationResult.summary.totalMonths}
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-purple-800">Monthly SIP</h3>
              <div className="text-lg font-mono font-bold text-purple-900 text-center">
                {formatLargeNumber(simulationResult.summary.monthlySIP)}
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
          />

          {/* Step-up vs Time-to-goal Chart */}
          {lastFormData && lastFormData.targetAmount && lastFormData.monthlySIP > 0 && lastFormData.xirr >= 0 && (
            <div className="mt-8">
              <StepUpEffectChart
                stepUpPercents={[0, 5, 10, 15, 20, 25, 30]}
                monthlySIP={lastFormData.monthlySIP}
                xirrPercent={lastFormData.xirr}
                targetAmount={lastFormData.targetAmount}
              />
            </div>
          )}

          {/* Simulation Scenario Table */}
          <div className="mt-8">
            <SimulationSummaryTable scenarios={getScenarios()} />
          </div>
        </div>
      )}
    </div>
  )
} 