'use server'

import { createClient } from '@supabase/supabase-js'
import { calculatePortfolioXIRR, calculateSchemeXIRR, calculateGoalXIRR, formatXIRR } from './xirr'

// Create server-side Supabase client with service role key
const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Get current portfolio for a user with NAV data
export async function getCurrentPortfolio(userId: string) {
  try {
    const { data, error } = await supabaseServer
      .from('current_portfolio')
      .select(`
        *,
        latest_transaction:transactions!latest_transaction_id(*)
      `)
      .eq('user_id', userId)
      .order('latest_date', { ascending: false })

    if (error) {
      console.error('Error fetching current portfolio:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getCurrentPortfolio:', error)
    return []
  }
}

// Get portfolio summary for a user
export async function getPortfolioSummary(userId: string) {
  try {
    const { data, error } = await supabaseServer
      .from('current_portfolio')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching portfolio summary:', error)
      return null
    }

    if (!data || data.length === 0) {
      return {
        totalHoldings: 0,
        totalInvested: 0,
        totalCurrentValue: 0,
        totalReturn: 0,
        totalReturnPercentage: 0,
        totalNavValue: 0,
        entriesWithNav: 0
      }
    }

    const summary = data.reduce((acc, holding) => {
      acc.totalHoldings += 1
      acc.totalInvested += parseFloat(holding.total_invested || '0')
      acc.totalCurrentValue += parseFloat(holding.current_value || '0')
      acc.totalReturn += parseFloat(holding.return_amount || '0')
      if (holding.current_nav && holding.current_nav > 0) {
        acc.totalNavValue += parseFloat(holding.current_nav)
        acc.entriesWithNav += 1
      }
      return acc
    }, {
      totalHoldings: 0,
      totalInvested: 0,
      totalCurrentValue: 0,
      totalReturn: 0,
      totalNavValue: 0,
      entriesWithNav: 0
    })

    const totalReturnPercentage = summary.totalInvested > 0 
      ? (summary.totalReturn / summary.totalInvested) * 100 
      : 0

    return {
      ...summary,
      totalReturnPercentage
    }
  } catch (error) {
    console.error('Error in getPortfolioSummary:', error)
    return null
  }
}

