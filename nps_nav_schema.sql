-- Table to store latest NAV per NPS fund
CREATE TABLE IF NOT EXISTS nps_nav (
  fund_code text PRIMARY KEY REFERENCES nps_funds(fund_code) ON DELETE CASCADE,
  nav numeric NOT NULL,
  nav_date date NOT NULL,
  created_at timestamp with time zone DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_nps_nav_nav_date ON nps_nav(nav_date);

-- Enable Row Level Security
ALTER TABLE nps_nav ENABLE ROW LEVEL SECURITY;

-- RLS: Allow all users to read, only admin to insert/update/delete
CREATE POLICY "Users can view NAVs"
  ON nps_nav FOR SELECT
  USING (true);

CREATE POLICY "Admin can upsert NAVs"
  ON nps_nav FOR INSERT, UPDATE, DELETE
  USING (auth.uid() IN (SELECT user_id FROM user_profiles WHERE role = 'admin')); 