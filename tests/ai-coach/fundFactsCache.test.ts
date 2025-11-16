import { describe, expect, it, vi, afterEach } from 'vitest'
import type { FundFactsLLM } from '../../lib/ai-coach-api/types'
import { getFreshFundFacts, upsertFundFacts } from '../../lib/ai-coach-api/fundFactsCache'

function createMockSupabase() {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    upsert: vi.fn()
  }

  return {
    builder,
    supabase: {
      from: vi.fn(() => builder)
    }
  }
}

let mock = createMockSupabase()

afterEach(() => {
  vi.clearAllMocks()
  mock = createMockSupabase()
})

describe('fundFactsCache', () => {
  it('returns null when no fresh data found', async () => {
    mock.builder.maybeSingle.mockResolvedValue({ data: null, error: null })

    const result = await getFreshFundFacts(mock.supabase as any, '120503')
    expect(result).toBeNull()
    expect(mock.supabase.from).toHaveBeenCalledWith('fund_facts_llm')
  })

  it('throws when select fails', async () => {
    mock.builder.maybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } })

    await expect(getFreshFundFacts(mock.supabase as any, '120503')).rejects.toThrow('boom')
  })

  it('returns record when data is fresh', async () => {
    const record = {
      fund_id: '120503',
      as_of_month: '2025-11-01',
      payload: [] as FundFactsLLM[],
      confidence: 'medium',
      sources: [],
      provenance: 'llm+cited',
      created_at: new Date().toISOString()
    }

    mock.builder.maybeSingle.mockResolvedValue({ data: record, error: null })

    const result = await getFreshFundFacts(mock.supabase as any, '120503')
    expect(result).toEqual(record)
  })

  it('upserts a record and handles errors', async () => {
    mock.builder.upsert.mockResolvedValue({ error: null })

    await upsertFundFacts(mock.supabase as any, {
      fund_id: '120503',
      as_of_month: '2025-11-01',
      payload: [],
      confidence: 'medium',
      sources: []
    })
    expect(mock.builder.upsert).toHaveBeenCalled()
  })

  it('throws when upsert fails', async () => {
    mock.builder.upsert.mockResolvedValue({ error: { message: 'insert failed' } })

    await expect(
      upsertFundFacts(mock.supabase as any, {
        fund_id: 'fail',
        as_of_month: '2025-11-01',
        payload: [],
        confidence: 'medium',
        sources: []
      })
    ).rejects.toThrow('insert failed')
  })
})

