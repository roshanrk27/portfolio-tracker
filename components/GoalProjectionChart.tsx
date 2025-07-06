'use client'

import { adjustForInflation } from '@/lib/goalSimulator'

interface ProjectionPoint {
  date: string
  corpus: number
  months: number
}

interface GoalProjectionChartProps {
  data: ProjectionPoint[]
  title?: string
  totalInvested?: number
  inflationAdjusted?: boolean
}

function downsample<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr
  const step = (arr.length - 1) / (maxPoints - 1)
  const result = []
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.round(i * step)
    if (arr[idx] !== undefined && arr[idx] !== null) {
      result.push(arr[idx])
    }
  }
  return result
}

export default function GoalProjectionChart({ data, title = "Corpus Projection", totalInvested: propTotalInvested, inflationAdjusted = false }: GoalProjectionChartProps) {
  // Defensive: filter out any undefined/null/invalid points
  const safeData = Array.isArray(data) ? data.filter(
    d => d && typeof d.corpus === 'number' && !isNaN(d.corpus)
  ) : []

  // Apply inflation adjustment if requested
  const processedData = inflationAdjusted 
    ? safeData.map(point => ({
        ...point,
        corpus: adjustForInflation(point.corpus, point.months, 6)
      }))
    : safeData

  if (!safeData || safeData.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2zm0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Projection Data</h3>
        <p className="text-gray-600">Run a simulation to see the corpus projection chart.</p>
      </div>
    )
  }

  // Downsample for clarity
  const maxPoints = 40
  const chartData = downsample(processedData, maxPoints)

  // SVG chart dimensions
  const width = 600
  const height = 300
  const padding = 80

  // Format large numbers for Y-axis
  function formatLargeNumber(n: number): string {
    if (n >= 1_000_000_000) return `₹${(n / 1_000_000_000).toFixed(2)}B`
    if (n >= 1_000_000) return `₹${(n / 1_000_000).toFixed(2)}M`
    if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`
    return `₹${n.toLocaleString('en-IN')}`
  }

  // Scaling
  const maxCorpus = Math.max(...chartData.map(d => d.corpus))
  const minCorpus = Math.min(...chartData.map(d => d.corpus))
  const corpusRange = maxCorpus - minCorpus || 1

  // X/Y mapping
  const getX = (i: number) => padding + (i * (width - 2 * padding)) / (chartData.length - 1)
  const getY = (corpus: number) => height - padding - ((corpus - minCorpus) / corpusRange) * (height - 2 * padding)

  // Build line path
  const linePath = chartData.map((point, i) => `${i === 0 ? 'M' : 'L'}${getX(i)},${getY(point.corpus)}`).join(' ')

  // X-axis labels: show start, end, and every 5th point
  const labelIndexes = new Set([0, chartData.length - 1])
  for (let i = 5; i < chartData.length - 1; i += 5) labelIndexes.add(i)

  // Calculate total invested (sum of all SIPs, including step-up)
  function calculateTotalInvested(): number {
    if (!safeData || safeData.length === 0) return 0
    let total = 0
    // Try to infer SIP and step-up from corpus increments
    // Fallback: use difference between corpus values
    for (let i = 1; i < safeData.length; i++) {
      const diff = safeData[i].corpus - safeData[i - 1].corpus
      if (diff > 0) {
        total += diff
      }
    }
    // This is a fallback; ideally, total invested should be passed in props or calculated in the simulation logic
    return total
  }

  const totalInvested = typeof propTotalInvested === 'number' ? propTotalInvested : calculateTotalInvested()
  const finalCorpus = safeData[safeData.length - 1]?.corpus || 0
  const growthPct = totalInvested > 0 ? (((finalCorpus - totalInvested) / totalInvested) * 100).toFixed(1) : '0.0'

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        {title}{inflationAdjusted ? ' (Inflation-Adjusted)' : ''}
      </h3>
      <div className="overflow-x-auto">
        <svg width={width} height={height} className="block mx-auto">
          {/* X and Y axes */}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#d1d5db" />
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#d1d5db" />
          {/* Line path */}
          <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth={3} />
          {/* Dots */}
          {chartData.map((point, i) => (
            <circle
              key={i}
              cx={getX(i)}
              cy={getY(point.corpus)}
              r={3}
              fill="#3b82f6"
              stroke="#fff"
              strokeWidth={1}
            />
          ))}
          {/* X-axis labels */}
          {chartData.map((point, i) =>
            labelIndexes.has(i) ? (
              <text
                key={i}
                x={getX(i)}
                y={height - padding + 18}
                fontSize={11}
                textAnchor="middle"
                fill="#6b7280"
                style={{ fontFamily: 'inherit' }}
              >
                {new Date(point.date).toLocaleDateString('en-IN', { year: '2-digit', month: 'short' })}
              </text>
            ) : null
          )}
          {/* Y-axis labels (min/max) */}
          <text x={padding - 40} y={getY(minCorpus)} fontSize={11} textAnchor="end" fill="#6b7280">{formatLargeNumber(minCorpus)}</text>
          <text x={padding - 40} y={getY(maxCorpus)} fontSize={11} textAnchor="end" fill="#6b7280">{formatLargeNumber(maxCorpus)}</text>
        </svg>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 text-sm mt-4">
        <div className="text-gray-600">
          <span className="font-medium">Start:</span> ₹{processedData[0]?.corpus.toLocaleString('en-IN') || '0'}
          {inflationAdjusted && <span className="text-xs text-gray-500 ml-1">(Real)</span>}
        </div>
        <div className="text-gray-600">
          <span className="font-medium">End:</span> ₹{processedData[processedData.length - 1]?.corpus.toLocaleString('en-IN') || '0'}
          {inflationAdjusted && <span className="text-xs text-gray-500 ml-1">(Real)</span>}
        </div>
        <div className="text-gray-600">
          <span className="font-medium">Duration:</span> {data[data.length - 1]?.months || 0} months ({new Date(data[data.length - 1]?.date || Date.now()).toLocaleDateString('en-IN', { month: '2-digit', year: 'numeric' }).replace('/', '-')})
        </div>
        <div className="text-gray-600">
          <span className="font-medium">Growth:</span> {growthPct}%
        </div>
      </div>

      {/* Data table for detailed view */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Projection Timeline</h4>
        <div className="max-h-40 overflow-y-auto">
          <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                <th className="text-left p-3 font-semibold text-gray-700">Date</th>
                <th className="text-right p-3 font-semibold text-gray-700">Corpus</th>
                <th className="text-right p-3 font-semibold text-gray-700">Months</th>
              </tr>
            </thead>
            <tbody>
              {processedData.map((point, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-3 text-gray-900">{new Date(point.date).toLocaleDateString('en-IN', { year: '2-digit', month: 'short' })}</td>
                  <td className="p-3 text-right font-medium text-blue-900">
                    ₹{point.corpus.toLocaleString('en-IN')}
                    {inflationAdjusted && <span className="text-xs text-gray-500 ml-1">(Real)</span>}
                  </td>
                  <td className="p-3 text-right text-gray-500">{point.months}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
} 