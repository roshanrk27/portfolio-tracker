'use client'

import { adjustForInflation, formatIndianNumberWithSuffix } from '@/lib/goalSimulator'

// Utility to format large numbers as 1K, 1M, 1B, etc.
// function formatLargeNumber(n: number): string {
//   if (n >= 1_000_000_000) return `₹${(n / 1_000_000_000).toFixed(2)}B`
//   if (n >= 1_000_000) return `₹${(n / 1_000_000).toFixed(2)}M`
//   if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`
//   return `₹${n.toLocaleString('en-IN')}`
// }

interface SimulationScenario {
  xirr: number
  sip: number
  stepUp: number
  totalInvested: number
  goalDate: string
  finalCorpus: number
}

interface SimulationSummaryTableProps {
  scenarios: SimulationScenario[]
  title?: string
  inflationAdjusted?: boolean
}

export default function SimulationSummaryTable({ scenarios, title = 'Simulation Scenario Comparison', inflationAdjusted = false }: SimulationSummaryTableProps) {
  if (!scenarios || scenarios.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2zm0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Scenarios</h3>
        <p className="text-gray-600">Run or add simulation scenarios to compare results.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        {title}{inflationAdjusted ? ' (Inflation-Adjusted)' : ''}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th className="p-3 text-left font-semibold text-gray-700">XIRR (%)</th>
              <th className="p-3 text-left font-semibold text-gray-700">SIP (₹)</th>
              <th className="p-3 text-left font-semibold text-gray-700">Step-up (%)</th>
              <th className="p-3 text-left font-semibold text-gray-700">Total Invested (₹)</th>
              <th className="p-3 text-left font-semibold text-gray-700">Goal Date</th>
              <th className="p-3 text-left font-semibold text-gray-700">
                Final Corpus (₹){inflationAdjusted ? ' (Real)' : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s, i) => {
              // Calculate inflation-adjusted final corpus
              const months = Math.ceil((new Date(s.goalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))
              const realCorpus = inflationAdjusted ? adjustForInflation(s.finalCorpus, months, 6) : s.finalCorpus
              
              return (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-3 text-gray-900">{s.xirr.toFixed(2)}</td>
                  <td className="p-3 text-gray-900">{formatIndianNumberWithSuffix(s.sip)}</td>
                  <td className="p-3 text-gray-900">{s.stepUp}%</td>
                  <td className="p-3 text-gray-900">{formatIndianNumberWithSuffix(s.totalInvested)}</td>
                  <td className="p-3 text-gray-900">{s.goalDate}</td>
                  <td className="p-3 font-semibold text-blue-900">
                    {formatIndianNumberWithSuffix(realCorpus)}
                    {inflationAdjusted && <span className="text-xs text-gray-500 ml-1">(Real)</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
} 