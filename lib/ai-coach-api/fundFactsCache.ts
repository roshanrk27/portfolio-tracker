import { aiCoachConfig } from './config'
import type { FundFactsLLM, FundFactsConfidence } from './types'

export interface FundFactsCacheRecord {
  fund_id: string
  as_of_month: string
  payload: FundFactsLLM[]
  confidence: FundFactsConfidence
  sources: unknown[]
  provenance: string
  created_at: string
}

const TABLE_NAME = 'fund_facts_llm'

type SupabaseUpsertResult = { error: { message: string } | null }

interface SupabaseQueryBuilder<T> {
  select(columns: string): SupabaseQueryBuilder<T>
  eq(column: string, value: unknown): SupabaseQueryBuilder<T>
  gte(column: string, value: unknown): SupabaseQueryBuilder<T>
  order(column: string, options: { ascending: boolean }): SupabaseQueryBuilder<T>
  limit(count: number): SupabaseQueryBuilder<T>
  maybeSingle(): Promise<{ data: T | null; error: { message: string } | null }>
}

export interface SupabaseLike {
  from<T>(table: string): SupabaseQueryBuilder<T> & {
    upsert(values: Partial<T> | Partial<T>[]): Promise<SupabaseUpsertResult>
  }
}

export async function getFreshFundFacts(
  supabase: SupabaseLike,
  fundId: string
): Promise<FundFactsCacheRecord | null> {
  const ttlDays = aiCoachConfig.fundFacts.ttlDays
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - ttlDays)

  const { data, error } = await supabase
    .from<FundFactsCacheRecord>(TABLE_NAME)
    .select('*')
    .eq('fund_id', fundId)
    .gte('created_at', cutoffDate.toISOString())
    .order('as_of_month', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to read fund_facts_llm cache: ${error.message}`)
  }

  return data ?? null
}

export async function upsertFundFacts(
  supabase: SupabaseLike,
  record: {
    fund_id: string
    as_of_month: string
    payload: FundFactsLLM[]
    confidence: FundFactsConfidence
    sources: unknown[]
    provenance?: string
  }
): Promise<void> {
  const { error } = await supabase
    .from(TABLE_NAME)
    .upsert({
      fund_id: record.fund_id,
      as_of_month: record.as_of_month,
      payload: record.payload,
      confidence: record.confidence,
      sources: record.sources,
      provenance: record.provenance ?? 'llm+cited'
    })

  if (error) {
    throw new Error(`Failed to upsert fund_facts_llm: ${error.message}`)
  }
}

