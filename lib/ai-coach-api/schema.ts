import { z } from 'zod'

// Date regex for YYYY-MM-DD format
const dateRegex = /^\d{4}-\d{2}-\d{2}$/

export const FundFactsLLMSchema = z.object({
  fund_ident: z.object({
    query_name: z.string(),
    amfi_code: z.string().nullable(),
    isin: z.string().nullable(),
    scheme_name_official: z.string().nullable(),
    plan: z.enum(['Direct', 'Regular']).nullable(),
    option: z.enum(['Growth', 'IDCW']).nullable()
  }),
  facts: z.object({
    category: z.string().nullable(),
    benchmark: z.string().nullable(),
    expense_ratio_pct: z.number().nullable(),
    aum_cr: z.number().nullable()
  }),
  performance: z.object({
    as_of: z.string().regex(dateRegex).nullable(),
    cagr_1y: z.number().nullable(),
    cagr_3y: z.number().nullable(),
    cagr_5y: z.number().nullable(),
    ret_ytd: z.number().nullable(),
    ret_1m: z.number().nullable(),
    ret_3m: z.number().nullable(),
    ret_6m: z.number().nullable()
  }),
  risk_metrics: z.object({
    period: z.enum(['3Y', '5Y', '1Y']).nullable(),
    as_of: z.string().regex(dateRegex).nullable(),
    alpha: z.number().nullable(),
    beta: z.number().nullable(),
    sharpe_ratio: z.number().nullable(),
    sortino_ratio: z.number().nullable(),
    stddev_pct: z.number().nullable(),
    r_squared: z.number().nullable(),
    information_ratio: z.number().nullable(),
    source: z.string().nullable()
  }),
  sources: z.array(
    z.object({
      field: z.string(),
      url: z.string().url(),
      as_of: z.string().regex(dateRegex).nullable()
    })
  ),
  confidence: z.enum(['high', 'medium', 'low']),
  notes: z.string().nullable()
})

export type FundFactsLLMParsed = z.infer<typeof FundFactsLLMSchema>

