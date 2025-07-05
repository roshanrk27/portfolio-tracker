'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getLatestNavDate, isNavUpToDate } from '@/lib/portfolioUtils'

interface NavStatus {
  mutualFunds: {
    isUpToDate: boolean
    lastUpdate: string | null
  }
  nps: {
    lastUpdate: string | null
  }
}

export default function NavMonitorPage() {
  const [loading, setLoading] = useState(true)
  const [navStatus, setNavStatus] = useState<NavStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchNavStatus = async () => {
    try {
      setLoading(true)
      
      // Get mutual fund NAV status
      const [mfUpToDate, mfLastDate] = await Promise.all([
        isNavUpToDate(),
        getLatestNavDate()
      ])

      // Get NPS NAV status
      const { data: npsNavData } = await supabase
        .from('nps_nav')
        .select('nav_date')
        .order('nav_date', { ascending: false })
        .limit(1)
        .single()

      setNavStatus({
        mutualFunds: {
          isUpToDate: mfUpToDate,
          lastUpdate: mfLastDate
        },
        nps: {
          lastUpdate: npsNavData?.nav_date || null
        }
      })
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNavStatus()
  }, [])

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading NAV status...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error loading NAV status</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={fetchNavStatus}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">NAV Refresh Monitor</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mutual Funds Status */}
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Mutual Funds NAV</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  navStatus?.mutualFunds.isUpToDate 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {navStatus?.mutualFunds.isUpToDate ? 'Up to Date' : 'Needs Update'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Last Update:</span>
                <span className="text-gray-900 font-medium">
                  {formatDate(navStatus?.mutualFunds.lastUpdate)}
                </span>
              </div>
              <div className="text-sm text-gray-500 mt-4">
                <p>• Automated refresh runs weekdays at 6:00 PM IST</p>
                <p>• Updates from AMFI (Association of Mutual Funds in India)</p>
              </div>
            </div>
          </div>

          {/* NPS Status */}
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">NPS NAV</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Last Update:</span>
                <span className="text-gray-900 font-medium">
                  {formatDate(navStatus?.nps.lastUpdate)}
                </span>
              </div>
              <div className="text-sm text-gray-500 mt-4">
                <p>• Automated refresh runs Mondays at 7:00 PM IST</p>
                <p>• Updates from npsnav.in API</p>
              </div>
            </div>
          </div>
        </div>

        {/* Information Panel */}
        <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Automated NAV Refresh</h3>
          <div className="text-blue-800 space-y-2">
            <p>• <strong>Mutual Funds:</strong> Weekdays at 6:00 PM IST (after market hours)</p>
            <p>• <strong>NPS:</strong> Mondays at 7:00 PM IST (weekly update)</p>
            <p>• <strong>Security:</strong> Protected by API key authentication</p>
            <p>• <strong>Monitoring:</strong> Check this page for refresh status</p>
          </div>
        </div>
      </div>
    </div>
  )
} 