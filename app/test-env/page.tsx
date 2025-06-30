'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getPortfolioXIRR, getSchemeXIRRs, getGoalXIRR } from '@/lib/portfolioUtils'
import { calculateSchemeXIRR } from '@/lib/xirr'
import { categorizeScheme } from '@/lib/assetAllocation'

export default function TestEnv() {
  const [portfolioXIRR, setPortfolioXIRR] = useState<any>(null)
  const [schemeXIRRs, setSchemeXIRRs] = useState<any[]>([])
  const [goalXIRR, setGoalXIRR] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [folioSchemes, setFolioSchemes] = useState<any[]>([])
  const [selectedFolio, setSelectedFolio] = useState('')
  const [selectedScheme, setSelectedScheme] = useState('')
  const [schemeTxs, setSchemeTxs] = useState<any[]>([])
  const [schemeCurrentValue, setSchemeCurrentValue] = useState<number>(0)
  const [schemeXirrDebug, setSchemeXirrDebug] = useState<any>(null)
  
  // Goal debug state
  const [goals, setGoals] = useState<any[]>([])
  const [selectedGoal, setSelectedGoal] = useState('')
  const [goalTxs, setGoalTxs] = useState<any[]>([])
  const [goalCurrentValue, setGoalCurrentValue] = useState<number>(0)
  const [goalXirrDebug, setGoalXirrDebug] = useState<any>(null)
  
  // Portfolio debug state
  const [portfolioTxs, setPortfolioTxs] = useState<any[]>([])
  const [portfolioCurrentValue, setPortfolioCurrentValue] = useState<number>(0)
  const [portfolioXirrDebug, setPortfolioXirrDebug] = useState<any>(null)

  const [schemeNames, setSchemeNames] = useState<string[]>([])

  const testPortfolioXIRR = async () => {
    try {
      setLoading(true)
      setError('')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      const result = await getPortfolioXIRR(session.user.id)
      setPortfolioXIRR(result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const testSchemeXIRRs = async () => {
    try {
      setLoading(true)
      setError('')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      const result = await getSchemeXIRRs(session.user.id)
      setSchemeXIRRs(result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const testGoalXIRR = async () => {
    try {
      setLoading(true)
      setError('')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      // Get first goal for testing
      const { data: goals } = await supabase
        .from('goals')
        .select('id')
        .eq('user_id', session.user.id)
        .limit(1)

      if (goals && goals.length > 0) {
        const result = await getGoalXIRR(goals[0].id)
        setGoalXIRR(result)
      } else {
        setError('No goals found for testing')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Fetch all folio+scheme combos for the user
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase
        .from('current_portfolio')
        .select('folio, scheme_name')
        .eq('user_id', session.user.id)
      setFolioSchemes(data || [])
    })()
  }, [])

  useEffect(() => {
    // Fetch all goals for the user
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase
        .from('goals')
        .select('id, name')
        .eq('user_id', session.user.id)
      setGoals(data || [])
    })()
  }, [])

  const handleFolioSchemeSelect = async (folio: string, scheme: string) => {
    setSelectedFolio(folio)
    setSelectedScheme(scheme)
    setSchemeTxs([])
    setSchemeCurrentValue(0)
    setSchemeXirrDebug(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    // Fetch transactions
    const { data: txs } = await supabase
      .from('transactions')
      .select('date, transaction_type, amount, units')
      .eq('user_id', session.user.id)
      .eq('folio', folio)
      .eq('scheme_name', scheme)
      .order('date', { ascending: true })
    setSchemeTxs(txs || [])
    // Fetch current value
    const { data: cp } = await supabase
      .from('current_portfolio')
      .select('current_value')
      .eq('user_id', session.user.id)
      .eq('folio', folio)
      .eq('scheme_name', scheme)
      .single()
    setSchemeCurrentValue(cp?.current_value ? parseFloat(cp.current_value) : 0)
    // Prepare cash flows for XIRR with proper categorization
    const cashFlows = (txs || []).map(tx => {
      const transactionType = tx.transaction_type.toLowerCase()
      
      // Negative cash flows (money going out)
      const isNegative = ['purchase', 'investment', 'dividend', 'switch in', 'shift in'].some(type => 
        transactionType.includes(type)
      )
      
      // Positive cash flows (money coming in)
      const isPositive = ['switch out', 'redemption', 'shift out'].some(type => 
        transactionType.includes(type)
      )
      
      const amount = isNegative ? -parseFloat(tx.amount) : (isPositive ? parseFloat(tx.amount) : parseFloat(tx.amount))
      
      return {
        date: tx.date,
        amount,
        type: tx.transaction_type
      }
    })
    cashFlows.push({ 
      date: new Date().toISOString().slice(0, 10), 
      amount: cp?.current_value ? parseFloat(cp.current_value) : 0, 
      type: 'Current Value' 
    })
    // Calculate XIRR
    const xirrResult = calculateSchemeXIRR(
      (txs || []).map(tx => ({ date: tx.date, amount: parseFloat(tx.amount), type: tx.transaction_type })),
      cp?.current_value ? parseFloat(cp.current_value) : 0
    )
    setSchemeXirrDebug({ cashFlows, xirrResult })
  }

  const handleGoalSelect = async (goalId: string) => {
    setSelectedGoal(goalId)
    setGoalTxs([])
    setGoalCurrentValue(0)
    setGoalXirrDebug(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    
    // Get goal mappings
    const { data: mappings } = await supabase
      .from('goal_scheme_mapping')
      .select('scheme_name, folio')
      .eq('goal_id', goalId)
    
    if (!mappings || mappings.length === 0) {
      setGoalXirrDebug({ cashFlows: [], xirrResult: { xirr: 0, converged: true, error: 'No schemes mapped' } })
      return
    }
    
    // Collect all transactions for mapped schemes
    const allTxs: any[] = []
    let totalCurrentValue = 0
    
    for (const mapping of mappings) {
      const { data: txs } = await supabase
        .from('transactions')
        .select('date, transaction_type, amount, units')
        .eq('user_id', session.user.id)
        .eq('scheme_name', mapping.scheme_name)
        .eq('folio', mapping.folio)
        .order('date', { ascending: true })
      
      if (txs) allTxs.push(...txs)
      
      // Get current value for this scheme
      const { data: cp } = await supabase
        .from('current_portfolio')
        .select('current_value')
        .eq('user_id', session.user.id)
        .eq('scheme_name', mapping.scheme_name)
        .eq('folio', mapping.folio)
        .single()
      
      if (cp?.current_value) {
        totalCurrentValue += parseFloat(cp.current_value)
      }
    }
    
    setGoalTxs(allTxs)
    setGoalCurrentValue(totalCurrentValue)
    
    // Prepare cash flows for XIRR
    const cashFlows = allTxs.map((tx: any) => {
      const transactionType = tx.transaction_type.toLowerCase()
      
      let amount: number
      
      // Debug: log the transaction type to see what we're getting
      console.log('Transaction type:', transactionType, 'Original:', tx.transaction_type)
      
      // Negative cash flows (money going out - you're spending money)
      if (transactionType.includes('purchase') || 
          transactionType.includes('investment') || 
          transactionType.includes('dividend') || 
          transactionType.includes('switch in') || 
          transactionType.includes('shift in')) {
        amount = -parseFloat(tx.amount)
        console.log('Negative flow:', tx.transaction_type, amount)
      }
      // Positive cash flows (money coming in - you're receiving money)
      else if (transactionType.includes('switch out') || 
               transactionType.includes('redemption') || 
               transactionType.includes('shift out')) {
        amount = parseFloat(tx.amount)
        console.log('Positive flow:', tx.transaction_type, amount)
      }
      // Default case - treat as positive (shouldn't happen with proper transaction types)
      else {
        amount = parseFloat(tx.amount)
        console.log('Default flow:', tx.transaction_type, amount)
      }
      
      return {
        date: tx.date,
        amount,
        type: tx.transaction_type
      }
    })
    
    if (totalCurrentValue > 0) {
      cashFlows.push({ 
        date: new Date().toISOString().slice(0, 10), 
        amount: totalCurrentValue, 
        type: 'Current Value' 
      })
    }
    
    // Calculate XIRR
    const xirrResult = calculateSchemeXIRR(
      allTxs.map((tx: any) => ({ date: tx.date, amount: parseFloat(tx.amount), type: tx.transaction_type })),
      totalCurrentValue
    )
    
    setGoalXirrDebug({ cashFlows, xirrResult })
  }

  const handlePortfolioDebug = async () => {
    setPortfolioTxs([])
    setPortfolioCurrentValue(0)
    setPortfolioXirrDebug(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    
    // Get all transactions
    const { data: txs } = await supabase
      .from('transactions')
      .select('date, transaction_type, amount, units')
      .eq('user_id', session.user.id)
      .order('date', { ascending: true })
    
    // Get total current value
    const { data: portfolio } = await supabase
      .from('current_portfolio')
      .select('current_value')
      .eq('user_id', session.user.id)
    
    const totalCurrentValue = portfolio?.reduce((sum, p) => sum + parseFloat(p.current_value || '0'), 0) || 0
    
    setPortfolioTxs(txs || [])
    setPortfolioCurrentValue(totalCurrentValue)
    
    // Prepare cash flows for XIRR
    const cashFlows = (txs || []).map((tx: any) => {
      const transactionType = tx.transaction_type.toLowerCase()
      const isNegative = ['purchase', 'investment', 'dividend', 'switch in', 'shift in'].some(type => 
        transactionType.includes(type)
      )
      const isPositive = ['switch out', 'redemption', 'shift out'].some(type => 
        transactionType.includes(type)
      )
      const amount = isNegative ? -parseFloat(tx.amount) : (isPositive ? parseFloat(tx.amount) : parseFloat(tx.amount))
      
      return {
        date: tx.date,
        amount,
        type: tx.transaction_type
      }
    })
    
    cashFlows.push({ 
      date: new Date().toISOString().slice(0, 10), 
      amount: totalCurrentValue, 
      type: 'Current Value' 
    })
    
    // Calculate XIRR
    const xirrResult = calculateSchemeXIRR(
      (txs || []).map((tx: any) => ({ date: tx.date, amount: parseFloat(tx.amount), type: tx.transaction_type })),
      totalCurrentValue
    )
    
    setPortfolioXirrDebug({ cashFlows, xirrResult })
  }

  const loadSchemeNames = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    
    const { data } = await supabase
      .from('current_portfolio')
      .select('scheme_name')
      .eq('user_id', session.user.id)
    
    const uniqueNames = [...new Set((data?.map((item: { scheme_name: string }) => item.scheme_name) || []))]
    setSchemeNames(uniqueNames.sort())
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">XIRR Testing Environment</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button
            onClick={testPortfolioXIRR}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Portfolio XIRR'}
          </button>

          <button
            onClick={testSchemeXIRRs}
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Scheme XIRRs'}
          </button>

          <button
            onClick={testGoalXIRR}
            disabled={loading}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Goal XIRR'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Scheme Names Debug */}
        <div className="mb-8 p-4 bg-blue-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Scheme Names for Asset Allocation Debug</h2>
          <button 
            onClick={loadSchemeNames}
            className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Load Scheme Names
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schemeNames.map((name, index) => (
              <div key={index} className="p-3 bg-white rounded border">
                <div className="font-medium text-sm">{name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Category: {categorizeScheme(name).category}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Folio+Scheme Debug Section */}
        <div className="mb-8 p-4 bg-white rounded-lg shadow">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Debug XIRR for Folio + Scheme</h2>
          <div className="flex flex-wrap gap-4 mb-4">
            <select
              className="border border-gray-300 bg-white text-gray-900 rounded px-3 py-2"
              value={selectedFolio}
              onChange={e => setSelectedFolio(e.target.value)}
            >
              <option value="">Select Folio</option>
              {[...new Set(folioSchemes.map(fs => fs.folio))].map((folio: string) => (
                <option key={folio} value={folio}>{folio}</option>
              ))}
            </select>
            <select
              className="border border-gray-300 bg-white text-gray-900 rounded px-3 py-2"
              value={selectedScheme}
              onChange={e => setSelectedScheme(e.target.value)}
              disabled={!selectedFolio}
            >
              <option value="">Select Scheme</option>
              {folioSchemes.filter(fs => fs.folio === selectedFolio).map((fs: any) => (
                <option key={fs.scheme_name} value={fs.scheme_name}>{fs.scheme_name}</option>
              ))}
            </select>
            <button
              className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
              disabled={!selectedFolio || !selectedScheme}
              onClick={() => handleFolioSchemeSelect(selectedFolio, selectedScheme)}
            >
              Show Debug
            </button>
          </div>
          {schemeTxs.length > 0 && (
            <div className="mb-4">
              <h3 className="font-bold text-gray-900 mb-2">Transactions</h3>
              <table className="min-w-full text-sm mb-2">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-3 py-2 text-left text-gray-800 font-bold">Date</th>
                    <th className="px-3 py-2 text-left text-gray-800 font-bold">Type</th>
                    <th className="px-3 py-2 text-left text-gray-800 font-bold">Amount</th>
                    <th className="px-3 py-2 text-left text-gray-800 font-bold">Units</th>
                  </tr>
                </thead>
                <tbody>
                  {schemeTxs.map((tx: any, i: number) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-900">{tx.date}</td>
                      <td className="px-3 py-2 text-gray-900">{tx.transaction_type}</td>
                      <td className="px-3 py-2 text-gray-900">₹{parseFloat(tx.amount).toLocaleString()}</td>
                      <td className="px-3 py-2 text-gray-900">{tx.units}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mb-2">Current Value: <span className="font-semibold text-gray-900">₹{schemeCurrentValue.toLocaleString()}</span></div>
            </div>
          )}
          {schemeXirrDebug && (
            <div className="mb-4">
              <h3 className="font-bold text-gray-900 mb-2">XIRR Cash Flows</h3>
              <table className="min-w-full text-sm mb-2">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-3 py-2 text-left text-gray-800 font-bold">Date</th>
                    <th className="px-3 py-2 text-left text-gray-800 font-bold">Type</th>
                    <th className="px-3 py-2 text-left text-gray-800 font-bold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {schemeXirrDebug.cashFlows.map((cf: any, i: number) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-900">{cf.date}</td>
                      <td className="px-3 py-2 text-gray-900">{cf.type}</td>
                      <td className="px-3 py-2 text-gray-900">{cf.amount >= 0 ? '' : '-'}₹{Math.abs(cf.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mb-2 text-gray-900">XIRR: <span className="font-semibold text-gray-900">{schemeXirrDebug.xirrResult.xirr ? (schemeXirrDebug.xirrResult.xirr * 100).toFixed(2) + '%' : '0.00%'}</span></div>
              <div className="mb-2 text-gray-900">Converged: <span className="font-semibold text-gray-900">{schemeXirrDebug.xirrResult.converged ? 'Yes' : 'No'}</span></div>
              {schemeXirrDebug.xirrResult.error && (
                <div className="text-red-600">Error: {schemeXirrDebug.xirrResult.error}</div>
              )}
            </div>
          )}
        </div>

        {/* Goal Debug Section */}
        <div className="mb-8 p-4 bg-white rounded-lg shadow">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Debug XIRR for Goal</h2>
          <div className="flex flex-wrap gap-4 mb-4">
            <select
              className="border border-gray-300 bg-white text-gray-900 rounded px-3 py-2"
              value={selectedGoal}
              onChange={e => setSelectedGoal(e.target.value)}
            >
              <option value="">Select Goal</option>
              {goals.map((goal: any) => (
                <option key={goal.id} value={goal.id}>{goal.name}</option>
              ))}
            </select>
            <button
              className="bg-green-600 text-white px-3 py-2 rounded disabled:opacity-50"
              disabled={!selectedGoal}
              onClick={() => handleGoalSelect(selectedGoal)}
            >
              Show Goal Debug
            </button>
          </div>
          {goalTxs.length > 0 && (
            <div className="mb-4">
              <h3 className="font-bold text-gray-900 mb-2">Goal Transactions</h3>
              <table className="min-w-full text-sm mb-2">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-3 py-2 text-left text-gray-800 font-bold">Date</th>
                    <th className="px-3 py-2 text-left text-gray-800 font-bold">Type</th>
                    <th className="px-3 py-2 text-left text-gray-800 font-bold">Amount</th>
                    <th className="px-3 py-2 text-left text-gray-800 font-bold">Units</th>
                  </tr>
                </thead>
                <tbody>
                  {goalTxs.map((tx: any, i: number) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-900">{tx.date}</td>
                      <td className="px-3 py-2 text-gray-900">{tx.transaction_type}</td>
                      <td className="px-3 py-2 text-gray-900">₹{parseFloat(tx.amount).toLocaleString()}</td>
                      <td className="px-3 py-2 text-gray-900">{tx.units}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mb-2 text-gray-900">Total Current Value: <span className="font-semibold text-gray-900">₹{goalCurrentValue.toLocaleString()}</span></div>
            </div>
          )}
          {goalXirrDebug && (
            <div className="mb-4">
              <h3 className="font-bold text-gray-900 mb-2">Goal XIRR Cash Flows</h3>
              <table className="min-w-full text-sm mb-2">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-3 py-2 text-left text-gray-800 font-bold">Date</th>
                    <th className="px-3 py-2 text-left text-gray-800 font-bold">Type</th>
                    <th className="px-3 py-2 text-left text-gray-800 font-bold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {goalXirrDebug.cashFlows.map((cf: any, i: number) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-900">{cf.date}</td>
                      <td className="px-3 py-2 text-gray-900">{cf.type}</td>
                      <td className="px-3 py-2 text-gray-900">{cf.amount >= 0 ? '' : '-'}₹{Math.abs(cf.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mb-2 text-gray-900">Goal XIRR: <span className="font-semibold text-gray-900">{goalXirrDebug.xirrResult.xirr ? (goalXirrDebug.xirrResult.xirr * 100).toFixed(2) + '%' : '0.00%'}</span></div>
              <div className="mb-2 text-gray-900">Converged: <span className="font-semibold text-gray-900">{goalXirrDebug.xirrResult.converged ? 'Yes' : 'No'}</span></div>
              {goalXirrDebug.xirrResult.error && (
                <div className="text-red-600">Error: {goalXirrDebug.xirrResult.error}</div>
              )}
            </div>
          )}
        </div>

        {/* Portfolio Debug Section */}
        <div className="mb-8 p-4 bg-white rounded-lg shadow">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Debug XIRR for Overall Portfolio</h2>
          <div className="flex flex-wrap gap-4 mb-4">
            <button
              className="bg-purple-600 text-white px-3 py-2 rounded"
              onClick={handlePortfolioDebug}
            >
              Show Portfolio Debug
            </button>
          </div>
          {portfolioTxs.length > 0 && (
            <div className="mb-4">
              <h3 className="font-bold text-gray-900 mb-2">Portfolio Transactions</h3>
              <div className="text-sm text-gray-700 mb-2">Showing first 20 transactions (total: {portfolioTxs.length})</div>
              <table className="min-w-full text-sm mb-2">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-3 py-2 text-left text-gray-800 font-bold">Date</th>
                    <th className="px-3 py-2 text-left text-gray-800 font-bold">Type</th>
                    <th className="px-3 py-2 text-left text-gray-800 font-bold">Amount</th>
                    <th className="px-3 py-2 text-left text-gray-800 font-bold">Units</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolioTxs.slice(0, 20).map((tx: any, i: number) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-900">{tx.date}</td>
                      <td className="px-3 py-2 text-gray-900">{tx.transaction_type}</td>
                      <td className="px-3 py-2 text-gray-900">₹{parseFloat(tx.amount).toLocaleString()}</td>
                      <td className="px-3 py-2 text-gray-900">{tx.units}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mb-2 text-gray-900">Total Current Value: <span className="font-semibold text-gray-900">₹{portfolioCurrentValue.toLocaleString()}</span></div>
            </div>
          )}
          {portfolioXirrDebug && (
            <div className="mb-4">
              <h3 className="font-bold text-gray-900 mb-2">Portfolio XIRR Cash Flows</h3>
              <div className="text-sm text-gray-700 mb-2">Showing first 20 cash flows (total: {portfolioXirrDebug.cashFlows.length})</div>
              <table className="min-w-full text-sm mb-2">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-3 py-2 text-left text-gray-800 font-bold">Date</th>
                    <th className="px-3 py-2 text-left text-gray-800 font-bold">Type</th>
                    <th className="px-3 py-2 text-left text-gray-800 font-bold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolioXirrDebug.cashFlows.slice(0, 20).map((cf: any, i: number) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-900">{cf.date}</td>
                      <td className="px-3 py-2 text-gray-900">{cf.type}</td>
                      <td className="px-3 py-2 text-gray-900">{cf.amount >= 0 ? '' : '-'}₹{Math.abs(cf.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mb-2 text-gray-900">Portfolio XIRR: <span className="font-semibold text-gray-900">{portfolioXirrDebug.xirrResult.xirr ? (portfolioXirrDebug.xirrResult.xirr * 100).toFixed(2) + '%' : '0.00%'}</span></div>
              <div className="mb-2 text-gray-900">Converged: <span className="font-semibold text-gray-900">{portfolioXirrDebug.xirrResult.converged ? 'Yes' : 'No'}</span></div>
              {portfolioXirrDebug.xirrResult.error && (
                <div className="text-red-600">Error: {portfolioXirrDebug.xirrResult.error}</div>
              )}
            </div>
          )}
        </div>

        {/* Portfolio XIRR Results */}
        {portfolioXIRR && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Portfolio XIRR Results</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">XIRR Rate</p>
                <p className="text-lg font-semibold text-gray-900">{portfolioXIRR.xirr?.toFixed(6)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">XIRR Percentage</p>
                <p className={`text-lg font-semibold ${portfolioXIRR.xirrPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {portfolioXIRR.formattedXIRR}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Converged</p>
                <p className="text-lg font-semibold text-gray-900">{portfolioXIRR.converged ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Current Value</p>
                <p className="text-lg font-semibold text-gray-900">₹{portfolioXIRR.totalCurrentValue?.toLocaleString()}</p>
              </div>
            </div>
            {portfolioXIRR.error && (
              <p className="text-sm text-red-600 mt-2">Error: {portfolioXIRR.error}</p>
            )}
          </div>
        )}

        {/* Scheme XIRR Results */}
        {schemeXIRRs.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Scheme XIRR Results</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Scheme</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Folio</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">XIRR</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Current Value</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {schemeXIRRs.map((scheme, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {scheme.scheme_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {scheme.folio}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                        <span className={scheme.xirrPercentage >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {scheme.formattedXIRR}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{scheme.current_value?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {scheme.converged ? '✓ Converged' : '✗ Failed'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Goal XIRR Results */}
        {goalXIRR && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Goal XIRR Results</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">XIRR Rate</p>
                <p className="text-lg font-semibold text-gray-900">{goalXIRR.xirr?.toFixed(6)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">XIRR Percentage</p>
                <p className={`text-lg font-semibold ${goalXIRR.xirrPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {goalXIRR.formattedXIRR}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Converged</p>
                <p className="text-lg font-semibold text-gray-900">{goalXIRR.converged ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Current Value</p>
                <p className="text-lg font-semibold text-gray-900">₹{goalXIRR.current_value?.toLocaleString()}</p>
              </div>
            </div>
            {goalXIRR.error && (
              <p className="text-sm text-red-600 mt-2">Error: {goalXIRR.error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 