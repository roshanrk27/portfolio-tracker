-- Migration: Create fund_facts_llm cache table for Perplexity-backed fund facts
-- Run manually via Supabase SQL editor or `psql` (refer to project docs)

CREATE TABLE IF NOT EXISTS fund_facts_llm (
  fund_id TEXT NOT NULL,
  as_of_month DATE NOT NULL,
  payload JSONB NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('high','medium','low')),
  sources JSONB NOT NULL DEFAULT '[]',
  provenance TEXT NOT NULL DEFAULT 'llm+cited',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (fund_id, as_of_month)
);

CREATE INDEX IF NOT EXISTS idx_fund_facts_llm_conf ON fund_facts_llm (confidence);

-- Verification queries (optional):
-- SELECT * FROM fund_facts_llm LIMIT 1;
-- \d fund_facts_llm;

