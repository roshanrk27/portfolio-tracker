-- ========================================
-- RLS POLICIES FOR PORTFOLIO TRACKER
-- ========================================

-- Enable RLS on all tables
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE current_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE nav_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

-- ========================================
-- TRANSACTIONS TABLE POLICIES
-- ========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;

-- Create comprehensive policies for transactions
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- CURRENT_PORTFOLIO TABLE POLICIES
-- ========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own portfolio" ON current_portfolio;
DROP POLICY IF EXISTS "Users can insert own portfolio" ON current_portfolio;
DROP POLICY IF EXISTS "Users can update own portfolio" ON current_portfolio;
DROP POLICY IF EXISTS "Users can delete own portfolio" ON current_portfolio;

-- Create comprehensive policies for current_portfolio
CREATE POLICY "Users can view own portfolio"
  ON current_portfolio FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolio"
  ON current_portfolio FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolio"
  ON current_portfolio FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolio"
  ON current_portfolio FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- NAV_DATA TABLE POLICIES
-- ========================================

-- Note: nav_data is public data from AMFI, but we'll restrict access
-- to prevent abuse and ensure proper usage

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view nav data" ON nav_data;
DROP POLICY IF EXISTS "Service role can manage nav data" ON nav_data;

-- Create policies for nav_data (read-only for authenticated users)
CREATE POLICY "Authenticated users can view nav data"
  ON nav_data FOR SELECT
  USING (auth.role() = 'authenticated');

-- Service role can manage nav data (for admin updates)
CREATE POLICY "Service role can manage nav data"
  ON nav_data FOR ALL
  USING (auth.role() = 'service_role');

-- ========================================
-- UPLOADS TABLE POLICIES
-- ========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own uploads" ON uploads;
DROP POLICY IF EXISTS "Users can insert own uploads" ON uploads;
DROP POLICY IF EXISTS "Users can update own uploads" ON uploads;
DROP POLICY IF EXISTS "Users can delete own uploads" ON uploads;

-- Create comprehensive policies for uploads
CREATE POLICY "Users can view own uploads"
  ON uploads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own uploads"
  ON uploads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own uploads"
  ON uploads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own uploads"
  ON uploads FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- STORAGE BUCKET POLICIES
-- ========================================

-- Note: These need to be applied in Supabase Dashboard or via CLI
-- Storage bucket: 'uploads'

-- Policy for authenticated users to upload files
-- CREATE POLICY "Authenticated users can upload files"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'uploads' AND 
--     auth.role() = 'authenticated' AND
--     (storage.foldername(name))[1] = auth.uid()::text
--   );

-- Policy for users to view their own uploaded files
-- CREATE POLICY "Users can view own uploaded files"
--   ON storage.objects FOR SELECT
--   USING (
--     bucket_id = 'uploads' AND 
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- Policy for users to update their own uploaded files
-- CREATE POLICY "Users can update own uploaded files"
--   ON storage.objects FOR UPDATE
--   USING (
--     bucket_id = 'uploads' AND 
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- Policy for users to delete their own uploaded files
-- CREATE POLICY "Users can delete own uploaded files"
--   ON storage.objects FOR DELETE
--   USING (
--     bucket_id = 'uploads' AND 
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Check which tables have RLS enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('transactions', 'current_portfolio', 'nav_data', 'uploads', 'goals', 'goal_scheme_mapping')
ORDER BY tablename;

-- Check existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('transactions', 'current_portfolio', 'nav_data', 'uploads', 'goals', 'goal_scheme_mapping')
ORDER BY tablename, policyname; 