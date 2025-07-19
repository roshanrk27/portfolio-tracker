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
      <div className="md:col-span-2 p-6 md:p-10 flex items-center relative" style={{ background: 'linear-gradient(135deg, #A3D6F5 0%, #66A7C5 60%, #B2D9C4 100%)' }}>
        {/* Decorative Side Border */}
        <div className="absolute left-0 top-6 bottom-6 rounded-full" style={{ width: '10px', background: '#66A7C5', boxShadow: '2px 0 8px 0 rgba(102,167,197,0.15)', zIndex: 20 }} />
        <div className="max-w-2xl w-full relative z-10">
          {/* Header and Branding */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-3xl md:text-4xl font-bold" style={{ color: '#1a202c' }}>SIPGoals</h1>
            <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4" style={{ color: '#1a202c' }}>
              🎯 Take control of your financial goals
            </h2>
            <p className="text-base font-normal leading-relaxed" style={{ color: '#1a202c' }}>
              Track all your investments — Mutual Funds, Stocks, and NPS — in one place. Built for Indian investors, designed for simplicity.
            </p>
          </div>

          {/* Feature Highlights */}
          <ul className="grid grid-cols-2 grid-rows-3 gap-3 md:gap-4 md:space-y-0">
            <li className="flex items-center space-x-2 md:space-x-3">
              <span className="text-xl md:text-2xl">📁</span>
              <span className="text-sm md:text-base" style={{ color: '#1a202c' }}>Upload CAMS statements</span>
            </li>
            <li className="flex items-center space-x-2 md:space-x-3">
              <span className="text-xl md:text-2xl">🎯</span>
              <span className="text-sm md:text-base" style={{ color: '#1a202c' }}>Create & manage goals</span>
            </li>
            <li className="flex items-center space-x-2 md:space-x-3">
              <span className="text-xl md:text-2xl">📊</span>
              <span className="text-sm md:text-base" style={{ color: '#1a202c' }}>Get Mutual Fund XIRR</span>
            </li>
            <li className="flex items-center space-x-2 md:space-x-3">
              <span className="text-xl md:text-2xl">📈</span>
              <span className="text-sm md:text-base" style={{ color: '#1a202c' }}>Visual dashboards</span>
            </li>
            <li className="flex items-center space-x-2 md:space-x-3">
              <span className="text-xl md:text-2xl">🔒</span>
              <span className="text-sm md:text-base" style={{ color: '#1a202c' }}>Secure & private</span>
            </li>
            <li className="flex items-center space-x-2 md:space-x-3">
              <span className="text-xl md:text-2xl">🧮</span>
              <span className="text-sm md:text-base" style={{ color: '#1a202c' }}>Simulate Goal Scenarios</span>
            </li>
          </ul>
        </div>
      </div>
      
      {/* Right Panel - 1/3 width on desktop */}
      <div className="md:col-span-1 flex justify-center items-center p-6 md:p-8" style={{ background: 'radial-gradient(circle at 70% 30%, #e0f3ff 0%, #CEEBFB 70%, #fff 100%)' }}>
        <div className="max-w-md w-full flex justify-center items-center">
          <div className="w-full p-6 md:p-8 rounded-2xl shadow-lg bg-white/70 backdrop-blur-md">
            <div>
              <h2 className="mt-6 text-center text-2xl md:text-3xl font-extrabold" style={{ color: '#222' }}>
                Sign in to your account
              </h2>
            </div>
            <form className="mt-8 space-y-6" onSubmit={handleLogin}>
              <div className="space-y-4">
                <div>
                  <input
                    type="email"
                    required
                    className="rounded px-4 py-2 w-full border border-gray-400 bg-white placeholder-gray-600 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 sm:text-sm backdrop-blur-sm"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <input
                    type="password"
                    required
                    className="rounded px-4 py-2 w-full border border-gray-400 bg-white placeholder-gray-600 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 sm:text-sm backdrop-blur-sm"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <div className="mt-2 text-right">
                    <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
                      Forgot your password?
                    </Link>
                  </div>
                </div>
              </div>

              {error && (
                <div className="text-red-600 text-sm text-center">{error}</div>
              )}

              <div className="mb-4 text-center">
                <div className="text-xs bg-blue-100 text-blue-800 rounded-full px-3 py-1 inline-block shadow-sm">
                  ✅ 100% Free to Use
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full font-semibold py-2 px-4 rounded bg-blue-600 hover:bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>

              <div className="text-center">
                <Link href="/auth/signup" className="hover:underline" style={{ color: '#222' }}>
                  Don&apos;t have an account? Sign up
                </Link>
              </div>

              {/* Legal Links */}
              <div className="text-center pt-4 border-t border-gray-200">
                <div className="flex justify-center items-center space-x-4 text-xs text-gray-500">
                  <Link href="/terms" className="hover:text-gray-700 hover:underline">
                    Terms of Service
                  </Link>
                  <span>•</span>
                  <Link href="/privacy" className="hover:text-gray-700 hover:underline">
                    Privacy Policy
                  </Link>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
} 