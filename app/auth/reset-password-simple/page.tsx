'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function ResetPasswordSimplePage() {
  useEffect(() => {
    // Let Supabase handle the password reset automatically
    const handlePasswordReset = async () => {
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Session error:', error)
      } else if (data.session) {
        console.log('User is authenticated, redirecting to dashboard')
        window.location.href = '/dashboard'
      } else {
        console.log('No session, redirecting to login')
        window.location.href = '/auth/login'
      }
    }

    handlePasswordReset()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Processing Password Reset
          </h2>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">
            Please wait while we process your password reset...
          </p>
        </div>
      </div>
    </div>
  )
} 