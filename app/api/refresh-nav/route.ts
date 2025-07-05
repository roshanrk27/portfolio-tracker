import { NextRequest, NextResponse } from 'next/server'
import { updateNavData } from '@/lib/updateNavData'

export async function POST(request: NextRequest) {
  try {
    // API key authentication
    const apiKey = request.headers.get('x-api-key')
    if (apiKey !== process.env.NAV_REFRESH_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('Starting automated NAV refresh')
    
    // Update NAV data without user-specific portfolio refresh
    const result = await updateNavData()
    
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
    
  } catch (error: unknown) {
    console.error('Error in automated NAV refresh:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 