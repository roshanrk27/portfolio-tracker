import { supabase } from './supabaseClient'

export interface UserProfile {
  user_id: string
  role?: string
  has_seen_onboarding: boolean
}

/**
 * Debug function to test database connection and table structure
 */
export async function debugUserProfilesTable() {
  try {
    console.log('=== DEBUG: Testing user_profiles table ===')
    
    const { data: { session } } = await supabase.auth.getSession()
    console.log('Session user ID:', session?.user?.id)
    
    // Test basic table access
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('DEBUG: Error accessing user_profiles table:', error)
    } else {
      console.log('DEBUG: Successfully accessed user_profiles table')
      console.log('DEBUG: Sample data structure:', data)
    }
    
    console.log('=== END DEBUG ===')
  } catch (error) {
    console.error('DEBUG: Unexpected error:', error)
  }
}

/**
 * Fetch user profile including onboarding status
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) {
      console.log('No session found, user not authenticated')
      return null
    }

    console.log('Fetching user profile for user:', session.user.id)

    // First, let's check if the user_profiles table exists and has the right columns
    const { error: tableError } = await supabase
      .from('user_profiles')
      .select('user_id, has_seen_onboarding')
      .limit(1)

    if (tableError) {
      console.error('Error checking user_profiles table:', tableError)
      console.error('Table error details:', {
        code: tableError.code,
        message: tableError.message,
        details: tableError.details,
        hint: tableError.hint
      })
      return null
    }

    console.log('user_profiles table exists with has_seen_onboarding column, proceeding with query')

    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, role, has_seen_onboarding')
      .eq('user_id', session.user.id)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      
      // If record doesn't exist, create one with default values
      if (error.code === 'PGRST116') {
        console.log('User profile not found, creating new profile')
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: session.user.id,
            has_seen_onboarding: false
          })
          .select('user_id, role, has_seen_onboarding')
          .single()

        if (createError) {
          console.error('Error creating user profile:', createError)
          console.error('Create error details:', {
            code: createError.code,
            message: createError.message,
            details: createError.details,
            hint: createError.hint
          })
          return null
        }

        return newProfile
      }
      
      return null
    }

    console.log('User profile found:', data)
    return data
  } catch (error) {
    console.error('Error in getUserProfile:', error)
    console.error('Full error object:', error)
    return null
  }
}

/**
 * Mark onboarding as seen for the current user
 */
export async function markOnboardingAsSeen(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) {
      console.log('No session found, cannot mark onboarding as seen')
      return false
    }

    console.log('Marking onboarding as seen for user:', session.user.id)

    // First, check if the user_profiles record exists
    const { error: checkError } = await supabase
      .from('user_profiles')
      .select('user_id, has_seen_onboarding')
      .eq('user_id', session.user.id)
      .single()

    if (checkError) {
      console.error('Error checking existing profile:', checkError)
      console.error('Check error details:', {
        code: checkError.code,
        message: checkError.message,
        details: checkError.details,
        hint: checkError.hint
      })
      
      // If record doesn't exist, create it with has_seen_onboarding = true
      if (checkError.code === 'PGRST116') {
        console.log('User profile not found, creating with has_seen_onboarding = true')
        const { error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: session.user.id,
            has_seen_onboarding: true
          })
          .select('user_id, has_seen_onboarding')
          .single()

        if (createError) {
          console.error('Error creating user profile:', createError)
          console.error('Create error details:', {
            code: createError.code,
            message: createError.message,
            details: createError.details,
            hint: createError.hint
          })
          return false
        }

        console.log('Successfully created profile with has_seen_onboarding = true')
        return true
      }
      
      return false
    }

    // If profile exists, update it
    console.log('Profile exists, updating has_seen_onboarding to true')
    const { data: updateResult, error } = await supabase
      .from('user_profiles')
      .update({ has_seen_onboarding: true })
      .eq('user_id', session.user.id)
      .select('user_id, has_seen_onboarding')

    if (error) {
      console.error('Error updating onboarding status:', error)
      console.error('Update error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return false
    }

    console.log('Update result:', updateResult)
    console.log('Successfully marked onboarding as seen')
    return true
  } catch (error) {
    console.error('Error in markOnboardingAsSeen:', error)
    console.error('Full error object:', error)
    return false
  }
}

/**
 * Reset onboarding status to show modal again
 */
export async function resetOnboardingStatus(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) {
      console.log('No session found, cannot reset onboarding status')
      return false
    }

    console.log('Resetting onboarding status for user:', session.user.id)

    const { error } = await supabase
      .from('user_profiles')
      .update({ has_seen_onboarding: false })
      .eq('user_id', session.user.id)

    if (error) {
      console.error('Error resetting onboarding status:', error)
      return false
    }

    console.log('Successfully reset onboarding status')
    return true
  } catch (error) {
    console.error('Error in resetOnboardingStatus:', error)
    return false
  }
} 