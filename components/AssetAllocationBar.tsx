import React from 'react';

interface AssetAllocation {
  category: string;
  value: number;
  percentage: number;
  color: string;
}

interface AssetAllocationBarProps {
  data: AssetAllocation[];
  title?: string;
  height?: number;
}

export default function AssetAllocationBar({ data, title = 'Asset Allocation', height = 32 }: AssetAllocationBarProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <div className="w-full flex items-center mb-2">
        <div className="flex w-full h-[{height}px] rounded overflow-hidden border border-gray-200">
          {data.map((item, idx) => (
            <div
              key={item.category}
              style={{
                width: `${item.percentage}%`,
                backgroundColor: item.color,
                height: height,
                minWidth: item.percentage > 0 ? 2 : 0,
              }}
              className="transition-all duration-300"
              title={`${item.category}: ₹${item.value.toLocaleString()} (${item.percentage.toFixed(1)}%)`}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
        {data.map((item, idx) => (
          <div key={item.category} className="flex items-center mr-4 mb-1">
            <span className="w-3 h-3 rounded-full mr-2 inline-block" style={{ backgroundColor: item.color }}></span>
            <span className="text-gray-700 mr-1">{item.category}</span>
            <span className="text-gray-500">{item.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
} 