import { useState } from 'react'
import { goalEditSchema, formatValidationErrors } from '@/lib/validation'
import { z } from 'zod'

interface GoalEditModalProps {
  goal: {
    id: string
    name: string
    target_amount: number
    target_date: string
  }
  onSave: (updated: { target_amount: number; target_date: string }) => void
  onCancel: () => void
}

export default function GoalEditModal({ goal, onSave, onCancel }: GoalEditModalProps) {
  const [targetAmount, setTargetAmount] = useState(goal.target_amount)
  const [targetDate, setTargetDate] = useState(goal.target_date)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const validateField = (name: string, value: string | number) => {
    try {
      if (name === 'targetAmount') {
        goalEditSchema.shape.targetAmount.parse(value)
      } else if (name === 'targetDate') {
        goalEditSchema.shape.targetDate.parse(value)
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
    setSaving(true)
    setError(null)
    setFieldErrors({})

    try {
      // Validate with Zod
      const validatedData = goalEditSchema.parse({
        targetAmount,
        targetDate
      })

      await onSave({
        target_amount: validatedData.targetAmount,
        target_date: validatedData.targetDate
      })
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
        setError(errorMessage)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (name: string, value: string | number) => {
    if (name === 'targetAmount') {
      setTargetAmount(Number(value))
    } else if (name === 'targetDate') {
      setTargetDate(value as string)
    }
    
    // Clear error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleBlur = (name: string, value: string | number) => {
    validateField(name, value)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Edit Goal</h2>
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
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Goal Name</label>
            <input
              type="text"
              value={goal.name}
              disabled
              className="w-full h-12 px-4 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed text-gray-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Target Amount</label>
            <input
              type="number"
              min={1}
              value={targetAmount}
              onChange={e => handleInputChange('targetAmount', e.target.value)}
              onBlur={e => handleBlur('targetAmount', Number(e.target.value))}
              className={`w-full h-12 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors ${
                fieldErrors.targetAmount ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 hover:border-gray-400'
              }`}
              required
            />
            {fieldErrors.targetAmount && (
              <p className="mt-2 text-sm text-red-600">{fieldErrors.targetAmount}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Target Date</label>
            <input
              type="date"
              value={targetDate.slice(0, 10)}
              onChange={e => handleInputChange('targetDate', e.target.value)}
              onBlur={e => handleBlur('targetDate', e.target.value)}
              className={`w-full h-12 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors ${
                fieldErrors.targetDate ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 hover:border-gray-400'
              }`}
              required
            />
            {fieldErrors.targetDate && (
              <p className="mt-2 text-sm text-red-600">{fieldErrors.targetDate}</p>
            )}
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
          
          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 h-12 px-6 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors font-medium text-gray-700"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-12 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 