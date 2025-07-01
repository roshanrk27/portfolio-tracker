'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function NPSDashboard() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
      } else {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">NPS (National Pension System)</h1>
              <p className="text-gray-600">Your NPS holdings and performance</p>
            </div>
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center opacity-50 cursor-not-allowed"
              disabled
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add NPS Statement
            </button>
          </div>
        </div>

        {/* Coming Soon Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">NPS Integration Coming Soon</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            We're working on adding NPS (National Pension System) support to help you track your pension investments alongside your other financial goals.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 max-w-md mx-auto">
            <h3 className="font-semibold text-gray-900 mb-2">Planned Features:</h3>
            <ul className="text-sm text-gray-600 space-y-1 text-left">
              <li>• Upload NPS holding statements</li>
              <li>• Track scheme-wise NAV and units</li>
              <li>• Calculate current NPS value</li>
              <li>• Map NPS schemes to financial goals</li>
              <li>• View NPS performance over time</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
} 