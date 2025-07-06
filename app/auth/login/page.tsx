'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isClient, setIsClient] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
      } else {
        router.push('/dashboard')
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
    <div className="grid grid-cols-1 md:grid-cols-3 min-h-screen">
      {/* Left Panel - 2/3 width on desktop */}
      <div className="md:col-span-2 bg-gradient-to-br from-green-500 via-green-400 to-yellow-400 p-6 md:p-10 flex items-center">
        <div className="max-w-2xl w-full">
          {/* Header and Branding */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 md:mb-6">SIPGoals</h1>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 md:mb-4">
              🎯 Take control of your financial goals
            </h2>
            <p className="text-base font-normal text-white/80 leading-relaxed">
              Track all your investments — Mutual Funds, Stocks, and NPS — in one place. Built for Indian investors, designed for simplicity.
            </p>
          </div>

          {/* Feature Highlights - 2 columns on mobile, single column on desktop */}
          <ul className="grid grid-cols-2 md:grid-cols-1 gap-3 md:gap-4 md:space-y-0">
            <li className="flex items-center space-x-2 md:space-x-3">
              <span className="text-xl md:text-2xl">📁</span>
              <span className="text-sm md:text-base text-white/90">Upload CAMS statements</span>
            </li>
            <li className="flex items-center space-x-2 md:space-x-3">
              <span className="text-xl md:text-2xl">🎯</span>
              <span className="text-sm md:text-base text-white/90">Create & manage goals</span>
            </li>
            <li className="flex items-center space-x-2 md:space-x-3">
              <span className="text-xl md:text-2xl">📊</span>
              <span className="text-sm md:text-base text-white/90">Get Mutual Fund XIRR</span>
            </li>
            <li className="flex items-center space-x-2 md:space-x-3">
              <span className="text-xl md:text-2xl">📈</span>
              <span className="text-sm md:text-base text-white/90">Visual dashboards</span>
            </li>
            <li className="flex items-center space-x-2 md:space-x-3 col-span-2 md:col-span-1">
              <span className="text-xl md:text-2xl">🔒</span>
              <span className="text-sm md:text-base text-white/90">Secure & private</span>
            </li>
          </ul>
        </div>
      </div>
      
      {/* Right Panel - 1/3 width on desktop */}
      <div className="md:col-span-1 flex justify-center items-center p-6 md:p-8 bg-gradient-to-br from-yellow-400 via-green-400 to-green-500">
        <div className="max-w-md w-full space-y-6 md:space-y-8">
          <div>
            <h2 className="mt-6 text-center text-2xl md:text-3xl font-extrabold text-white">
              Sign in to your account
            </h2>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div>
                <input
                  type="email"
                  required
                  className="rounded px-4 py-2 w-full border border-white/30 bg-white/90 placeholder-gray-600 text-gray-900 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white sm:text-sm backdrop-blur-sm"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <input
                  type="password"
                  required
                  className="rounded px-4 py-2 w-full border border-white/30 bg-white/90 placeholder-gray-600 text-gray-900 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white sm:text-sm backdrop-blur-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">{error}</div>
            )}

            <div className="mb-4 text-center">
              <div className="text-xs bg-emerald-100 text-emerald-800 rounded-full px-3 py-1 inline-block shadow-sm">
                ✅ 100% Free to Use
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-800 text-white font-semibold hover:bg-green-900 py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 transition-all duration-200 hover:scale-105"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>

            <div className="text-center">
              <Link href="/auth/signup" className="text-white/90 hover:text-white underline">
                Don&apos;t have an account? Sign up
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 