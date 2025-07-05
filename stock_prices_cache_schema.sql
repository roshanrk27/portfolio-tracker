-- Task T2: Create Supabase Table for Stock Price Cache
-- This table allows conversion tracking from foreign currencies to INR

CREATE TABLE stock_prices_cache (
  symbol TEXT PRIMARY KEY,
  price_inr NUMERIC NOT NULL,
  price_original NUMERIC,
  currency TEXT,
  exchange_rate_to_inr NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index on updated_at for efficient stale record queries
CREATE INDEX idx_stock_prices_cache_updated_at ON stock_prices_cache(updated_at);

-- Add RLS policy to allow all authenticated users to read
ALTER TABLE stock_prices_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read stock prices cache" ON stock_prices_cache
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service role to insert/update (for API routes)
CREATE POLICY "Allow service role to manage stock prices cache" ON stock_prices_cache
  FOR ALL USING (auth.role() = 'service_role'); 