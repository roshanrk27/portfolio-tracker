import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchUSDToINR } from '@/lib/exchangeRateUtils'

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('fetchUSDToINR', () => {
  it('returns rate from Yahoo when Yahoo responds successfully', async () => {
    const yahooPayload = {
      chart: {
        result: [{ meta: { regularMarketPrice: 83.45 } }],
      },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(yahooPayload))
    )

    const result = await fetchUSDToINR()

    expect(result).toEqual({
      success: true,
      rate: 83.45,
      source: 'yahoo',
    })
  })

  it('falls back to ExchangeRate-API when Yahoo returns 429', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response('Too Many Requests', { status: 429 })
        )
        .mockResolvedValueOnce(
          jsonResponse({
            result: 'success',
            rates: { INR: 84.12 },
          })
        )
    )

    const result = await fetchUSDToINR()

    expect(result).toEqual({
      success: true,
      rate: 84.12,
      source: 'exchangerate-api',
    })
  })

  it('falls back to ExchangeRate-API when Yahoo returns non-JSON body', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response('Too Many Requests', { status: 429 }))
        .mockResolvedValueOnce(
          jsonResponse({
            result: 'success',
            rates: { INR: 83.9 },
          })
        )
    )

    const result = await fetchUSDToINR()

    expect(result.success).toBe(true)
    expect(result.source).toBe('exchangerate-api')
    expect((result as { rate: number }).rate).toBe(83.9)
  })

  it('returns failure when both Yahoo and ExchangeRate-API fail', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response('Too Many Requests', { status: 429 }))
        .mockResolvedValueOnce(new Response('Service Unavailable', { status: 503 }))
    )

    const result = await fetchUSDToINR()

    expect(result).toMatchObject({
      success: false,
      rate: null,
      source: null,
    })
    expect('error' in result && result.error).toBeDefined()
  })

  it('returns failure when ExchangeRate-API returns invalid data', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response('Too Many Requests', { status: 429 }))
        .mockResolvedValueOnce(jsonResponse({ result: 'error' }))
    )

    const result = await fetchUSDToINR()

    expect(result).toMatchObject({
      success: false,
      rate: null,
      source: null,
    })
  })
})
