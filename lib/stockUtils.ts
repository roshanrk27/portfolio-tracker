// Utility functions for stock price fetching

import { formatIndianNumberWithSuffix } from './goalSimulator'

export interface StockPrice {
  symbol: string
  price: number | null
  currency: string
  exchangeRate?: number
  originalPrice?: number
  originalCurrency?: string
  timestamp: string
}

interface StockPriceData {
  price: number | null
  currency: string
  exchangeRate?: number
  originalPrice?: number
  originalCurrency?: string
}

export interface StockPricesResponse {
  success: boolean
  prices: Record<string, StockPriceData>
  timestamp: string
  stale: boolean
  fallback?: boolean
}

// Exchange to Yahoo Finance symbol mapping
const EXCHANGE_MAPPING: Record<string, string> = {
  'NSE': '.NS',      // India - National Stock Exchange
  'BSE': '.BO',      // India - Bombay Stock Exchange  
  'NASDAQ': '',      // US - NASDAQ (no suffix)
  'NYSE': '',        // US - NYSE (no suffix)
  'LSE': '.L',       // UK - London Stock Exchange
  'TSE': '.T',       // Japan - Tokyo Stock Exchange
  'ASX': '.AX',      // Australia - Australian Securities Exchange
  'TSX': '.TO',      // Canada - Toronto Stock Exchange
  'HKEX': '.HK'      // Hong Kong - Hong Kong Stock Exchange
}

// Function to convert stock_code + exchange to Yahoo Finance symbol
function getYahooSymbol(stockCode: string, exchange: string): string {
  const suffix = EXCHANGE_MAPPING[exchange] || ''
  return stockCode + suffix
}

// Fetch single stock price
export async function fetchStockPrice(symbol: string, exchange?: string): Promise<StockPrice | null> {
  try {
    // Convert to Yahoo Finance symbol format
    const yahooSymbol = getYahooSymbol(symbol, exchange || 'NSE')
    
    // Use GET request with symbols parameter
    const response = await fetch(`/api/stock-prices?symbols=${encodeURIComponent(yahooSymbol)}`)

    if (!response.ok) {
      console.error(`Failed to fetch stock price for ${yahooSymbol}:`, response.status)
      return null
    }

    const data = await response.json()

    if (!data.success) {
      console.error(`API error for ${yahooSymbol}:`, data.error)
      return null
    }

    // The API returns prices keyed by symbol
    const priceData = data.prices[yahooSymbol]
    if (!priceData) {
      return null
    }

    return {
      symbol: yahooSymbol,
      price: priceData.price,
      currency: priceData.currency,
      exchangeRate: priceData.exchangeRate,
      originalPrice: priceData.originalPrice,
      originalCurrency: priceData.originalCurrency,
      timestamp: data.timestamp
    }
  } catch (error) {
    console.error(`Error fetching stock price for ${symbol}:`, error)
    return null
  }
}

// Fetch multiple stock prices
export async function fetchStockPrices(symbols: string[], exchanges?: string[]): Promise<StockPricesResponse | null> {
  try {
    // Convert symbols to Yahoo Finance format
    const yahooSymbols = symbols.map((symbol, index) => {
      const exchange = exchanges?.[index] || 'NSE'
      return getYahooSymbol(symbol, exchange)
    })
    
    const BATCH_SIZE = 10 // Increased batch size since we're using cached data
    let allPrices: Record<string, {
      price: number | null
      currency: string
      exchangeRate?: number
      originalPrice?: number
      originalCurrency?: string
    }> = {}
    let timestamp = new Date().toISOString()
    
    for (let i = 0; i < yahooSymbols.length; i += BATCH_SIZE) {
      const batchSymbols = yahooSymbols.slice(i, i + BATCH_SIZE)
      
      try {
        const symbolsParam = batchSymbols.map(s => encodeURIComponent(s)).join(',')
        const response = await fetch(`/api/stock-prices?symbols=${symbolsParam}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (!response.ok) {
          console.error('Failed to fetch stock prices:', response.status)
          // Continue with next batch instead of failing completely
          continue
        }
        
        const data = await response.json()
        if (!data.success) {
          console.error('API error:', data.error)
          // Continue with next batch instead of failing completely
          continue
        }
        
        // Map Yahoo symbols back to original symbols for backward compatibility
        const mappedPrices: Record<string, StockPriceData> = {}
        for (const [yahooSymbol, priceData] of Object.entries(data.prices)) {
          // Find the original symbol that maps to this Yahoo symbol
          const originalIndex = yahooSymbols.indexOf(yahooSymbol)
          if (originalIndex !== -1) {
            mappedPrices[symbols[originalIndex]] = priceData as StockPriceData
          }
        }
        
        allPrices = { ...allPrices, ...mappedPrices }
        timestamp = data.timestamp || timestamp
        
        // Track if any batch had stale data
        if (data.stale || data.fallback) {
          console.log('[STOCK-PRICES] Using stale/fallback data from API')
        }
      } catch (batchError) {
        console.error('Error in batch request:', batchError)
        // Continue with next batch instead of failing completely
        continue
      }
    }
    
    // Check if any of the batches had stale data
    const hasStaleData = Object.keys(allPrices).length > 0
    
    return { 
      success: true, 
      prices: allPrices, 
      timestamp,
      stale: hasStaleData, // Indicate if we're using any cached/stale data
      fallback: hasStaleData // Same as stale for now
    }
  } catch (error) {
    console.error('Error fetching stock prices:', error)
    // Return empty prices instead of null to prevent UI crashes
          return { success: true, prices: {}, timestamp: new Date().toISOString(), stale: false }
  }
}

// Calculate current stock value
export function calculateStockValue(quantity: number, currentPrice: number | null): number {
  if (currentPrice === null) {
    return 0
  }
  return quantity * currentPrice
}

// Format stock price for display
export function formatStockPrice(price: number | null, currency: string = 'INR'): string {
  if (price === null) {
    return 'N/A'
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price)
}

// Format stock value for display
export function formatStockValue(value: number): string {
  return formatIndianNumberWithSuffix(value)
}

// Get exchange display name
export function getExchangeDisplayName(exchange: string): string {
  const exchangeNames: Record<string, string> = {
    'NSE': 'NSE (India)',
    'BSE': 'BSE (India)',
    'NASDAQ': 'NASDAQ (US)',
    'NYSE': 'NYSE (US)'
  }
  return exchangeNames[exchange] || exchange
} 