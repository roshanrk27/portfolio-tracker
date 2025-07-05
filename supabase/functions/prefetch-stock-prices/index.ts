import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

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

// Function to fetch USD to INR exchange rate using Yahoo Finance
async function fetchUSDToINR(): Promise<number | null> {
  try {
    const response = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/USDINR=X')
    const data = await response.json()
    if (data.chart?.result?.[0]?.meta?.regularMarketPrice) {
      return data.chart.result[0].meta.regularMarketPrice
    }
    return null
  } catch (error) {
    console.error('Error fetching USD-INR rate:', error)
    return null
  }
}

// Function to fetch stock prices from Yahoo Finance in batches
async function fetchYahooStockPrices(symbols: string[]): Promise<{
  success: boolean
  prices: Record<string, any>
  error?: string
}> {
  try {
    const prices: Record<string, any> = {}
    const BATCH_SIZE = 50 // Yahoo Finance limit
    
    // Process symbols in batches
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE)
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} symbols`)
      
      // Fetch prices in parallel for the current batch
      const pricePromises = batch.map(async (symbol) => {
        try {
          const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`)
          const data = await response.json()
          
          if (data.chart?.result?.[0]?.meta?.regularMarketPrice) {
            const price = data.chart.result[0].meta.regularMarketPrice
            const currency = data.chart.result[0].meta.currency || 'USD'
            
            prices[symbol] = {
              symbol,
              price,
              currency,
              originalPrice: price,
              originalCurrency: currency
            }
          } else {
            console.warn(`No price data for symbol: ${symbol}`)
          }
        } catch (error) {
          console.error(`Error fetching price for ${symbol}:`, error)
        }
      })
      
      await Promise.all(pricePromises)
      
      // Add a small delay between batches to be respectful to Yahoo Finance
      if (i + BATCH_SIZE < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay
      }
    }
    
    return {
      success: true,
      prices
    }
  } catch (error) {
    return {
      success: false,
      prices: {},
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Function to convert prices to INR
async function convertToINR(prices: Record<string, any>): Promise<Record<string, any>> {
  const usdToInrRate = await fetchUSDToINR()
  
  if (!usdToInrRate) {
    console.warn('Could not fetch USD-INR rate, returning original prices')
    return prices
  }
  
  const convertedPrices: Record<string, any> = {}
  
  for (const [symbol, data] of Object.entries(prices)) {
    if (data.currency === 'USD' && data.price) {
      convertedPrices[symbol] = {
        ...data,
        price: data.price * usdToInrRate,
        currency: 'INR',
        exchangeRate: usdToInrRate
      }
    } else {
      convertedPrices[symbol] = data
    }
  }
  
  return convertedPrices
}

// Function to store prices in cache
async function storeInCache(prices: Record<string, any>): Promise<void> {
  const cacheData = Object.entries(prices).map(([symbol, data]) => ({
    symbol,
    price_inr: data.price,
    price_original: data.originalPrice,
    currency: data.originalCurrency,
    exchange_rate_to_inr: data.exchangeRate,
    updated_at: new Date().toISOString()
  }))
  
  const { error } = await supabase
    .from('stock_prices_cache')
    .upsert(cacheData, { onConflict: 'symbol' })
  
  if (error) {
    console.error('Error storing in cache:', error)
  }
}

serve(async (req: Request) => {
  try {
    console.log('Starting prefetch stock prices job...')
    
    // Fetch all unique stock symbols from the stocks table
    const { data: stocks, error: stocksError } = await supabase
      .from('stocks')
      .select('stock_code, exchange')
      .not('stock_code', 'is', null)
      .not('exchange', 'is', null)
    
    if (stocksError) {
      console.error('Error fetching stocks:', stocksError)
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to fetch stocks from database' 
      }), { status: 500 })
    }
    
    if (!stocks || stocks.length === 0) {
      console.log('No stocks found in database')
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No stocks to prefetch',
        updated: []
      }), { status: 200 })
    }
    
    // Convert to Yahoo Finance symbols with proper type handling
    const yahooSymbols: string[] = stocks.map((stock: any) => 
      getYahooSymbol(stock.stock_code as string, stock.exchange as string)
    )
    
    // Remove duplicates
    const uniqueSymbols = [...new Set(yahooSymbols)]
    
    console.log(`Found ${stocks.length} stocks, ${uniqueSymbols.length} unique symbols to fetch`)
    console.log('Total batches needed:', Math.ceil(uniqueSymbols.length / 50))
    
    // Fetch prices from Yahoo Finance (now with batching)
    const yahooResult = await fetchYahooStockPrices(uniqueSymbols)
    
    if (!yahooResult.success) {
      console.error('Yahoo Finance fetch failed:', yahooResult.error)
      return new Response(JSON.stringify({ 
        success: false, 
        error: yahooResult.error 
      }), { status: 500 })
    }
    
    // Convert to INR
    const prices = await convertToINR(yahooResult.prices)
    
    // Store in cache
    await storeInCache(prices)
    
    const updatedSymbols = Object.keys(prices)
    console.log(`Successfully updated ${updatedSymbols.length} symbols in cache`)
    
    return new Response(JSON.stringify({ 
      success: true, 
      updated: updatedSymbols,
      totalStocks: stocks.length,
      uniqueSymbols: uniqueSymbols.length,
      cachedSymbols: updatedSymbols.length,
      batchesProcessed: Math.ceil(uniqueSymbols.length / 50)
    }), { status: 200 })
    
  } catch (error) {
    console.error('Error in prefetch job:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), { status: 500 })
  }
}) 