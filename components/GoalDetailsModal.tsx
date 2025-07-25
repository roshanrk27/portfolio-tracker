'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { formatIndianNumberWithSuffix } from '@/lib/goalSimulator'
import { getGoalMappings, getGoalXIRR } from '@/lib/portfolioUtils'
import { calculateSchemeXIRR, formatXIRR } from '@/lib/xirr'
import { categorizeScheme } from '@/lib/assetAllocation'

import AssetAllocationBar from './AssetAllocationBar'
import { useQuery } from '@tanstack/react-query'
import { fetchStockPrices } from '@/lib/stockUtils'

interface GoalDetailsModalProps {
  goal: {
    id: string
    name: string
    description: string | null
    target_amount: number
    target_date: string
    current_amount: number
    mappedStocks?: { stock_code: string; quantity: number; exchange: string; source_id: string }[]
  }
  xirrData?: {
    xirr: number
    xirrPercentage: number
    formattedXIRR: string
    converged: boolean
    error?: string
    current_value: number
  }
  onClose: () => void
}

interface SchemeDetails {
  id: string
  scheme_name: string
  folio: string | null
  allocation_percentage: number
  current_value: number
  balance_units: number
  current_nav: number
  xirr?: number
  formattedXIRR?: string
}

interface NpsHoldingDetail {
  id: string
  fund_name: string
  fund_code: string
  units: number
  nav: number
  current_value: number
}

