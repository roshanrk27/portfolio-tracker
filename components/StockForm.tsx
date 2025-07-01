'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { stockFormSchema, formatValidationErrors } from '@/lib/validation'

interface StockFormProps {
  onStockAdded: () => void
  onCancel: () => void
  existingHoldings: { stock_code: string; exchange: string }[]
}

export default function StockForm({ onStockAdded, onCancel, existingHoldings }: StockFormProps) {
  const [formData, setFormData] = useState({
    stockCode: '',
    quantity: '',
    purchaseDate: '',
    exchange: 'NSE'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const validateField = (name: string, value: string) => {
    try {
      if (name === 'stockCode') {
        stockFormSchema.shape.stockCode.parse(value)
      } else if (name === 'quantity') {
        stockFormSchema.shape.quantity.parse(value)
      } else if (name === 'purchaseDate') {
        stockFormSchema.shape.purchaseDate.parse(value)
      }
      // Clear field error if validation passes
      setFieldErrors(prev => ({ ...prev, [name]: '' }))
    } catch (err) {
      if (err instanceof Error) {
        setFieldErrors(prev => ({ ...prev, [name]: err.message }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setFieldErrors({})

    // Client-side duplicate check
    const duplicate = existingHoldings.some(h =>
      h.stock_code.trim().toUpperCase() === formData.stockCode.trim().toUpperCase() &&
      h.exchange === formData.exchange
    )
    if (duplicate) {
      setError('You already have a holding for this stock and exchange.')
      setLoading(false)
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      // Validate entire form with Zod
      const validatedData = stockFormSchema.parse(formData)

      // Insert stock into database
      const { error: insertError } = await supabase
        .from('stocks')
        .insert({
          user_id: session.user.id,
          stock_code: validatedData.stockCode,
          quantity: validatedData.quantity,
          purchase_date: validatedData.purchaseDate,
          exchange: formData.exchange
        })

      if (insertError) {
        console.error('Error inserting stock:', insertError)
        setError(insertError.message)
        return
      }

      // Reset form and notify parent
      setFormData({
        stockCode: '',
        quantity: '',
        purchaseDate: '',
        exchange: 'NSE'
      })
      onStockAdded()
    } catch (err: any) {
      if (err.name === 'ZodError') {
        // Handle Zod validation errors
        const errorMessage = formatValidationErrors(err)
        setError(errorMessage)
        
        // Set individual field errors
        const fieldErrors: Record<string, string> = {}
        err.errors.forEach((error: any) => {
          if (error.path[0]) {
            fieldErrors[error.path[0]] = error.message
          }
        })
        setFieldErrors(fieldErrors)
      } else {
        console.error('Error in handleSubmit:', err)
        setError(err.message || 'An error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    validateField(name, value)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Add New Stock</h2>
          <button
            onClick={onCancel}
            className="text-neutral-500 hover:text-neutral-800 p-2 rounded-full hover:bg-neutral-100 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Stock Code */}
          <div>
            <label htmlFor="stockCode" className="block text-sm font-semibold text-gray-700 mb-3">
              Stock Code *
            </label>
            <input
              type="text"
              id="stockCode"
              name="stockCode"
              value={formData.stockCode}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder="e.g., RELIANCE, TCS, INFY"
              className={`w-full h-12 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white placeholder-gray-400 transition-colors ${
                fieldErrors.stockCode ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 hover:border-gray-400'
              }`}
              required
            />
            {fieldErrors.stockCode && (
              <p className="mt-2 text-sm text-red-600">{fieldErrors.stockCode}</p>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label htmlFor="quantity" className="block text-sm font-semibold text-gray-700 mb-3">
              Quantity *
            </label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              value={formData.quantity}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder="100.000"
              min="0.001"
              step="0.001"
              className={`w-full h-12 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white placeholder-gray-400 transition-colors ${
                fieldErrors.quantity ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 hover:border-gray-400'
              }`}
              required
            />
            {fieldErrors.quantity && (
              <p className="mt-2 text-sm text-red-600">{fieldErrors.quantity}</p>
            )}
          </div>

          {/* Purchase Date */}
          <div>
            <label htmlFor="purchaseDate" className="block text-sm font-semibold text-gray-700 mb-3">
              Purchase Date *
            </label>
            <input
              type="date"
              id="purchaseDate"
              name="purchaseDate"
              value={formData.purchaseDate}
              onChange={handleInputChange}
              onBlur={handleBlur}
              max={new Date().toISOString().split('T')[0]}
              className={`w-full h-12 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors ${
                fieldErrors.purchaseDate ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 hover:border-gray-400'
              }`}
              required
            />
            {fieldErrors.purchaseDate && (
              <p className="mt-2 text-sm text-red-600">{fieldErrors.purchaseDate}</p>
            )}
          </div>

          {/* Exchange */}
          <div>
            <label htmlFor="exchange" className="block text-sm font-semibold text-gray-700 mb-3">
              Exchange *
            </label>
            <select
              id="exchange"
              name="exchange"
              value={formData.exchange}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={`w-full h-12 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white placeholder-gray-400 transition-colors ${
                fieldErrors.exchange ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 hover:border-gray-400'
              }`}
              required
            >
              <option value="NSE">NSE</option>
              <option value="BSE">BSE</option>
              <option value="US">US</option>
            </select>
            {fieldErrors.exchange && (
              <p className="mt-2 text-sm text-red-600">{fieldErrors.exchange}</p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 h-12 px-6 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-12 px-6 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Adding...' : 'Add Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 