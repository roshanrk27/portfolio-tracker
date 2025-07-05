import { NextResponse } from 'next/server'
import { fetchYahooStockPrices } from '@/lib/yahooFinanceUtils'

export async function GET() {
  try {
    console.log('Testing Yahoo Finance utility...')
    
    const testSymbols = ['TCS.NS', 'MSFT']
    const result = await fetchYahooStockPrices(testSymbols)
    
    console.log('Test result:', JSON.stringify(result, null, 2))
    
    if (result.success && Object.keys(result.prices).length > 0) {
      console.log('✅ Yahoo Finance utility test passed')
      console.log('Prices fetched:')
      Object.entries(result.prices).forEach(([symbol, data]: [string, { price: number | null; currency: string; exchangeRate?: number; originalPrice?: number; originalCurrency?: string }]) => {
        console.log(`  ${symbol}: ${data.price} ${data.currency}`)
      })
    } else {
      console.log('❌ Yahoo Finance utility test failed')
      console.log('Error:', result.error)
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error testing Yahoo Finance utility:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 