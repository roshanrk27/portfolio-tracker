'use client'

import { calculateCorpusWithStepUp } from '@/lib/goalSimulator'

interface StepUpEffectChartProps {
  stepUpPercents: number[]
  monthlySIP: number
  xirrPercent: number
  targetAmount: number
  existingCorpus?: number
  title?: string
}

export default function StepUpEffectChart({ stepUpPercents, monthlySIP, xirrPercent, targetAmount, existingCorpus = 0, title = 'Step-up vs Time-to-goal' }: StepUpEffectChartProps) {
  // Compute months to goal for each step-up percent
  const data = stepUpPercents.map(stepUp => ({
    stepUp,
    months: calculateCorpusWithStepUp(monthlySIP, xirrPercent, stepUp, targetAmount, undefined, existingCorpus).months
  }))

  // SVG chart dimensions
  const width = 500
  const height = 300
  const padding = 70

  // Scaling
  const maxMonths = Math.max(...data.map(d => d.months))
  const minMonths = Math.min(...data.map(d => d.months))
  const monthsRange = maxMonths - minMonths || 1

  const getX = (i: number) => padding + (i * (width - 2 * padding)) / (data.length - 1)
  const getY = (months: number) => height - padding - ((months - minMonths) / monthsRange) * (height - 2 * padding)

  // Build line path
  const linePath = data.map((point, i) => `${i === 0 ? 'M' : 'L'}${getX(i)},${getY(point.months)}`).join(' ')

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <svg width={width} height={height} className="block mx-auto">
          {/* X and Y axes */}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#d1d5db" />
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#d1d5db" />
          {/* Line path */}
          <path d={linePath} fill="none" stroke="#f59e42" strokeWidth={3} />
          {/* Dots */}
          {data.map((point, i) => (
            <circle
              key={i}
              cx={getX(i)}
              cy={getY(point.months)}
              r={3}
              fill="#f59e42"
              stroke="#fff"
              strokeWidth={1}
            />
          ))}
          {/* X-axis labels */}
          {data.map((point, i) => (
            <text
              key={i}
              x={getX(i)}
              y={height - padding + 18}
              fontSize={11}
              textAnchor="middle"
              fill="#6b7280"
              style={{ fontFamily: 'inherit' }}
            >
              {point.stepUp}%
            </text>
          ))}
          {/* Y-axis labels (min/max) */}
          <text x={padding - 32} y={getY(minMonths)} fontSize={11} textAnchor="end" fill="#6b7280">{minMonths} mo</text>
          <text x={padding - 32} y={getY(maxMonths)} fontSize={11} textAnchor="end" fill="#6b7280">{maxMonths} mo</text>
        </svg>
      </div>
      {/* Data table for detailed view */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Step-up Effect Table</h4>
        <div className="max-h-40 overflow-y-auto">
          <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                <th className="text-left p-3 font-semibold text-gray-700">Step-up %</th>
                <th className="text-right p-3 font-semibold text-gray-700">Months to Goal</th>
              </tr>
            </thead>
            <tbody>
              {data.map((point, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-3 text-gray-900">{point.stepUp}%</td>
                  <td className="p-3 text-right font-medium text-blue-900">{point.months}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
} 