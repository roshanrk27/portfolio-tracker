'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const router = useRouter()

  const checkAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/auth/login')
      return
    }
    setIsAuthenticated(true)
  }, [router])

  useEffect(() => {
    setIsClient(true)
    checkAuth()
  }, [checkAuth])

  const validatePassword = (password: string) => {
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)
    const isLongEnough = password.length >= 8
    
    return {
      isValid: hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar && isLongEnough,
      errors: {
        length: !isLongEnough ? 'At least 8 characters required' : null,
        uppercase: !hasUpperCase ? 'At least one uppercase letter required' : null,
        lowercase: !hasLowerCase ? 'At least one lowercase letter required' : null,
        numbers: !hasNumbers ? 'At least one number required' : null,
        special: !hasSpecialChar ? 'At least one special character required' : null
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase || !isAuthenticated) return

    // Clear previous messages
    setError('')
    setMessage('')

    // Validate new password
    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.isValid) {
      const errorMessages = Object.values(passwordValidation.errors).filter(Boolean)
      setError(`Password requirements not met: ${errorMessages.join(', ')}`)
      return
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    // Check if new password is different from current
    if (currentPassword === newPassword) {
      setError('New password must be different from current password')
      return
    }

    setLoading(true)

    try {
      // Update password using Supabase
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        setError(error.message)
      } else {
        setMessage('Password updated successfully!')
        // Clear form
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      }
    } catch (err) {
      console.error('Password update error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isClient) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return <div>Redirecting to login...</div>
  }

  const passwordValidation = validatePassword(newPassword)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Change Password</h1>
          <p className="text-gray-600 mt-2">Update your account password</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current Password */}
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <input
                id="currentPassword"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your current password"
              />
            </div>

            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  newPassword && !passwordValidation.isValid ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your new password"
              />
              
              {/* Password Requirements */}
              {newPassword && (
                <div className="mt-2 text-sm">
                  <div className="font-medium text-gray-700 mb-2">Password Requirements:</div>
                  <div className="space-y-1">
                    <div className={`flex items-center ${passwordValidation.errors.length ? 'text-red-600' : 'text-green-600'}`}>
                      <span className="mr-2">{passwordValidation.errors.length ? '✗' : '✓'}</span>
                      At least 8 characters
                    </div>
                    <div className={`flex items-center ${passwordValidation.errors.uppercase ? 'text-red-600' : 'text-green-600'}`}>
                      <span className="mr-2">{passwordValidation.errors.uppercase ? '✗' : '✓'}</span>
                      At least one uppercase letter (A-Z)
                    </div>
                    <div className={`flex items-center ${passwordValidation.errors.lowercase ? 'text-red-600' : 'text-green-600'}`}>
                      <span className="mr-2">{passwordValidation.errors.lowercase ? '✗' : '✓'}</span>
                      At least one lowercase letter (a-z)
                    </div>
                    <div className={`flex items-center ${passwordValidation.errors.numbers ? 'text-red-600' : 'text-green-600'}`}>
                      <span className="mr-2">{passwordValidation.errors.numbers ? '✗' : '✓'}</span>
                      At least one number (0-9)
                    </div>
                    <div className={`flex items-center ${passwordValidation.errors.special ? 'text-red-600' : 'text-green-600'}`}>
                      <span className="mr-2">{passwordValidation.errors.special ? '✗' : '✓'}</span>
                      At least one special character (!@#$%^&*)
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  confirmPassword && newPassword !== confirmPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Confirm your new password"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            {/* Success Message */}
            {message && (
              <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md">
                {message}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !passwordValidation.isValid || newPassword !== confirmPassword || !currentPassword}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
} 