-- Table to store user NPS holdings
CREATE TABLE IF NOT EXISTS nps_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  fund_code text REFERENCES nps_funds(fund_code) ON DELETE CASCADE,
  units numeric NOT NULL,
  as_of_date date NOT NULL,
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW(),
  UNIQUE (user_id, fund_code)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_nps_holdings_user_id ON nps_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_nps_holdings_fund_code ON nps_holdings(fund_code);

-- Enable Row Level Security
ALTER TABLE nps_holdings ENABLE ROW LEVEL SECURITY;

-- RLS: Only allow users to access their own holdings
CREATE POLICY "Users can view their own NPS holdings"
  ON nps_holdings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own NPS holdings"
  ON nps_holdings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own NPS holdings"
  ON nps_holdings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own NPS holdings"
  ON nps_holdings FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_nps_holdings_updated_at
  BEFORE UPDATE ON nps_holdings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 