-- ========================================
-- ARTICLES TABLE FOR PUBLIC INVESTING CONTENT
-- ========================================

-- Create articles table to store educational content
CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  subheading text,
  content_markdown text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Basic indexes for querying
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);

-- Enable Row Level Security
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS POLICIES FOR ARTICLES
-- ========================================

-- Public (including anon) can read articles
CREATE POLICY "Public can read articles"
  ON articles FOR SELECT
  USING (true);

-- Only admins can insert/update/delete articles
CREATE POLICY "Admins can manage articles"
  ON articles FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE role = 'admin'
    )
  );

-- Trigger function to keep updated_at fresh
CREATE OR REPLACE FUNCTION update_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_articles_updated_at();


