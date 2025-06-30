'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getAvailableSchemes, getGoalMappings } from '@/lib/portfolioUtils'

interface Goal {
  id: string
  name: string
  description: string | null
  target_amount: number
  target_date: string
  current_amount: number
}

interface Scheme {
  scheme_name: string
  folio: string
}

interface GoalMapping {
  id: string
  goal_id: string
  scheme_name: string
  folio: string
  allocation_percentage: number
}

interface GoalMappingModalProps {
  goal: Goal
  onClose: () => void
  onMappingUpdated: () => void
}

export default function GoalMappingModal({ goal, onClose, onMappingUpdated }: GoalMappingModalProps) {
  const [availableSchemes, setAvailableSchemes] = useState<Scheme[]>([])
  const [currentMappings, setCurrentMappings] = useState<GoalMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [goal.id])

  const loadData = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      const [schemes, mappings] = await Promise.all([
        getAvailableSchemes(session.user.id),
        getGoalMappings(goal.id)
      ])

      setAvailableSchemes(schemes)
      setCurrentMappings(mappings)
    } catch (err: any) {
      setError(err.message || 'Error loading data')
    } finally {
      setLoading(false)
    }
  }

  const addMapping = async (schemeName: string, folio: string) => {
    try {
      setSaving(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      const { error: insertError } = await supabase
        .from('goal_scheme_mapping')
        .insert({
          goal_id: goal.id,
          scheme_name: schemeName,
          folio: folio,
          allocation_percentage: 100
        })

      if (insertError) {
        console.error('Error adding mapping:', insertError)
        setError(insertError.message)
        return
      }

      // Refresh mappings
      const mappings = await getGoalMappings(goal.id)
      setCurrentMappings(mappings)
      onMappingUpdated()
    } catch (err: any) {
      setError(err.message || 'Error adding mapping')
    } finally {
      setSaving(false)
    }
  }

  const removeMapping = async (mappingId: string) => {
    try {
      setSaving(true)
      const { error: deleteError } = await supabase
        .from('goal_scheme_mapping')
        .delete()
        .eq('id', mappingId)

      if (deleteError) {
        console.error('Error removing mapping:', deleteError)
        setError(deleteError.message)
        return
      }

      // Refresh mappings
      const mappings = await getGoalMappings(goal.id)
      setCurrentMappings(mappings)
      onMappingUpdated()
    } catch (err: any) {
      setError(err.message || 'Error removing mapping')
    } finally {
      setSaving(false)
    }
  }

  const isSchemeMapped = (schemeName: string, folio: string) => {
    return currentMappings.some(mapping => 
      mapping.scheme_name === schemeName && mapping.folio === folio
    )
  }

  const getUnmappedSchemes = () => {
    return availableSchemes.filter(scheme => 
      !isSchemeMapped(scheme.scheme_name, scheme.folio)
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading investment mappings...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Map Investments to Goal</h2>
            <p className="text-sm text-gray-600 mt-1">{goal.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Mappings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Mapped Investments</h3>
            {currentMappings.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-gray-600">No investments mapped to this goal yet.</p>
                <p className="text-sm text-gray-500 mt-1">Add investments from the right panel.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentMappings.map((mapping) => (
                  <div key={mapping.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-green-900">{mapping.scheme_name}</h4>
                        <p className="text-sm text-green-700">Folio: {mapping.folio}</p>
                      </div>
                      <button
                        onClick={() => removeMapping(mapping.id)}
                        disabled={saving}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Schemes */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Available Investments</h3>
            {getUnmappedSchemes().length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-gray-600">All investments are already mapped to this goal.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {getUnmappedSchemes().map((scheme, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{scheme.scheme_name}</h4>
                        <p className="text-sm text-gray-600">Folio: {scheme.folio}</p>
                      </div>
                      <button
                        onClick={() => addMapping(scheme.scheme_name, scheme.folio)}
                        disabled={saving}
                        className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? 'Adding...' : 'Add'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
} 