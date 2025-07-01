// Utility functions for stock price fetching

export interface StockPrice {
  symbol: string
  price: number | null
  currency: string
  exchangeRate?: number
  originalPrice?: number
  originalCurrency?: string
  timestamp: string
}

export interface StockPricesResponse {
  success: boolean
  prices: Record<string, {
    price: number | null
    currency: string
    exchangeRate?: number
    originalPrice?: number
    originalCurrency?: string
  }>
  timestamp: string
}

// Fetch single stock price
export async function fetchStockPrice(symbol: string, exchange?: string): Promise<StockPrice | null> {
  try {
    const url = new URL('/api/stock-prices', window.location.origin)
    url.searchParams.set('symbol', symbol)
    if (exchange) {
      url.searchParams.set('exchange', exchange)
    }
    
    const response = await fetch(url.toString())
    
    if (!response.ok) {
      console.error(`Failed to fetch stock price for ${symbol}:`, response.status)
      return null
    }

    const data = await response.json()
    
    if (!data.success) {
      console.error(`API error for ${symbol}:`, data.error)
      return null
    }

    return {
      symbol: data.symbol,
      price: data.price,
      currency: data.currency,
      exchangeRate: data.exchangeRate,
      originalPrice: data.originalPrice,
      originalCurrency: data.originalCurrency,
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
    const BATCH_SIZE = 5
    let allPrices: Record<string, any> = {}
    let timestamp = new Date().toISOString()
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batchSymbols = symbols.slice(i, i + BATCH_SIZE)
      const batchExchanges = exchanges ? exchanges.slice(i, i + BATCH_SIZE) : undefined
      const response = await fetch('/api/stock-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbols: batchSymbols, exchanges: batchExchanges })
      })
      if (!response.ok) {
        console.error('Failed to fetch stock prices:', response.status)
        continue
      }
      const data = await response.json()
      if (!data.success) {
        console.error('API error:', data.error)
        continue
      }
      allPrices = { ...allPrices, ...data.prices }
      timestamp = data.timestamp || timestamp
    }
    return { success: true, prices: allPrices, timestamp }
  } catch (error) {
    console.error('Error fetching stock prices:', error)
    return null
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
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
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