// Get portfolio by folio
export async function getPortfolioByFolio(userId: string, folio: string) {
  try {
    const { data, error } = await supabaseServer
      .from('current_portfolio')
      .select(`
        *,
        latest_transaction:transactions!latest_transaction_id(*)
      `)
      .eq('user_id', userId)
      .eq('folio', folio)
      .order('scheme_name')

    if (error) {
      console.error('Error fetching portfolio by folio:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getPortfolioByFolio:', error)
    return []
  }
}

// Get portfolio by scheme name
export async function getPortfolioByScheme(userId: string, schemeName: string) {
  try {
    const { data, error } = await supabaseServer
      .from('current_portfolio')
      .select(`
        *,
        latest_transaction:transactions!latest_transaction_id(*)
      `)
      .eq('user_id', userId)
      .ilike('scheme_name', `%${schemeName}%`)
      .order('latest_date', { ascending: false })

    if (error) {
      console.error('Error fetching portfolio by scheme:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getPortfolioByScheme:', error)
    return []
  }
}

// Refresh NAV data for portfolio entries
export async function refreshPortfolioNav(userId: string) {
  try {
    // Get current portfolio entries that need NAV refresh
    const { data: portfolio, error: portfolioError } = await supabaseServer
      .from('current_portfolio')
      .select('*')
      .eq('user_id', userId)

    if (portfolioError) {
      console.error('Error fetching portfolio for NAV refresh:', portfolioError)
      return { success: false, error: portfolioError.message }
    }

    if (!portfolio || portfolio.length === 0) {
      return { success: true, updated: 0 }
    }

    let updatedCount = 0

    // Update each portfolio entry with latest NAV
    for (const entry of portfolio) {
      // First, recalculate the unit balance as sum of all units for this folio+scheme
      const { data: unitBalanceData, error: unitBalanceError } = await supabaseServer
        .from('transactions')
        .select('units')
        .eq('folio', entry.folio)
        .eq('scheme_name', entry.scheme_name)

      if (unitBalanceError) {
        console.error('Error calculating unit balance for', entry.folio, entry.scheme_name, unitBalanceError)
        continue
      }

      const totalUnitBalance = unitBalanceData?.reduce((sum, t) => sum + parseFloat(t.units || '0'), 0) || 0

      // Get latest NAV for this scheme+ISIN combination
      let navFound = false
      
      // First try by ISIN if available
      if (entry.isin && entry.isin.trim() !== '') {
        const { data: navByIsin } = await supabaseServer
          .from('nav_data')
          .select('nav_value, nav_date')
          .or(`isin_div_payout.eq.${entry.isin},isin_div_reinvestment.eq.${entry.isin}`)
          .order('nav_date', { ascending: false })
          .limit(1)
        
        if (navByIsin && navByIsin.length > 0) {
          const { error: updateError } = await supabaseServer
            .from('current_portfolio')
            .update({
              current_nav: navByIsin[0].nav_value,
              last_nav_update_date: navByIsin[0].nav_date,
              latest_unit_balance: totalUnitBalance,
              current_value: navByIsin[0].nav_value * totalUnitBalance,
              return_amount: (navByIsin[0].nav_value * totalUnitBalance) - parseFloat(entry.total_invested || '0'),
              return_percentage: parseFloat(entry.total_invested || '0') > 0 
                ? ((navByIsin[0].nav_value * totalUnitBalance) - parseFloat(entry.total_invested || '0')) / parseFloat(entry.total_invested || '0') * 100
                : 0,
              updated_at: new Date().toISOString()
            })
            .eq('id', entry.id)

          if (!updateError) {
            updatedCount++
            navFound = true
          }
        }
      }

      // Fallback to scheme_name lookup if ISIN lookup failed
      if (!navFound) {
        const { data: navByScheme } = await supabaseServer
          .from('nav_data')
          .select('nav_value, nav_date')
          .ilike('scheme_name', `%${entry.scheme_name}%`)
          .order('nav_date', { ascending: false })
          .limit(1)

        if (navByScheme && navByScheme.length > 0) {
          const { error: updateError } = await supabaseServer
            .from('current_portfolio')
            .update({
              current_nav: navByScheme[0].nav_value,
              last_nav_update_date: navByScheme[0].nav_date,
              latest_unit_balance: totalUnitBalance,
              current_value: navByScheme[0].nav_value * totalUnitBalance,
              return_amount: (navByScheme[0].nav_value * totalUnitBalance) - parseFloat(entry.total_invested || '0'),
              return_percentage: parseFloat(entry.total_invested || '0') > 0 
                ? ((navByScheme[0].nav_value * totalUnitBalance) - parseFloat(entry.total_invested || '0')) / parseFloat(entry.total_invested || '0') * 100
                : 0,
              updated_at: new Date().toISOString()
            })
            .eq('id', entry.id)

          if (!updateError) {
            updatedCount++
          }
        }
      }
    }

    return { success: true, updated: updatedCount }
  } catch (error: unknown) {
    console.error('Error in refreshPortfolioNav:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}

// Get portfolio entries with missing NAV data
export async function getPortfolioWithMissingNav(userId: string) {
  try {
    const { data, error } = await supabaseServer
      .from('current_portfolio')
      .select('*')
      .eq('user_id', userId)
      .or('current_nav.is.null,current_nav.eq.0')
      .order('scheme_name')

    if (error) {
      console.error('Error fetching portfolio with missing NAV:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getPortfolioWithMissingNav:', error)
    return []
  }
}

// ===== GOAL MANAGEMENT FUNCTIONS =====

// Get all goals for a user
export async function getGoals(userId: string) {
  try {
    const { data, error } = await supabaseServer
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('target_date', { ascending: true })

    if (error) {
      console.error('Error fetching goals:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getGoals:', error)
    return []
  }
}

// Get goal with progress calculation
export async function getGoalWithProgress(goalId: string) {
  try {
    // Get the goal details
    const { data: goal, error: goalError } = await supabaseServer
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .single()

    if (goalError) {
      console.error('Error fetching goal:', goalError)
      return null
    }

    // Calculate current amount from mapped schemes
    const { data: mappedSchemes, error: mappingError } = await supabaseServer
      .from('goal_scheme_mapping')
      .select('scheme_name, folio')
      .eq('goal_id', goalId)

    if (mappingError) {
      console.error('Error fetching goal mappings:', mappingError)
      return { ...goal, current_amount: 0 }
    }

    if (!mappedSchemes || mappedSchemes.length === 0) {
      return { ...goal, current_amount: 0 }
    }

    // Calculate total current value from mapped schemes
    let totalCurrentValue = 0
    for (const mapping of mappedSchemes) {
      const { data: portfolioEntry } = await supabaseServer
        .from('current_portfolio')
        .select('current_value')
        .eq('user_id', goal.user_id)
        .eq('scheme_name', mapping.scheme_name)
        .eq('folio', mapping.folio || '')
        .single()

      if (portfolioEntry) {
        totalCurrentValue += parseFloat(portfolioEntry.current_value || '0')
      }
    }

    return {
      ...goal,
      current_amount: totalCurrentValue
    }
  } catch (error) {
    console.error('Error in getGoalWithProgress:', error)
    return null
  }
}

// Get all goals with progress for a user
export async function getGoalsWithProgress(userId: string) {
  try {
    const goals = await getGoals(userId)
    const goalsWithProgress = []

    for (const goal of goals) {
      const goalWithProgress = await getGoalWithProgress(goal.id)
      if (goalWithProgress) {
        goalsWithProgress.push(goalWithProgress)
      }
    }

    return goalsWithProgress
  } catch (error) {
    console.error('Error in getGoalsWithProgress:', error)
    return []
  }
}

// Get available schemes for goal mapping
export async function getAvailableSchemes(userId: string) {
  try {
    const { data, error } = await supabaseServer
      .from('current_portfolio')
      .select('scheme_name, folio')
      .eq('user_id', userId)
      .order('folio', { ascending: true })
      .order('scheme_name', { ascending: true })

    if (error) {
      console.error('Error fetching available schemes:', error)
      return []
    }

    // Remove duplicates
    const uniqueSchemes = data?.reduce((acc, item) => {
      const key = `${item.scheme_name}-${item.folio}`
      if (!acc.find(s => `${s.scheme_name}-${s.folio}` === key)) {
        acc.push(item)
      }
      return acc
    }, [] as Array<{ scheme_name: string; folio: string }>) || []

    return uniqueSchemes
  } catch (error) {
    console.error('Error in getAvailableSchemes:', error)
    return []
  }
}

// Get schemes mapped to a goal
export async function getGoalMappings(goalId: string) {
  try {
    const { data, error } = await supabaseServer
      .from('goal_scheme_mapping')
      .select('*')
      .eq('goal_id', goalId)

    if (error) {
      console.error('Error fetching goal mappings:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getGoalMappings:', error)
    return []
  }
}

// ===== XIRR CALCULATION FUNCTIONS =====

/**
 * Calculate XIRR for overall portfolio
 */
export async function getPortfolioXIRR(userId: string) {
  try {
    // Get all transactions for the user
    const { data: transactions, error: txError } = await supabaseServer
      .from('transactions')
      .select('date, amount, transaction_type')
      .eq('user_id', userId)
      .order('date', { ascending: true })

    if (txError) {
      console.error('Error fetching transactions for XIRR:', txError)
      return null
    }

    // Get current portfolio value
    const { data: portfolio, error: portfolioError } = await supabaseServer
      .from('current_portfolio')
      .select('current_value')
      .eq('user_id', userId)

    if (portfolioError) {
      console.error('Error fetching portfolio for XIRR:', portfolioError)
      return null
    }

    const totalCurrentValue = portfolio?.reduce((sum, p) => sum + parseFloat(p.current_value || '0'), 0) || 0

    // Calculate XIRR
    const xirrResult = calculatePortfolioXIRR(
      transactions?.map(tx => ({
        date: tx.date,
        amount: parseFloat(tx.amount || '0'),
        type: tx.transaction_type
      })) || [],
      totalCurrentValue
    )

    return {
      xirr: xirrResult.xirr,
      xirrPercentage: xirrResult.xirr * 100,
      formattedXIRR: formatXIRR(xirrResult.xirr),
      converged: xirrResult.converged,
      error: xirrResult.error,
      totalCurrentValue
    }
  } catch (error) {
    console.error('Error in getPortfolioXIRR:', error)
    return null
  }
}

/**
 * Calculate XIRR for each scheme in portfolio
 */
export async function getSchemeXIRRs(userId: string) {
  try {
    // Get all portfolio entries
    const { data: portfolio, error: portfolioError } = await supabaseServer
      .from('current_portfolio')
      .select('scheme_name, folio, current_value')
      .eq('user_id', userId)

    if (portfolioError) {
      console.error('Error fetching portfolio for scheme XIRR:', portfolioError)
      return []
    }

    const schemeXIRRs = []

    for (const entry of portfolio || []) {
      // Get transactions for this scheme
      const { data: transactions, error: txError } = await supabaseServer
        .from('transactions')
        .select('date, amount, transaction_type')
        .eq('user_id', userId)
        .eq('scheme_name', entry.scheme_name)
        .eq('folio', entry.folio)
        .order('date', { ascending: true })

      if (txError) {
        console.error('Error fetching transactions for scheme XIRR:', txError)
        continue
      }

      const currentValue = parseFloat(entry.current_value || '0')

      // Calculate XIRR for this scheme
      const xirrResult = calculateSchemeXIRR(
        transactions?.map(tx => ({
          date: tx.date,
          amount: parseFloat(tx.amount || '0'),
          type: tx.transaction_type
        })) || [],
        currentValue
      )

      schemeXIRRs.push({
        scheme_name: entry.scheme_name,
        folio: entry.folio,
        xirr: xirrResult.xirr,
        xirrPercentage: xirrResult.xirr * 100,
        formattedXIRR: formatXIRR(xirrResult.xirr),
        converged: xirrResult.converged,
        error: xirrResult.error,
        current_value: currentValue
      })
    }

    return schemeXIRRs
  } catch (error) {
    console.error('Error in getSchemeXIRRs:', error)
    return []
  }
}

/**
 * Calculate XIRR for a specific goal
 */
export async function getGoalXIRR(goalId: string) {
  try {
    // Get goal details
    const { data: goal, error: goalError } = await supabaseServer
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .single()

    if (goalError) {
      console.error('Error fetching goal for XIRR:', goalError)
      return null
    }

    // Get goal mappings
    const { data: mappings, error: mappingError } = await supabaseServer
      .from('goal_scheme_mapping')
      .select('scheme_name, folio')
      .eq('goal_id', goalId)

    if (mappingError) {
      console.error('Error fetching goal mappings for XIRR:', mappingError)
      return null
    }

    if (!mappings || mappings.length === 0) {
      return {
        xirr: 0,
        xirrPercentage: 0,
        formattedXIRR: '0.00%',
        converged: true,
        error: 'No schemes mapped to this goal',
        current_value: 0
      }
    }

    // Collect transactions and current values for mapped schemes
    const goalSchemeTransactions: Record<string, Array<{ date: string; amount: number; type: string }>> = {}
    const schemeCurrentValues: Record<string, number> = {}

    for (const mapping of mappings) {
      const key = `${mapping.scheme_name}-${mapping.folio}`
      
      // Get transactions for this scheme
      const { data: transactions } = await supabaseServer
        .from('transactions')
        .select('date, amount, transaction_type')
        .eq('user_id', goal.user_id)
        .eq('scheme_name', mapping.scheme_name)
        .eq('folio', mapping.folio)
        .order('date', { ascending: true })

      goalSchemeTransactions[key] = transactions?.map(tx => ({
        date: tx.date,
        amount: parseFloat(tx.amount || '0'),
        type: tx.transaction_type
      })) || []

      // Get current value for this scheme
      const { data: portfolioEntry } = await supabaseServer
        .from('current_portfolio')
        .select('current_value')
        .eq('user_id', goal.user_id)
        .eq('scheme_name', mapping.scheme_name)
        .eq('folio', mapping.folio)
        .single()

      schemeCurrentValues[key] = parseFloat(portfolioEntry?.current_value || '0')
    }

    // Calculate XIRR for the goal
    const xirrResult = calculateGoalXIRR(
      mappings,
      goalSchemeTransactions,
      schemeCurrentValues
    )

    const totalCurrentValue = Object.values(schemeCurrentValues).reduce((sum, value) => sum + value, 0)

    return {
      xirr: xirrResult.xirr,
      xirrPercentage: xirrResult.xirr * 100,
      formattedXIRR: formatXIRR(xirrResult.xirr),
      converged: xirrResult.converged,
      error: xirrResult.error,
      current_value: totalCurrentValue
    }
  } catch (error) {
    console.error('Error in getGoalXIRR:', error)
    return null
  }
}

/**
 * Get all goals with XIRR calculations
 */
export async function getGoalsWithXIRR(userId: string) {
  try {
    const goals = await getGoals(userId)
    const goalsWithXIRR = []

    for (const goal of goals) {
      const xirrData = await getGoalXIRR(goal.id)
      if (xirrData) {
        goalsWithXIRR.push({
          ...goal,
          xirr: xirrData.xirr,
          xirrPercentage: xirrData.xirrPercentage,
          formattedXIRR: xirrData.formattedXIRR,
          xirrConverged: xirrData.converged,
          xirrError: xirrData.error
        })
      }
    }

    return goalsWithXIRR
  } catch (error) {
    console.error('Error in getGoalsWithXIRR:', error)
    return []
  }
}

/**
 * Get all goals with progress and XIRR (excluding stocks and NPS from XIRR)
 */
export async function getGoalsWithProgressAndXIRR(userId: string) {
  try {
    const goals = await getGoals(userId)
    const goalsWithProgress = []

    for (const goal of goals) {
      // Get all mappings for this goal
      const mappings = await getGoalMappings(goal.id)
      
      let totalCurrentValue = 0
      let mutualFundValue = 0
      let stockValue = 0
      let npsValue = 0
      let xirrData = null
      const mappedStocks: Array<{ stock_code: string; quantity: number; exchange: string; source_id: string }> = []

      // Debug: print mappings for this goal
    //  console.log('[XIRR DEBUG] Goal:', goal.name, 'Mappings:', mappings)

      // Process each mapping based on source type
      for (const mapping of mappings) {
        if (mapping.source_type === 'mutual_fund') {
          // Get mutual fund value from current_portfolio using exact matching
          const { data: portfolioData } = await supabaseServer
            .from('current_portfolio')
            .select('current_value')
            .eq('user_id', userId)
            .eq('scheme_name', mapping.scheme_name)
            .eq('folio', mapping.folio || '')
          
          const schemeValue = (portfolioData || []).reduce((sum, item) => sum + (parseFloat(item.current_value || '0') || 0), 0)
          mutualFundValue += schemeValue
          totalCurrentValue += schemeValue
        } else if (mapping.source_type === 'stock') {
          // Collect mapped stock info for client-side price fetch
          if (mapping.source_id) {
            const { data: stockData } = await supabaseServer
              .from('stocks')
              .select('*')
              .eq('id', mapping.source_id)
              .eq('user_id', userId)
              .single()
            if (stockData) {
              mappedStocks.push({
                stock_code: stockData.stock_code,
                quantity: stockData.quantity,
                exchange: stockData.exchange,
                source_id: stockData.id
              })
              
              // For now, we'll set a placeholder value that will be updated client-side
              // This ensures the total includes stocks even before live prices are fetched
              stockValue += 0 // Will be updated client-side with live prices
              totalCurrentValue += 0 // Will be updated client-side with live prices
            }
          }
        } else if (mapping.source_type === 'nps') {
          // NPS value calculation will be implemented later
          // For now, set to 0
          npsValue += 0
          totalCurrentValue += 0
        }
      }

      // Debug: print mutualFundValue for this goal
     // console.log('[XIRR DEBUG] Goal:', goal.name, 'mutualFundValue:', mutualFundValue)

      // Calculate XIRR only for mutual fund investments (exclude stocks and NPS)
      if (mutualFundValue > 0) {
        const mutualFundMappings = mappings.filter(m => m.source_type === 'mutual_fund')
        const xirrTransactions = []
        
        for (const mapping of mutualFundMappings) {
          const portfolioData = await getPortfolioByScheme(userId, mapping.scheme_name)
          for (const item of portfolioData) {
            // Get transactions for this scheme
          //  console.log('[XIRR DEBUG] Fetching transactions for:', mapping.scheme_name, mapping.folio)
            const { data: transactions } = await supabaseServer
              .from('transactions')
              .select('*')
              .eq('user_id', userId)
              .eq('scheme_name', item.scheme_name)
              .eq('folio', item.folio)
              .order('date', { ascending: true })

            if (transactions) {
              for (const tx of transactions) {
                const transactionType = (tx.transaction_type || '').toLowerCase()
                let amount = parseFloat(tx.amount || '0')
                // Outflows (investments) are negative, inflows (redemptions) are positive
                if (
                  transactionType.includes('purchase') ||
                  transactionType.includes('investment') ||
                  transactionType.includes('dividend') ||
                  transactionType.includes('switch in') ||
                  transactionType.includes('shift in')
                ) {
                  amount = -Math.abs(amount)
                } else if (
                  transactionType.includes('switch out') ||
                  transactionType.includes('redemption') ||
                  transactionType.includes('shift out')
                ) {
                  amount = -Math.abs(amount)
                }
                // Default: treat as positive (shouldn't happen)
                xirrTransactions.push({
                  date: new Date(tx.date),
                  amount: amount
                })
              }
            }
          }
        }

        // Add current value as final positive cash flow if > 0
        if (mutualFundValue > 0) {
          xirrTransactions.push({
            date: new Date(),
            amount: mutualFundValue
          })
        }

        // DEBUG: Print xirrTransactions array
       // console.log('[XIRR DEBUG] Goal:', goal.name, 'xirrTransactions:', xirrTransactions)

        // Calculate XIRR only if we have transactions
        if (xirrTransactions.length > 1) {
          try {
            // Create the proper structure for calculateGoalXIRR
            const goalMappings = mutualFundMappings.map(m => ({
              scheme_name: m.scheme_name,
              folio: m.folio || ''
            }))
            
            const goalSchemeTransactions: Record<string, Array<{ date: string; amount: number; type: string }>> = {}
            const schemeCurrentValues: Record<string, number> = {}
            
            for (const mapping of mutualFundMappings) {
              const key = `${mapping.scheme_name}-${mapping.folio || ''}`
              const portfolioData = await getPortfolioByScheme(userId, mapping.scheme_name)
              
              // Get transactions for this scheme
            //  console.log('[XIRR_ROSHAN] scheme: ', mapping.scheme_name)
            //  console.log('[XIRR_ROSHAN] folio: ', mapping.folio)

              const { data: transactions } = await supabaseServer
                .from('transactions')
                .select('*')
                .eq('user_id', userId)
                .eq('scheme_name', mapping.scheme_name)
                .eq('folio', mapping.folio || '')
                .order('date', { ascending: true })

              goalSchemeTransactions[key] = transactions || []
              
              schemeCurrentValues[key] = portfolioData.reduce((sum, item) => sum + (item.current_value || 0), 0)
             
            }
           
            //console.log('[XIRR DEBUG] schemeCurrentValues:', schemeCurrentValues)
            const xirrResult = calculateGoalXIRR(goalMappings, goalSchemeTransactions, schemeCurrentValues)
            xirrData = {
              xirr: xirrResult.xirr, 
              xirrPercentage: xirrResult.xirr * 100,
              formattedXIRR: formatXIRR(xirrResult.xirr),
              xirrConverged: xirrResult.converged,
              xirrError: xirrResult.error
            }
          } catch (error) {
            console.error('Error calculating XIRR for goal:', goal.id, error)
            xirrData = { xirr: null, xirrPercentage: null, formattedXIRR: 'Error', xirrConverged: false, xirrError: 'Calculation failed' }
          }
        }
      }

      // Ensure xirrData is always an object
      if (!xirrData) {
        xirrData = { xirr: null, xirrPercentage: null, formattedXIRR: null, xirrConverged: false, xirrError: null }
      }

      // Debug: print xirrData for this goal
      console.log('[XIRR DEBUG] Goal:', goal.name, 'xirrData:', xirrData)

      // Calculate progress percentage
      const progressPercentage = goal.target_amount > 0 ? (totalCurrentValue / goal.target_amount) * 100 : 0
      const daysRemaining = Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

      goalsWithProgress.push({
        ...goal,
        current_amount: totalCurrentValue,
        progress_percentage: progressPercentage,
        days_remaining: daysRemaining,
        mutual_fund_value: mutualFundValue,
        stock_value: stockValue,
        nps_value: npsValue,
        mappedStocks,
        ...xirrData
      })
    }

    return goalsWithProgress
  } catch (error) {
    console.error('Error in getGoalsWithProgressAndXIRR:', error)
    return []
  }
}

// Get the latest NAV update date
export async function getLatestNavDate() {
  try {
    const { data, error } = await supabaseServer
      .from('nav_data')
      .select('nav_date')
      .order('nav_date', { ascending: false })
      .limit(1)
      .single()

  //  console.log('🔍 DEBUG - Raw data from nav_data query:', data)
    // console.log('🔍 DEBUG - Error from nav_data query:', error)

    if (error) {
      console.error('Error fetching latest NAV date:', error)
      return null
    }

    const result = data?.nav_date || null
  //  console.log('🔍 DEBUG - Returning nav_date:', result)
    return result
  } catch (error) {
    console.error('Error in getLatestNavDate:', error)
    return null
  }
}

// Check if NAV is up to date (latest NAV date is today or yesterday)
export async function isNavUpToDate() {
  try {
    const latestNavDate = await getLatestNavDate()
   // console.log('🔍 DEBUG - Latest NAV date from DB:', latestNavDate)
   // console.log('🔍 DEBUG - Latest NAV date type:', typeof latestNavDate)

    if (!latestNavDate) {
      console.log('🔍 DEBUG - No NAV date found, returning false')
      return false
    }

    // Get today's date as YYYY-MM-DD string in local timezone
    const today = new Date()
    const todayString = today.toLocaleDateString('en-CA') // YYYY-MM-DD
    const todayDate = new Date(todayString)
    const navDate = new Date(latestNavDate)

    // Calculate the difference in days
    const diffMs = todayDate.getTime() - navDate.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    console.log('🔍 DEBUG - Date diff in days:', diffDays)

    // Consider up to date if NAV date is today or yesterday (diffDays 0 or 1)
    const isUpToDate = diffDays >= 0 && diffDays <= 1
    console.log('🔍 DEBUG - isUpToDate (<=1 day):', isUpToDate)
    return isUpToDate
  } catch (error) {
    console.error('Error checking if NAV is up to date:', error)
    return false
  }
} 