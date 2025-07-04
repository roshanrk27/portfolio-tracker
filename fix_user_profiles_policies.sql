-- Drop the broken recursive policies that are causing infinite recursion
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;

-- Recreate the basic policies without recursion
-- Users can read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can insert their own profile (fallback)
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- For admin access, we'll handle it differently later if needed
-- For now, let's keep it simple and avoid recursion

-- Remove the updated_at trigger that's causing the error
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
DROP FUNCTION IF EXISTS update_user_profiles_updated_at(); 