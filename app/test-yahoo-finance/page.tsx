'use client'

import { useState } from 'react'

interface YahooFinanceResult {
  success: boolean
  prices: Record<string, {
    price: number | null
    currency: string
    exchangeRate?: number
    originalPrice?: number
    originalCurrency?: string
  }>
  error?: string
}

export default function TestYahooFinance() {
  const [result, setResult] = useState<YahooFinanceResult | null>(null)
  const [loading, setLoading] = useState(false)

  const testYahooFinance = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test-yahoo-finance')
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ 
        success: false, 
        prices: {}, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Yahoo Finance Utility Test</h1>
      
      <button 
        onClick={testYahooFinance}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
      >
        {loading ? 'Testing...' : 'Test Yahoo Finance Utility'}
      </button>

      {result && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Test Result:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
          
          {result.success && result.prices && Object.keys(result.prices).length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Prices Fetched:</h3>
              <ul className="list-disc list-inside">
                {Object.entries(result.prices).map(([symbol, data]: [string, { price: number | null; currency: string; exchangeRate?: number; originalPrice?: number; originalCurrency?: string }]) => (
                  <li key={symbol}>
                    <strong>{symbol}</strong>: {data.price} {data.currency}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 