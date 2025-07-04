'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getUserProfile, debugUserProfilesTable, resetOnboardingStatus } from '@/lib/onboardingUtils'
import OnboardingModal from './OnboardingModal'

interface OnboardingProviderProps {
  children: React.ReactNode
}

export default function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Fetch user profile to check onboarding status
  const { data: userProfile, isLoading, error } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      // Debug the table first
      await debugUserProfilesTable()
      return getUserProfile()
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
    // Only run query if we're on the client side
    enabled: typeof window !== 'undefined',
  })

  // Show onboarding modal if user hasn't seen it
  useEffect(() => {
    console.log('OnboardingProvider: userProfile:', userProfile, 'isLoading:', isLoading, 'error:', error)
    
    if (!isLoading && userProfile && !userProfile.has_seen_onboarding) {
      console.log('Showing onboarding modal for user:', userProfile.user_id)
      setShowOnboarding(true)
    } else if (!isLoading && userProfile && userProfile.has_seen_onboarding) {
      console.log('User has already seen onboarding, not showing modal')
    } else if (!isLoading && !userProfile) {
      console.log('No user profile found, not showing onboarding modal')
    }
  }, [userProfile, isLoading, error])

  const handleCloseOnboarding = () => {
    console.log('Closing onboarding modal')
    setShowOnboarding(false)
  }

  const handleShowOnboarding = useCallback(async () => {
    try {
      await resetOnboardingStatus()
      setShowOnboarding(true)
    } catch (error) {
      console.error('Error showing onboarding:', error)
    }
  }, [])

  // Expose the show onboarding function globally
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as { showOnboarding?: () => void }).showOnboarding = handleShowOnboarding
    }
  }, [handleShowOnboarding])

  return (
    <>
      {children}
      {showOnboarding && (
        <OnboardingModal onClose={handleCloseOnboarding} />
      )}
    </>
  )
} 