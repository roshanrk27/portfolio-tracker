'use client'

import React from 'react'

interface AssetAllocation {
  category: string
  value: number
  percentage: number
  color: string
}

interface AllocationPieProps {
  data: AssetAllocation[]
  title?: string
  width?: number
  height?: number
}

export default function AllocationPie({ 
  data, 
  title = "Asset Allocation", 
  width = 300, 
  height = 300 
}: AllocationPieProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="text-center text-gray-500 py-8">
          <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="mt-2">No allocation data available</p>
        </div>
      </div>
    )
  }

  const total = data.reduce((sum, item) => sum + item.value, 0)
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(width, height) / 2 - 40

  let currentAngle = 0
  const paths: React.ReactElement[] = []
  const labels: React.ReactElement[] = []

  data.forEach((item, index) => {
    const sliceAngle = (item.value / total) * 2 * Math.PI
    const startAngle = currentAngle
    const endAngle = currentAngle + sliceAngle

    // Create pie slice path
    const x1 = centerX + radius * Math.cos(startAngle)
    const y1 = centerY + radius * Math.sin(startAngle)
    const x2 = centerX + radius * Math.cos(endAngle)
    const y2 = centerY + radius * Math.sin(endAngle)

    const largeArcFlag = sliceAngle > Math.PI ? 1 : 0

    // For single category (100%), create a full circle
    if (data.length === 1) {
      const pathData = [
        `M ${centerX} ${centerY}`,
        `m -${radius} 0`,
        `a ${radius} ${radius} 0 1 1 ${radius * 2} 0`,
        `a ${radius} ${radius} 0 1 1 -${radius * 2} 0`
      ].join(' ')

      paths.push(
        <path
          key={index}
          d={pathData}
          fill={item.color}
          stroke="white"
          strokeWidth="2"
          className="transition-all duration-300 hover:opacity-80"
        />
      )
    } else {
      // Normal pie slice for multiple categories
      const pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ')

      paths.push(
        <path
          key={index}
          d={pathData}
          fill={item.color}
          stroke="white"
          strokeWidth="2"
          className="transition-all duration-300 hover:opacity-80"
        />
      )
    }

    // Create label
    const labelAngle = startAngle + sliceAngle / 2
    const labelRadius = radius + 20
    const labelX = centerX + labelRadius * Math.cos(labelAngle)
    const labelY = centerY + labelRadius * Math.sin(labelAngle)

    labels.push(
      <g key={`label-${index}`}>
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-xs font-medium fill-gray-700"
        >
          {item.category}
        </text>
        <text
          x={labelX}
          y={labelY + 15}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-xs font-bold fill-gray-900"
        >
          {item.percentage.toFixed(1)}%
        </text>
      </g>
    )

    currentAngle = endAngle
  })

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      <div className="flex flex-col items-center">
        <svg width={width} height={height} className="mb-4">
          {paths}
          {labels}
        </svg>

        {/* Legend */}
        <div className="w-full max-w-xs">
          <div className="space-y-2">
            {data.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm text-gray-700">{item.category}</span>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  ₹{item.value.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Total</span>
              <span className="text-sm font-bold text-gray-900">
                ₹{total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 