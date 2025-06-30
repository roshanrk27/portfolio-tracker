'use client'

import React from 'react'

interface DataPoint {
  date: string
  value: number
  invested: number
}

interface XirrChartProps {
  data: DataPoint[]
  title?: string
  width?: number
  height?: number
}

export default function XirrChart({ 
  data, 
  title = "Investment Growth", 
  width = 600, 
  height = 300 
}: XirrChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="text-center text-gray-500 py-8">
          <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          <p className="mt-2">No growth data available</p>
        </div>
      </div>
    )
  }

  const margin = { top: 20, right: 30, bottom: 40, left: 60 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom

  // Find min/max values for scaling
  const allValues = data.flatMap(d => [d.value, d.invested])
  const minValue = Math.min(...allValues)
  const maxValue = Math.max(...allValues)
  const valueRange = maxValue - minValue

  // Create date scale
  const dates = data.map(d => new Date(d.date))
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
  const dateRange = maxDate.getTime() - minDate.getTime()

  // Helper functions for scaling
  const scaleX = (date: Date) => {
    const time = date.getTime()
    return margin.left + ((time - minDate.getTime()) / dateRange) * chartWidth
  }

  const scaleY = (value: number) => {
    return margin.top + chartHeight - ((value - minValue) / valueRange) * chartHeight
  }

  // Create path data for the lines
  const createPathData = (dataPoints: DataPoint[], valueKey: 'value' | 'invested') => {
    if (dataPoints.length === 0) return ''
    
    const points = dataPoints.map((d, i) => {
      const x = scaleX(new Date(d.date))
      const y = scaleY(d[valueKey])
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    
    return points.join(' ')
  }

  const valuePathData = createPathData(data, 'value')
  const investedPathData = createPathData(data, 'invested')

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      <div className="flex flex-col items-center">
        <svg width={width} height={height} className="mb-4">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => {
            const value = minValue + (tick * valueRange)
            const y = scaleY(value)
            return (
              <g key={`y-tick-${i}`}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={margin.left - 5}
                  y2={y}
                  stroke="#9ca3af"
                  strokeWidth="1"
                />
                <text
                  x={margin.left - 10}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="text-xs fill-gray-600"
                >
                  {formatCurrency(value)}
                </text>
              </g>
            )
          })}

          {/* X-axis labels */}
          {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 5)) === 0).map((d, i) => {
            const x = scaleX(new Date(d.date))
            return (
              <g key={`x-tick-${i}`}>
                <line
                  x1={x}
                  y1={chartHeight + margin.top}
                  x2={x}
                  y2={chartHeight + margin.top + 5}
                  stroke="#9ca3af"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={chartHeight + margin.top + 20}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                  transform={`rotate(-45 ${x} ${chartHeight + margin.top + 20})`}
                >
                  {formatDate(d.date)}
                </text>
              </g>
            )
          })}

          {/* Lines */}
          <path
            d={investedPathData}
            fill="none"
            stroke="#6b7280"
            strokeWidth="2"
            strokeDasharray="5,5"
            className="opacity-70"
          />
          <path
            d={valuePathData}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            className="transition-all duration-300"
          />

          {/* Data points */}
          {data.map((d, i) => {
            const x = scaleX(new Date(d.date))
            const y = scaleY(d.value)
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="4"
                fill="#3b82f6"
                className="transition-all duration-300 hover:r-6"
              />
            )
          })}
        </svg>

        {/* Legend */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center">
            <div className="w-4 h-0.5 bg-blue-500 mr-2"></div>
            <span className="text-sm text-gray-700">Current Value</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-0.5 bg-gray-500 mr-2" style={{ borderTop: '2px dashed #6b7280' }}></div>
            <span className="text-sm text-gray-700">Amount Invested</span>
          </div>
        </div>

        {/* Summary stats */}
        {data.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-600">Current Value</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(data[data.length - 1].value)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Total Invested</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(data[data.length - 1].invested)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Gain/Loss</p>
              <p className={`text-lg font-semibold ${
                data[data.length - 1].value >= data[data.length - 1].invested 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {formatCurrency(data[data.length - 1].value - data[data.length - 1].invested)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 