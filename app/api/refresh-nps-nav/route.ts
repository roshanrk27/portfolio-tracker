import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface NavData {
  fund_code: string
  nav: number
  nav_date: string
}

export async function POST(req: NextRequest) {
  const logs: string[] = []
  try {
    // API key authentication
    const apiKey = req.headers.get('x-api-key')
    if (apiKey !== process.env.NAV_REFRESH_API_KEY) {
      logs.push('Invalid API key')
      return NextResponse.json({ success: false, logs }, { status: 401 })
    }

    logs.push('API key authenticated')
    
    // Create Supabase client with service role key for automated access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all fund codes in our DB
    const { data: fundRows, error: fundError } = await supabase
      .from('nps_funds')
      .select('fund_code')
    if (fundError) {
      logs.push('Error fetching nps_funds')
      return NextResponse.json({ success: false, logs }, { status: 500 })
    }
    const fundCodes = (fundRows || []).map(f => f.fund_code)
    logs.push(`Found ${fundCodes.length} fund codes`)
    
    // For each fund_code, fetch NAV from npsnav.in/api/detailed/{fund_code}
    let upsertCount = 0
    const sampleNavs: NavData[] = []
    for (const fund_code of fundCodes) {
      try {
        const url = `https://npsnav.in/api/detailed/${fund_code}`
        const resp = await fetch(url)
        if (!resp.ok) {
          logs.push(`Failed to fetch NAV for ${fund_code}: HTTP ${resp.status}`)
          continue
        }
        const json = await resp.json()
        // Expecting { NAV: string, 'Last Updated': string }
        const nav = parseFloat(json["NAV"])
        let nav_date = json["Last Updated"]?.trim()
        // Convert DD-MM-YYYY to YYYY-MM-DD
        if (nav_date && /^\d{2}-\d{2}-\d{4}$/.test(nav_date)) {
          const [day, month, year] = nav_date.split('-')
          nav_date = `${year}-${month}-${day}`
        }
        if (isNaN(nav) || !nav_date) {
          logs.push(`Invalid NAV or date for ${fund_code}`)
          continue
        }
        // Upsert NAV
        const { error } = await supabase
          .from('nps_nav')
          .upsert({
            fund_code,
            nav,
            nav_date
          }, { onConflict: 'fund_code' })
        if (!error) {
          upsertCount++
          if (sampleNavs.length < 3) sampleNavs.push({ fund_code, nav, nav_date })
        } else {
          logs.push(`Upsert error for ${fund_code}: ${error.message}`)
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        logs.push(`Error for ${fund_code}: ${errorMessage}`)
      }
    }
    logs.push(`Upserted NAVs for ${upsertCount} funds`)
    logs.push('Sample:', JSON.stringify(sampleNavs))
    return NextResponse.json({ success: true, logs })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    logs.push('Error: ' + errorMessage)
    return NextResponse.json({ success: false, logs }, { status: 500 })
  }
} 

export async function GET(request: NextRequest) {
  return POST(request)
} 