import { afterEach, describe, expect, it, vi } from 'vitest'

const originalEnv = { ...process.env }

function mockFetch(responses: Array<Response | (() => Response)>) {
  const fetchMock = vi.fn()
  responses.forEach((res) => {
    fetchMock.mockImplementationOnce(async () => (typeof res === 'function' ? (res as () => Response)() : res))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' }, ...init })
}

afterEach(() => {
  process.env = { ...originalEnv }
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('fetchPerplexityFundFacts', () => {
  it('returns validated payload when Perplexity responds successfully', async () => {
    process.env.PERPLEXITY_API_KEY = 'test-key'
    const payload = [
      {
        version: '1.0',
        scheme_id: '120503',
        as_of: '2025-11-01',
        identity: {
          scheme_name: 'Axis Bluechip Fund',
          amfi_code: '120503',
          isin: 'INF846K01AB1',
          category: 'Large Cap',
          benchmark: 'NIFTY 50',
          plan: 'Direct',
          option: 'Growth'
        },
        fees_aum: {
          expense_ratio_pct: 0.012,
          aum_cr: 38.4
        },
        risk_return: {
          cagr_1y: 0.15,
          cagr_3y: 0.13,
          cagr_5y: 0.12,
          ret_ytd: 0.09,
          ret_1m: 0.02,
          ret_3m: 0.045,
          ret_6m: 0.078,
          vol_3y_ann: 0.14,
          max_dd_5y: -0.22
        },
        source_evidence: [
          {
            field: 'risk_return',
            url: 'https://www.axisamc.com/fundfacts',
            as_of: '2025-10-31'
          }
        ],
        confidence: 'medium',
        notes: null
      }
    ]

    mockFetch([
      jsonResponse({
        choices: [
          {
            message: {
              content: JSON.stringify(payload)
            }
          }
        ]
      })
    ])

    const { fetchPerplexityFundFacts } = await import('../../lib/ai-coach-api/perplexity')
    const result = await fetchPerplexityFundFacts({
      goal_name: 'Retirement',
      funds: [
        {
          scheme_name: 'Axis Bluechip Fund',
          fund_id: '120503',
          isin: 'INF846K01AB1',
          latest_nav: 45.12,
          current_value: 100000
        }
      ]
    })

    expect(result.status).toBe(200)
    expect(result.payload).toEqual(payload)
  })

  it('retries on transient errors and eventually succeeds', async () => {
    process.env.PERPLEXITY_API_KEY = 'test-key'
    const responses = [
      new Response('Too Many Requests', { status: 429 }),
      jsonResponse({
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  version: '1.0',
                  scheme_id: 'INF179KA1GN2',
                  as_of: '2025-11-01',
                  identity: {
                    scheme_name: 'HDFC Balanced Advantage Fund',
                    amfi_code: null,
                    isin: 'INF179KA1GN2',
                    category: null,
                    benchmark: null,
                    plan: null,
                    option: null
                  },
                  fees_aum: {
                    expense_ratio_pct: null,
                    aum_cr: null
                  },
                  risk_return: {
                    cagr_1y: null,
                    cagr_3y: null,
                    cagr_5y: null,
                    ret_ytd: null,
                    ret_1m: null,
                    ret_3m: null,
                    ret_6m: null,
                    vol_3y_ann: null,
                    max_dd_5y: null
                  },
                  source_evidence: [],
                  confidence: 'low',
                  notes: null
                }
              ])
            }
          }
        ]
      })
    ]

    const fetchMock = mockFetch(responses)

    const { fetchPerplexityFundFacts } = await import('../../lib/ai-coach-api/perplexity')
    const result = await fetchPerplexityFundFacts({
      funds: [
        {
          scheme_name: 'HDFC Balanced Advantage Fund',
          fund_id: null,
          isin: 'INF179KA1GN2',
          latest_nav: null,
          current_value: null
        }
      ]
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.status).toBe(200)
    expect(result.payload).toHaveLength(1)
  })

  it('throws when Perplexity returns non-JSON body', async () => {
    process.env.PERPLEXITY_API_KEY = 'test-key'

    mockFetch([
      jsonResponse({
        choices: [
          {
            message: {
              content: '{invalid_json'
            }
          }
        ]
      })
    ])

    const { fetchPerplexityFundFacts } = await import('../../lib/ai-coach-api/perplexity')

    await expect(
      fetchPerplexityFundFacts({
        funds: [
          {
            scheme_name: 'Axis Bluechip Fund',
            fund_id: '120503',
            isin: null,
            latest_nav: null,
            current_value: null
          }
        ]
      })
    ).rejects.toThrow('Failed to parse Perplexity JSON content')
  })
})

