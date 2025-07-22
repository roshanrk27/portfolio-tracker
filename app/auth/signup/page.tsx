'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isClient, setIsClient] = useState(false)
  const [is18, setIs18] = useState(false)
  const [agreesToTerms, setAgreesToTerms] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    if (!is18 || !agreesToTerms) {
      setError('You must confirm you are 18 or older and agree to the Terms of Service and Privacy Policy.')
      return
    }
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) {
        setError(error.message)
      } else {
        setMessage('Check your email for the confirmation link!')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (!isClient) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSignup}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          {message && (
            <div className="text-green-600 text-sm text-center">{message}</div>
          )}

          <div className="space-y-3">
            <div className="flex items-start">
              <input
                id="is18"
                name="is18"
                type="checkbox"
                checked={is18}
                onChange={e => setIs18(e.target.checked)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mt-1"
                required
              />
              <label htmlFor="is18" className="ml-2 block text-sm text-gray-700">
                I am 18 years of age or older.
              </label>
            </div>
            <div className="flex items-start">
              <input
                id="agreesToTerms"
                name="agreesToTerms"
                type="checkbox"
                checked={agreesToTerms}
                onChange={e => setAgreesToTerms(e.target.checked)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mt-1"
                required
              />
              <label htmlFor="agreesToTerms" className="ml-2 block text-sm text-gray-700">
                I agree to the{' '}
                <Link href="/terms" target="_blank" className="text-blue-700 underline hover:text-blue-900">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" target="_blank" className="text-blue-700 underline hover:text-blue-900">Privacy Policy</Link>.
              </label>
            </div>
            <button
              type="submit"
              disabled={loading || !is18 || !agreesToTerms}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>

          <div className="text-center">
            <Link href="/auth/login" className="text-indigo-600 hover:text-indigo-500">
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
} 