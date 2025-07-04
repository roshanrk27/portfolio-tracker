-- Add has_seen_onboarding column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN has_seen_onboarding BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.has_seen_onboarding IS 'Flag to track if user has seen the onboarding modal'; 