'use client'

import { useState } from 'react'
import { updateNavData } from '@/lib/updateNavData'

export default function NavUpdatePage() {
  const [isUpdating, setIsUpdating] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleUpdateNav = async () => {
    setIsUpdating(true)
    setError(null)
    setResult(null)

    try {
      const response = await updateNavData()
      
      if (response.success) {
        setResult(response)
      } else {
        setError(response.error)
      }
    } catch (err: any) {
      setError(err.message)
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
                Updated NAV data for <span className="font-bold">{result.count}</span> schemes on <span className="font-bold">{result.date}</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
          <h2 className="text-xl font-bold mb-6 text-gray-800">
            About NAV Updates
          </h2>
          <ul className="list-disc list-inside space-y-3 text-gray-700 text-lg">
            <li className="font-medium">Fetches latest NAV data from AMFI India</li>
            <li className="font-medium">Updates are stored with today's date</li>
            <li className="font-medium">Duplicate entries for the same date are prevented</li>
            <li className="font-medium">Data can be used for portfolio valuation and XIRR calculations</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 