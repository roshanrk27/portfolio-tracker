'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getGoalMappings, getGoalXIRR } from '@/lib/portfolioUtils'
import { calculateSchemeXIRR, formatXIRR } from '@/lib/xirr'
import { calculateAssetAllocation } from '@/lib/assetAllocation'
import AllocationPie from './AllocationPie'

interface GoalDetailsModalProps {
  goal: {
    id: string
    name: string
    description: string | null
    target_amount: number
    target_date: string
    current_amount: number
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

export default function GoalDetailsModal({ goal, onClose }: GoalDetailsModalProps) {
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

  useEffect(() => {
    loadSchemeDetails()
  }, [goal.id])

  const loadSchemeDetails = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      // Get goal XIRR
      const xirrData = await getGoalXIRR(goal.id)
      setGoalXIRR(xirrData)

      // Get goal mappings
      const mappings = await getGoalMappings(goal.id)
      
      // Get detailed information for each mapped scheme
      const details: SchemeDetails[] = []
      
      for (const mapping of mappings) {
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
    } catch (err: any) {
      setError(err.message || 'Error loading scheme details')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(num)
  }

  const calculateTotalValue = () => {
    return schemeDetails.reduce((sum, scheme) => sum + scheme.current_value, 0)
  }

  const calculateTotalUnits = () => {
    return schemeDetails.reduce((sum, scheme) => sum + scheme.balance_units, 0)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-4xl mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading scheme details...</p>
          </div>
        </div>
      </div>
    )
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
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-800 p-2 rounded-full hover:bg-neutral-100 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Goal Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
            <p className="text-sm font-semibold text-blue-700 mb-2">Target Amount</p>
            <p className="text-2xl font-bold text-blue-900">{formatCurrency(goal.target_amount)}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-6 border border-green-200">
            <p className="text-sm font-semibold text-green-700 mb-2">Current Value</p>
            <p className="text-2xl font-bold text-green-900">{formatCurrency(goal.current_amount)}</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
            <p className="text-sm font-semibold text-purple-700 mb-2">Total Units</p>
            <p className="text-2xl font-bold text-purple-900">{formatNumber(calculateTotalUnits())}</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
            <p className="text-sm font-semibold text-orange-700 mb-2">Mapped Schemes</p>
            <p className="text-2xl font-bold text-orange-900">{schemeDetails.length}</p>
          </div>
        </div>

        {/* Goal XIRR Card */}
        {goalXIRR && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-8 mb-8 border border-indigo-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Goal XIRR</h3>
                <p className="text-base text-gray-600">
                  {goalXIRR.converged ? 'Calculated successfully' : 'Calculation may be approximate'}
                </p>
              </div>
              <div className="text-right">
                <div className={`text-4xl font-bold ${
                  goalXIRR.xirrPercentage >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {goalXIRR.formattedXIRR}
                </div>
                <div className="text-base text-gray-600 mt-2">
                  {goalXIRR.converged ? '✓ Converged' : '⚠ Limited data'}
                </div>
              </div>
            </div>
            {goalXIRR.error && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">{goalXIRR.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Asset Allocation Chart */}
        {schemeDetails.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Asset Allocation</h3>
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              {(() => {
                const allocationData = calculateAssetAllocation(schemeDetails.map(s => ({
                  scheme_name: s.scheme_name,
                  current_value: s.current_value
                })))
                console.log('Allocation data:', allocationData)
                return (
                  <AllocationPie 
                    data={allocationData}
                    title="Portfolio Allocation"
                  />
                )
              })()}
            </div>
          </div>
        )}

        {/* Scheme Details Table */}
        {schemeDetails.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-6">Scheme Details</h3>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Scheme Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Folio</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Units</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">NAV</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Current Value</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">XIRR</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Allocation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {schemeDetails.map((scheme, index) => (
                    <tr key={scheme.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{scheme.scheme_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{scheme.folio || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatNumber(scheme.balance_units)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(scheme.current_nav)}</td>
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
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">{scheme.allocation_percentage}%</td>
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