-- Add missing columns to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS folio_number TEXT,
ADD COLUMN IF NOT EXISTS isin TEXT,
ADD COLUMN IF NOT EXISTS unit_balance NUMERIC;

-- Add RLS policy for folio_number column access
CREATE POLICY "Users can view own transaction folio numbers" 
ON transactions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transaction folio numbers" 
ON transactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Verify the table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position; 