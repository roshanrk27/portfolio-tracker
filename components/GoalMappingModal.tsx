'use client'

import { useState, useEffect, useCallback } from 'react'
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

interface Stock {
  id: string
  stock_code: string
  quantity: number
  exchange: string
}

interface NpsHolding {
  id: string
  fund_code: string
  units: string | number
  user_id?: string
  as_of_date?: string
  created_at?: string
  updated_at?: string
  nps_funds?: {
    fund_name: string
  }
}

interface GoalMapping {
  id: string
  goal_id: string
  scheme_name: string
  folio: string
  source_type: 'mutual_fund' | 'stock' | 'nps'
  source_id?: string
  allocation_percentage: number
}

interface GoalMappingModalProps {
  goal: Goal
  onClose: () => void
  onMappingUpdated: () => void
}

export default function GoalMappingModal({ goal, onClose, onMappingUpdated }: GoalMappingModalProps) {
  const [availableSchemes, setAvailableSchemes] = useState<Scheme[]>([])
  const [availableStocks, setAvailableStocks] = useState<Stock[]>([])
  const [currentMappings, setCurrentMappings] = useState<GoalMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'mutual_funds' | 'stocks' | 'nps'>('mutual_funds')
  const [allGoalMappings, setAllGoalMappings] = useState<GoalMapping[]>([])
  const [selectedStockIds, setSelectedStockIds] = useState<string[]>([])
  const [availableNpsHoldings, setAvailableNpsHoldings] = useState<NpsHolding[]>([])
  const [selectedNpsIds, setSelectedNpsIds] = useState<string[]>([])
  const [hasChanges, setHasChanges] = useState(false)
  // BEGIN: Mutual Fund Search Box State
  const [mfSearchTerm, setMfSearchTerm] = useState('');
  // END: Mutual Fund Search Box State
  // BEGIN: Mutual Fund Multi-Select State
  const [selectedSchemeKeys, setSelectedSchemeKeys] = useState<string[]>([]);
  // END: Mutual Fund Multi-Select State

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      const [schemes, mappings, stocks, allGoalMappings, npsHoldings] = await Promise.all([
        getAvailableSchemes(session.user.id),
        getGoalMappings(goal.id),
        loadStocks(session.user.id),
        loadAllGoalMappings(session.user.id),
        loadNpsHoldings(session.user.id)
      ])

      setAvailableSchemes(schemes)
      setCurrentMappings(mappings)
      setAvailableStocks(stocks)
      setAllGoalMappings(allGoalMappings)
      const mappedNpsIds = new Set(
        allGoalMappings.filter(m => m.source_type === 'nps' && m.source_id).map(m => m.source_id)
      )
      setAvailableNpsHoldings(npsHoldings.filter(h => !mappedNpsIds.has(h.id)))
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error loading data'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [goal.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const loadStocks = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('stocks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading stocks:', error)
        return []
      }

      return data || []
    } catch (err) {
      console.error('Error loading stocks:', err)
      return []
    }
  }

  const loadAllGoalMappings = async (userId: string) => {
    const { data: userGoals, error: goalsError } = await supabase
      .from('goals')
      .select('id')
      .eq('user_id', userId)
    if (goalsError) return []
    if (!userGoals || userGoals.length === 0) return []
    const goalIds = userGoals.map((goal: { id: string }) => goal.id)
    const { data: mappings, error: mappingsError } = await supabase
      .from('goal_scheme_mapping')
      .select('id, goal_id, scheme_name, folio, source_type, source_id, allocation_percentage')
      .in('goal_id', goalIds)
    if (mappingsError) return []
    return mappings || []
  }

  const loadNpsHoldings = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('nps_holdings')
        .select('*, nps_funds(fund_name)')
        .eq('user_id', userId)
      if (error) {
        console.error('Error loading NPS holdings:', error)
        return []
      }
      return data || []
    } catch (err) {
      console.error('Error loading NPS holdings:', err)
      return []
    }
  }

  const addMapping = async (schemeName: string, folio: string, sourceType: 'mutual_fund' | 'stock' | 'nps', sourceId?: string) => {
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
          source_type: sourceType,
          source_id: sourceId,
          allocation_percentage: 100
        })

      if (insertError) {
        console.error('Error adding mapping:', insertError)
        setError(insertError.message)
        return
      }

      // BEGIN: Refresh lists after mapping
      await loadData();
      // END: Refresh lists after mapping
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
      setSaving(true)
      // Get mapping details before deletion to update available schemes
      const mappingToRemove = currentMappings.find(m => m.id === mappingId)
      if (!mappingToRemove) {
        setError('Mapping not found')
        return
      }
      
      const { error: deleteError } = await supabase
        .from('goal_scheme_mapping')
        .delete()
        .eq('id', mappingId)

      if (deleteError) {
        console.error('Error removing mapping:', deleteError)
        setError(deleteError.message)
        return
      }

      // Update current mappings by removing the deleted mapping
      setCurrentMappings(prev => prev.filter(m => m.id !== mappingId))
      
      // Update allGoalMappings to reflect the removal
      setAllGoalMappings(prev => prev.filter(m => m.id !== mappingId))
      
      // If it's a mutual fund, add it back to available schemes
      if (mappingToRemove.source_type === 'mutual_fund') {
        const schemeKey = `${mappingToRemove.scheme_name}|${mappingToRemove.folio || ''}`
        const existingSchemeKeys = new Set(availableSchemes.map(s => `${s.scheme_name}|${s.folio || ''}`))
        if (!existingSchemeKeys.has(schemeKey)) {
          setAvailableSchemes(prev => [...prev, {
            scheme_name: mappingToRemove.scheme_name,
            folio: mappingToRemove.folio || ''
          }])
        }
      }
      
      // If it's a stock, add it back to available stocks
      if (mappingToRemove.source_type === 'stock' && mappingToRemove.source_id) {
        const existingStockIds = new Set(availableStocks.map(s => s.id))
        if (!existingStockIds.has(mappingToRemove.source_id)) {
          const stockToAdd = availableStocks.find(s => s.id === mappingToRemove.source_id)
          if (stockToAdd) {
            setAvailableStocks(prev => [...prev, stockToAdd])
          }
        }
      }
      
      // If it's NPS, add it back to available NPS holdings
      if (mappingToRemove.source_type === 'nps' && mappingToRemove.source_id) {
        const existingNpsIds = new Set(availableNpsHoldings.map(h => h.id))
        if (!existingNpsIds.has(mappingToRemove.source_id)) {
          const npsToAdd = availableNpsHoldings.find(h => h.id === mappingToRemove.source_id)
          if (npsToAdd) {
            setAvailableNpsHoldings(prev => [...prev, npsToAdd])
          }
        }
      }
      
      setHasChanges(true)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error removing mapping'
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  

  const getUnmappedSchemes = () => {
    const mappedSchemeKeys = new Set(
      allGoalMappings.map(m => `${m.scheme_name}|${m.folio || ''}`)
    )
    return availableSchemes.filter(scheme => {
      const key = `${scheme.scheme_name}|${scheme.folio || ''}`
      return !mappedSchemeKeys.has(key)
    })
  }

  const getUnmappedStocks = () => {
    // Find all mapped stock IDs across all goals
    const mappedStockIds = new Set(
      allGoalMappings
        .filter(m => m.source_type === 'stock' && m.source_id)
        .map(m => m.source_id)
    )
    return availableStocks.filter(stock => !mappedStockIds.has(stock.id))
  }

  const handleStockCheckbox = (stockId: string) => {
    setSelectedStockIds(prev =>
      prev.includes(stockId)
        ? prev.filter(id => id !== stockId)
        : [...prev, stockId]
    )
  }

  const handleAddSelectedStocks = async () => {
    setSaving(true)
    setError('')
    try {
      for (const stockId of selectedStockIds) {
        const stock = availableStocks.find(s => s.id === stockId)
        if (stock) {
          await addMapping(stock.stock_code, '', 'stock', stock.id)
        }
      }
      setSelectedStockIds([])
      // BEGIN: Refresh lists after mapping
      await loadData();
      // END: Refresh lists after mapping
      setHasChanges(true)
      // Do not close the modal; let user close explicitly
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error adding stocks'
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleNpsCheckbox = (npsId: string) => {
    setSelectedNpsIds(prev =>
      prev.includes(npsId)
        ? prev.filter(id => id !== npsId)
        : [...prev, npsId]
    )
  }

  const handleAddSelectedNps = async () => {
    setSaving(true)
    setError('')
    try {
      for (const npsId of selectedNpsIds) {
        const nps = availableNpsHoldings.find(h => h.id === npsId)
        if (nps) {
          await addMapping(
            nps.nps_funds?.fund_name || nps.fund_code,
            '',
            'nps',
            nps.id
          )
        }
      }
      setSelectedNpsIds([])
      // BEGIN: Refresh lists after mapping
      await loadData();
      // END: Refresh lists after mapping
      setHasChanges(true)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error adding NPS holdings'
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }



  const getSourceTypeDisplayName = (sourceType: string) => {
    switch (sourceType) {
      case 'mutual_fund': return 'Mutual Fund'
      case 'stock': return 'Stock'
      case 'nps': return 'NPS'
      default: return sourceType
    }
  }

  // Helper component to show mapped stock info
  function MappedStockInfo({ stockId }: { stockId: string }) {
    const [stock, setStock] = useState<Stock | null>(null)
    useEffect(() => {
      const fetchStock = async () => {
        const { data, error } = await supabase
          .from('stocks')
          .select('*')
          .eq('id', stockId)
          .single()
        if (!error && data) setStock(data)
      }
      fetchStock()
    }, [stockId])
    if (!stock) return null
    return (
      <p className="text-xs text-gray-700 mt-1">
        {stock.quantity} shares • {stock.exchange}
      </p>
    )
  }

  const handleClose = () => {
    if (hasChanges) {
      onMappingUpdated()
    }
    onClose()
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
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-6xl mx-4 max-h-[90vh] flex flex-col" style={{ minHeight: '500px' }}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Map Investments to Goal</h2>
            <p className="text-sm text-gray-600 mt-1">{goal.name}</p>
          </div>
          <button
            onClick={handleClose}
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

        {/* BEGIN: Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6 sticky top-0 z-10 bg-white">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('mutual_funds')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'mutual_funds'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Mutual Funds
              </button>
              <button
                onClick={() => setActiveTab('stocks')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'stocks'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Stocks
              </button>
              <button
                onClick={() => setActiveTab('nps')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'nps'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                NPS
              </button>
            </nav>
          </div>

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
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">{mapping.scheme_name}</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {getSourceTypeDisplayName(mapping.source_type)}
                            </span>
                          </div>
                          {mapping.source_type === 'stock' && mapping.source_id && (
                            <MappedStockInfo stockId={mapping.source_id} />
                          )}
                          {mapping.folio && (
                            <p className="text-sm text-gray-600 mt-1">Folio: {mapping.folio}</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeMapping(mapping.id)}
                          disabled={saving}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available Investments */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Available Investments</h3>
              
              {activeTab === 'mutual_funds' && (
                <div className="space-y-3">
                  {/* BEGIN: Mutual Fund Search Box */}
                  <div className="mb-2">
                    <input
                      type="text"
                      value={mfSearchTerm}
                      onChange={e => setMfSearchTerm(e.target.value)}
                      placeholder="Search by scheme name or folio..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                    />
                  </div>
                  {/* END: Mutual Fund Search Box */}
                  {(() => {
                    const filteredSchemes = getUnmappedSchemes().filter(scheme => {
                      const term = mfSearchTerm.trim().toLowerCase();
                      if (!term) return true;
                      return (
                        scheme.scheme_name.toLowerCase().includes(term) ||
                        (scheme.folio && scheme.folio.toLowerCase().includes(term))
                      );
                    });
                    return filteredSchemes.length === 0 ? (
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-gray-600">All mutual funds are already mapped to this goal.</p>
                      </div>
                    ) : (
                      <>
                        {filteredSchemes.map((scheme) => {
                          const key = `${scheme.scheme_name}|${scheme.folio || ''}`;
                          const checked = selectedSchemeKeys.includes(key);
                          return (
                            <div key={key} className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                              <div className="flex items-center">
                                {/* BEGIN: Mutual Fund Checkbox */}
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => setSelectedSchemeKeys(prev =>
                                    checked ? prev.filter(k => k !== key) : [...prev, key]
                                  )}
                                  className="mr-3 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  disabled={saving}
                                />
                                {/* END: Mutual Fund Checkbox */}
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{scheme.scheme_name}</p>
                                  {scheme.folio && (
                                    <p className="text-sm text-gray-600">Folio: {scheme.folio}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>
              )}

              {activeTab === 'stocks' && (
                <div className="space-y-3">
                  {getUnmappedStocks().length === 0 ? (
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-gray-600">All stocks are already mapped to a goal.</p>
                    </div>
                  ) : (
                    <>
                      {getUnmappedStocks().map((stock) => (
                        <div key={stock.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedStockIds.includes(stock.id)}
                              onChange={() => handleStockCheckbox(stock.id)}
                              className="mr-3 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              disabled={saving}
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{stock.stock_code}</p>
                              <p className="text-sm text-gray-600">{stock.quantity} shares • {stock.exchange}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {activeTab === 'nps' && (
                <div className="space-y-3">
                  {availableNpsHoldings.length === 0 ? (
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-gray-600">All NPS holdings are already mapped to a goal.</p>
                    </div>
                  ) : (
                    <>
                      {availableNpsHoldings.map((nps: NpsHolding) => (
                        <div key={nps.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedNpsIds.includes(nps.id)}
                              onChange={() => handleNpsCheckbox(nps.id)}
                              className="mr-3 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              disabled={saving}
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{nps.nps_funds?.fund_name || nps.fund_code}</p>
                              <p className="text-sm text-gray-600">{nps.fund_code} • {nps.units} units</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* END: Modal Scrollable Content */}

        {/* BEGIN: Modal Footer with Done Button */}
        <div className="mt-6 flex justify-end border-t pt-4 bg-white sticky bottom-0 z-20">
          {/* Add Selected Button - only show when items are selected in current tab */}
          {activeTab === 'mutual_funds' && selectedSchemeKeys.length > 0 && (
            <button
              onClick={async () => {
                setSaving(true);
                setError('');
                try {
                  // Build array of mapping objects for batch insert
                  const mappingObjects = selectedSchemeKeys.map(key => {
                    const [scheme_name, ...folioParts] = key.split('|');
                    const folio = folioParts.join('|');
                    return {
                      goal_id: goal.id,
                      scheme_name: scheme_name,
                      folio: folio,
                      source_type: 'mutual_fund' as const,
                      source_id: undefined,
                      allocation_percentage: 100
                    };
                  });
                  
                  // Perform batch insert
                  const { error: insertError } = await supabase
                    .from('goal_scheme_mapping')
                    .insert(mappingObjects);
                  
                  if (insertError) {
                    console.error('Error adding mappings:', insertError);
                    setError(insertError.message);
                    return;
                  }
                  
                  // Refresh data once after batch insert
                  await loadData();
                  setHasChanges(true);
                  setSelectedSchemeKeys([]);
                } catch {
                  setError('Error adding selected mutual funds');
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              className="mr-3 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Add Selected
            </button>
          )}
          
          {activeTab === 'stocks' && selectedStockIds.length > 0 && (
            <button
              onClick={handleAddSelectedStocks}
              disabled={saving}
              className="mr-3 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Add Selected
            </button>
          )}
          
          {activeTab === 'nps' && selectedNpsIds.length > 0 && (
            <button
              onClick={handleAddSelectedNps}
              disabled={saving}
              className="mr-3 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Add Selected
            </button>
          )}
          
          <button
            onClick={handleClose}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Done
          </button>
        </div>
        {/* END: Modal Footer with Done Button */}
      </div>
    </div>
  )
} 