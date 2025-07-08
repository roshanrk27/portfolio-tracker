'use client'

import { useState, useEffect } from 'react'
import Tooltip from './Tooltip'

interface GoalSimulatorFormProps {
  goalId?: string
  initialData?: {
    monthlySIP?: number
    xirr?: number
    stepUp?: number
    targetAmount?: number
    existingCorpus?: number
  }
  onSubmit?: (data: SimulationFormData) => void
  onChange?: (data: SimulationFormData) => void
}

export interface SimulationFormData {
  monthlySIP: number
  xirr: number
  stepUp: number
  targetAmount?: number
  existingCorpus: number
  months: number
  goalId?: string
}

export default function GoalSimulatorForm({
  goalId,
  initialData,
  onSubmit,
  onChange
}: GoalSimulatorFormProps) {
  const [formData, setFormData] = useState<SimulationFormData>({
    monthlySIP: initialData?.monthlySIP || 0,
    xirr: initialData?.xirr || 12,
    stepUp: initialData?.stepUp || 0,
    targetAmount: initialData?.targetAmount,
    existingCorpus: initialData?.existingCorpus || 0,
    months: 60,
    goalId
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        monthlySIP: initialData.monthlySIP ? Math.round(initialData.monthlySIP) : prev.monthlySIP,
        xirr: initialData.xirr ?? prev.xirr,
        stepUp: initialData.stepUp ?? prev.stepUp,
        targetAmount: initialData.targetAmount ?? prev.targetAmount,
        existingCorpus: initialData.existingCorpus ? Math.round(initialData.existingCorpus) : prev.existingCorpus,
        months: prev.months,
        goalId: goalId ?? prev.goalId
      }))
    }
  }, [initialData, goalId])

  // Emit changes when form data changes
  useEffect(() => {
    if (onChange) {
      onChange(formData)
    }
  }, [formData, onChange])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.monthlySIP || formData.monthlySIP <= 0) {
      newErrors.monthlySIP = 'Monthly SIP must be greater than 0'
    }

    if (!formData.xirr || formData.xirr < 0 || formData.xirr > 50) {
      newErrors.xirr = 'XIRR must be between 0 and 50%'
    }

    if (formData.stepUp < 0 || formData.stepUp > 100) {
      newErrors.stepUp = 'Step-up must be between 0 and 100%'
    }

    if (formData.targetAmount !== undefined && formData.targetAmount <= 0) {
      newErrors.targetAmount = 'Target amount must be greater than 0'
    }

    if (formData.existingCorpus < 0) {
      newErrors.existingCorpus = 'Existing corpus must be greater than or equal to 0'
    }

    // Duration validation: only required if no target amount is provided
    if (!formData.targetAmount && (!formData.months || formData.months < 1 || formData.months > 600)) {
      newErrors.months = 'Duration must be between 1 and 600 months when no target amount is specified'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateForm() && onSubmit) {
      onSubmit(formData)
    }
  }

  const handleInputChange = (field: keyof SimulationFormData, value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value
    
    // Round to whole numbers for monthlySIP, existingCorpus, months
    const roundedValue = (field === 'monthlySIP' || field === 'existingCorpus' || field === 'months') 
      ? Math.round(numValue) 
      : numValue
    
    setFormData(prev => ({
      ...prev,
      [field]: roundedValue
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly SIP */}
        <div>
          <label htmlFor="monthlySIP" className="block text-sm font-medium text-gray-700 mb-2">
            Monthly SIP Amount (₹)
          </label>
          <input
            type="number"
            id="monthlySIP"
            value={formData.monthlySIP || ''}
            onChange={(e) => handleInputChange('monthlySIP', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.monthlySIP ? 'border-red-500' : 'border-gray-300'
            } placeholder-gray-500`}
            style={{ background: '#E8F0FE', color: '#1A202C' }}
            placeholder="Enter monthly SIP amount"
            min="0"
            step="1"
          />
          {errors.monthlySIP && (
            <p className="mt-1 text-sm text-red-600">{errors.monthlySIP}</p>
          )}
        </div>

        {/* XIRR */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label htmlFor="xirr" className="block text-sm font-medium text-gray-700">
              Expected XIRR (%)
            </label>
            <Tooltip content="What % return do you expect from your investments for this goal">
              <svg className="w-4 h-4 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Tooltip>
          </div>
          <input
            type="number"
            id="xirr"
            value={formData.xirr || ''}
            onChange={(e) => handleInputChange('xirr', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.xirr ? 'border-red-500' : 'border-gray-300'
            } placeholder-gray-500`}
            style={{ background: '#E8F0FE', color: '#1A202C' }}
            placeholder="Enter expected XIRR"
            min="0"
            max="50"
            step="0.1"
          />
          {errors.xirr && (
            <p className="mt-1 text-sm text-red-600">{errors.xirr}</p>
          )}
        </div>

        {/* Step-up */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label htmlFor="stepUp" className="block text-sm font-medium text-gray-700">
              Yearly Step-up (%)
            </label>
            <Tooltip content="By what % do you wish to increase your SIP each year">
              <svg className="w-4 h-4 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Tooltip>
          </div>
          <input
            type="number"
            id="stepUp"
            value={formData.stepUp || ''}
            onChange={(e) => handleInputChange('stepUp', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.stepUp ? 'border-red-500' : 'border-gray-300'
            } placeholder-gray-500`}
            style={{ background: '#E8F0FE', color: '#1A202C' }}
            placeholder="Enter yearly step-up percentage"
            min="0"
            max="100"
            step="0.1"
          />
          {errors.stepUp && (
            <p className="mt-1 text-sm text-red-600">{errors.stepUp}</p>
          )}
        </div>

        {/* Target Amount */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label htmlFor="targetAmount" className="block text-sm font-medium text-gray-700">
              Target Amount (₹) <span className="text-gray-500">(Optional)</span>
            </label>
            <Tooltip content="The total amount you wish to achieve through your investments for this goal">
              <svg className="w-4 h-4 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Tooltip>
          </div>
          <input
            type="number"
            id="targetAmount"
            value={formData.targetAmount || ''}
            onChange={(e) => handleInputChange('targetAmount', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.targetAmount ? 'border-red-500' : 'border-gray-300'
            } placeholder-gray-500`}
            style={{ background: '#E8F0FE', color: '#1A202C' }}
            placeholder="Enter target amount"
            min="0"
            step="1"
          />
          {errors.targetAmount && (
            <p className="mt-1 text-sm text-red-600">{errors.targetAmount}</p>
          )}
        </div>

        {/* Existing Corpus */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label htmlFor="existingCorpus" className="block text-sm font-medium text-gray-700">
              Existing Corpus (₹) <span className="text-gray-500">(Optional)</span>
            </label>
            <Tooltip content="The value of your investments for this goal that already exists">
              <svg className="w-4 h-4 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Tooltip>
          </div>
          <input
            type="number"
            id="existingCorpus"
            value={formData.existingCorpus || ''}
            onChange={(e) => handleInputChange('existingCorpus', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.existingCorpus ? 'border-red-500' : 'border-gray-300'
            } placeholder-gray-500`}
            style={{ background: '#E8F0FE', color: '#1A202C' }}
            placeholder="Enter existing corpus amount"
            min="0"
            step="1"
          />
          {errors.existingCorpus && (
            <p className="mt-1 text-sm text-red-600">{errors.existingCorpus}</p>
          )}
        </div>

        {/* Duration (months) */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label htmlFor="months" className="block text-sm font-medium text-gray-700">
              Duration (months) {formData.targetAmount && <span className="text-gray-500">(Optional)</span>}
            </label>
            <Tooltip content="How many months do you plan to invest for this goal? If you specify a target amount, this field becomes optional and the simulator will calculate the duration needed to reach the target.">
              <svg className="w-4 h-4 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Tooltip>
          </div>
          <input
            type="number"
            id="months"
            value={formData.months || ''}
            onChange={(e) => handleInputChange('months', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.months ? 'border-red-500' : 'border-gray-300'
            } placeholder-gray-500`}
            style={{ background: '#E8F0FE', color: '#1A202C' }}
            placeholder="Enter duration in months"
            min="1"
            max="600"
            step="1"
          />
          {errors.months && (
            <p className="mt-1 text-sm text-red-600">{errors.months}</p>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Simulate Goal
        </button>
      </div>
    </form>
  )
} 