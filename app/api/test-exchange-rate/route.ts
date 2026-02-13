import { NextResponse } from 'next/server'
import { fetchUSDToINR } from '@/lib/exchangeRateUtils'

/**
 * Test endpoint to verify USD-INR exchange rate fetching (Yahoo + ExchangeRate-API fallback).
 * GET /api/test-exchange-rate
 * Returns: { success, rate, source, error? }
 */
export async function GET() {
  try {
    const result = await fetchUSDToINR()

    if (result.success) {
      return NextResponse.json({
        success: true,
        rate: result.rate,
        source: result.source,
        message: `USD-INR rate: ${result.rate} (from ${result.source})`,
      })
    }

    return NextResponse.json(
      {
        success: false,
        rate: null,
        source: null,
        error: result.error ?? 'Could not fetch USD-INR from any source',
      },
      { status: 503 }
    )
  } catch (error) {
    console.error('[test-exchange-rate] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
