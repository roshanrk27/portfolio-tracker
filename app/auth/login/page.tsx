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
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Layout */}
      <div className="lg:hidden">
        {/* Hero Section for Mobile */}
        <div className="bg-gradient-to-r from-blue-400 to-indigo-500 py-12 px-4">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-3xl font-bold text-white mb-4">
              Welcome back to your goals
            </h1>
            <p className="text-blue-100 mb-6">
              Sign in to continue tracking your investment goals and see your portfolio progress.
            </p>
            
            {/* Feature Highlights */}
            <div className="grid grid-cols-2 gap-3 text-sm text-blue-100">
              <div className="flex items-center justify-center space-x-2">
                <span>📊</span>
                <span>Track portfolio</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span>🎯</span>
                <span>Manage goals</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span>📈</span>
                <span>View insights</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span>🧮</span>
                <span>Run simulations</span>
              </div>
            </div>
          </div>
        </div>

        {/* Login Form for Mobile */}
        <div className="px-4 py-8">
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-lg shadow-xl p-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Sign in to your account
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  Welcome back! Please enter your details.
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleLogin}>
                <div>
                  <label htmlFor="email-mobile" className="block text-sm font-medium text-gray-700 mb-1">
                    Email address
                  </label>
                  <input
                    id="email-mobile"
                    type="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="password-mobile" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="password-mobile"
                    type="password"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <div className="mt-1 text-right">
                    <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
                      Forgot your password?
                    </Link>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-center">
                  <div className="text-xs bg-blue-100 text-blue-800 rounded-full px-3 py-1 inline-block">
                    ✅ 100% Free to Use
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Signing in...
                      </div>
                    ) : (
                      'Sign in'
                    )}
                  </button>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Don&apos;t have an account?{' '}
                    <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-800 hover:underline">
                      Sign up
                    </Link>
                  </p>
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

      {/* Desktop Layout */}
      <div className="hidden lg:block">
        <div className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="relative z-10 pb-8 bg-gray-50 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
              <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
                <div className="sm:text-center lg:text-left">
                  <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                    <span className="block xl:inline">Welcome back to</span>{' '}
                    <span className="block text-blue-600 xl:inline">your goals</span>
                  </h1>
                  <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                    Sign in to continue tracking your investment goals and see your portfolio progress.
                  </p>
                  
                  {/* Feature Highlights */}
                  <div className="mt-8 grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-500">📊</span>
                      <span>Track your portfolio</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-500">🎯</span>
                      <span>Manage your goals</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-500">📈</span>
                      <span>View insights</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-500">🧮</span>
                      <span>Run simulations</span>
                    </div>
                  </div>
                </div>
              </main>
            </div>
          </div>
          <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
            <div className="h-full w-full bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-center lg:rounded-l-3xl relative">
              {/* Background branding */}
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <div className="text-white text-center">
                  <h2 className="text-2xl font-bold mb-4">Investment Goal Tracking</h2>
                  <p className="text-lg opacity-90">Plan • Track • Achieve</p>
                </div>
              </div>
              
              {/* Login Form */}
              <div className="relative z-10 w-full max-w-md px-4 sm:px-6 lg:px-8 lg:pt-24">
                <div className="bg-white rounded-lg shadow-xl p-6">
                  <div className="text-center mb-5">
                    <h2 className="text-xl font-bold text-gray-900">
                      Sign in to your account
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Welcome back! Please enter your details.
                    </p>
                  </div>

                  <form className="space-y-4" onSubmit={handleLogin}>
                    <div>
                      <label htmlFor="email-desktop" className="block text-sm font-medium text-gray-700 mb-1">
                        Email address
                      </label>
                      <input
                        id="email-desktop"
                        type="email"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>

                    <div>
                      <label htmlFor="password-desktop" className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                      </label>
                      <input
                        id="password-desktop"
                        type="password"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <div className="mt-1 text-right">
                        <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
                          Forgot your password?
                        </Link>
                      </div>
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-red-700">{error}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="text-center">
                      <div className="text-xs bg-blue-100 text-blue-800 rounded-full px-3 py-1 inline-block">
                        ✅ 100% Free to Use
                      </div>
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {loading ? (
                          <div className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Signing in...
                          </div>
                        ) : (
                          'Sign in'
                        )}
                      </button>
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-gray-600">
                        Don&apos;t have an account?{' '}
                        <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-800 hover:underline">
                          Sign up
                        </Link>
                      </p>
                    </div>

                    {/* Legal Links */}
                    <div className="text-center pt-2 border-t border-gray-200">
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
        </div>
      </div>
    </div>
  )
} 