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

// Yahoo rate-limits (429) - use User-Agent and check response before JSON parse
const YAHOO_FETCH_OPTIONS: RequestInit = {
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  },
}

/** Direct fetch fallback when yahoo-finance2 fails (e.g. 429 rate limit) */
async function fetchViaDirectFetch(symbol: string): Promise<YahooStockPrice | null> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`,
      YAHOO_FETCH_OPTIONS
    )
    if (!response.ok) {
      const text = await response.text()
      console.warn(`Yahoo ${symbol} returned ${response.status}: ${text.slice(0, 50)}`)
      return null
    }
    const data = (await response.json()) as {
      chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; currency?: string } }> }
    }
    const price = data.chart?.result?.[0]?.meta?.regularMarketPrice
    const currency = data.chart?.result?.[0]?.meta?.currency || 'USD'
    if (typeof price === 'number') {
      return {
        symbol,
        price,
        currency,
        originalPrice: price,
        originalCurrency: currency,
      }
    }
  } catch (error) {
    console.warn(`Direct fetch for ${symbol} failed:`, error)
  }
  return null
}

// Fetch single stock price - yahoo-finance2 with direct fetch fallback on 429/parse error
export async function fetchYahooStockPrice(symbol: string): Promise<YahooStockPrice | null> {
  try {
    const quote = await yahooFinance.quote(symbol)

    if (!quote || !quote.regularMarketPrice) {
      return null
    }

    const price = quote.regularMarketPrice
    const currency = quote.currency || 'USD'

    return {
      symbol,
      price,
      currency,
      originalPrice: price,
      originalCurrency: currency,
    }
  } catch (error) {
    // yahoo-finance2 throws when Yahoo returns 429 "Too Many Requests" (parsed as JSON fails)
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('Too Many Requests') || msg.includes('is not valid JSON')) {
      console.warn(`yahoo-finance2 rate-limited for ${symbol}, trying direct fetch`)
      return fetchViaDirectFetch(symbol)
    }
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