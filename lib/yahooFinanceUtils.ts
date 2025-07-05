import yahooFinance from 'yahoo-finance2'

export interface YahooStockPrice {
  symbol: string
  price: number | null
  currency: string
  originalPrice?: number
  originalCurrency?: string
  exchangeRate?: number
}

export interface YahooStockPricesResponse {
  success: boolean
  prices: Record<string, YahooStockPrice>
  timestamp: string
  error?: string
}

// Fetch single stock price using Yahoo Finance
export async function fetchYahooStockPrice(symbol: string): Promise<YahooStockPrice | null> {
  try {
    const quote = await yahooFinance.quote(symbol)
    
    if (!quote || !quote.regularMarketPrice) {
      console.error(`No price data available for ${symbol}`)
      return null
    }

    const price = quote.regularMarketPrice
    const currency = quote.currency || 'USD'
    
    // For now, we'll return the original price and currency
    // INR conversion will be handled in the API route
    return {
      symbol,
      price,
      currency,
      originalPrice: price,
      originalCurrency: currency
    }
  } catch (error) {
    console.error(`Error fetching Yahoo Finance price for ${symbol}:`, error)
    return null
  }
}

// Fetch multiple stock prices using Yahoo Finance
export async function fetchYahooStockPrices(symbols: string[]): Promise<YahooStockPricesResponse> {
  const prices: Record<string, YahooStockPrice> = {}
  const timestamp = new Date().toISOString()
  
  try {
    // Fetch prices in parallel for better performance
    const pricePromises = symbols.map(async (symbol) => {
      try {
        const price = await fetchYahooStockPrice(symbol)
        if (price) {
          prices[symbol] = price
        }
      } catch (error) {
        console.error(`Error fetching price for ${symbol}:`, error)
      }
    })
    
    await Promise.all(pricePromises)
    
    return {
      success: true,
      prices,
      timestamp
    }
  } catch (error) {
    console.error('Error fetching Yahoo Finance prices:', error)
    return {
      success: false,
      prices: {},
      timestamp,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Test function to verify the utility works
export async function testYahooFinanceUtility(): Promise<void> {
  console.log('Testing Yahoo Finance utility...')
  
  const testSymbols = ['TCS.NS', 'MSFT']
  const result = await fetchYahooStockPrices(testSymbols)
  
  console.log('Test result:', JSON.stringify(result, null, 2))
  
  if (result.success && Object.keys(result.prices).length > 0) {
    console.log('✅ Yahoo Finance utility test passed')
  } else {
    console.log('❌ Yahoo Finance utility test failed')
  }
} 