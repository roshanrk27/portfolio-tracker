'use client'

import { useState, useEffect } from 'react'
import { isNavUpToDate, getLatestNavDate } from '@/lib/portfolioUtils'

interface RefreshNavButtonProps {
  onRefresh?: () => void
  className?: string
}

export default function RefreshNavButton({ onRefresh, className }: RefreshNavButtonProps) {
  const [isUpToDate, setIsUpToDate] = useState<boolean | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchNavStatus = async () => {
    try {
      console.log('🔍 DEBUG - Fetching NAV status...')
      const [upToDate, latestDate] = await Promise.all([
        isNavUpToDate(),
        getLatestNavDate()
      ])
      
      console.log('🔍 DEBUG - Component received isUpToDate:', upToDate)
      console.log('🔍 DEBUG - Component received latestDate:', latestDate)
      
      setIsUpToDate(upToDate)
      
      if (latestDate) {
        const date = new Date(latestDate)
        const formattedDate = date.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
        console.log('🔍 DEBUG - Formatted date:', formattedDate)
        setLastUpdate(formattedDate)
      }
    } catch (error) {
      console.error('Error fetching NAV status:', error)
    }
  }

  useEffect(() => {
    fetchNavStatus()
  }, [])

  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/refresh-nav', {
        method: 'POST'
      })
      
      if (response.ok) {
        await fetchNavStatus()
        onRefresh?.()
      }
    } catch (error) {
      console.error('Error refreshing NAV:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={handleRefresh}
        disabled={isUpToDate === true || isLoading}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center ${
          isUpToDate === true 
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-50' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isLoading ? (
          <svg className="w-4 h-4 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )}
        Refresh NAV
      </button>
      {lastUpdate && (
        <span className="text-sm text-gray-500">
          Last: {lastUpdate}
        </span>
      )}
    </div>
  )
} 