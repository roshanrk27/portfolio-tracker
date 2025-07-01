-- Create stocks table for stock investments
CREATE TABLE IF NOT EXISTS stocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  stock_code text NOT NULL,
  quantity numeric NOT NULL,
  purchase_date date NOT NULL,
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stocks_user_id ON stocks(user_id);
CREATE INDEX IF NOT EXISTS idx_stocks_stock_code ON stocks(stock_code);
CREATE INDEX IF NOT EXISTS idx_stocks_purchase_date ON stocks(purchase_date);

-- Enable Row Level Security
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stocks table
CREATE POLICY "Users can view their own stocks"
  ON stocks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stocks"
  ON stocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stocks"
  ON stocks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stocks"
  ON stocks FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to automatically update updated_at
CREATE TRIGGER update_stocks_updated_at
  BEFORE UPDATE ON stocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 