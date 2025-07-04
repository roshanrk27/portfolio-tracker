'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getPortfolioXIRR, getSchemeXIRRs, getGoalXIRR } from '@/lib/portfolioUtils'
import { calculateSchemeXIRR } from '@/lib/xirr'
import { categorizeScheme } from '@/lib/assetAllocation'

// TypeScript interfaces for better type safety
interface XIRRResult {
  xirr: number
  iterations: number
  converged: boolean
  error?: string
}

interface PortfolioXIRRResult {
  xirr: number
  xirrPercentage: number
  formattedXIRR: string
  converged: boolean
  error?: string
  totalCurrentValue?: number
  current_value?: number
}

interface Transaction {
  date: string
  transaction_type: string
  amount: string
  units: string
}

interface CashFlow {
  date: string
  amount: number
  type: string
}

interface XIRRDebug {
  cashFlows: CashFlow[]
  xirrResult: XIRRResult
}

interface FolioScheme {
  folio: string
  scheme_name: string
}

interface Goal {
  id: string
  name: string
}

interface SchemeXIRR {
  scheme_name: string
  folio: string
  xirr: number
  xirrPercentage: number
  formattedXIRR: string
  converged: boolean
  error?: string
  current_value: number
}

export default function TestEnv() {
  const [portfolioXIRR, setPortfolioXIRR] = useState<PortfolioXIRRResult | null>(null)
  const [schemeXIRRs, setSchemeXIRRs] = useState<SchemeXIRR[]>([])
  const [goalXIRR, setGoalXIRR] = useState<PortfolioXIRRResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [folioSchemes, setFolioSchemes] = useState<FolioScheme[]>([])
  const [selectedFolio, setSelectedFolio] = useState('')
  const [selectedScheme, setSelectedScheme] = useState('')
  const [schemeTxs, setSchemeTxs] = useState<Transaction[]>([])
  const [schemeCurrentValue, setSchemeCurrentValue] = useState<number>(0)
  const [schemeXirrDebug, setSchemeXirrDebug] = useState<XIRRDebug | null>(null)
  
  // Goal debug state
  const [goals, setGoals] = useState<Goal[]>([])
  const [selectedGoal, setSelectedGoal] = useState('')
  const [goalTxs, setGoalTxs] = useState<Transaction[]>([])
  const [goalCurrentValue, setGoalCurrentValue] = useState<number>(0)
  const [goalXirrDebug, setGoalXirrDebug] = useState<XIRRDebug | null>(null)
  
  // Portfolio debug state
  const [portfolioTxs, setPortfolioTxs] = useState<Transaction[]>([])
  const [portfolioCurrentValue, setPortfolioCurrentValue] = useState<number>(0)
  const [portfolioXirrDebug, setPortfolioXirrDebug] = useState<XIRRDebug | null>(null)

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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
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
    setSchemeTxs((txs || []) as unknown as Transaction[])
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
    const cashFlows: CashFlow[] = (txs || []).map((tx: Transaction) => {
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
      (txs || []).map((tx: Transaction) => ({ date: tx.date, amount: parseFloat(tx.amount), type: tx.transaction_type })),
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
        setGoalXirrDebug({ cashFlows: [], xirrResult: { xirr: 0, iterations: 0, converged: true, error: 'No schemes mapped' } })
        return
      }
    
    // Collect all transactions for mapped schemes
    const allTxs: Record<string, unknown>[] = []
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
    
    setGoalTxs(allTxs as unknown as Transaction[])
    setGoalCurrentValue(totalCurrentValue)
    
    // Prepare cash flows for XIRR
    const cashFlows: CashFlow[] = allTxs.map((tx: Record<string, unknown>) => {
      const transactionType = (tx.transaction_type as string).toLowerCase()
      
      let amount: number
      
      // Debug: log the transaction type to see what we're getting
      console.log('Transaction type:', transactionType, 'Original:', tx.transaction_type)
      
      // Negative cash flows (money going out - you're spending money)
      if (transactionType.includes('purchase') || 
          transactionType.includes('investment') || 
          transactionType.includes('dividend') || 
          transactionType.includes('switch in') || 
          transactionType.includes('shift in')) {
        amount = -parseFloat(tx.amount as string)
        console.log('Negative flow:', tx.transaction_type, amount)
      }
      // Positive cash flows (money coming in - you're receiving money)
      else if (transactionType.includes('switch out') || 
               transactionType.includes('redemption') || 
               transactionType.includes('shift out')) {
        amount = parseFloat(tx.amount as string)
        console.log('Positive flow:', tx.transaction_type, amount)
      }
      // Default case - treat as positive (shouldn't happen with proper transaction types)
      else {
        amount = parseFloat(tx.amount as string)
        console.log('Default flow:', tx.transaction_type, amount)
      }
      
      return {
        date: tx.date as string,
        amount,
        type: tx.transaction_type as string
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
      allTxs.map((tx: Record<string, unknown>) => ({ date: (tx.date as string), amount: parseFloat(tx.amount as string), type: tx.transaction_type as string })),
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
    
    //const totalCurrentValue = portfolio?.reduce((sum: number, p: Record<string, unknown>) => sum + parseFloat(p.current_value || '0'), 0) || 0
    
    //ChatGPT suggestion
    const totalCurrentValue = portfolio?.reduce((sum: number, p: Record<string, unknown>) => {
      const value = p.current_value ?? '0';
      return sum + parseFloat(value as string);
    }, 0) || 0;

    setPortfolioTxs((txs || []) as unknown as Transaction[])
    setPortfolioCurrentValue(totalCurrentValue)
    
    // Prepare cash flows for XIRR
    const cashFlows: CashFlow[] = (txs || []).map((tx: Record<string, unknown>) => {
      const transactionType = (tx.transaction_type as string).toLowerCase()
      const isNegative = ['purchase', 'investment', 'dividend', 'switch in', 'shift in'].some(type => 
        transactionType.includes(type)
      )
      const isPositive = ['switch out', 'redemption', 'shift out'].some(type => 
        transactionType.includes(type)
      )
      const amount = isNegative ? -parseFloat(tx.amount as string) : (isPositive ? parseFloat(tx.amount as string) : parseFloat(tx.amount as string))
      
      return {
        date: tx.date as string,
        amount,
        type: tx.transaction_type as string
      }
    })
    
    cashFlows.push({ 
      date: new Date().toISOString().slice(0, 10), 
      amount: totalCurrentValue, 
      type: 'Current Value' 
    })
    
    // Calculate XIRR
    const xirrResult = calculateSchemeXIRR(
      (txs || []).map((tx: Record<string, unknown>) => ({ date: (tx.date as string), amount: parseFloat(tx.amount as string), type: tx.transaction_type as string })),
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
    

    setSchemeNames((data || []).map((d: Record<string, unknown>) => d.scheme_name as string))
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
              {folioSchemes.filter(fs => fs.folio === selectedFolio).map((fs: FolioScheme) => (
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
                  {schemeTxs.map((tx: Transaction, i: number) => (
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
          {schemeXirrDebug && Array.isArray(schemeXirrDebug.cashFlows) && (
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
                  {schemeXirrDebug.cashFlows.map((cf: CashFlow, i: number) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-900">{cf.date}</td>
                      <td className="px-3 py-2 text-gray-900">{cf.type}</td>
                      <td className="px-3 py-2 text-gray-900">{cf.amount >= 0 ? '' : '-'}₹{Math.abs(cf.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {schemeXirrDebug && typeof schemeXirrDebug === 'object' && 'xirrResult' in schemeXirrDebug && (
                <div className="mb-2 text-gray-900">XIRR: <span className="font-semibold text-gray-900">{((schemeXirrDebug as { xirrResult: { xirr: number } })?.xirrResult?.xirr * 100).toFixed(2) + '%'}</span></div>
              )}
              {schemeXirrDebug && typeof schemeXirrDebug === 'object' && 'xirrResult' in schemeXirrDebug && ((schemeXirrDebug as { xirrResult: { converged: boolean } })?.xirrResult?.converged) && (
                <div className="text-green-600">Converged: Yes</div>
              )}
              {schemeXirrDebug && typeof schemeXirrDebug === 'object' && 'xirrResult' in schemeXirrDebug && ((schemeXirrDebug as { xirrResult: { error: string } })?.xirrResult?.error) && (
                <div className="text-red-600">Error: {((schemeXirrDebug as { xirrResult: { error: string } })?.xirrResult?.error)}</div>
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
              {goals.map((goal: Goal) => (
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
                  {goalTxs.map((tx: Transaction, i: number) => (
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
          {goalXirrDebug && Array.isArray(goalXirrDebug.cashFlows) && (
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
                  {goalXirrDebug.cashFlows.map((cf: CashFlow, i: number) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-900">{cf.date}</td>
                      <td className="px-3 py-2 text-gray-900">{cf.type}</td>
                      <td className="px-3 py-2 text-gray-900">{cf.amount >= 0 ? '' : '-'}₹{Math.abs(cf.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {goalXirrDebug && typeof goalXirrDebug === 'object' && 'xirrResult' in goalXirrDebug && (
                <div className="mb-2 text-gray-900">Goal XIRR: <span className="font-semibold text-gray-900">{((goalXirrDebug as { xirrResult: { xirr: number } })?.xirrResult?.xirr * 100).toFixed(2) + '%'}</span></div>
              )}
              {goalXirrDebug && typeof goalXirrDebug === 'object' && ((goalXirrDebug as { xirrResult: { converged: boolean } })?.xirrResult?.converged) && (
                <div className="text-green-600">Converged: Yes</div>
              )}
              {goalXirrDebug && typeof goalXirrDebug === 'object' && ((goalXirrDebug as { xirrResult: { error: string } })?.xirrResult?.error) && (
                <div className="text-red-600">Error: {((goalXirrDebug as { xirrResult: { error: string } })?.xirrResult?.error)}</div>
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
                  {portfolioTxs.slice(0, 20).map((tx: Transaction, i: number) => (
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
          {portfolioXirrDebug && Array.isArray(portfolioXirrDebug.cashFlows) && (
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
                  {portfolioXirrDebug.cashFlows.slice(0, 20).map((cf: CashFlow, i: number) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-900">{cf.date}</td>
                      <td className="px-3 py-2 text-gray-900">{cf.type}</td>
                      <td className="px-3 py-2 text-gray-900">{cf.amount >= 0 ? '' : '-'}₹{Math.abs(cf.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {portfolioXirrDebug && typeof portfolioXirrDebug === 'object' && 'xirrResult' in portfolioXirrDebug && (
                <div className="mb-2 text-gray-900">Portfolio XIRR: <span className="font-semibold text-gray-900">{((portfolioXirrDebug as { xirrResult: { xirr: number } })?.xirrResult?.xirr * 100).toFixed(2) + '%'}</span></div>
              )}
              {portfolioXirrDebug && typeof portfolioXirrDebug === 'object' && ((portfolioXirrDebug as { xirrResult: { converged: boolean } })?.xirrResult?.converged) && (
                <div className="text-green-600">Converged: Yes</div>
              )}
              {portfolioXirrDebug && typeof portfolioXirrDebug === 'object' && ((portfolioXirrDebug as { xirrResult: { error: string } })?.xirrResult?.error) && (
                <div className="text-red-600">Error: {((portfolioXirrDebug as { xirrResult: { error: string } })?.xirrResult?.error)}</div>
              )}
            </div>
          )}
        </div>

        {/* Portfolio XIRR Results */}
        {portfolioXIRR && typeof portfolioXIRR === 'object' && 'xirr' in portfolioXIRR && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Portfolio XIRR Results</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">XIRR Rate</p>
                <p className="text-lg font-semibold text-gray-900">{(portfolioXIRR as { xirr: number }).xirr?.toFixed(6)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">XIRR Percentage</p>
                <p className={`text-lg font-semibold ${(portfolioXIRR as { xirrPercentage: number }).xirrPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(portfolioXIRR as { formattedXIRR: string }).formattedXIRR}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Converged</p>
                <p className="text-lg font-semibold text-gray-900">{(portfolioXIRR as { converged: boolean }).converged ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Current Value</p>
                <p className="text-lg font-semibold text-gray-900">₹{(portfolioXIRR as { totalCurrentValue: number }).totalCurrentValue?.toLocaleString()}</p>
              </div>
            </div>
            {(portfolioXIRR as { error?: string }).error && (
              <p className="text-sm text-red-600 mt-2">Error: {(portfolioXIRR as { error: string }).error}</p>
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