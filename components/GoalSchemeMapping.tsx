'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getAvailableSchemes, getGoalMappings } from '@/lib/portfolioUtils'

interface GoalSchemeMappingProps {
  goalId: string
  goalName: string
  onClose: () => void
  onMappingChanged?: () => void
}

interface Scheme {
  scheme_name: string
  folio: string
}

interface Mapping {
  id: string
  scheme_name: string
  folio: string
  allocation_percentage: number
}

export default function GoalSchemeMapping({ goalId, goalName, onClose, onMappingChanged }: GoalSchemeMappingProps) {
  const [availableSchemes, setAvailableSchemes] = useState<Scheme[]>([])
  const [currentMappings, setCurrentMappings] = useState<Mapping[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [hasChanges, setHasChanges] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      // Get all schemes and current goal mappings
      const [allSchemes, currentGoalMappings] = await Promise.all([
        getAvailableSchemes(session.user.id),
        getGoalMappings(goalId)
      ])

      // Get ALL goal mappings for this user to filter out already mapped schemes
      // First get all goals for the user
      const { data: userGoals, error: goalsError } = await supabase
        .from('goals')
        .select('id')
        .eq('user_id', session.user.id)

      if (goalsError) {
        console.error('Error fetching user goals:', goalsError)
      }

      // Then get all mappings for those goals
      let allGoalMappings: Record<string, unknown>[] = []
      if (userGoals && userGoals.length > 0) {
        const goalIds = userGoals.map((goal: { id: string }) => goal.id)
        const { data: mappings, error: mappingsError } = await supabase
          .from('goal_scheme_mapping')
          .select('scheme_name, folio')
          .in('goal_id', goalIds)

        if (mappingsError) {
          console.error('Error fetching all goal mappings:', mappingsError)
        } else {
          allGoalMappings = mappings || []
        }
      }

      // Filter out schemes that are already mapped to any goal
      const mappedSchemeKeys = new Set()
      allGoalMappings.forEach((mapping: Record<string, unknown>) => {
        const key = `${mapping.scheme_name}-${mapping.folio || ''}`
        mappedSchemeKeys.add(key)
      })

      const unmappedSchemes = allSchemes.filter(scheme => {
        const key = `${scheme.scheme_name}-${scheme.folio || ''}`
        return !mappedSchemeKeys.has(key)
      })

      // Debug logging
      console.log('All schemes:', allSchemes.length)
      console.log('Mapped scheme keys:', Array.from(mappedSchemeKeys))
      console.log('Unmapped schemes:', unmappedSchemes.length)
      console.log('Unmapped schemes:', unmappedSchemes.map(s => `${s.scheme_name}-${s.folio}`))

      setAvailableSchemes(unmappedSchemes)
      setCurrentMappings(currentGoalMappings)
      setHasChanges(false) // Reset changes flag when loading
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error loading data'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [goalId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const addMapping = async (schemeName: string, folio: string) => {
    try {
      setSaving(true)
      const { error } = await supabase
        .from('goal_scheme_mapping')
        .insert({
          goal_id: goalId,
          scheme_name: schemeName,
          folio: folio || null,
          allocation_percentage: 100
        })

      if (error) {
        setError(error.message)
        return
      }

      // Refresh mappings locally (don't trigger dashboard refresh)
      const mappings = await getGoalMappings(goalId)
      setCurrentMappings(mappings)
      setHasChanges(true)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error adding mapping'
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const removeMapping = async (mappingId: string) => {
    try {
      const { error } = await supabase
        .from('goal_scheme_mapping')
        .delete()
        .eq('id', mappingId)

      if (error) {
        setError(error.message)
        return
      }

      // Refresh mappings locally (don't trigger dashboard refresh)
      const mappings = await getGoalMappings(goalId)
      setCurrentMappings(mappings)
      setHasChanges(true)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error removing mapping'
      setError(errorMessage)
    }
  }

  const isSchemeMapped = (schemeName: string, folio: string) => {
    return currentMappings.some(m => 
      m.scheme_name === schemeName && m.folio === (folio || null)
    )
  }

  const handleClose = () => {
    // Only trigger dashboard refresh if there were actual changes
    if (hasChanges) {
      onMappingChanged?.()
    }
    onClose()
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading schemes...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Map Schemes to Goal: {goalName}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Mappings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Schemes Mapped to This Goal</h3>
            {currentMappings.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-gray-600">No schemes mapped to this goal yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentMappings.map((mapping) => (
                  <div key={mapping.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-blue-900">{mapping.scheme_name}</p>
                        {mapping.folio && (
                          <p className="text-sm text-blue-700">Folio: {mapping.folio}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeMapping(mapping.id)}
                        className="text-red-600 hover:text-red-800 ml-2"
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">Available Schemes (Unmapped)</h3>
            {availableSchemes.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-gray-600">No unmapped schemes available. All schemes are already mapped to goals.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableSchemes.map((scheme) => {
                  const isMapped = isSchemeMapped(scheme.scheme_name, scheme.folio)
                  return (
                    <div key={`${scheme.scheme_name}-${scheme.folio}`} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{scheme.scheme_name}</p>
                          {scheme.folio && (
                            <p className="text-sm text-gray-600">Folio: {scheme.folio}</p>
                          )}
                        </div>
                        {isMapped ? (
                          <span className="text-green-600 text-sm font-medium">✓ Mapped</span>
                        ) : (
                          <button
                            onClick={() => addMapping(scheme.scheme_name, scheme.folio)}
                            disabled={saving}
                            className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                          >
                            {saving ? 'Adding...' : 'Add'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleClose}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
} 