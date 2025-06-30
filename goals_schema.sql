-- Create goals table for financial goal tracking
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  target_amount numeric NOT NULL,
  target_date date NOT NULL,
  current_amount numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

-- Create goal-scheme mapping table
CREATE TABLE IF NOT EXISTS goal_scheme_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid REFERENCES goals(id) ON DELETE CASCADE,
  scheme_name text NOT NULL,
  folio text,
  allocation_percentage numeric DEFAULT 100,
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW(),
  UNIQUE(goal_id, scheme_name, folio)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_target_date ON goals(target_date);
CREATE INDEX IF NOT EXISTS idx_goal_scheme_mapping_goal_id ON goal_scheme_mapping(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_scheme_mapping_scheme ON goal_scheme_mapping(scheme_name);

-- Enable Row Level Security
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_scheme_mapping ENABLE ROW LEVEL SECURITY;

-- RLS Policies for goals table
CREATE POLICY "Users can view their own goals"
  ON goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
  ON goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON goals FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for goal_scheme_mapping table
CREATE POLICY "Users can view their own goal mappings"
  ON goal_scheme_mapping FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM goals 
      WHERE goals.id = goal_scheme_mapping.goal_id 
      AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own goal mappings"
  ON goal_scheme_mapping FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM goals 
      WHERE goals.id = goal_scheme_mapping.goal_id 
      AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own goal mappings"
  ON goal_scheme_mapping FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM goals 
      WHERE goals.id = goal_scheme_mapping.goal_id 
      AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own goal mappings"
  ON goal_scheme_mapping FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM goals 
      WHERE goals.id = goal_scheme_mapping.goal_id 
      AND goals.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goal_scheme_mapping_updated_at
  BEFORE UPDATE ON goal_scheme_mapping
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate goal progress
CREATE OR REPLACE FUNCTION calculate_goal_progress(goal_uuid uuid)
RETURNS TABLE (
  goal_id uuid,
  current_amount numeric,
  target_amount numeric,
  progress_percentage numeric,
  days_remaining integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id as goal_id,
    COALESCE(SUM(cp.current_value), 0) as current_amount,
    g.target_amount,
    CASE 
      WHEN g.target_amount > 0 THEN 
        (COALESCE(SUM(cp.current_value), 0) / g.target_amount) * 100
      ELSE 0 
    END as progress_percentage,
    EXTRACT(DAY FROM (g.target_date - CURRENT_DATE))::integer as days_remaining
  FROM goals g
  LEFT JOIN goal_scheme_mapping gsm ON g.id = gsm.goal_id
  LEFT JOIN current_portfolio cp ON (
    cp.scheme_name = gsm.scheme_name 
    AND (gsm.folio IS NULL OR cp.folio = gsm.folio)
    AND cp.user_id = g.user_id
  )
  WHERE g.id = goal_uuid
  GROUP BY g.id, g.target_amount, g.target_date;
END;
$$ LANGUAGE plpgsql; 