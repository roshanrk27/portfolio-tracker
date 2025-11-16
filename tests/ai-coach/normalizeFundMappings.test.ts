import { describe, expect, it } from 'vitest'
import { normalizeFundMappings } from '../../lib/ai-coach-api/helpers'

describe('normalizeFundMappings', () => {
  it('deduplicates by fund_id, isin, or scheme name and keeps best data', () => {
    const result = normalizeFundMappings([
      {
        scheme_name: 'Axis Bluechip Fund',
        fund_id: '120503',
        isin: null,
        latest_nav: 45.12,
        current_value: 100000
      },
      {
        scheme_name: 'Axis Bluechip Fund - Direct Plan',
        fund_id: '120503',
        isin: 'INF846K01AB1',
        latest_nav: null,
        current_value: 100500
      },
      {
        scheme_name: 'HDFC Balanced Advantage Fund',
        fund_id: null,
        isin: 'INF179KA1GN2',
        latest_nav: 120.45,
        current_value: null
      },
      {
        scheme_name: 'HDFC Balanced Advantage Fund',
        fund_id: null,
        isin: null,
        latest_nav: 121,
        current_value: 50000
      },
      {
        scheme_name: 'Empty Name',
        fund_id: null,
        isin: null,
        latest_nav: null,
        current_value: null
      }
    ])

    expect(result).toEqual([
      {
        scheme_name: 'Axis Bluechip Fund',
        fund_id: '120503',
        isin: 'INF846K01AB1',
        latest_nav: 45.12,
        current_value: 100000
      },
      {
        scheme_name: 'HDFC Balanced Advantage Fund',
        fund_id: null,
        isin: 'INF179KA1GN2',
        latest_nav: 120.45,
        current_value: 50000
      }
    ])
  })

  it('returns empty array when inputs have no scheme name', () => {
    expect(
      normalizeFundMappings([
        { scheme_name: null, fund_id: null, isin: null },
        { scheme_name: '   ', fund_id: '123', isin: null }
      ])
    ).toEqual([])
  })
})

