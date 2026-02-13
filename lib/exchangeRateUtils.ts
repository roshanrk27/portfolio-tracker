/**
 * Fetches USD to INR exchange rate.
 * Tries Yahoo Finance first; falls back to ExchangeRate-API (open access, no key) when Yahoo rate-limits.
 * Used by stock-prices API and test-exchange-rate for verification.
 */

const YAHOO_FETCH_OPTIONS: RequestInit = {
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  },
}

export type FetchUSDToINRResult =
  | { success: true; rate: number; source: 'yahoo' | 'exchangerate-api' }
  | { success: false; rate: null; source: null; error?: string }

export async function fetchUSDToINR(): Promise<FetchUSDToINRResult> {
  // Try Yahoo Finance first
  try {
    const response = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/USDINR=X',
      YAHOO_FETCH_OPTIONS
    )
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`HTTP ${response.status}: ${text.slice(0, 80)}`)
    }
    const data = (await response.json()) as {
      chart?: { result?: Array<{ meta?: { regularMarketPrice?: number } }> }
    }
    const rate = data.chart?.result?.[0]?.meta?.regularMarketPrice
    if (typeof rate === 'number') {
      return { success: true, rate, source: 'yahoo' }
    }
  } catch {
    // Fall through to ExchangeRate-API
  }

  // Fallback: ExchangeRate-API (open access, no key)
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD')
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`HTTP ${response.status}: ${text.slice(0, 80)}`)
    }
    const data = (await response.json()) as {
      result?: string
      rates?: { INR?: number }
    }
    if (data.result === 'success' && typeof data.rates?.INR === 'number') {
      return { success: true, rate: data.rates.INR, source: 'exchangerate-api' }
    }
  } catch (error) {
    return {
      success: false,
      rate: null,
      source: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }

  return { success: false, rate: null, source: null }
}
