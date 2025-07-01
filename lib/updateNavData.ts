'use server'

import { createClient } from '@supabase/supabase-js'
import { refreshPortfolioNav } from './portfolioUtils'

// Create server-side Supabase client with service role key
const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function updateNavData(userId?: string) {
  try {
    console.log('Starting NAV data update from AMFI...')
    
    // Fetch NAV data from AMFI
    const response = await fetch('https://www.amfiindia.com/spages/NAVAll.txt')
    
    if (!response.ok) {
      throw new Error(`Failed to fetch NAV data: ${response.status} ${response.statusText}`)
    }
    
    const navText = await response.text()
    console.log('Fetched NAV data, length:', navText.length)
    
    // Parse the NAV data
    const navEntries = parseAMFINavData(navText)
    console.log('Parsed NAV entries:', navEntries.length)
    
    if (navEntries.length === 0) {
      throw new Error('No NAV entries found in the data')
    }
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0]
    
    // Prepare data for insertion
    const navDataToInsert = navEntries.map(entry => ({
      scheme_code: entry.schemeCode,
      isin_div_payout: entry.isinDivPayout,
      isin_div_reinvestment: entry.isinDivReinvestment,
      scheme_name: entry.schemeName,
      nav_value: entry.navValue,
      nav_date: entry.navDate
    }))
    
    // Insert NAV data into database - update existing rows instead of creating new ones
    const { data, error } = await supabaseServer
      .from('nav_data')
      .upsert(navDataToInsert, {
        onConflict: 'scheme_code',
        ignoreDuplicates: false
      })
    
    if (error) {
      console.error('NAV data insert error:', error)
      throw new Error(`Failed to store NAV data: ${error.message}`)
    }
    
    console.log('Successfully updated NAV data for', navEntries.length, 'schemes')
    
    // Now refresh portfolio values with the updated NAV data
    // Note: Portfolio refresh requires a specific user ID, so we'll skip it if not provided
    if (userId) {
      console.log('Starting portfolio value refresh for user:', userId)
      const refreshResult = await refreshPortfolioNav(userId)
      
      if (refreshResult.success) {
        console.log('Successfully refreshed portfolio values for', refreshResult.updated, 'entries')
        return {
          success: true,
          count: navEntries.length,
          date: today,
          message: `Updated NAV data for ${navEntries.length} schemes and refreshed portfolio values for ${refreshResult.updated} entries`,
          navUpdated: navEntries.length,
          portfolioRefreshed: refreshResult.updated
        }
      } else {
        console.error('Portfolio refresh failed:', refreshResult.error)
        return {
          success: true,
          count: navEntries.length,
          date: today,
          message: `Updated NAV data for ${navEntries.length} schemes, but portfolio refresh failed: ${refreshResult.error}`,
          navUpdated: navEntries.length,
          portfolioRefreshed: 0,
          portfolioError: refreshResult.error
        }
      }
    } else {
      console.log('No user ID provided, skipping portfolio refresh')
      return {
        success: true,
        count: navEntries.length,
        date: today,
        message: `Updated NAV data for ${navEntries.length} schemes (portfolio refresh skipped - no user ID provided)`,
        navUpdated: navEntries.length,
        portfolioRefreshed: 0
      }
    }
    
  } catch (error: any) {
    console.error('NAV update error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

function parseAMFINavData(navText: string) {
  const lines = navText.split('\n')
  console.log('Lines:', lines)
  const navEntries: any[] = []
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    // Skip empty lines and header lines
    if (!trimmedLine || trimmedLine.startsWith('Scheme Code;')) {
      continue
    }
    
    // Parse semicolon-separated values
    const parts = trimmedLine.split(';')
    console.log('Parts:', parts)
    
    if (parts.length >= 6) {
      const schemeCode = parts[0]?.trim()
      const isinDivPayout = parts[1]?.trim() || null
      const isinDivReinvestment = parts[2]?.trim() || null
      const schemeName = parts[3]?.trim()
      const navValue = parseFloat(parts[4]?.trim() || '0')
      const navDate = parts[5]?.trim()
      
      // Only add valid entries
      if (schemeCode && schemeName && navValue > 0) {
        navEntries.push({
          schemeCode,
          isinDivPayout: isinDivPayout === '-' ? null : isinDivPayout,
          isinDivReinvestment: isinDivReinvestment === '-' ? null : isinDivReinvestment,
          schemeName,
          navValue,
          navDate
        })
      }
    }
  }
  
  return navEntries
}

// Function to get latest NAV for a specific scheme
export async function getLatestNav(schemeName: string) {
  try {
    const { data, error } = await supabaseServer
      .from('nav_data')
      .select('*')
      .ilike('scheme_name', `%${schemeName}%`)
      .order('nav_date', { ascending: false })
      .limit(1)
      .single()
    
    if (error) {
      console.error('Error fetching NAV:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error in getLatestNav:', error)
    return null
  }
}

// Function to get latest NAV for multiple schemes
export async function getLatestNavForSchemes(schemeNames: string[]) {
  try {
    const { data, error } = await supabaseServer
      .from('nav_data')
      .select('*')
      .in('scheme_name', schemeNames)
      .order('nav_date', { ascending: false })
    
    if (error) {
      console.error('Error fetching NAVs:', error)
      return []
    }
    
    // Group by scheme_name and get the latest for each
    const latestNavs = data.reduce((acc: any, nav: any) => {
      if (!acc[nav.scheme_name] || new Date(nav.nav_date) > new Date(acc[nav.scheme_name].nav_date)) {
        acc[nav.scheme_name] = nav
      }
      return acc
    }, {})
    
    return Object.values(latestNavs)
  } catch (error) {
    console.error('Error in getLatestNavForSchemes:', error)
    return []
  }
} 