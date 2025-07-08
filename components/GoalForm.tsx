'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { goalFormSchema, formatValidationErrors } from '@/lib/validation'
import { z } from 'zod'

interface GoalFormProps {
  onGoalAdded: () => void
  onCancel: () => void
}

export default function GoalForm({ onGoalAdded, onCancel }: GoalFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    targetAmount: '',
    targetDate: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const validateField = (name: string, value: string) => {
    try {
      if (name === 'name') {
        goalFormSchema.shape.name.parse(value)
      } else if (name === 'description') {
        goalFormSchema.shape.description.parse(value)
      } else if (name === 'targetAmount') {
        goalFormSchema.shape.targetAmount.parse(value)
      } else if (name === 'targetDate') {
        goalFormSchema.shape.targetDate.parse(value)
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

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      // Validate entire form with Zod
      const validatedData = goalFormSchema.parse(formData)

      // Insert goal into database
      const { error: insertError } = await supabase
        .from('goals')
        .insert({
          user_id: session.user.id,
          name: validatedData.name,
          description: validatedData.description || null,
          target_amount: validatedData.targetAmount,
          target_date: validatedData.targetDate
        })

      if (insertError) {
        console.error('Error inserting goal:', insertError)
        setError(insertError.message)
        return
      }

      // Reset form and notify parent
      setFormData({
        name: '',
        description: '',
        targetAmount: '',
        targetDate: ''
      })
      onGoalAdded()
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        // Handle Zod validation errors
        const errorMessage = formatValidationErrors(err)
        setError(errorMessage)
        // Set individual field errors
        const fieldErrors: Record<string, string> = {}
        err.errors.forEach((error) => {
          if (error.path && Array.isArray(error.path) && error.path[0]) {
            fieldErrors[error.path[0] as string] = error.message
          }
        })
        setFieldErrors(fieldErrors)
      } else {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred'
        console.error('Error in handleSubmit:', errorMessage)
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    validateField(name, value)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Add New Goal</h2>
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
          {/* Goal Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-3">
              Goal Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Buy a house, Child's education"
              className={`w-full h-12 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                fieldErrors.name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 hover:border-gray-400'
              } placeholder-gray-500`}
              style={{ background: '#E8F0FE', color: '#1A202C' }}
              required
            />
            {fieldErrors.name && (
              <p className="mt-2 text-sm text-red-600">{fieldErrors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-3">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder="Optional description of your goal"
              rows={3}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors ${
                fieldErrors.description ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 hover:border-gray-400'
              } placeholder-gray-500`}
              style={{ background: '#E8F0FE', color: '#1A202C' }}
            />
            {fieldErrors.description && (
              <p className="mt-2 text-sm text-red-600">{fieldErrors.description}</p>
            )}
          </div>

          {/* Target Amount */}
          <div>
            <label htmlFor="targetAmount" className="block text-sm font-semibold text-gray-700 mb-3">
              Target Amount (₹) *
            </label>
            <input
              type="number"
              id="targetAmount"
              name="targetAmount"
              value={formData.targetAmount}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder="1000000"
              min="1"
              className={`w-full h-12 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                fieldErrors.targetAmount ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 hover:border-gray-400'
              } placeholder-gray-500`}
              style={{ background: '#E8F0FE', color: '#1A202C' }}
              required
            />
            {fieldErrors.targetAmount && (
              <p className="mt-2 text-sm text-red-600">{fieldErrors.targetAmount}</p>
            )}
          </div>

          {/* Target Date */}
          <div>
            <label htmlFor="targetDate" className="block text-sm font-semibold text-gray-700 mb-3">
              Target Date *
            </label>
            <input
              type="date"
              id="targetDate"
              name="targetDate"
              value={formData.targetDate}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={`w-full h-12 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                fieldErrors.targetDate ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 hover:border-gray-400'
              } placeholder-gray-500`}
              style={{ background: '#E8F0FE', color: '#1A202C' }}
              required
            />
            {fieldErrors.targetDate && (
              <p className="mt-2 text-sm text-red-600">{fieldErrors.targetDate}</p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 h-12 px-6 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors font-medium text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-12 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Adding...' : 'Add Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 