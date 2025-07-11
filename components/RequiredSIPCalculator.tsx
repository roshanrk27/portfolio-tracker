'use client'

import { useState, useEffect } from 'react'
import { generateStepUpScenarios, formatIndianNumberWithSuffix } from '@/lib/goalSimulator'
import Tooltip from './Tooltip'

interface RequiredSIPFormData {
  targetAmount: number
  months: number
  xirr: number
  existingCorpus: number
  stepUpRates: number[]
}

interface RequiredSIPResult {
  stepUpPercent: number
  monthlySIP: number
  totalInvested: number
  finalCorpus: number
  yearColumns: Array<{ year: number; sip: number }>
}

interface RequiredSIPCalculatorProps {
  goalId?: string
  initialData?: {
    targetAmount?: number
    months?: number
    xirr?: number
    existingCorpus?: number
  }
  onSubmit?: (data: RequiredSIPFormData) => void
  onChange?: (data: RequiredSIPFormData) => void
}

export default function RequiredSIPCalculator({
  initialData,
  onSubmit,
  onChange
}: RequiredSIPCalculatorProps) {
  const [formData, setFormData] = useState<RequiredSIPFormData>({
    targetAmount: initialData?.targetAmount || 0,
    months: initialData?.months || 60,
    xirr: initialData?.xirr || 12,
    existingCorpus: initialData?.existingCorpus || 0,
    stepUpRates: [0, 5, 10, 15, 20]
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [scenarios, setScenarios] = useState<RequiredSIPResult[]>([])
  const [isCalculating, setIsCalculating] = useState(false)
  const [corpusBreakdown, setCorpusBreakdown] = useState<{
    futureValueOfExisting: number
    remainingTarget: number
  } | null>(null)

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        targetAmount: initialData.targetAmount ?? prev.targetAmount,
        months: initialData.months ?? prev.months,
        xirr: initialData.xirr ?? prev.xirr,
        existingCorpus: initialData.existingCorpus ?? prev.existingCorpus
      }))
    }
  }, [initialData])

  // Emit changes when form data changes
  useEffect(() => {
    if (onChange) {
      onChange(formData)
    }
  }, [formData, onChange])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.targetAmount || formData.targetAmount <= 0) {
      newErrors.targetAmount = 'Target amount must be greater than 0'
    }

    if (!formData.months || formData.months < 1 || formData.months > 600) {
      newErrors.months = 'Duration must be between 1 and 600 months'
    }

    if (!formData.xirr || formData.xirr < 0 || formData.xirr > 50) {
      newErrors.xirr = 'XIRR must be between 0 and 50%'
    }

    if (formData.existingCorpus < 0) {
      newErrors.existingCorpus = 'Existing corpus must be greater than or equal to 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsCalculating(true)
    setCorpusBreakdown(null) // Clear previous breakdown
    
    try {
      // Calculate corpus breakdown for display
      const monthlyRate = formData.xirr / 100 / 12
      const futureValueOfExisting = formData.existingCorpus * Math.pow(1 + monthlyRate, formData.months)
      const remainingTarget = formData.targetAmount - futureValueOfExisting
      
      setCorpusBreakdown({
        futureValueOfExisting,
        remainingTarget
      })
      
      // Check if existing corpus is sufficient
      if (remainingTarget <= 0) {
        setScenarios([])
        setErrors({ general: 'Your existing corpus is sufficient to reach the target. No additional SIP is required.' })
        return
      }
      
      const scenarios = generateStepUpScenarios(
        formData.targetAmount,
        formData.months,
        formData.xirr,
        formData.existingCorpus,
        formData.stepUpRates
      )
      
      setScenarios(scenarios)
      
      if (onSubmit) {
        onSubmit(formData)
      }
    } catch (error) {
      console.error('Error calculating required SIP:', error)
      setErrors({ general: 'Error calculating required SIP. Please check your inputs.' })
    } finally {
      setIsCalculating(false)
    }
  }

  const handleInputChange = (field: keyof RequiredSIPFormData, value: string | number) => {
    let processedValue: number | undefined
    
    if (typeof value === 'string') {
      if (value === '') {
        processedValue = undefined
      } else {
        const numValue = parseFloat(value)
        processedValue = isNaN(numValue) ? 0 : numValue
      }
    } else {
      processedValue = value
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }))
  }

  const handleStepUpRatesChange = (rates: string) => {
    const rateArray = rates.split(',').map(r => parseFloat(r.trim())).filter(r => !isNaN(r))
    setFormData(prev => ({
      ...prev,
      stepUpRates: rateArray.length > 0 ? rateArray : [0, 5, 10, 15, 20]
    }))
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Target Amount */}
          <div>
            <label htmlFor="targetAmount" className="block text-sm font-medium text-gray-700 mb-2">
              Target Amount (₹)
            </label>
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
              step="any"
            />
            {errors.targetAmount && (
              <p className="mt-1 text-sm text-red-600">{errors.targetAmount}</p>
            )}
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="months" className="block text-sm font-medium text-gray-700 mb-2">
              Duration (Months)
            </label>
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

          {/* XIRR */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label htmlFor="xirr" className="block text-sm font-medium text-gray-700">
                Expected XIRR (%)
              </label>
              <Tooltip content="What % return do you expect from your investments">
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

          {/* Existing Corpus */}
          <div>
            <label htmlFor="existingCorpus" className="block text-sm font-medium text-gray-700 mb-2">
              Existing Corpus (₹)
            </label>
            <input
              type="number"
              id="existingCorpus"
              value={formData.existingCorpus || ''}
              onChange={(e) => handleInputChange('existingCorpus', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.existingCorpus ? 'border-red-500' : 'border-gray-300'
              } placeholder-gray-500`}
              style={{ background: '#E8F0FE', color: '#1A202C' }}
              placeholder="Enter existing corpus"
              min="0"
              step="any"
            />
            {errors.existingCorpus && (
              <p className="mt-1 text-sm text-red-600">{errors.existingCorpus}</p>
            )}
          </div>

          {/* Step-up Rates */}
          <div className="md:col-span-2">
            <label htmlFor="stepUpRates" className="block text-sm font-medium text-gray-700 mb-2">
              Step-up Rates (%) (comma-separated)
            </label>
            <input
              type="text"
              id="stepUpRates"
              value={formData.stepUpRates.join(', ')}
              onChange={(e) => handleStepUpRatesChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
              style={{ background: '#E8F0FE', color: '#1A202C' }}
              placeholder="0, 5, 10, 15, 20"
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter step-up percentages to compare different scenarios
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center">
          <button
            type="submit"
            disabled={isCalculating}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isCalculating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Calculating...
              </>
            ) : (
              'Calculate Required SIP'
            )}
          </button>
        </div>
      </form>

      {/* Error Display */}
      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Calculation Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{errors.general}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Table */}
      {scenarios.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Required SIP Scenarios</h3>
          
          {/* Corpus Breakdown Display */}
          {corpusBreakdown && formData.existingCorpus > 0 && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-800 mb-3">Corpus Breakdown</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-xs text-blue-600 font-medium">Existing Corpus</div>
                  <div className="text-lg font-bold text-blue-900">
                    {formatIndianNumberWithSuffix(formData.existingCorpus)}
                  </div>
                  <div className="text-xs text-blue-500">Current Value</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-green-600 font-medium">Future Value</div>
                  <div className="text-lg font-bold text-green-900">
                    {formatIndianNumberWithSuffix(corpusBreakdown.futureValueOfExisting)}
                  </div>
                  <div className="text-xs text-green-500">After {formData.months} months</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-orange-600 font-medium">Remaining Target</div>
                  <div className="text-lg font-bold text-orange-900">
                    {formatIndianNumberWithSuffix(corpusBreakdown.remainingTarget)}
                  </div>
                  <div className="text-xs text-orange-500">To be achieved via SIP</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-blue-600">
                <strong>Note:</strong> The SIP amounts below are calculated to achieve the remaining target amount.
              </div>
            </div>
          )}
          
          <div className="overflow-x-auto">
            {formData.existingCorpus > 0 && (
              <div className="mb-2 text-xs text-gray-600">
                <strong>Note:</strong> &ldquo;Total Invested&rdquo; shows only the new SIP investments. Your existing corpus of {formatIndianNumberWithSuffix(formData.existingCorpus)} will grow to {formatIndianNumberWithSuffix(corpusBreakdown?.futureValueOfExisting || 0)} and contribute to the final corpus.
              </div>
            )}
            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Step-up %
                  </th>
                  {scenarios[0]?.yearColumns.map((yearCol, colIndex) => (
                    <th key={colIndex} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SIP (Year {yearCol.year})
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Invested
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {formData.existingCorpus > 0 ? 'Total Corpus' : 'Final Corpus'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {scenarios.map((scenario, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {scenario.stepUpPercent}%
                    </td>
                    {scenario.yearColumns.map((yearCol, colIndex) => (
                      <td key={colIndex} className="px-4 py-3 text-sm text-gray-900 font-mono">
                        {formatIndianNumberWithSuffix(yearCol.sip)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                      {formatIndianNumberWithSuffix(scenario.totalInvested)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                      {formatIndianNumberWithSuffix(scenario.finalCorpus)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
} 