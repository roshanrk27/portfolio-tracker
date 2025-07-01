-- Create NPS funds table for fund name to code mapping
CREATE TABLE IF NOT EXISTS nps_funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_name text NOT NULL,
  fund_code text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_nps_funds_fund_code ON nps_funds(fund_code);

-- Enable Row Level Security
ALTER TABLE nps_funds ENABLE ROW LEVEL SECURITY;

-- RLS Policies for nps_funds table (admin access only)
CREATE POLICY "Admin users can view all NPS funds"
  ON nps_funds FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM user_profiles WHERE role = 'admin'
  ));

CREATE POLICY "Admin users can insert NPS funds"
  ON nps_funds FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM user_profiles WHERE role = 'admin'
  ));

CREATE POLICY "Admin users can update NPS funds"
  ON nps_funds FOR UPDATE
  USING (auth.uid() IN (
    SELECT user_id FROM user_profiles WHERE role = 'admin'
  ));

CREATE POLICY "Admin users can delete NPS funds"
  ON nps_funds FOR DELETE
  USING (auth.uid() IN (
    SELECT user_id FROM user_profiles WHERE role = 'admin'
  ));

-- Trigger to automatically update updated_at
CREATE TRIGGER update_nps_funds_updated_at
  BEFORE UPDATE ON nps_funds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 