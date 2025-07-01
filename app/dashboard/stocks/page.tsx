'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import StockForm from '@/components/StockForm'
import { fetchStockPrices, calculateStockValue, formatStockValue, formatStockPrice } from '@/lib/stockUtils'
import { useState as useMenuState } from 'react'

interface Stock {
  id: string
  stock_code: string
  quantity: number
  purchase_date: string
  exchange: string
  created_at: string
  updated_at: string
}

interface StockWithValue extends Stock {
  currentPrice?: number | null
  currentValue?: number
  currency?: string
  exchangeRate?: number
  originalPrice?: number
  originalCurrency?: string
}

export default function StocksPage() {
  const [stocks, setStocks] = useState<StockWithValue[]>([])
  const [loading, setLoading] = useState(true)
  const [pricesLoading, setPricesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showStockForm, setShowStockForm] = useState(false)
  const router = useRouter()
  const [editStock, setEditStock] = useState<StockWithValue | null>(null)
  const [editQuantity, setEditQuantity] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editError, setEditError] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [openMenuId, setOpenMenuId] = useMenuState<string | null>(null)
  const menuRefs = useRef<{ [id: string]: HTMLDivElement | null }>({})

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
      } else {
        setLoading(false)
        loadStocks(session.user.id)
      }
    }

    checkAuth()
  }, [router])

  const loadStocks = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('stocks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading stocks:', error)
        setError(error.message)
        return
      }

      setStocks(data || [])
      
      // Fetch current prices for all stocks
      if (data && data.length > 0) {
        await fetchCurrentPrices(data)
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const fetchCurrentPrices = async (stockData: Stock[]) => {
    try {
      setPricesLoading(true)
      // Filter out stocks with empty/invalid stock_code or exchange
      const validStocks = stockData.filter(stock =>
        typeof stock.stock_code === 'string' && stock.stock_code.trim() !== '' &&
          typeof stock.exchange === 'string' && stock.exchange.trim() !== ''
      )
      const symbols = validStocks.map(stock => stock.stock_code)
      const exchanges = validStocks.map(stock => stock.exchange === 'US' ? 'NASDAQ' : stock.exchange)
      const pricesResponse = await fetchStockPrices(symbols, exchanges)
      if (pricesResponse && pricesResponse.success) {
        const updatedStocks = stockData.map(stock => {
          // If this stock was filtered out, just return as is
          if (!symbols.includes(stock.stock_code)) return stock
          const priceData = pricesResponse.prices[stock.stock_code]
          if (priceData && priceData.price !== null) {
            const currentValue = calculateStockValue(stock.quantity, priceData.price)
            return {
              ...stock,
              currentPrice: priceData.price,
              currentValue: currentValue,
              currency: priceData.currency,
              exchangeRate: priceData.exchangeRate,
              originalPrice: priceData.originalPrice,
              originalCurrency: priceData.originalCurrency
            }
          } else {
            // If price is unavailable, set currentPrice/currentValue to undefined
            return {
              ...stock,
              currentPrice: undefined,
              currentValue: undefined,
              currency: priceData?.currency || 'INR',
              exchangeRate: priceData?.exchangeRate,
              originalPrice: priceData?.originalPrice,
              originalCurrency: priceData?.originalCurrency
            }
          }
        })
        setStocks(updatedStocks)
      }
    } catch (err: any) {
      console.error('Error fetching stock prices:', err)
    } finally {
      setPricesLoading(false)
    }
  }

  const handleStockAdded = async () => {
    setShowStockForm(false)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await loadStocks(session.user.id)
    }
  }

  const handleStockDeleted = async (stockId: string) => {
    try {
      const { error } = await supabase
        .from('stocks')
        .delete()
        .eq('id', stockId)

      if (error) {
        console.error('Error deleting stock:', error)
        return
      }

      // Refresh stocks list
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await loadStocks(session.user.id)
      }
    } catch (err: any) {
      console.error('Error in handleStockDeleted:', err)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getTotalPortfolioValue = () => {
    return stocks.reduce((total, stock) => {
      return total + (stock.currentValue || 0)
    }, 0)
  }

  const openEditModal = (stock: StockWithValue) => {
    setEditStock(stock)
    setEditQuantity(stock.quantity.toString())
    setEditDate(stock.updated_at.slice(0, 10))
    setEditError('')
  }

  const closeEditModal = () => {
    setEditStock(null)
    setEditQuantity('')
    setEditDate('')
    setEditError('')
  }

  const handleEditSave = async () => {
    setEditLoading(true)
    setEditError('')
    const quantityNum = parseFloat(editQuantity)
    if (isNaN(quantityNum) || quantityNum <= 0 || editQuantity.split('.')[1]?.length > 3) {
      setEditError('Quantity must be a positive number with up to 3 decimal places')
      setEditLoading(false)
      return
    }
    if (!editDate) {
      setEditError('Date is required')
      setEditLoading(false)
      return
    }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setEditError('Not authenticated')
        setEditLoading(false)
        return
      }
      const { error } = await supabase
        .from('stocks')
        .update({ quantity: quantityNum, updated_at: new Date(editDate).toISOString() })
        .eq('id', editStock!.id)
        .eq('user_id', session.user.id)
      if (error) {
        setEditError(error.message)
        setEditLoading(false)
        return
      }
      await loadStocks(session.user.id)
      closeEditModal()
    } catch (err: any) {
      setEditError(err.message || 'Error updating stock')
    } finally {
      setEditLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading stocks...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error loading stocks</div>
          <p className="text-gray-600">{error}</p>
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Stocks</h1>
              <p className="text-gray-600">Manage your stock investments</p>
            </div>
            <button
              onClick={() => setShowStockForm(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Stock
            </button>
          </div>
        </div>

        {/* Portfolio Summary Card */}
        {stocks.length > 0 && (
          <div className="mb-6">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Stock Portfolio Value</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {pricesLoading ? 'Loading...' : formatStockValue(getTotalPortfolioValue())}
                    </p>
                  </div>
                </div>
                {pricesLoading && (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stocks List */}
        {stocks.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No stocks yet</h3>
            <p className="text-gray-600 mb-4">Add your first stock investment to start tracking.</p>
            <button
              onClick={() => setShowStockForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Add Your First Stock
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Your Stock Holdings</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Exchange
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stocks.map((stock) => (
                    <tr key={stock.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{stock.stock_code}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{stock.quantity.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {pricesLoading ? (
                            <div className="animate-pulse bg-gray-200 h-4 w-16 rounded"></div>
                          ) : (
                            formatStockPrice(stock.currentPrice || null, 'INR')
                          )}
                        </div>
                        {stock.originalPrice && stock.originalCurrency && (
                          <div className="text-xs text-gray-500">
                            {formatStockPrice(stock.originalPrice, stock.originalCurrency)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {pricesLoading ? (
                            <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
                          ) : (
                            formatStockValue(stock.currentValue || 0)
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{stock.exchange}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(stock.updated_at)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === stock.id ? null : stock.id)}
                          className="text-gray-500 hover:text-gray-900 p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                          aria-label="Actions"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="1.5" />
                            <circle cx="19.5" cy="12" r="1.5" />
                            <circle cx="4.5" cy="12" r="1.5" />
                          </svg>
                        </button>
                        {openMenuId === stock.id && (
                          <div
                            ref={el => { menuRefs.current[stock.id] = el; }}
                            className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
                          >
                            <button
                              onClick={() => { setOpenMenuId(null); openEditModal(stock) }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => { setOpenMenuId(null); handleStockDeleted(stock.id) }}
                              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Stock Form Modal */}
      {showStockForm && (
        <StockForm
          onStockAdded={handleStockAdded}
          onCancel={() => setShowStockForm(false)}
          existingHoldings={stocks.map(s => ({ stock_code: s.stock_code, exchange: s.exchange }))}
        />
      )}

      {editStock && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Edit Stock Holding</h2>
            <div className="mb-4">
              <label htmlFor="editQuantity" className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
              <input
                type="number"
                id="editQuantity"
                name="editQuantity"
                value={editQuantity}
                onChange={e => setEditQuantity(e.target.value)}
                min="0.001"
                step="0.001"
                className="w-full h-12 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 placeholder-gray-400 transition-colors"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="editDate" className="block text-sm font-semibold text-gray-700 mb-2">Last Updated</label>
              <input
                type="date"
                id="editDate"
                name="editDate"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full h-12 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 transition-colors"
              />
            </div>
            {editError && <p className="mt-2 text-sm text-red-600">{editError}</p>}
            <div className="flex justify-end space-x-2">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                disabled={editLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                disabled={editLoading}
              >
                {editLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 