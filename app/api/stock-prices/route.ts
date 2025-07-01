import { NextRequest, NextResponse } from 'next/server'

// Function to fetch stock price from Google Finance
async function fetchStockPriceFromGoogle(symbol: string, exchange?: string): Promise<number | null> {
  try {
    // Construct the Google Finance URL
    let googleFinanceUrl: string
    
    if (exchange === 'NSE' || exchange === 'BSE') {
      // Indian stocks
      googleFinanceUrl = `https://www.google.com/finance/quote/${symbol}:${exchange}`
    } else if (exchange === 'NASDAQ' || exchange === 'NYSE') {
      // US stocks
      googleFinanceUrl = `https://www.google.com/finance/quote/${symbol}:${exchange}`
    } else {
      // Try to detect exchange or default to NSE for Indian stocks
      if (symbol.length <= 5) {
        // Likely Indian stock (short symbol)
        googleFinanceUrl = `https://www.google.com/finance/quote/${symbol}:NSE`
      } else {
        // Likely US stock (longer symbol)
        googleFinanceUrl = `https://www.google.com/finance/quote/${symbol}:NASDAQ`
      }
    }
    
    const response = await fetch(googleFinanceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!response.ok) {
      console.error(`Failed to fetch stock price for ${symbol}:`, response.status)
      return null
    }

    const html = await response.text()
    
    // Extract price from Google Finance HTML
    // Look for the price in the HTML response
    const priceMatch = html.match(/"price":\s*"([^"]+)"/) || 
                      html.match(/"currentPrice":\s*"([^"]+)"/) ||
                      html.match(/data-last-price="([^"]+)"/)
    
    if (priceMatch && priceMatch[1]) {
      const price = parseFloat(priceMatch[1].replace(/,/g, ''))
      return isNaN(price) ? null : price
    }

    console.error(`No price data found for ${symbol}`)
    return null
  } catch (error) {
    console.error(`Error fetching stock price for ${symbol}:`, error)
    return null
  }
}

// Function to fetch USD to INR exchange rate
async function fetchUSDToINR(): Promise<number | null> {
  try {
    const response = await fetch('https://www.google.com/finance/quote/USD-INR', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!response.ok) {
      console.error('Failed to fetch USD-INR rate:', response.status)
      return null
    }

    const html = await response.text()
    
    // Extract exchange rate from Google Finance HTML
    const rateMatch = html.match(/"price":\s*"([^"]+)"/) || 
                     html.match(/"currentPrice":\s*"([^"]+)"/) ||
                     html.match(/data-last-price="([^"]+)"/)
    
    if (rateMatch && rateMatch[1]) {
      const rate = parseFloat(rateMatch[1].replace(/,/g, ''))
      return isNaN(rate) ? null : rate
    }

    console.error('No exchange rate data found')
    return null
  } catch (error) {
    console.error('Error fetching USD-INR rate:', error)
    return null
  }
}

// Function to fetch stock price with currency conversion
async function fetchStockPrice(symbol: string, exchange?: string): Promise<{ 
  price: number | null, 
  currency: string, 
  exchangeRate?: number,
  originalPrice?: number,
  originalCurrency?: string 
}> {
  try {
    const price = await fetchStockPriceFromGoogle(symbol, exchange)
    
    if (price === null) {
      return { price: null, currency: 'INR' }
    }

    // Determine if this is a US stock (NASDAQ, NYSE) or Indian stock (NSE, BSE)
    const isUSStock = exchange === 'NASDAQ' || exchange === 'NYSE' || 
                     (exchange === undefined && symbol.length > 5)
    
    if (isUSStock) {
      // Convert USD to INR
      const exchangeRate = await fetchUSDToINR()
      if (exchangeRate) {
        const priceInINR = price * exchangeRate
        return { 
          price: priceInINR, 
          currency: 'INR', 
          exchangeRate: exchangeRate,
          originalPrice: price,
          originalCurrency: 'USD'
        }
      } else {
        // Return USD price if conversion fails
        return { price: price, currency: 'USD' }
      }
    } else {
      // Indian stock, already in INR
      return { price: price, currency: 'INR' }
    }
  } catch (error) {
    console.error(`Error fetching stock price for ${symbol}:`, error)
    return { price: null, currency: 'INR' }
  }
}

// Function to fetch multiple stock prices
async function fetchMultipleStockPrices(symbols: string[], exchanges?: string[]): Promise<Record<string, any>> {
  const results: Record<string, any> = {}
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i]
    const exchange = exchanges?.[i]
    try {
      const result = await fetchStockPrice(symbol, exchange)
      console.log('[STOCK_PRICE_ROSHAN] result: ', result, symbol, exchange)
      results[symbol] = result
    } catch (error) {
      // If fetching fails, set price: null and currency: 'INR', and include error
      results[symbol] = { price: null, currency: 'INR', error: (error as Error).message }
    }
    if (symbols.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  return results
}

export async function POST(request: NextRequest) {
  try {
    const { symbols, exchanges } = await request.json()
    console.log('[DEBUG] Incoming symbols:', symbols)
    console.log('[DEBUG] Incoming exchanges:', exchanges)
    if (!symbols || !Array.isArray(symbols)) {
      console.log('[DEBUG] 400: symbols array is missing or invalid')
      return NextResponse.json(
        { error: 'Invalid request: symbols array is required' },
        { status: 400 }
      )
    }
    if (symbols.length === 0) {
      console.log('[DEBUG] Empty symbols array, returning empty prices')
      return NextResponse.json({ prices: {} })
    }
    if (symbols.length > 5) {
      console.log('[DEBUG] 400: Too many symbols requested')
      return NextResponse.json(
        { error: 'Too many symbols requested. Maximum 5 symbols allowed.' },
        { status: 400 }
      )
    }
    // Defensive: filter out any obviously invalid symbols (null/empty)
    const filteredSymbols: string[] = []
    const filteredExchanges: string[] = []
    for (let i = 0; i < symbols.length; i++) {
      if (typeof symbols[i] === 'string' && symbols[i].trim() !== '' && typeof (exchanges?.[i]) === 'string' && exchanges[i].trim() !== '') {
        filteredSymbols.push(symbols[i])
        filteredExchanges.push(exchanges[i])
      }
    }
    console.log('[DEBUG] Filtered symbols:', filteredSymbols)
    console.log('[DEBUG] Filtered exchanges:', filteredExchanges)
    if (filteredSymbols.length === 0) {
      console.log('[DEBUG] No valid symbols after filtering, returning empty prices')
      return NextResponse.json({ success: true, prices: {}, timestamp: new Date().toISOString() })
    }
    console.log(`[DEBUG] Fetching stock prices for: ${filteredSymbols.join(', ')}`)
    const prices = await fetchMultipleStockPrices(filteredSymbols, filteredExchanges)
    // Always return success, even if some prices are null
    console.log('[DEBUG] Returning prices:', prices)
    return NextResponse.json({
      success: true,
      prices,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in stock prices API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const exchange = searchParams.get('exchange')
    
    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      )
    }

    console.log(`Fetching stock price for: ${symbol}${exchange ? ` (${exchange})` : ''}`)
    
    const result = await fetchStockPrice(symbol, exchange || undefined)
    
    return NextResponse.json({
      success: true,
      symbol,
      exchange: exchange || 'auto',
      ...result,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error in stock price API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 