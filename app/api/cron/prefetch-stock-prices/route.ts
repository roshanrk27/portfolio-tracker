import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request from Vercel
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    // Call the Supabase Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/prefetch-stock-prices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Supabase function call failed:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to call Supabase function' },
        { status: 500 }
      )
    }

    const result = await response.json()
    console.log('Cron job completed successfully:', result)

    return NextResponse.json({
      success: true,
      message: 'Stock prices prefetched successfully',
      result
    })

  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 