'use server'

import { createClient } from '@supabase/supabase-js'

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
  } catch (error: any) {
    console.error('Error in refreshPortfolioNav:', error)
    return { success: false, error: error.message }
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