export default function GoalDetailsModal({ goal, xirrData, onClose }: GoalDetailsModalProps) {
  const [schemeDetails, setSchemeDetails] = useState<SchemeDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [goalXIRR, setGoalXIRR] = useState<{
    xirr: number
    xirrPercentage: number
    formattedXIRR: string
    converged: boolean
    error?: string
    current_value: number
  } | null>(null)
  const [stockRows, setStockRows] = useState<{ stock_code: string; quantity: number; exchange: string; source_id: string }[]>([])
  const [stockPrices, setStockPrices] = useState<Record<string, { inr: number; usd?: number }>>({})
  const [npsHoldings, setNpsHoldings] = useState<NpsHoldingDetail[]>([])

  useEffect(() => {
    const loadAllDetails = async () => {
      setLoading(true)
      setError('')
      try {
        await Promise.all([
          loadSchemeDetails(),
          loadNpsDetails()
        ])
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Error loading details'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }
    loadAllDetails()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal.id])

  useEffect(() => {
    // Fetch mapped stocks from goal prop if available
    if (goal.mappedStocks && Array.isArray(goal.mappedStocks)) {
      setStockRows(goal.mappedStocks)
    }
  }, [goal])

  // Debug NPS holdings
  useEffect(() => {
    console.log('[DEBUG_NPS_TABLE] NPS holdings state:', npsHoldings)
  }, [npsHoldings])

  // Prepare symbols and exchanges for the query
  const symbols = stockRows.map(stock => stock.stock_code)
  const exchanges = stockRows.map(stock => stock.exchange === 'US' ? 'NASDAQ' : stock.exchange)

  const { data: pricesData } = useQuery({
    queryKey: ['stockPrices', symbols, exchanges],
    queryFn: async () => {
      if (symbols.length === 0) return {}
      try {
        const res = await fetchStockPrices(symbols, exchanges)
        return res?.prices || {}
      } catch (error) {
        console.error('Error fetching stock prices:', error)
        // Return empty object instead of throwing to prevent UI crashes
        return {}
      }
    },
    enabled: symbols.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1, // Only retry once to avoid infinite loops
    retryDelay: 1000, // Wait 1 second before retry
  })

  // Convert pricesData to the format expected by the rest of the component
  useEffect(() => {
    if (!pricesData) return
    const formatted: Record<string, { inr: number; usd?: number }> = {}
    for (const stock of stockRows) {
      const priceObj = pricesData[stock.stock_code]
      if (priceObj && priceObj.price) {
        if (priceObj.originalCurrency === 'USD') {
          // US stock: price is converted to INR, originalPrice is in USD
          formatted[stock.stock_code] = {
            inr: priceObj.price,
            usd: priceObj.originalPrice
          }
        } else {
          // Indian stock: price is already in INR
          formatted[stock.stock_code] = {
            inr: priceObj.price
          }
        }
      }
    }
    setStockPrices(formatted)
  }, [pricesData, stockRows])

  const loadSchemeDetails = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      // Use pre-calculated XIRR data if available, otherwise calculate
      if (xirrData) {
        setGoalXIRR(xirrData)
      } else {
        const calculatedXirrData = await getGoalXIRR(goal.id)
        setGoalXIRR(calculatedXirrData)
      }

      // Get goal mappings
      const mappings = await getGoalMappings(goal.id)
      
      // Get detailed information for each mapped scheme (only mutual funds)
      const details: SchemeDetails[] = []
      for (const mapping of mappings) {
        // Only include mutual fund mappings
        if (mapping.source_type !== 'mutual_fund') continue;
        // Get current portfolio data for this scheme
        const { data: portfolioData } = await supabase
          .from('current_portfolio')
          .select('current_value, latest_unit_balance, current_nav')
          .eq('user_id', session.user.id)
          .eq('scheme_name', mapping.scheme_name)
          .eq('folio', mapping.folio || '')
          .single()

        // Get transactions for this scheme
        const { data: transactions } = await supabase
          .from('transactions')
          .select('date, amount, transaction_type')
          .eq('user_id', session.user.id)
          .eq('scheme_name', mapping.scheme_name)
          .eq('folio', mapping.folio || '')
          .order('date', { ascending: true })

        // Prepare cash flows for XIRR
        const cashFlows = (transactions || []).map((tx: { date: string; amount: string; transaction_type: string }) => {
          const transactionType = (tx.transaction_type || '').toLowerCase()
          let amount = parseFloat(tx.amount || '0')
          // Outflows (investments) are negative, inflows (redemptions) are positive
          if (
            transactionType.includes('purchase') ||
            transactionType.includes('investment') ||
            transactionType.includes('dividend') ||
            transactionType.includes('switch in') ||
            transactionType.includes('shift in')
          ) {
            amount = -Math.abs(amount)
          } else if (
            transactionType.includes('switch out') ||
            transactionType.includes('redemption') ||
            transactionType.includes('shift out')
          ) {
            amount = Math.abs(amount)
          }
          // Default: treat as positive (shouldn't happen)
          return {
            date: tx.date,
            amount,
            type: tx.transaction_type
          }
        })

        // Add current value as final positive cash flow if > 0
        const currentValue = parseFloat(portfolioData?.current_value || '0')
        if (currentValue > 0) {
          cashFlows.push({
            date: new Date().toISOString().slice(0, 10),
            amount: currentValue,
            type: 'Current Value'
          })
        }

        // Calculate XIRR using the same function as the rest of the app
        const xirrResult = calculateSchemeXIRR(
          (transactions || []).map((tx: { date: string; amount: string; transaction_type: string }) => ({
            date: tx.date,
            amount: parseFloat(tx.amount || '0'),
            type: tx.transaction_type
          })),
          currentValue
        )

        details.push({
          id: mapping.id,
          scheme_name: mapping.scheme_name,
          folio: mapping.folio,
          allocation_percentage: mapping.allocation_percentage,
          current_value: currentValue,
          balance_units: parseFloat(portfolioData?.latest_unit_balance || '0'),
          current_nav: parseFloat(portfolioData?.current_nav || '0'),
          xirr: xirrResult.xirr * 100,
          formattedXIRR: formatXIRR(xirrResult.xirr) + (xirrResult.converged ? '' : ' ⚠'),
          // Optionally, you can add converged/error fields for display
        })
      }

      setSchemeDetails(details)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error loading scheme details'
      setError(errorMessage)
    }
  }, [goal.id, xirrData])

  const loadNpsDetails = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      // Get goal mappings
      const mappings = await getGoalMappings(goal.id)
      console.log('[DEBUG_NPS] All mappings:', mappings)
      const npsMappings = mappings.filter((m: Record<string, unknown>) => m.source_type === 'nps' && m.source_id)
      console.log('[DEBUG_NPS] NPS mappings:', npsMappings)
      if (npsMappings.length === 0) {
        console.log('[DEBUG_NPS] No NPS mappings found')
        setNpsHoldings([])
        return
      }
      const npsIds = npsMappings.map((m: Record<string, unknown>) => typeof m.source_id === 'string' ? m.source_id : '')
      console.log('[DEBUG_NPS] NPS IDs to fetch:', npsIds)
      // Fetch nps_holdings for these IDs
      const { data: holdings, error: holdingsError } = await supabase
        .from('nps_holdings')
        .select('id, fund_code, units, nps_funds(fund_name)')
        .in('id', npsIds)
      if (holdingsError) throw holdingsError
      console.log('[DEBUG_NPS] Raw holdings data:', holdings)
      // Fetch NAVs for all fund_codes
      const fundCodes = Array.from(new Set((holdings || []).map((h: Record<string, unknown>) => typeof h.fund_code === 'string' ? h.fund_code : '')))
      let navMap: Record<string, number> = {}
      if (fundCodes.length > 0) {
        console.log('[DEBUG_NPS] Fetching NAVs for fund codes:', fundCodes)
        const { data: navs, error: navsError } = await supabase
          .from('nps_nav')
          .select('fund_code, nav, nav_date')
          .in('fund_code', fundCodes)
          .order('nav_date', { ascending: false })
        if (navsError) throw navsError
        console.log('[DEBUG_NPS] Raw NAV data:', navs)
        
        // Get the latest NAV for each fund code
        const latestNavs = new Map<string, number>()
        for (const nav of navs || []) {
          const fundCode = typeof nav.fund_code === 'string' ? nav.fund_code : ''
          if (!latestNavs.has(fundCode)) {
            const navValue = typeof nav.nav === 'string' ? parseFloat(nav.nav) : typeof nav.nav === 'number' ? nav.nav : 0
            latestNavs.set(fundCode, navValue)
          }
        }
        navMap = Object.fromEntries(latestNavs)
        console.log('[DEBUG_NPS] Processed NAV map:', navMap)
      }
      // Prepare details
      const details: NpsHoldingDetail[] = (holdings || []).map((h: Record<string, unknown>) => {
        const fund_code = typeof h.fund_code === 'string' ? h.fund_code : ''
        const id = typeof h.id === 'string' ? h.id : ''
        const units = typeof h.units === 'string' ? parseFloat(h.units) : typeof h.units === 'number' ? h.units : 0
        let fund_name = fund_code
        if (typeof h.nps_funds === 'object' && h.nps_funds !== null && 'fund_name' in h.nps_funds) {
          fund_name = (h.nps_funds as { fund_name?: string }).fund_name || fund_code
        }
        const nav = navMap[fund_code] || 0
        const current_value = nav * units
        console.log('[DEBUG_NPS] NPS Holding:', { fund_code, fund_name, units, nav, current_value })
        return {
          id,
          fund_name,
          fund_code,
          units,
          nav,
          current_value
        }
      })
      console.log('[DEBUG_NPS] Final NPS holdings:', details)
      setNpsHoldings(details)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error loading NPS details'
      setError(errorMessage)
    }
  }, [goal.id])

  const formatCurrency = (amount: number) => {
    return formatIndianNumberWithSuffix(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(num)
  }

  const formatNav = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num)
  }

  const calculateTotalUnits = () => {
    return schemeDetails.reduce((sum, scheme) => sum + scheme.balance_units, 0)
  }

  // Calculate true current value (MF + Stocks + NPS)
  const calculateTrueCurrentValue = () => {
    const mfValue = schemeDetails.reduce((sum, scheme) => sum + scheme.current_value, 0)
    const stockValue = stockRows.reduce((sum, stock) => {
      const price = stockPrices[stock.stock_code]
      return sum + (price ? stock.quantity * price.inr : 0)
    }, 0)
    const npsValue = npsHoldings.reduce((sum, nps) => sum + nps.current_value, 0)
    return mfValue + stockValue + npsValue
  }

  // Calculate % Goal Achieved
  const percentGoalAchieved = () => {
    const percent = goal.target_amount > 0 ? (calculateTrueCurrentValue() / goal.target_amount) * 100 : 0;
    return Math.min(percent, 100);
  }

  // Format date as DD MMM YYYY
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">{goal.name}</h2>
            {goal.description && (
              <p className="text-gray-600 mt-2 text-lg">{goal.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-neutral-500 hover:text-neutral-800 p-2 rounded-full hover:bg-neutral-100 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Top 4 Summary Cards in a Row */}
        <div className="flex flex-row flex-wrap gap-4 mb-8 w-full">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex-1 min-w-[180px] flex flex-col items-center justify-center">
            <span className="text-sm font-semibold text-blue-700 mb-1">Target Amount</span>
            <span className="text-lg font-bold text-blue-900">{formatCurrency(goal.target_amount)}</span>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 flex-1 min-w-[180px] flex flex-col items-center justify-center">
            <span className="text-sm font-semibold text-yellow-700 mb-1">Target Date</span>
            <span className="text-lg font-bold text-yellow-900">{formatDate(goal.target_date)}</span>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex-1 min-w-[180px] flex flex-col items-center justify-center">
            <span className="text-sm font-semibold text-green-700 mb-1">Current Value</span>
            <span className="text-lg font-bold text-green-900">{loading ? <div className="animate-pulse bg-green-200 h-6 w-24 rounded" /> : formatCurrency(calculateTrueCurrentValue())}</span>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex-1 min-w-[180px] flex flex-col items-center justify-center">
            <span className="text-sm font-semibold text-green-700 mb-1">% Goal Achieved</span>
            <span className="text-lg font-bold text-green-900">{loading ? <div className="animate-pulse bg-green-200 h-6 w-16 rounded" /> : percentGoalAchieved().toFixed(1) + '%'}</span>
          </div>
        </div>

        {/* Asset Allocation Bar - just below top cards */}
        {(schemeDetails.length > 0 || stockRows.length > 0 || npsHoldings.length > 0) && (
          <div className="mb-8">
            {loading ? (
              <div className="h-8 w-full bg-gray-200 animate-pulse rounded" />
            ) : (
              (() => {
                // Prepare allocation data for MF
                const mfAlloc = schemeDetails.map(s => ({
                  type: s.scheme_name,
                  value: s.current_value,
                  category: categorizeScheme(s.scheme_name).category
                }))
                const stockAlloc = stockRows.map(stock => {
                  const price = stockPrices[stock.stock_code]
                  const value = price ? stock.quantity * price.inr : 0
                  return {
                    type: stock.stock_code,
                    value,
                    category: 'Equity'
                  }
                })
                const npsAlloc = npsHoldings.map(nps => {
                  const name = (nps.fund_name || '').toLowerCase();
                  let category = 'Other';
                  if (name.includes('scheme e') || name.includes('scheme a')) category = 'Equity';
                  else if (name.includes('scheme g') || name.includes('scheme c')) category = 'Debt';
                  return {
                    type: nps.fund_name,
                    value: nps.current_value,
                    category
                  }
                })
                const allAlloc = [...mfAlloc, ...stockAlloc, ...npsAlloc]
                const allocationMap: Record<string, number> = {}
                for (const item of allAlloc) {
                  if (!item.value || item.value <= 0) continue;
                  allocationMap[item.category] = (allocationMap[item.category] || 0) + item.value
                }
                const totalValue = Object.values(allocationMap).reduce((sum, v) => sum + v, 0);
                const colorMap: Record<string, string> = {
                  Equity: '#3b82f6',
                  Debt: '#10b981',
                  Hybrid: '#f59e0b',
                  Other: '#f3e8ff',
                };
                const allocationData = Object.entries(allocationMap).map(([category, value]) => ({
                  category,
                  value,
                  percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
                  color: colorMap[category] || '#64748b',
                }))
                return <AssetAllocationBar data={allocationData} title="Asset Allocation" />
              })()
            )}
          </div>
        )}

        {/* Scheme Details Table */}
        {loading ? (
          <div className="mb-8">
            <div className="h-6 w-40 bg-gray-200 animate-pulse rounded mb-4" />
            <div className="h-10 w-full bg-gray-100 animate-pulse rounded mb-2" />
            <div className="h-10 w-full bg-gray-100 animate-pulse rounded mb-2" />
            <div className="h-10 w-full bg-gray-100 animate-pulse rounded mb-2" />
          </div>
        ) : schemeDetails.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-6">Mutual Funds</h3>
            {/* Compact MF Stat Cards - full width */}
            <div className="flex flex-row flex-wrap gap-3 mb-4 w-full justify-between">
              <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-2 flex flex-col items-center min-w-[120px] flex-1">
                <span className="text-xs font-semibold text-purple-700">Total Units</span>
                <span className="text-lg font-bold text-purple-900">{formatNumber(calculateTotalUnits())}</span>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2 flex flex-col items-center min-w-[120px] flex-1">
                <span className="text-xs font-semibold text-orange-700">Mapped Schemes</span>
                <span className="text-lg font-bold text-orange-900">{schemeDetails.length}</span>
              </div>
              {goalXIRR && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2 flex flex-col items-center min-w-[120px] flex-1">
                  <span className="text-xs font-semibold text-indigo-700">MF XIRR</span>
                  <span className={`text-lg font-bold ${goalXIRR.xirrPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>{goalXIRR.formattedXIRR}</span>
                </div>
              )}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm text-gray-700">Scheme Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Folio</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Units</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">NAV</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Current Value</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">XIRR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {schemeDetails.map((scheme) => (
                    <tr key={scheme.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{scheme.scheme_name}</div>
                          </div>
                          <span 
                            className="text-xs px-2 py-1 rounded-full font-medium"
                            style={{ 
                              backgroundColor: `${categorizeScheme(scheme.scheme_name).color}20`,
                              color: categorizeScheme(scheme.scheme_name).color,
                              border: `1px solid ${categorizeScheme(scheme.scheme_name).color}40`
                            }}
                          >
                            {categorizeScheme(scheme.scheme_name).category}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{scheme.folio || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatNumber(scheme.balance_units)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatNav(scheme.current_nav)}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">{formatCurrency(scheme.current_value)}</td>
                      <td className="px-6 py-4 text-sm text-right">
                        {scheme.formattedXIRR ? (
                          <span className={`font-semibold ${scheme.xirr && scheme.xirr >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {scheme.formattedXIRR}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {stockRows.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-green-700 mb-2">Stocks</h3>
            <div className="overflow-x-auto rounded-lg border border-green-200 bg-green-50">
              <table className="min-w-full divide-y divide-green-200">
                <thead className="bg-green-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-green-700 uppercase tracking-wider">Stock</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-green-700 uppercase tracking-wider">Quantity</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-green-700 uppercase tracking-wider">Quote (INR)</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-green-700 uppercase tracking-wider">Quote (USD)</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-green-700 uppercase tracking-wider">Current Value</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-green-100">
                  {stockRows.map(stock => {
                    const price = stockPrices[stock.stock_code]
                    const value = price ? stock.quantity * price.inr : 0
                    return (
                      <tr key={stock.stock_code}>
                        <td className="px-4 py-2 text-sm text-green-900">{stock.stock_code} <span className="ml-2 text-xs text-green-600">({stock.exchange})</span></td>
                        <td className="px-4 py-2 text-sm text-green-900">{stock.quantity}</td>
                        <td className="px-4 py-2 text-sm text-green-900">{price ? formatCurrency(price.inr) : '...'}</td>
                        <td className="px-4 py-2 text-sm text-green-900">{price && price.usd ? `$${price.usd.toFixed(2)}` : (stock.exchange === 'US' ? '...' : '-')}</td>
                        <td className="px-4 py-2 text-sm text-green-900">{price ? formatCurrency(value) : '...'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {npsHoldings.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-purple-700 mb-2">NPS Holdings ({npsHoldings.length})</h3>
            <div className="overflow-x-auto rounded-lg border border-purple-200 bg-purple-50">
              <table className="min-w-full divide-y divide-purple-200">
                <thead className="bg-purple-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Fund Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">Fund Code</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-purple-700 uppercase tracking-wider">Units</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-purple-700 uppercase tracking-wider">NAV</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-purple-700 uppercase tracking-wider">Current Value</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-purple-100">
                  {npsHoldings.map(nps => (
                    <tr key={nps.id}>
                      <td className="px-4 py-2 text-sm text-purple-900">{nps.fund_name}</td>
                      <td className="px-4 py-2 text-sm text-purple-900">{nps.fund_code}</td>
                      <td className="px-4 py-2 text-sm text-purple-900 text-right">{formatNumber(nps.units)}</td>
                      <td className="px-4 py-2 text-sm text-purple-900 text-right">{formatNav(nps.nav)}</td>
                      <td className="px-4 py-2 text-sm font-semibold text-purple-900 text-right">{formatCurrency(nps.current_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {schemeDetails.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No schemes mapped</h3>
            <p className="text-gray-600">Map mutual fund schemes to this goal to see detailed analytics.</p>
          </div>
        )}
      </div>
    </div>
  )
} 