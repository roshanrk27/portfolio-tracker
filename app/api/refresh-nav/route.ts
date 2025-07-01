import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { updateNavData } from '@/lib/updateNavData'

// Create server-side Supabase client
const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Get user ID from request headers (will be set by client)
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    console.log('Starting NAV refresh for user:', userId)
    
    // Update NAV data and refresh portfolio for the user
    const result = await updateNavData(userId)
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        navUpdated: result.navUpdated,
        portfolioRefreshed: result.portfolioRefreshed
      })
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }
    
  } catch (error: any) {
    console.error('Error in refresh NAV API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 