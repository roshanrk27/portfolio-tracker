'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ResetPasswordContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isValidLink, setIsValidLink] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    setIsClient(true)
    
    // Try multiple ways to get URL parameters
    const urlParams = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    
    // Debug: Log all possible parameter sources
    console.log('Window location search:', window.location.search)
    console.log('Window location hash:', window.location.hash)
    console.log('URLSearchParams from search:', Object.fromEntries(urlParams.entries()))
    console.log('URLSearchParams from hash:', Object.fromEntries(hashParams.entries()))
    console.log('Next.js searchParams:', Object.fromEntries(searchParams.entries()))
    
    // Check if we have the necessary URL parameters for password reset
    const accessToken = searchParams.get('access_token') || urlParams.get('access_token') || hashParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token') || urlParams.get('refresh_token') || hashParams.get('refresh_token')
    const type = searchParams.get('type') || urlParams.get('type') || hashParams.get('type')
    
    // Supabase might send different parameter names, let's check for alternatives
    const token = searchParams.get('token') || urlParams.get('token') || hashParams.get('token')
    const recovery = searchParams.get('recovery') || urlParams.get('recovery') || hashParams.get('recovery')
    
    console.log('Final tokens found:', { accessToken, refreshToken, type, token, recovery })
    
    // More flexible validation - check for any of the possible token parameters
    if ((accessToken && refreshToken && type === 'recovery') || 
        (token && recovery === 'true') ||
        accessToken) {
      setIsValidLink(true)
      console.log('Link validated successfully')
    } else {
      setError('Invalid or expired reset link. Please request a new one.')
      console.log('Link validation failed')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase || !isValidLink) return

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)
    setError('')

    try {
      // First, try to set the session from URL parameters if available
      const urlParams = new URLSearchParams(window.location.search)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      
      const accessToken = searchParams.get('access_token') || urlParams.get('access_token') || hashParams.get('access_token')
      const refreshToken = searchParams.get('refresh_token') || urlParams.get('refresh_token') || hashParams.get('refresh_token')
      
      if (accessToken && refreshToken) {
        console.log('Setting session from URL parameters')
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })
        
        if (sessionError) {
          console.log('Session error:', sessionError)
        }
      }

      // Now update the password
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        setError(error.message)
        console.log('Password update error:', error)
      } else {
        setMessage('Password updated successfully! You will be redirected to the login page to sign in with your new password.')
        
        // Check if user has an active session
        const { data: { session } } = await supabase.auth.getSession()
        console.log('Session after password update:', session ? 'Active' : 'None')
        
        // Always redirect to login after password reset for security
        // This ensures users must log in with their new password
        setTimeout(() => {
          router.push('/auth/login')
        }, 2000)
      }
    } catch (err) {
      console.log('Unexpected error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (!isClient) {
    return <div>Loading...</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 min-h-screen">
      {/* Left Panel - 2/3 width on desktop */}
      <div className="md:col-span-2 p-6 md:p-10 flex items-center relative" style={{ background: 'linear-gradient(135deg, #A3D6F5 0%, #66A7C5 60%, #B2D9C4 100%)' }}>
        {/* Decorative Side Border */}
        <div className="absolute left-0 top-6 bottom-6 rounded-full" style={{ width: '10px', background: '#66A7C5', boxShadow: '2px 0 8px 0 rgba(102,167,197,0.15)', zIndex: 20 }} />
        <div className="max-w-2xl w-full relative z-10">
          {/* Header and Branding */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-3xl md:text-4xl font-bold" style={{ color: '#1a202c' }}>SIPGoals</h1>
            <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4" style={{ color: '#1a202c' }}>
              🔐 Set New Password
            </h2>
            <p className="text-base font-normal leading-relaxed" style={{ color: '#1a202c' }}>
              Enter your new password below. Make sure it&apos;s secure and easy to remember.
            </p>
          </div>

          {/* Password Requirements */}
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3" style={{ color: '#1a202c' }}>Password Requirements</h3>
            <ul className="space-y-2">
              <li className="flex items-start space-x-2">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-sm" style={{ color: '#1a202c' }}>At least 6 characters long</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">💡</span>
                <span className="text-sm" style={{ color: '#1a202c' }}>Use a mix of letters, numbers, and symbols</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">💡</span>
                <span className="text-sm" style={{ color: '#1a202c' }}>Avoid common passwords</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Right Panel - 1/3 width on desktop */}
      <div className="md:col-span-1 flex justify-center items-center p-6 md:p-8" style={{ background: 'radial-gradient(circle at 70% 30%, #e0f3ff 0%, #CEEBFB 70%, #fff 100%)' }}>
        <div className="max-w-md w-full flex justify-center items-center">
          <div className="w-full p-6 md:p-8 rounded-2xl shadow-lg bg-white/70 backdrop-blur-md">
            <div>
              <h2 className="mt-6 text-center text-2xl md:text-3xl font-extrabold" style={{ color: '#222' }}>
                Reset Password
              </h2>
            </div>
            
            {!isValidLink ? (
              <div className="mt-8 space-y-6">
                <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
                <div className="text-center">
                  <Link href="/auth/forgot-password" className="text-blue-600 hover:text-blue-800 hover:underline">
                    Request New Reset Link
                  </Link>
                </div>
              </div>
            ) : (
              <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <input
                      type="password"
                      required
                      className="rounded px-4 py-2 w-full border border-gray-400 bg-white placeholder-gray-600 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 sm:text-sm backdrop-blur-sm"
                      placeholder="New password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      required
                      className="rounded px-4 py-2 w-full border border-gray-400 bg-white placeholder-gray-600 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 sm:text-sm backdrop-blur-sm"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-red-600 text-sm text-center">{error}</div>
                )}

                {message && (
                  <div className="text-green-600 text-sm text-center bg-green-50 p-3 rounded-lg">
                    {message}
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full font-semibold py-2 px-4 rounded bg-blue-600 hover:bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>

                <div className="text-center">
                  <Link href="/auth/login" className="hover:underline" style={{ color: '#222' }}>
                    Back to Sign In
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
} 