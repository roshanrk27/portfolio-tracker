-- Add exchange column to stocks table
ALTER TABLE stocks 
ADD COLUMN IF NOT EXISTS exchange TEXT DEFAULT 'NSE';

-- Create index for better performance on exchange queries
CREATE INDEX IF NOT EXISTS idx_stocks_exchange ON stocks(exchange);

-- Update existing stocks to have NSE as default exchange
UPDATE stocks 
SET exchange = 'NSE' 
WHERE exchange IS NULL;

-- Add unique constraint to prevent duplicate stock holdings per user
ALTER TABLE stocks
ADD CONSTRAINT stocks_user_stock_exchange_unique UNIQUE (user_id, stock_code, exchange); 