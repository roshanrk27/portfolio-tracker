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

// Optimized portfolio summary - fetches only essential aggregated data
export async function getPortfolioSummaryOptimized(userId: string) {
  try {
    const { data, error } = await supabaseServer
      .from('current_portfolio')
      .select('current_value, total_invested')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching optimized portfolio summary:', error)
      return null
    }

    if (!data || data.length === 0) {
      return {
        totalHoldings: 0,
        totalInvested: 0,
        totalCurrentValue: 0
      }
    }

    // Client-side aggregation (much faster than fetching all fields)
    const summary = data.reduce((acc, holding) => {
      acc.totalHoldings += 1
      acc.totalInvested += parseFloat(holding.total_invested || '0')
      acc.totalCurrentValue += parseFloat(holding.current_value || '0')
      return acc
    }, {
      totalHoldings: 0,
      totalInvested: 0,
      totalCurrentValue: 0
    })

    return summary
  } catch (error) {
    console.error('Error in getPortfolioSummaryOptimized:', error)
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

// Refresh NAV data for all users with portfolio entries
export async function refreshAllUsersPortfolios() {
  try {
    console.log('Starting bulk portfolio NAV refresh for all users...')
    
    // Get all unique user IDs from current_portfolio table
    const { data: portfolioEntries, error: portfolioError } = await supabaseServer
      .from('current_portfolio')
      .select('user_id')
      .order('user_id')

    if (portfolioError) {
      console.error('Error fetching portfolio entries for bulk refresh:', portfolioError)
      return {
        success: false,
        totalUsers: 0,
        successfulUpdates: 0,
        failedUpdates: 0,
        errors: [portfolioError.message]
      }
    }

    if (!portfolioEntries || portfolioEntries.length === 0) {
      console.log('No portfolio entries found for bulk refresh')
      return {
        success: true,
        totalUsers: 0,
        successfulUpdates: 0,
        failedUpdates: 0,
        errors: []
      }
    }

    // Get unique user IDs
    const uniqueUserIds = Array.from(new Set(portfolioEntries.map(entry => entry.user_id)))
    console.log(`Found ${uniqueUserIds.length} unique users with portfolio entries`)

    let successfulUpdates = 0
    let failedUpdates = 0
    const errors: string[] = []

    // Process each user
    for (const userId of uniqueUserIds) {
      try {
        console.log(`Processing portfolio refresh for user: ${userId}`)
        
        // Get all portfolio entries for this user
        const { data: userPortfolio, error: userPortfolioError } = await supabaseServer
          .from('current_portfolio')
          .select('*')
          .eq('user_id', userId)

        if (userPortfolioError) {
          const errorMsg = `Error fetching portfolio for user ${userId}: ${userPortfolioError.message}`
          console.error(errorMsg)
          errors.push(errorMsg)
          failedUpdates++
          continue
        }

        if (!userPortfolio || userPortfolio.length === 0) {
          console.log(`No portfolio entries found for user: ${userId}`)
          continue
        }

        let userUpdatedCount = 0

        // Update each portfolio entry with latest NAV
        for (const entry of userPortfolio) {
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
                  current_value: navByIsin[0].nav_value * parseFloat(entry.latest_unit_balance || '0'),
                  return_amount: (navByIsin[0].nav_value * parseFloat(entry.latest_unit_balance || '0')) - parseFloat(entry.total_invested || '0'),
                  return_percentage: parseFloat(entry.total_invested || '0') > 0 
                    ? ((navByIsin[0].nav_value * parseFloat(entry.latest_unit_balance || '0')) - parseFloat(entry.total_invested || '0')) / parseFloat(entry.total_invested || '0') * 100
                    : 0,
                  updated_at: new Date().toISOString()
                })
                .eq('id', entry.id)

              if (!updateError) {
                userUpdatedCount++
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
                  current_value: navByScheme[0].nav_value * parseFloat(entry.latest_unit_balance || '0'),
                  return_amount: (navByScheme[0].nav_value * parseFloat(entry.latest_unit_balance || '0')) - parseFloat(entry.total_invested || '0'),
                  return_percentage: parseFloat(entry.total_invested || '0') > 0 
                    ? ((navByScheme[0].nav_value * parseFloat(entry.latest_unit_balance || '0')) - parseFloat(entry.total_invested || '0')) / parseFloat(entry.total_invested || '0') * 100
                    : 0,
                  updated_at: new Date().toISOString()
                })
                .eq('id', entry.id)

              if (!updateError) {
                userUpdatedCount++
              }
            }
          }
        }

        console.log(`Successfully updated ${userUpdatedCount} portfolio entries for user: ${userId}`)
        successfulUpdates++

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        const errorMsg = `Error processing portfolio refresh for user ${userId}: ${errorMessage}`
        console.error(errorMsg)
        errors.push(errorMsg)
        failedUpdates++
      }
    }

    console.log(`Bulk portfolio refresh completed. Success: ${successfulUpdates}, Failed: ${failedUpdates}`)

    return {
      success: failedUpdates === 0,
      totalUsers: uniqueUserIds.length,
      successfulUpdates,
      failedUpdates,
      errors
    }

  } catch (error: unknown) {
    console.error('Error in refreshAllUsersPortfolios:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      totalUsers: 0,
      successfulUpdates: 0,
      failedUpdates: 0,
      errors: [errorMessage]
    }
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

// TypeScript interfaces for better type safety
interface StockData {
  id: string
  stock_code: string
  quantity: number
  exchange: string
  user_id: string
}

interface PortfolioData {
  scheme_name: string
  folio: string
  current_value: string
}

interface NpsHoldingData {
  id: string
  fund_code: string
  units: string
}

interface NpsNavData {
  fund_code: string
  nav: string
}

interface GoalMapping {
  source_type: string
  source_id?: string
  scheme_name: string
  folio: string
}

interface GoalData {
  id: string
  name: string
  description: string | null
  target_amount: number
  target_date: string
  current_amount: number
  created_at: string
  updated_at: string
  user_id: string
}

/**
 * Fetch all goals with complete details including mappings, XIRR, and related data
 * This is optimized for React Query caching
 */
export async function fetchGoalsWithDetails(userId: string) {
  try {
    // 1. Get basic goals
    const goalsData = await getGoals(userId)
    if (!goalsData || goalsData.length === 0) {
      return []
    }

    // 2. Batch fetch all mappings for all goals
    const allMappings = await Promise.all(goalsData.map(goal => getGoalMappings(goal.id)))
    
    // 3. Collect all unique stock IDs, (scheme_name, folio) pairs, and NPS holding IDs
    const allStockIds: string[] = []
    const allPortfolioPairs: { scheme_name: string; folio: string }[] = []
    const allNpsIds: string[] = []
    
    goalsData.forEach((goal, i) => {
      for (const mapping of allMappings[i]) {
        if (mapping.source_type === 'stock' && mapping.source_id) {
          allStockIds.push(mapping.source_id)
        } else if (mapping.source_type === 'mutual_fund') {
          allPortfolioPairs.push({ scheme_name: mapping.scheme_name, folio: mapping.folio || '' })
        } else if (mapping.source_type === 'nps' && mapping.source_id) {
          allNpsIds.push(mapping.source_id)
        }
      }
    })

    // Remove duplicates
    const uniqueStockIds = Array.from(new Set(allStockIds))
    const uniquePortfolioPairs = Array.from(new Set(allPortfolioPairs.map((p: { scheme_name: string; folio: string }) => `${p.scheme_name}|${p.folio}`)))
      .map((key: string) => {
        const [scheme_name, folio] = key.split('|')
        return { scheme_name, folio }
      })
    const uniqueNpsIds = Array.from(new Set(allNpsIds))

    // 4. Batch fetch all stocks, portfolios, and NPS holdings
    let stocks: StockData[] = []
    if (uniqueStockIds.length > 0) {
      const { data } = await supabaseServer
        .from('stocks')
        .select('*')
        .eq('user_id', userId)
        .in('id', uniqueStockIds)
      stocks = data || []
    }

    let portfolios: PortfolioData[] = []
    if (uniquePortfolioPairs.length > 0) {
      const { data } = await supabaseServer
        .from('current_portfolio')
        .select('scheme_name, folio, current_value')
        .eq('user_id', userId)
      portfolios = data || []
    }

    let npsHoldings: NpsHoldingData[] = []
    if (uniqueNpsIds.length > 0) {
      const { data } = await supabaseServer
        .from('nps_holdings')
        .select('id, fund_code, units')
        .eq('user_id', userId)
        .in('id', uniqueNpsIds)
      npsHoldings = data || []
    }

    // Fetch all needed NAVs for NPS holdings
    let npsNavs: NpsNavData[] = []
    if (npsHoldings.length > 0) {
      const fundCodes = Array.from(new Set(npsHoldings.map((h: NpsHoldingData) => h.fund_code)))
      if (fundCodes.length > 0) {
        const { data } = await supabaseServer
          .from('nps_nav')
          .select('fund_code, nav')
          .in('fund_code', fundCodes)
        npsNavs = data || []
      }
    }

    const npsNavMap: Record<string, number> = {}
    for (const nav of npsNavs) {
      npsNavMap[nav.fund_code] = parseFloat(nav.nav)
    }

    // 5. Batch calculate XIRR for all goals (much faster than individual calls)
    const xirrResults = await batchCalculateXIRR(userId, goalsData, allMappings, portfolios)
    
    // 6. Combine goals with XIRR results and other data
    const goalsWithDetails = goalsData.map((goal, i) => {
      const mappings = allMappings[i] as GoalMapping[]
      const xirrData = xirrResults[i]
      
      let mutualFundValue = 0
      const mappedStocks: { stock_code: string; quantity: number; exchange: string; source_id: string }[] = []
      let npsValue = 0
      
      for (const mapping of mappings) {
        if (mapping.source_type === 'mutual_fund') {
          // Use pre-fetched portfolios, match scheme_name and folio (with fallback to empty string), ignore case and trim
          const mappingScheme = (mapping.scheme_name || '').trim().toLowerCase()
          const mappingFolio = (mapping.folio || '').trim().toLowerCase()
          const portfolioData = portfolios.filter(
            (p: PortfolioData) =>
              (p.scheme_name || '').trim().toLowerCase() === mappingScheme &&
              ((p.folio || '').trim().toLowerCase() === mappingFolio)
          )
          const mfValue = (portfolioData || []).reduce((sum: number, item: PortfolioData) => sum + (parseFloat(item.current_value || '0') || 0), 0)
          mutualFundValue += mfValue
        } else if (mapping.source_type === 'stock' && mapping.source_id) {
          // Use pre-fetched stocks
          const stockData = stocks.find((s: StockData) => s.id === mapping.source_id)
          if (stockData) {
            mappedStocks.push({
              stock_code: stockData.stock_code,
              quantity: stockData.quantity,
              exchange: stockData.exchange,
              source_id: stockData.id
            })
          }
        } else if (mapping.source_type === 'nps' && mapping.source_id) {
          // Use pre-fetched npsHoldings and npsNavMap
          const nps = npsHoldings.find((h: NpsHoldingData) => h.id === mapping.source_id)
          if (nps) {
            const nav = npsNavMap[nps.fund_code] || 0
            npsValue += nav * (parseFloat(nps.units) || 0)
          }
        }
      }

      return {
        ...goal,
        ...xirrData,
        mutual_fund_value: mutualFundValue,
        mappedStocks,
        nps_value: npsValue,
        current_amount: mutualFundValue + npsValue // stock value will be added client-side
      }
    })

    return goalsWithDetails
  } catch (error) {
    console.error('Error in fetchGoalsWithDetails:', error)
    return []
  }
}

/**
 * Batch calculate XIRR for all goals using pre-fetched data
 * This significantly improves performance by avoiding sequential database calls
 */
export async function batchCalculateXIRR(
  userId: string, 
  goals: GoalData[], 
  allMappings: GoalMapping[][], 
  portfolioData?: PortfolioData[]
) {
  try {
    // 1. Collect all unique scheme-folio pairs and goal IDs
    const allSchemeFolioPairs: { scheme_name: string; folio: string; goalId: string }[] = []
    const goalMappingIndex: Record<string, number> = {} // goalId -> mapping index
    
    goals.forEach((goal, goalIndex) => {
      const mappings = allMappings[goalIndex]
      mappings.forEach((mapping, mappingIndex) => {
        if (mapping.source_type === 'mutual_fund' && mapping.scheme_name) {
          allSchemeFolioPairs.push({
            scheme_name: mapping.scheme_name,
            folio: mapping.folio || '',
            goalId: goal.id
          })
          goalMappingIndex[goal.id] = mappingIndex
        }
      })
    })

    if (allSchemeFolioPairs.length === 0) {
      // No mutual fund mappings, return empty XIRR data for all goals
      return goals.map(() => ({
        xirr: 0,
        xirrPercentage: 0,
        formattedXIRR: '0.00%',
        converged: true,
        error: 'No mutual fund schemes mapped',
        current_value: 0
      }))
    }

    // 2. Batch fetch all transactions for all schemes
    const uniqueSchemeFolios = Array.from(new Set(allSchemeFolioPairs.map(p => `${p.scheme_name}|${p.folio}`)))
    const allTransactions: Record<string, Array<{ date: string; amount: number; type: string }>> = {}
    
    // Fetch all transactions in batches
    for (const schemeFolio of uniqueSchemeFolios) {
      const [scheme_name, folio] = schemeFolio.split('|')
      const { data: transactions } = await supabaseServer
        .from('transactions')
        .select('date, amount, transaction_type')
        .eq('user_id', userId)
        .eq('scheme_name', scheme_name)
        .eq('folio', folio)
        .order('date', { ascending: true })
      
      allTransactions[schemeFolio] = transactions?.map(tx => ({
        date: tx.date,
        amount: parseFloat(tx.amount || '0'),
        type: tx.transaction_type
      })) || []
    }

    // 3. Use passed portfolio data or fetch if not provided
    const allPortfolioValues: Record<string, number> = {}
    const portfolioEntries = portfolioData || await supabaseServer
      .from('current_portfolio')
      .select('scheme_name, folio, current_value')
      .eq('user_id', userId)
      .then(result => result.data || [])
    
    if (portfolioEntries) {
      for (const entry of portfolioEntries) {
        const key = `${entry.scheme_name}|${entry.folio}`
        allPortfolioValues[key] = parseFloat(entry.current_value || '0')
      }
    }

    // 4. Calculate XIRR for each goal using pre-fetched data
    const xirrResults = goals.map((goal, goalIndex) => {
      const mappings = allMappings[goalIndex]
      const mutualFundMappings = mappings.filter(m => m.source_type === 'mutual_fund')
      
      if (mutualFundMappings.length === 0) {
        return {
          xirr: 0,
          xirrPercentage: 0,
          formattedXIRR: '0.00%',
          converged: true,
          error: 'No mutual fund schemes mapped',
          current_value: 0
        }
      }

      // Collect all transactions and current values for this goal's mutual fund mappings
      const goalSchemeTransactions: Record<string, Array<{ date: string; amount: number; type: string }>> = {}
      const schemeCurrentValues: Record<string, number> = {}
      
      for (const mapping of mutualFundMappings) {
        const key = `${mapping.scheme_name}-${mapping.folio}`
        const schemeFolioKey = `${mapping.scheme_name}|${mapping.folio}`
        
        goalSchemeTransactions[key] = allTransactions[schemeFolioKey] || []
        schemeCurrentValues[key] = allPortfolioValues[schemeFolioKey] || 0
      }

      // Calculate XIRR for this goal
      const xirrResult = calculateGoalXIRR(
        mutualFundMappings,
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
    })

    return xirrResults
  } catch (error) {
    console.error('Error in batchCalculateXIRR:', error)
    // Return empty XIRR data for all goals on error
    return goals.map(() => ({
      xirr: 0,
      xirrPercentage: 0,
      formattedXIRR: '0.00%',
      converged: true,
      error: 'Error calculating XIRR',
      current_value: 0
    }))
  }
}

/**
 * Get a single goal with all asset types (MF, Stock, NPS) current values
 */
export async function getGoalWithAllAssets(goalId: string) {
  try {
    // Get goal details to get user_id
    const { data: goal, error: goalError } = await supabaseServer
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .single()

    if (goalError) {
      console.error('Error fetching goal for all assets:', goalError)
      return null
    }

    // Get goal mappings
    const { data: mappings, error: mappingError } = await supabaseServer
      .from('goal_scheme_mapping')
      .select('*')
      .eq('goal_id', goalId)

    if (mappingError) {
      console.error('Error fetching goal mappings for all assets:', mappingError)
      return { ...goal, current_amount: 0 }
    }

    if (!mappings || mappings.length === 0) {
      return { ...goal, current_amount: 0 }
    }

    let mutualFundValue = 0
    let npsValue = 0
    let stockValue = 0
    const mappedStocks: { stock_code: string; quantity: number; exchange: string; source_id: string }[] = []

    // Process each mapping
    for (const mapping of mappings) {
      if (mapping.source_type === 'mutual_fund') {
        // Get mutual fund current value
        const { data: portfolioEntry } = await supabaseServer
          .from('current_portfolio')
          .select('current_value')
          .eq('user_id', goal.user_id)
          .eq('scheme_name', mapping.scheme_name)
          .eq('folio', mapping.folio || '')
          .single()

        if (portfolioEntry) {
          mutualFundValue += parseFloat(portfolioEntry.current_value || '0')
        }
      } else if (mapping.source_type === 'stock' && mapping.source_id) {
        // Get stock details
        const { data: stockData } = await supabaseServer
          .from('stocks')
          .select('stock_code, quantity, exchange')
          .eq('id', mapping.source_id)
          .single()

        if (stockData) {
          mappedStocks.push({
            stock_code: stockData.stock_code,
            quantity: stockData.quantity,
            exchange: stockData.exchange,
            source_id: mapping.source_id
          })
        }
      } else if (mapping.source_type === 'nps' && mapping.source_id) {
        // Get NPS holding and NAV
        const { data: npsHolding } = await supabaseServer
          .from('nps_holdings')
          .select('fund_code, units')
          .eq('id', mapping.source_id)
          .single()

        if (npsHolding) {
          const { data: npsNav } = await supabaseServer
            .from('nps_nav')
            .select('nav')
            .eq('fund_code', npsHolding.fund_code)
            .single()

          if (npsNav) {
            const nav = parseFloat(npsNav.nav)
            const units = parseFloat(npsHolding.units)
            npsValue += nav * units
          }
        }
      }
    }

    // Calculate stock values from cache
    if (mappedStocks.length > 0) {
      // Get unique stock symbols
      const stockSymbols = Array.from(new Set(mappedStocks.map(stock => stock.stock_code)))
      
      // Fetch stock prices from cache
      const { data: stockPrices } = await supabaseServer
        .from('stock_prices_cache')
        .select('symbol, price_inr')
        .in('symbol', stockSymbols)

      if (stockPrices) {
        // Create a map of stock codes to prices
        const priceMap = stockPrices.reduce((acc, price) => {
          acc[price.symbol] = parseFloat(price.price_inr || '0')
          return acc
        }, {} as Record<string, number>)

        // Calculate total stock value
        for (const stock of mappedStocks) {
          const price = priceMap[stock.stock_code]
          if (price && price > 0) {
            stockValue += stock.quantity * price
          }
        }
      }
    }

    // Total current value includes MF + NPS + Stock values
    const totalCurrentValue = mutualFundValue + npsValue + stockValue

    return {
      ...goal,
      current_amount: totalCurrentValue,
      mutual_fund_value: mutualFundValue,
      nps_value: npsValue,
      stock_value: stockValue,
      mappedStocks
    }
  } catch (error) {
    console.error('Error in getGoalWithAllAssets:', error)
    return null
  }
}

/**
 * Calculate average monthly investment for a specific goal over the last 12 months
 */
export async function getAverageMonthlyInvestmentByGoal(goalId: string): Promise<number> {
  try {
    // Get goal details to get user_id
    const { data: goal, error: goalError } = await supabaseServer
      .from('goals')
      .select('user_id')
      .eq('id', goalId)
      .single()

    if (goalError) {
      console.error('Error fetching goal for average monthly investment:', goalError)
      return 0
    }

    // Get goal mappings
    const { data: mappings, error: mappingError } = await supabaseServer
      .from('goal_scheme_mapping')
      .select('scheme_name, folio')
      .eq('goal_id', goalId)

    if (mappingError) {
      console.error('Error fetching goal mappings for average monthly investment:', mappingError)
      return 0
    }

    if (!mappings || mappings.length === 0) {
      return 0
    }

    // Calculate date 12 months ago
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

    // Get transactions for mapped schemes over the last 12 months
    const { data: transactions, error } = await supabaseServer
      .from('transactions')
      .select('date, amount')
      .eq('user_id', goal.user_id)
      .gte('date', twelveMonthsAgo.toISOString().split('T')[0])
      .in('scheme_name', mappings.map(m => m.scheme_name))
      .in('folio', mappings.map(m => m.folio))
      .order('date', { ascending: true })

    if (error) {
      console.error('Error fetching transactions for goal average monthly investment:', error)
      return 0
    }

    if (!transactions || transactions.length === 0) {
      return 0
    }

    // Group transactions by month and sum amounts
    const monthlyTotals: Record<string, number> = {}
    
    for (const transaction of transactions) {
      const monthKey = transaction.date.substring(0, 7) // YYYY-MM format
      const amount = parseFloat(transaction.amount || '0')
      
      if (amount > 0) { // Only count positive amounts (investments)
        monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + amount
      }
    }

    // Calculate average
    const totalAmount = Object.values(monthlyTotals).reduce((sum, amount) => sum + amount, 0)
    const numberOfMonths = Object.keys(monthlyTotals).length

    return numberOfMonths > 0 ? totalAmount / numberOfMonths : 0
  } catch (error) {
    console.error('Error in getAverageMonthlyInvestmentByGoal:', error)
    return 0
  }
} 