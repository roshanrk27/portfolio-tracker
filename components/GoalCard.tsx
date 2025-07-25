'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import GoalMappingModal from './GoalMappingModal'
import GoalEditModal from './GoalEditModal'
import GoalDetailsModal from './GoalDetailsModal'

interface Goal {
  id: string
  name: string
  description: string | null
  target_amount: number
  target_date: string
  current_amount: number
  created_at: string
  updated_at: string
  xirr?: number
  xirrPercentage?: number
  formattedXIRR?: string
  xirrConverged?: boolean
  xirrError?: string
  mutual_fund_value?: number
  stock_value?: number
  nps_value?: number
  mappedStocks?: { stock_code: string; exchange: string; quantity: number; source_id: string }[]
}

interface GoalCardProps {
  goal: Goal
  xirrData?: {
    xirr: number
    xirrPercentage: number
    formattedXIRR: string
    converged: boolean
    error?: string
    current_value: number
  }
  isLoadingXIRR?: boolean
  isLoadingPortfolio?: boolean
  isLoadingAssets?: boolean
  onEdit?: (goal: Goal) => void
  onDelete?: (goalId: string) => void
  onMappingChanged?: () => void
}

export default function GoalCard({ goal, xirrData, isLoadingXIRR = false, isLoadingPortfolio = false, isLoadingAssets = false, onEdit, onDelete, onMappingChanged }: GoalCardProps) {
  const [showActions, setShowActions] = useState(false)
  const [showMappingModal, setShowMappingModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  // React Query to fetch stock prices for mapped stocks
  const {
    data: stockPrices = {},
    isLoading: stockPricesLoading
  } = useQuery({
    queryKey: ['goalStockPrices', goal.id, goal.mappedStocks],
    queryFn: async () => {
      if (!goal.mappedStocks || goal.mappedStocks.length === 0) {
        return {}
      }

      // Convert stocks to Yahoo Finance symbols
      const yahooSymbols = goal.mappedStocks.map(stock => {
        const suffix = stock.exchange === 'NSE' ? '.NS' : 
                     stock.exchange === 'BSE' ? '.BO' : 
                     stock.exchange === 'NASDAQ' || stock.exchange === 'NYSE' ? '' : ''
        return stock.stock_code + suffix
      })

      // Get prices from stock_prices_cache using price_inr
      const { data: cachedPrices, error } = await supabase
        .from('stock_prices_cache')
        .select('symbol, price_inr')
        .in('symbol', yahooSymbols)

      if (error) {
        console.error('Error fetching cached prices for goal:', error)
        return {}
      }

      // Create a map of original stock codes to prices
      const prices: Record<string, number> = {}
      for (const stock of goal.mappedStocks) {
        const yahooSymbol = stock.exchange === 'NSE' ? stock.stock_code + '.NS' : 
                           stock.exchange === 'BSE' ? stock.stock_code + '.BO' : 
                           stock.stock_code
        const cachedPrice = cachedPrices?.find(p => p.symbol === yahooSymbol)
        if (cachedPrice?.price_inr) {
          prices[stock.stock_code] = cachedPrice.price_inr
        }
      }

      return prices
    },
    enabled: !!goal.mappedStocks && goal.mappedStocks.length > 0,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes garbage collection time
    refetchOnWindowFocus: false,
  })

  const liveStockValue = (goal.mappedStocks || []).reduce((total, stock) => {
    const price = stockPrices[stock.stock_code]
    if (price) {
      return total + stock.quantity * price
    }
    return total
  }, 0)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const calculateProgress = () => {
    if (goal.target_amount <= 0) return 0
    // Calculate total current amount including live stock values
    const totalCurrentAmount = goal.current_amount + (liveStockValue || 0)
    return Math.min((totalCurrentAmount / goal.target_amount) * 100, 100)
  }

  const calculateDaysRemaining = () => {
    const targetDate = new Date(goal.target_date)
    const today = new Date()
    const diffTime = targetDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500'
    if (progress >= 60) return 'bg-blue-500'
    if (progress >= 40) return 'bg-yellow-500'
    if (progress >= 20) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getStatusColor = (daysRemaining: number) => {
    if (daysRemaining < 0) return 'text-red-600'
    if (daysRemaining <= 30) return 'text-orange-600'
    if (daysRemaining <= 90) return 'text-yellow-600'
    return 'text-green-600'
  }

  const progress = calculateProgress()
  const daysRemaining = calculateDaysRemaining()
  const progressColor = getProgressColor(progress)
  const statusColor = getStatusColor(daysRemaining)

  return (
    <>
      <div
        className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-shadow cursor-pointer"
        onClick={e => {
          console.log('[DEBUG_GOAL_CARD] GoalCard clicked:', {
            goalId: goal.id,
            goalName: goal.name,
            target: e.target,
            currentTarget: e.currentTarget,
            timestamp: new Date().toISOString(),
            stack: new Error().stack
          })
          
          // Prevent modal open if clicking actions menu
          if ((e.target as HTMLElement).closest('.goal-actions-menu')) return
          
          console.log('[DEBUG_GOAL_CARD] Setting showDetailsModal to true for goal:', goal.name)
          setShowDetailsModal(true)
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{goal.name}</h3>
            {goal.description && (
              <p className="text-sm text-gray-600">{goal.description}</p>
            )}
          </div>
          
          {/* Actions Menu */}
          <div className="relative goal-actions-menu">
            <button
              onClick={e => {
                e.stopPropagation()
                setShowActions(!showActions)
              }}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            
            {showActions && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                <div className="py-1">
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      setShowMappingModal(true)
                      setShowActions(false)
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Map Investments
                  </button>
                  {onEdit && (
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setShowEditModal(true)
                        setShowActions(false)
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Edit Goal
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        onDelete(goal.id)
                        setShowActions(false)
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      Delete Goal
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            {isLoadingPortfolio ? (
              <span className="text-sm font-semibold text-gray-500">Loading...</span>
            ) : (
              <span className="text-sm font-semibold text-gray-900">{calculateProgress().toFixed(1)}%</span>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            {isLoadingPortfolio ? (
              <div className="h-2 rounded-full bg-blue-200 animate-pulse" style={{ width: '100%' }}></div>
            ) : (
              <div
                className={`h-2 rounded-full transition-all duration-300 ${progressColor}`}
                style={{ width: `${calculateProgress()}%` }}
              ></div>
            )}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">Current Amount</p>
            {isLoadingAssets || isLoadingPortfolio ? (
              <div className="flex items-center h-7">
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></span>
                <span className="text-gray-500 text-sm">Loading...</span>
              </div>
            ) : (
              <p className="text-base sm:text-lg font-semibold text-gray-900">{formatCurrency(goal.current_amount + (liveStockValue || 0))}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-600">Target Amount</p>
            <p className="text-base sm:text-lg font-semibold text-gray-900">{formatCurrency(goal.target_amount)}</p>
          </div>
        </div>

        {/* Investment Breakdown */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Investment Breakdown</h4>
          <div className="space-y-2">
            {/* Mutual Funds */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-1 sm:space-y-0">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                <span className="text-xs sm:text-sm text-gray-600">Mutual Funds</span>
              </div>
              <div className="flex flex-col items-start sm:items-end">
                {isLoadingAssets ? (
                  <span className="inline-block w-16 h-5 bg-gray-200 rounded animate-pulse" />
                ) : (
                  <span className="text-xs sm:text-sm font-medium text-gray-900 break-words">
                    {goal.mutual_fund_value && goal.mutual_fund_value >= 0 ? formatCurrency(goal.mutual_fund_value) : '₹0'}
                  </span>
                )}
                {/* MF XIRR below current value */}
                {isLoadingXIRR ? (
                  <div className="flex items-center mt-1">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                    <span className="text-xs text-gray-500">Calculating XIRR...</span>
                  </div>
                ) : (
                  <span className={`text-xs sm:text-xs mt-1 ${xirrData?.xirrPercentage === undefined ? 'text-gray-400' : xirrData?.xirrPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {xirrData?.formattedXIRR ? `XIRR: ${xirrData.formattedXIRR}` : 'XIRR: N/A'}
                  </span>
                )}
              </div>
            </div>
            
            {/* NPS */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-1 sm:space-y-0">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full flex-shrink-0"></div>
                <span className="text-xs sm:text-sm text-gray-600">NPS</span>
              </div>
              {isLoadingAssets ? (
                <span className="inline-block w-16 h-5 bg-gray-200 rounded animate-pulse" />
              ) : (
                <span className="text-xs sm:text-sm font-medium text-gray-900 break-words">
                  {goal.nps_value && goal.nps_value > 0 ? formatCurrency(goal.nps_value) : '₹0'}
                </span>
              )}
            </div>
            
            {/* Stocks breakdown row */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-1 sm:space-y-0">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
                <span className="text-xs sm:text-sm text-gray-600">Stocks</span>
              </div>
              {isLoadingAssets || stockPricesLoading ? (
                <span className="inline-block w-16 h-5 bg-gray-200 rounded animate-pulse" />
              ) : (
                <span className="text-xs sm:text-sm font-medium text-gray-900 break-words">{formatCurrency(liveStockValue)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Target Date and Status */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">Target Date</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(goal.target_date)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Time Remaining</p>
            <p className={`text-sm font-medium ${statusColor}`}>
              {daysRemaining < 0 
                ? `${Math.abs(daysRemaining)} days overdue`
                : daysRemaining === 0
                ? 'Due today'
                : `${daysRemaining} days`
              }
            </p>
          </div>
        </div>

        {/* Remaining Amount */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-xs sm:text-sm text-gray-600">Remaining</span>
            {isLoadingAssets || isLoadingPortfolio ? (
              <span className="inline-block w-16 h-5 bg-gray-200 rounded animate-pulse" />
            ) : (
              <span className={`text-xs sm:text-sm font-semibold ${goal.target_amount - (goal.current_amount + (liveStockValue || 0)) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(goal.target_amount - (goal.current_amount + (liveStockValue || 0)))}
              </span>
            )}
          </div>
        </div>

        {/* Map Schemes Button */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMappingModal(true)
            }}
            className="w-full bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
          >
            Map Investments
          </button>
        </div>
      </div>

      {showDetailsModal && (
        <GoalDetailsModal goal={goal} xirrData={xirrData} onClose={() => setShowDetailsModal(false)} />
      )}

      {/* Scheme Mapping Modal */}
      {showMappingModal && (
        <GoalMappingModal
          goal={goal}
          onClose={() => setShowMappingModal(false)}
          onMappingUpdated={onMappingChanged || (() => {})}
        />
      )}

      {/* Edit Goal Modal */}
      {showEditModal && (
        <GoalEditModal
          goal={goal}
          onSave={async (updated) => {
            setShowEditModal(false)
            if (onEdit) await onEdit({ ...goal, ...updated })
          }}
          onCancel={() => setShowEditModal(false)}
        />
      )}
    </>
  )
}