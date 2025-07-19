'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    
    setLoading(true)
    setError('')
    setMessage('')

    try {
      console.log('Sending reset email to:', email)
      console.log('Redirect URL:', `${window.location.origin}/auth/reset-password`)
      
      // Use the current domain for redirect URL
      const redirectUrl = `${window.location.origin}/auth/reset-password`
      
      console.log('Using redirect URL:', redirectUrl)
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      })

      if (error) {
        setError(error.message)
      } else {
        setMessage('Check your email for a password reset link!')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
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
              🔐 Reset your password
            </h2>
            <p className="text-base font-normal leading-relaxed" style={{ color: '#1a202c' }}>
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3" style={{ color: '#1a202c' }}>What happens next?</h3>
            <ul className="space-y-2">
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">1.</span>
                <span className="text-sm" style={{ color: '#1a202c' }}>Check your email for a reset link</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">2.</span>
                <span className="text-sm" style={{ color: '#1a202c' }}>Click the link to set a new password</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">3.</span>
                <span className="text-sm" style={{ color: '#1a202c' }}>You&apos;ll be redirected to login to sign in with your new password</span>
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
                Forgot Password
              </h2>
            </div>
            
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div>
                <input
                  type="email"
                  required
                  className="rounded px-4 py-2 w-full border border-gray-400 bg-white placeholder-gray-600 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 sm:text-sm backdrop-blur-sm"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
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
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>

              <div className="text-center">
                <Link href="/auth/login" className="hover:underline" style={{ color: '#222' }}>
                  Back to Sign In
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
} 