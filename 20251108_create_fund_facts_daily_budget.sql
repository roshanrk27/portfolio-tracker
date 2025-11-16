-- Migration: Create table for tracking daily Perplexity API call budget
-- Purpose: Prevent runaway spend by capping daily API calls

CREATE TABLE IF NOT EXISTS fund_facts_daily_budget (
  date DATE NOT NULL PRIMARY KEY,
  call_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_fund_facts_daily_budget_date ON fund_facts_daily_budget (date);

-- Function to increment call count atomically
-- This ensures thread-safe increments even with concurrent requests
CREATE OR REPLACE FUNCTION increment_fund_facts_daily_budget()
RETURNS INTEGER AS $$
DECLARE
  today_date DATE;
  current_count INTEGER;
BEGIN
  today_date := CURRENT_DATE;
  
  -- Insert or update the count for today
  INSERT INTO fund_facts_daily_budget (date, call_count, updated_at)
  VALUES (today_date, 1, NOW())
  ON CONFLICT (date) 
  DO UPDATE SET 
    call_count = fund_facts_daily_budget.call_count + 1,
    updated_at = NOW()
  RETURNING call_count INTO current_count;
  
  RETURN current_count;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT increment_fund_facts_daily_budget();

