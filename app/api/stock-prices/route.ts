import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchYahooStockPrices } from '@/lib/yahooFinanceUtils'
import { fetchUSDToINR } from '@/lib/exchangeRateUtils'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function getUSDToINRRate(): Promise<number | null> {
  const result = await fetchUSDToINR()
  return result.success ? result.rate : null
}

// Function to check cache for symbols and return fresh/stale status
async function checkCache(symbols: string[]): Promise<{
  fresh: string[]
  stale: string[]
  missing: string[]
}> {
  const now = new Date()
  const isWeekend = now.getDay() === 0 || now.getDay() === 6 // Sunday = 0, Saturday = 6
  
  // Use longer cache time on weekends (24 hours) vs weekdays (30 minutes)
  const cacheTimeMinutes = isWeekend ? 24 * 60 : 30
  const cacheTimeAgo = new Date(Date.now() - cacheTimeMinutes * 60 * 1000).toISOString()
  
  console.log(`[STOCK-PRICES] Cache check - Weekend: ${isWeekend}, Cache time: ${cacheTimeMinutes} minutes`)
  
  // First, get all symbols from cache (both fresh and stale)
  const { data: allCacheData, error } = await supabase
    .from('stock_prices_cache')
    .select('symbol, updated_at')
    .in('symbol', symbols)
  
  if (error) {
    console.error('Error checking cache:', error)
    return { fresh: [], stale: [], missing: symbols }
  }
  
  const cachedSymbols = allCacheData || []
  const freshSymbols = cachedSymbols
    .filter(row => new Date(row.updated_at) >= new Date(cacheTimeAgo))
    .map(row => row.symbol)
  
  const staleSymbols = cachedSymbols
    .filter(row => new Date(row.updated_at) < new Date(cacheTimeAgo))
    .map(row => row.symbol)
  
  const missingSymbols = symbols.filter(symbol => 
    !cachedSymbols.some(row => row.symbol === symbol)
  )
  
  return { fresh: freshSymbols, stale: staleSymbols, missing: missingSymbols }
}

// Function to fetch fresh prices from cache
async function fetchFromCache(symbols: string[]): Promise<Record<string, StockPriceData>> {
  const { data, error } = await supabase
    .from('stock_prices_cache')
    .select('*')
    .in('symbol', symbols)
  
  if (error) {
    console.error('Error fetching from cache:', error)
    return {}
  }
  
  const result: Record<string, StockPriceData> = {}
  data?.forEach(row => {
    result[row.symbol] = {
      price: row.price_inr,
      currency: 'INR',
      exchangeRate: row.exchange_rate_to_inr,
      originalPrice: row.price_original,
      originalCurrency: row.currency
    }
  })
  
  return result
}

// Function to store prices in cache
async function storeInCache(prices: Record<string, StockPriceData>): Promise<void> {
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

// Function to convert prices to INR
async function convertToINR(prices: Record<string, StockPriceData>): Promise<Record<string, StockPriceData>> {
  const usdToInrRate = await getUSDToINRRate()
  
  if (!usdToInrRate) {
    console.warn('Could not fetch USD-INR rate, returning original prices')
    return prices
  }
  
  const convertedPrices: Record<string, StockPriceData> = {}
  
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

// Type definitions
interface StockPriceData {
  price: number | null
  currency: string
  exchangeRate?: number
  originalPrice?: number
  originalCurrency?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbolsParam = searchParams.get('symbols')
    
    if (!symbolsParam) {
      return NextResponse.json(
        { error: 'Symbols parameter is required' },
        { status: 400 }
      )
    }
    
    const symbols = symbolsParam.split(',').map(s => s.trim()).filter(s => s)
    
    if (symbols.length === 0) {
      return NextResponse.json(
        { error: 'At least one symbol is required' },
        { status: 400 }
      )
    }
    
    if (symbols.length > 10) {
      return NextResponse.json(
        { error: 'Too many symbols requested. Maximum 10 symbols allowed.' },
        { status: 400 }
      )
    }
    
    console.log(`[STOCK-PRICES] Fetching prices for: ${symbols.join(', ')}`)
    
    // Check cache status
    const { fresh, stale, missing } = await checkCache(symbols)
    console.log(`[STOCK-PRICES] Cache status - Fresh: ${fresh.length}, Stale: ${stale.length}, Missing: ${missing.length}`)
    
    // Fetch fresh prices from cache
    const freshPrices = await fetchFromCache(fresh)
    
    // Fetch stale/missing prices from Yahoo Finance
    const symbolsToFetch = [...stale, ...missing]
    let fetchedPrices: Record<string, StockPriceData> = {}
    let fallbackPrices: Record<string, StockPriceData> = {}
    let hasFallback = false
    
    if (symbolsToFetch.length > 0) {
      console.log(`[STOCK-PRICES] Fetching from Yahoo Finance: ${symbolsToFetch.join(', ')}`)
      const yahooResult = await fetchYahooStockPrices(symbolsToFetch)
      
      if (yahooResult.success) {
        // Convert to INR
        fetchedPrices = await convertToINR(yahooResult.prices)
        
        // Store in cache
        await storeInCache(fetchedPrices)
      } else {
        console.error('[STOCK-PRICES] Yahoo Finance fetch failed:', yahooResult.error)
        
        // Fallback: Get stale prices from cache for failed symbols
        console.log('[STOCK-PRICES] Using fallback to stale cached prices')
        const staleCachePrices = await fetchFromCache(symbolsToFetch)
        
        if (Object.keys(staleCachePrices).length > 0) {
          fallbackPrices = staleCachePrices
          hasFallback = true
          console.log(`[STOCK-PRICES] Fallback found for ${Object.keys(fallbackPrices).length} symbols`)
        } else {
          console.log('[STOCK-PRICES] No fallback prices available in cache')
        }
      }
    }
    
    // Combine fresh and fetched prices (or fallback prices)
    const allPrices = { ...freshPrices, ...fetchedPrices, ...fallbackPrices }
    
    // Determine if we're using any stale data
    const isUsingStaleData = stale.length > 0 || hasFallback
    
    return NextResponse.json({
      success: true,
      prices: allPrices,
      timestamp: new Date().toISOString(),
      cache: {
        fresh: fresh.length,
        stale: stale.length,
        missing: missing.length
      },
      fallback: hasFallback,
      stale: isUsingStaleData // Indicate if any prices are from stale cache or fallback
    })
    
  } catch (error) {
    console.error('[STOCK-PRICES] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Keep the POST method for backward compatibility
export async function POST(request: NextRequest) {
  try {
    const { symbols } = await request.json()
    
    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json(
        { error: 'Invalid request: symbols array is required' },
        { status: 400 }
      )
    }
    
    // Convert to GET request format
    const symbolsParam = symbols.join(',')
    const url = new URL(request.url)
    url.searchParams.set('symbols', symbolsParam)
    
    const getRequest = new NextRequest(url.toString(), {
      method: 'GET',
      headers: request.headers
    })
    
    return GET(getRequest)
    
  } catch (error) {
    console.error('Error in POST stock prices API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 