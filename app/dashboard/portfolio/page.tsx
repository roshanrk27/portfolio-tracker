'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { getCurrentPortfolio, getPortfolioSummaryOptimized, getLatestNavDate, getSchemeXIRRs, getPortfolioXIRR } from '@/lib/portfolioUtils'
import { formatIndianNumberWithSuffix } from '@/lib/goalSimulator'
import { useQuery } from '@tanstack/react-query'
import { categorizeScheme } from '@/lib/assetAllocation'

interface PortfolioHolding {
  id: string
  folio: string
  scheme_name: string
  isin: string
  latest_date: string
  latest_unit_balance: number
  current_nav: number
  current_value: number
  return_amount: number
  return_percentage: number
  last_nav_update_date: string
}

export default function PortfolioDashboard() {
  const [userId, setUserId] = useState<string | null>(null)
  const [latestNavDate, setLatestNavDate] = useState<string | null>(null)
  const [sortState, setSortState] = useState<'default' | 'xirr-asc' | 'xirr-desc'>('default')
  const router = useRouter()

  // Get user session and set userId
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
      } else {
        setUserId(session.user.id)
      }
    }
    checkAuth()
  }, [router])

  // Get latest NAV date
  useEffect(() => {
    const fetchNavDate = async () => {
      if (userId) {
        const navDate = await getLatestNavDate()
        setLatestNavDate(navDate)
      }
    }
    fetchNavDate()
  }, [userId])

  // React Query for Portfolio Data
  const {
    data: portfolio = [],
    isLoading: portfolioLoading,
    error: portfolioError
  } = useQuery({
    queryKey: ['portfolio', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID')
      return await getCurrentPortfolio(userId)
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // React Query for Portfolio Summary
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError
  } = useQuery({
    queryKey: ['portfolioSummary', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID')
      return await getPortfolioSummaryOptimized(userId)
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // React Query for Scheme XIRRs
  const {
    data: schemeXirrArr = [],
    isLoading: xirrLoading,
    error: xirrError
  } = useQuery({
    queryKey: ['schemeXIRRs', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID')
      return await getSchemeXIRRs(userId)
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 10, // 10 minutes for XIRR
  })

  // React Query for Portfolio XIRR
  const {
    data: mfXirr,
    isLoading: portfolioXirrLoading,
    error: portfolioXirrError
  } = useQuery({
    queryKey: ['portfolioXIRR', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID')
      return await getPortfolioXIRR(userId)
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 10, // 10 minutes for XIRR
  })

  // Create XIRR map for quick lookup
  const schemeXirrMap: Record<string, string> = {}
  if (schemeXirrArr) {
    for (const x of schemeXirrArr) {
      schemeXirrMap[`${x.scheme_name}__${x.folio}`] = x.formattedXIRR
    }
  }

  // Handle errors
  const error = portfolioError || summaryError || xirrError || portfolioXirrError

  const formatCurrency = (amount: number) => {
    return formatIndianNumberWithSuffix(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN')
  }

  // Helper to get XIRR value for a holding (number or null)
  const getXirrValue = (holding: PortfolioHolding) => {
    const xirrKey = `${holding.scheme_name}__${holding.folio}`
    if (schemeXirrMap[xirrKey]) {
      const match = schemeXirrMap[xirrKey].match(/-?\d+(\.\d+)?/)
      if (match) return parseFloat(match[0])
    }
    return null
  }

  // Sorting logic
  const sortedPortfolio = [...portfolio]
  if (sortState === 'xirr-asc') {
    sortedPortfolio.sort((a, b) => {
      const xirrA = getXirrValue(a)
      const xirrB = getXirrValue(b)
      if (xirrA === null && xirrB === null) return 0
      if (xirrA === null) return 1
      if (xirrB === null) return -1
      return xirrA - xirrB
    })
  } else if (sortState === 'xirr-desc') {
    sortedPortfolio.sort((a, b) => {
      const xirrA = getXirrValue(a)
      const xirrB = getXirrValue(b)
      if (xirrA === null && xirrB === null) return 0
      if (xirrA === null) return 1
      if (xirrB === null) return -1
      return xirrB - xirrA
    })
  } else {
    // Default: folio + scheme_name
    sortedPortfolio.sort((a, b) => {
      if (a.folio === b.folio) {
        return a.scheme_name.localeCompare(b.scheme_name)
      }
      return a.folio.localeCompare(b.folio)
    })
  }

  // Handler for XIRR header click
  const handleXirrHeaderClick = () => {
    setSortState((prev) => {
      if (prev === 'default') return 'xirr-asc'
      if (prev === 'xirr-asc') return 'xirr-desc'
      return 'default'
    })
  }

  // Skeleton loading components
  const SummaryCardSkeleton = () => (
    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-gray-300">
      <div className="flex items-center">
        <div className="p-2 bg-gray-100 rounded-lg">
          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="ml-4">
          <div className="h-4 bg-gray-200 rounded w-20 mb-2 animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
        </div>
      </div>
    </div>
  )

  const TableRowSkeleton = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
        <div className="h-3 bg-gray-100 rounded w-24"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </td>
    </tr>
  )

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error loading portfolio</div>
          <p className="text-gray-600">{error.message}</p>
          <button 
            onClick={() => window.location.reload()}
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
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Mutual Funds</h1>
              <p className="text-gray-600">Your current mutual fund holdings and performance</p>
              {latestNavDate && (
                <p className="text-sm text-gray-500 mt-1">
                  Last NAV update: {new Date(latestNavDate).toLocaleDateString('en-IN')}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {/* RefreshNavButton temporarily hidden due to automated NAV refresh
              <RefreshNavButton 
                onRefresh={handleNavRefresh}
              />
              */}
              <button
                onClick={() => router.push('/upload')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Transactions
              </button>
            </div>
          </div>
        </div>

        {/* Portfolio Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Holdings Card */}
          {summaryLoading ? (
            <SummaryCardSkeleton />
          ) : summary ? (
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Holdings</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalHoldings}</p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Current Value Card */}
          {summaryLoading ? (
            <SummaryCardSkeleton />
          ) : summary ? (
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Current Value</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalCurrentValue)}</p>
                </div>
              </div>
            </div>
          ) : null}

          {/* MF XIRR Card */}
          {portfolioXirrLoading ? (
            <SummaryCardSkeleton />
          ) : mfXirr ? (
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">MF XIRR</p>
                  <p className={`text-2xl font-bold ${mfXirr.xirr >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {mfXirr.formattedXIRR}
                  </p>
                  {!mfXirr.converged && (
                    <span className="text-xs text-orange-500">⚠ Not converged</span>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Asset Allocation Card */}
          {portfolioLoading ? (
            <SummaryCardSkeleton />
          ) : portfolio.length > 0 ? (
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-500">
              <div className="flex items-center mb-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Asset Allocation</p>
                </div>
              </div>
              {(() => {
                // Calculate allocation data
                const allocationMap: Record<string, number> = {}
                portfolio.forEach(holding => {
                  const category = categorizeScheme(holding.scheme_name).category
                  allocationMap[category] = (allocationMap[category] || 0) + holding.current_value
                })
                const totalValue = Object.values(allocationMap).reduce((sum, v) => sum + v, 0)
                
                // Sort categories by value descending
                const sortedCategories = Object.entries(allocationMap)
                  .sort(([,a], [,b]) => b - a)
                
                return (
                  <div className="space-y-3">
                    {/* Single stacked bar chart */}
                    <div className="flex bg-gray-200 rounded-full h-4 overflow-hidden">
                      {sortedCategories.map(([category, value]) => {
                        const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0
                        const color = categorizeScheme(category).color
                        return (
                          <div
                            key={category}
                            className="h-full transition-all duration-300"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: color
                            }}
                            title={`${category}: ${percentage.toFixed(1)}%`}
                          />
                        )
                      })}
                    </div>
                    
                    {/* Legend */}
                    <div className="flex flex-wrap gap-3">
                      {sortedCategories.map(([category, value]) => {
                        const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0
                        const color = categorizeScheme(category).color
                        return (
                          <div key={category} className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-1"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-xs text-gray-700">{category}</span>
                            <span className="text-xs font-medium text-gray-900 ml-1">
                              {percentage.toFixed(0)}%
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
            </div>
          ) : null}
        </div>

        {/* Holdings Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Current Holdings</h2>
            <p className="text-sm text-gray-600 mt-1">
              {portfolioLoading ? 'Loading...' : `${portfolio.length} holdings`}
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scheme
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Units
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    NAV
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Value
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                    onClick={handleXirrHeaderClick}
                    title="Sort by XIRR"
                  >
                    XIRR
                    {sortState === 'xirr-asc' && <span className="ml-1">▲</span>}
                    {sortState === 'xirr-desc' && <span className="ml-1">▼</span>}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Update
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {portfolioLoading ? (
                  // Show skeleton rows while loading
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRowSkeleton key={index} />
                  ))
                ) : xirrLoading ? (
                  // Show data rows with XIRR loading
                  sortedPortfolio.map((holding) => {
                    const xirrKey = `${holding.scheme_name}__${holding.folio}`
                    let rowColor = ''
                    let xirrValue: number | null = null
                    if (schemeXirrMap[xirrKey]) {
                      const match = schemeXirrMap[xirrKey].match(/-?\d+(\.\d+)?/)
                      if (match) xirrValue = parseFloat(match[0])
                    }
                    if (xirrValue !== null) {
                      if (xirrValue <= 0) rowColor = 'bg-red-100'
                      else if (xirrValue > 12) rowColor = 'bg-green-50'
                      else rowColor = 'bg-gray-50'
                    }
                    return (
                      <tr key={holding.id} className={`hover:bg-gray-100 ${rowColor}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{holding.scheme_name}</div>
                              {(holding.folio || holding.isin) && (
                                <div className="text-xs mt-1">
                                  {holding.folio && <span className="text-indigo-600">Folio: {holding.folio}</span>}
                                  {holding.folio && holding.isin && <span className="text-gray-400"> | </span>}
                                  {holding.isin && <span className="text-gray-500">ISIN: {holding.isin}</span>}
                                </div>
                              )}
                            </div>
                            <span 
                              className="text-xs px-2 py-1 rounded-full font-medium"
                              style={{ 
                                backgroundColor: `${categorizeScheme(holding.scheme_name).color}20`,
                                color: categorizeScheme(holding.scheme_name).color,
                                border: `1px solid ${categorizeScheme(holding.scheme_name).color}40`
                              }}
                            >
                              {categorizeScheme(holding.scheme_name).category}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {holding.latest_unit_balance.toLocaleString('en-IN', { maximumFractionDigits: 4 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{holding.current_nav.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(holding.current_value)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="text-gray-400">Loading...</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(holding.latest_date)}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  // Show complete data with XIRR
                  sortedPortfolio.map((holding) => {
                    const xirrKey = `${holding.scheme_name}__${holding.folio}`
                    let rowColor = ''
                    let xirrValue: number | null = null
                    if (schemeXirrMap[xirrKey]) {
                      const match = schemeXirrMap[xirrKey].match(/-?\d+(\.\d+)?/)
                      if (match) xirrValue = parseFloat(match[0])
                    }
                    if (xirrValue !== null) {
                      if (xirrValue <= 0) rowColor = 'bg-red-100'
                      else if (xirrValue > 12) rowColor = 'bg-green-50'
                      else rowColor = 'bg-gray-50'
                    }
                    return (
                      <tr key={holding.id} className={`hover:bg-gray-100 ${rowColor}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{holding.scheme_name}</div>
                              {(holding.folio || holding.isin) && (
                                <div className="text-xs mt-1">
                                  {holding.folio && <span className="text-indigo-600">Folio: {holding.folio}</span>}
                                  {holding.folio && holding.isin && <span className="text-gray-400"> | </span>}
                                  {holding.isin && <span className="text-gray-500">ISIN: {holding.isin}</span>}
                                </div>
                              )}
                            </div>
                            <span 
                              className="text-xs px-2 py-1 rounded-full font-medium"
                              style={{ 
                                backgroundColor: `${categorizeScheme(holding.scheme_name).color}20`,
                                color: categorizeScheme(holding.scheme_name).color,
                                border: `1px solid ${categorizeScheme(holding.scheme_name).color}40`
                              }}
                            >
                              {categorizeScheme(holding.scheme_name).category}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {holding.latest_unit_balance.toLocaleString('en-IN', { maximumFractionDigits: 4 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{holding.current_nav.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(holding.current_value)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {schemeXirrMap[xirrKey] || <span className="text-gray-400">N/A</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(holding.latest_date)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {portfolio.length === 0 && !portfolioLoading && !xirrLoading && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No holdings found</h3>
              <p className="text-gray-600">Upload your mutual fund statements to see your portfolio here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 