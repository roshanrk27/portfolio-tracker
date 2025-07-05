'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface StockPriceData {
  price: number | null
  currency: string
  exchangeRate?: number
  originalPrice?: number
  originalCurrency?: string
}

interface StockPricesResponse {
  success: boolean
  prices: Record<string, StockPriceData>
  timestamp: string
  stale: boolean
}

export default function TestStockCache() {
  const [cacheData, setCacheData] = useState<StockPriceData[] | { error: string } | null>(null)
  const [apiResponse, setApiResponse] = useState<StockPricesResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const testSymbols = ['TCS.NS', 'MSFT', 'RELIANCE.NS']

  const checkCache = async () => {
    setLoading(true)
    try {
      // Check what's in the cache
      const { data: cache, error } = await supabase
        .from('stock_prices_cache')
        .select('*')
        .in('symbol', testSymbols)
      
      if (error) {
        console.error('Cache error:', error)
        setCacheData({ error: error.message })
      } else {
        setCacheData(cache)
      }

      // Test the API
      const response = await fetch(`/api/stock-prices?symbols=${testSymbols.join(',')}`)
      const data = await response.json()
      setApiResponse(data)
      
    } catch (err) {
      console.error('Test error:', err)
    } finally {
      setLoading(false)
    }
  }

  const triggerCronJob = async () => {
    setLoading(true)
    try {
      // Trigger the cron job manually
      const response = await fetch('/api/stock-prices?symbols=TCS.NS,MSFT,RELIANCE.NS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbols: ['TCS.NS', 'MSFT', 'RELIANCE.NS']
        })
      })
      
      const data = await response.json()
      setApiResponse(data)
      
      // Check cache again after triggering
      await checkCache()
      
    } catch (err) {
      console.error('Cron job error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Stock Cache Test</h1>
      
      <button 
        onClick={checkCache}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
      >
        {loading ? 'Testing...' : 'Test Cache & API'}
      </button>

      <button 
        onClick={triggerCronJob}
        disabled={loading}
        className="bg-green-600 text-white px-4 py-2 rounded mb-4 ml-2"
      >
        {loading ? 'Triggering...' : 'Trigger Cron Job'}
      </button>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Cache Data</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(cacheData, null, 2)}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">API Response</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(apiResponse, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
} 