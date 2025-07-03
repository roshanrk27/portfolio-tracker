'use client'

import { useState, useEffect } from 'react'
import { updateNavData } from '@/lib/updateNavData'
import { supabase } from '@/lib/supabaseClient'

interface UpdateResult {
  success: boolean
  message?: string
  error?: string
  count?: number
  date?: string
  navUpdated?: number
  portfolioRefreshed?: number
  portfolioError?: string
}

export default function NavUpdatePage() {
  const [isUpdating, setIsUpdating] = useState(false)
  const [result, setResult] = useState<UpdateResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    // Get current user ID
    const getCurrentUser = async () => {
      if (!supabase) return
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUserId(session.user.id)
      }
    }
    getCurrentUser()
  }, [])

  const handleUpdateNav = async () => {
    setIsUpdating(true)
    setError(null)
    setResult(null)

    try {
      const response = await updateNavData(userId || undefined)
      
      if (response.success) {
        setResult(response)
      } else {
        setError(response.error || 'Unknown error occurred')
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 border-b-2 border-blue-500 pb-2">
          NAV Data Update
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8 border border-gray-200">
          <h2 className="text-xl font-bold mb-6 text-gray-800">
            Update NAV Data from AMFI
          </h2>
          
          <button
            onClick={handleUpdateNav}
            disabled={isUpdating}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold text-lg transition-colors duration-200 shadow-md"
          >
            {isUpdating ? 'Updating...' : 'Update NAV Data'}
          </button>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-lg">
              <div className="font-semibold text-red-900">Error:</div>
              <div className="mt-1">{error}</div>
            </div>
          )}

          {result && (
            <div className="mt-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-800 rounded-r-lg">
              <div className="font-semibold text-green-900">Success!</div>
              <div className="mt-1">
                {result.message}
              </div>
              {result.portfolioError && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                  <strong>Note:</strong> NAV data was updated successfully, but portfolio refresh encountered an issue: {result.portfolioError}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
          <h2 className="text-xl font-bold mb-6 text-gray-800">
            About NAV Updates
          </h2>
          <ul className="list-disc list-inside space-y-3 text-gray-700 text-lg">
            <li className="font-medium">Fetches latest NAV data from AMFI India</li>
            <li className="font-medium">Updates existing NAV records with latest values</li>
            <li className="font-medium">Uses actual NAV date from AMFI (not today&apos;s date)</li>
            <li className="font-medium">No duplicate entries - each scheme has only one current NAV record</li>
            <li className="font-medium">Automatically refreshes portfolio values with updated NAV data</li>
            <li className="font-medium">Updated values are immediately available in Dashboard and Mutual Funds page</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 