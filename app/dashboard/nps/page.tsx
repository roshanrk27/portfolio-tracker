'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

interface NpsFund {
  id: string;
  fund_name: string;
  fund_code: string;
  created_at?: string;
  updated_at?: string;
}

interface NpsHolding {
  id: string;
  user_id: string;
  fund_code: string;
  units: number | string;
  as_of_date: string;
  created_at?: string;
  updated_at?: string;
  nps_funds?: { fund_name: string };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount)
}

/*function isNpsFund(fund: unknown): fund is NpsFund {
  return (
    typeof fund === 'object' &&
    fund !== null &&
    'fund_code' in fund &&
    'fund_name' in fund &&
    typeof (fund as { fund_code: unknown }).fund_code === 'string' &&
    typeof (fund as { fund_name: unknown }).fund_name === 'string'
  );
}*/

export default function NPSDashboard() {
  const [loading, setLoading] = useState(true)
  const [funds, setFunds] = useState<NpsFund[]>([])
  const [holdings, setHoldings] = useState<NpsHolding[]>([])
  const [navMap, setNavMap] = useState<Record<string, { nav: number, nav_date?: string }>>({})
  const [search, setSearch] = useState('')
  const [selectedFund, setSelectedFund] = useState<NpsFund | null>(null)
  const [units, setUnits] = useState('')
  const [asOfDate, setAsOfDate] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [navRefreshLoading, setNavRefreshLoading] = useState(false)
  const [editModal, setEditModal] = useState<{ open: boolean, holding: NpsHolding } | null>(null)
  const [editUnits, setEditUnits] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const router = useRouter()

  // Auth check, fetch data, and check admin
  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
        return
      }
      try {
        setLoading(true)
        // Check admin
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single()
        if (!profileError && profile?.role === 'admin') setIsAdmin(true)
        // Fetch all funds
        const { data: fundsData, error: fundsError } = await supabase
          .from('nps_funds')
          .select('*')
          .order('fund_name')
        if (fundsError) throw fundsError
        setFunds(fundsData || [])
        // Fetch user holdings
        const { data: holdingsData, error: holdingsError } = await supabase
          .from('nps_holdings')
          .select('*, nps_funds(fund_name)')
          .order('as_of_date', { ascending: false })
        if (holdingsError) throw holdingsError
        setHoldings(holdingsData || [])
        // Fetch NAVs for all funds
        const { data: navData, error: navError } = await supabase
          .from('nps_nav')
          .select('fund_code, nav, nav_date')
        if (navError) throw navError
        const navMap: Record<string, { nav: number, nav_date?: string }> = {}
        for (const row of navData || []) {
          navMap[row.fund_code] = { nav: parseFloat(row.nav), nav_date: row.nav_date }
        }
        setNavMap(navMap)
      } catch (err: unknown) {
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }
    checkAuthAndFetch()
  }, [router])

  // Funds not already in holdings
  const heldFundCodes = new Set(holdings.map(h => h.fund_code))
  const availableFunds: NpsFund[] = funds.filter(f => !heldFundCodes.has(f.fund_code))

  //Original code
/*  const filteredFunds = (availableFunds.filter(f =>
    f.fund_name.toLowerCase().includes(search.toLowerCase()) ||
    f.fund_code.toLowerCase().includes(search.toLowerCase()))as NpsFund[]
  )*/
