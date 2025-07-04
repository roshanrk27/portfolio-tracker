-- Create user_profiles records for existing users who don't have them
INSERT INTO user_profiles (user_id, role, has_seen_onboarding)
SELECT 
  id as user_id,
  'user' as role,
  FALSE as has_seen_onboarding
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_profiles)
ON CONFLICT (user_id) DO NOTHING;

-- Show how many records were created
SELECT COUNT(*) as new_profiles_created FROM user_profiles WHERE created_at > NOW() - INTERVAL '1 minute'; 