//ChatGPT fix1
 /* const filteredFunds = availableFunds.filter(f =>
    f.fund_name.toLowerCase().includes(search.toLowerCase()) ||
    f.fund_code.toLowerCase().includes(search.toLowerCase())).map(f => f) as NpsFund[];*/

  //ChatGPT fix2
  const filteredFunds: NpsFund[] = availableFunds.filter(
    (f): f is NpsFund =>
      typeof f.fund_name === 'string' &&
      typeof f.fund_code === 'string' &&
      (
        f.fund_name.toLowerCase().includes(search.toLowerCase()) ||
        f.fund_code.toLowerCase().includes(search.toLowerCase())
      )
  );
  const openModal = () => {
    setShowModal(true)
    setSearch('')
    setSelectedFund(null)
    setUnits('')
    setAsOfDate('')
    setFormError(null)
  }
  const closeModal = () => {
    setShowModal(false)
    setFormError(null)
  }

  const handleAddHolding = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!selectedFund || !units || !asOfDate) {
      setFormError('Please fill all fields')
      return
    }
    setFormLoading(true)
    try {
      // Get current user id
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (!userId) {
        setFormError('User not authenticated')
        setFormLoading(false)
        return
      }
      const { error } = await supabase
        .from('nps_holdings')
        .upsert({
          user_id: userId,
          fund_code: selectedFund.fund_code,
          units: parseFloat(units),
          as_of_date: asOfDate
        }, { onConflict: 'user_id,fund_code' })
      if (error) throw error
      // Refresh holdings
      const { data: holdingsData, error: holdingsError } = await supabase
        .from('nps_holdings')
        .select('*, nps_funds(fund_name)')
        .order('as_of_date', { ascending: false })
      if (holdingsError) throw holdingsError
      setHoldings(holdingsData || [])
      // Reset form and close modal
      setSelectedFund(null)
      setUnits('')
      setAsOfDate('')
      setSearch('')
      setShowModal(false)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setFormError(errorMessage)
    } finally {
      setFormLoading(false)
    }
  }

  // NAV refresh handler
  const handleNavRefresh = async () => {
    setNavRefreshLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const resp = await fetch('/api/refresh-nps-nav', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      const result = await resp.json()
      console.log('NAV refresh result:', result.logs || ['No logs'])
    } catch (err: unknown) {
      console.error('NAV refresh error:', err)
    } finally {
      setNavRefreshLoading(false)
    }
  }

  // Compute current value for each holding
  const holdingsWithValue = holdings.map(h => {
    const nav = navMap[h.fund_code]?.nav || 0
    const nav_date = navMap[h.fund_code]?.nav_date || ''
    const current_value = nav * (parseFloat(h.units.toString()) || 0)
    return { ...h, nav, nav_date, current_value }
  })
  const totalNpsValue = holdingsWithValue.reduce((sum, h) => sum + h.current_value, 0)

  // Open edit modal
  const openEditModal = (holding: NpsHolding) => {
    setEditModal({ open: true, holding })
    setEditUnits(holding.units.toString())
    setEditDate(holding.as_of_date)
    setEditError(null)
  }
  const closeEditModal = () => {
    setEditModal(null)
    setEditUnits('')
    setEditDate('')
    setEditError(null)
  }

  // Save edit
  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditError(null)
    setEditLoading(true)
    try {
      const { error } = await supabase
        .from('nps_holdings')
        .update({ units: parseFloat(editUnits), as_of_date: editDate })
        .eq('id', editModal?.holding.id)
      if (error) throw error
      // Refresh holdings and navs
      closeEditModal()
      // Re-run the fetch logic
      setLoading(true)
      try {
        // Fetch all funds
        const { data: fundsData, error: fundsError } = await supabase
          .from('nps_funds')
          .select('*')
          .order('fund_name')
        if (fundsError) throw fundsError
        setFunds(fundsData || [])
        // Fetch user holdings
        const { data: holdingsData, error: holdingsError } = await supabase
          .from('nps_holdings')
          .select('*, nps_funds(fund_name)')
          .order('as_of_date', { ascending: false })
        if (holdingsError) throw holdingsError
        setHoldings(holdingsData || [])
        // Fetch NAVs for all funds
        const { data: navData, error: navError } = await supabase
          .from('nps_nav')
          .select('fund_code, nav, nav_date')
        if (navError) throw navError
        const navMap: Record<string, { nav: number, nav_date?: string }> = {}
        for (const row of navData || []) {
          navMap[row.fund_code] = { nav: parseFloat(row.nav), nav_date: row.nav_date }
        }
        setNavMap(navMap)
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        console.error('Error refreshing data:', errorMessage)
      } finally {
        setLoading(false)
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setEditError(errorMessage)
    } finally {
      setEditLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      <div className="w-full px-2 sm:px-4 md:px-6 p-6">
        <div className="mb-8">
          <h1 className="font-bold text-lg sm:text-2xl md:text-3xl text-gray-900 mb-2">NPS (National Pension System)</h1>
          <p className="text-gray-600">Your NPS holdings and performance</p>
        </div>

        {/* Total NPS Value Card */}
        <div className="mb-8 w-full">
          <div className="flex flex-wrap gap-4 w-full">
            <div className="bg-green-50 border-l-4 border-green-500 rounded-lg shadow p-6 flex-1 min-w-[200px] w-full">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">Total NPS Value</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalNpsValue)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Holdings Table */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 md:p-8 mb-8 border border-gray-200 w-full overflow-x-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">Current Holdings</h2>
            <div className="flex gap-2">
              <button
                onClick={openModal}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-base shadow-md"
              >
                + Add Holding
              </button>
              {isAdmin && (
                <button
                  onClick={handleNavRefresh}
                  disabled={navRefreshLoading}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold text-base shadow-md disabled:bg-gray-400"
                >
                  {navRefreshLoading ? 'Refreshing NAV...' : 'Refresh NPS NAV'}
                </button>
              )}
            </div>
          </div>
          {holdingsWithValue.length === 0 ? (
            <p className="text-gray-500">No holdings added yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fund Name</th>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fund Code</th>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NAV</th>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Value</th>
                    <th className="px-2 sm:px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-xs sm:text-sm">
                  {holdingsWithValue.map((h) => (
                    <tr key={h.id}>
                      <td className="px-2 sm:px-6 py-4 whitespace-normal truncate text-sm font-semibold text-gray-900 max-w-[120px]">{h.nps_funds?.fund_name || h.fund_code}</td>
                      <td className="px-2 sm:px-6 py-4 whitespace-normal truncate text-sm font-mono text-blue-800 bg-blue-50 rounded max-w-[80px]">{h.fund_code}</td>
                      <td className="px-2 sm:px-6 py-4 whitespace-normal truncate text-sm text-gray-700 font-medium max-w-[80px]">
                        {h.units}
                        {h.as_of_date && (
                          <div className="text-xs text-gray-400 mt-1">as on {h.as_of_date}</div>
                        )}
                      </td>
                      <td className="px-2 sm:px-6 py-4 whitespace-normal truncate text-sm text-gray-700 max-w-[80px]">
                        {h.nav ? formatCurrency(h.nav) : '-'}
                        {h.nav_date && (
                          <div className="text-xs text-gray-400 mt-1">{h.nav_date}</div>
                        )}
                      </td>
                      <td className="px-2 sm:px-6 py-4 whitespace-normal truncate text-sm text-gray-900 font-bold max-w-[100px]">{h.nav ? formatCurrency(h.current_value) : '-'}</td>
                      <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-right">
                        <button
                          className="text-blue-600 hover:underline text-sm font-semibold"
                          onClick={() => openEditModal(h)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Holding Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg relative">
              <button
                onClick={closeModal}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                aria-label="Close"
              >
                &times;
              </button>
              <h2 className="text-xl font-bold mb-6 text-gray-800">Add NPS Holding</h2>
              <form onSubmit={handleAddHolding}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fund</label>
                  <input
                    type="text"
                    placeholder="Search fund name or code"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                    style={{ background: '#E8F0FE', color: '#1A202C' }}
                    autoComplete="off"
                    disabled={!!selectedFund}
                  />
                  {!selectedFund && (
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md bg-white">
                     {(filteredFunds as NpsFund[]).map((fund: NpsFund) => (
                        <div
                          key={fund.fund_code}
                         className=""
                          // className={`p-2 cursor-pointer hover:bg-blue-100 ${(selectedFund?.fund_code === (fund as NpsFund).fund_code ? 'bg-blue-200' : ''}`}
                          onClick={() => setSelectedFund(fund)}
                        >
                          <span className="font-bold text-gray-900">{fund.fund_name}</span> <span className="text-xs font-mono text-blue-800 bg-blue-50 rounded px-1 ml-2">{fund.fund_code}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedFund && (
                    <div className="mt-4 mb-2 p-4 border-2 border-blue-400 bg-blue-50 rounded flex items-center justify-between">
                      <div>
                        <div className="font-bold text-lg text-blue-900">{selectedFund.fund_name}</div>
                        <div className="text-xs font-mono text-blue-800 bg-white border border-blue-200 rounded px-2 py-1 inline-block mt-1">{selectedFund.fund_code}</div>
                      </div>
                      <button
                        type="button"
                        className="ml-4 px-3 py-1 bg-white border border-blue-400 text-blue-700 rounded hover:bg-blue-100 text-sm font-semibold"
                        onClick={() => { setSelectedFund(null); setSearch(''); }}
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Units</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={units}
                    onChange={e => setUnits(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    style={{ background: '#E8F0FE', color: '#1A202C' }}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">As of Date</label>
                  <input
                    type="date"
                    value={asOfDate}
                    onChange={e => setAsOfDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    style={{ background: '#E8F0FE', color: '#1A202C' }}
                    required
                  />
                </div>
                {formError && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{formError}</div>}
                <button
                  type="submit"
                  disabled={formLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold text-lg transition-colors duration-200 shadow-md w-full"
                >
                  {formLoading ? 'Saving...' : 'Add Holding'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Edit Holding Modal */}
        {editModal?.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg relative">
              <button
                onClick={closeEditModal}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                aria-label="Close"
              >
                &times;
              </button>
              <h2 className="text-xl font-bold mb-6 text-gray-800">Edit NPS Holding</h2>
              <form onSubmit={handleEditSave}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Units</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editUnits}
                    onChange={e => setEditUnits(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    style={{ background: '#E8F0FE', color: '#1A202C' }}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">As of Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    style={{ background: '#E8F0FE', color: '#1A202C' }}
                    required
                  />
                </div>
                {editError && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{editError}</div>}
                <button
                  type="submit"
                  disabled={editLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold text-lg transition-colors duration-200 shadow-md w-full"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 