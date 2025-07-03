import { NextRequest, NextResponse } from 'next/server'
import { updateNavData } from '@/lib/updateNavData'

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
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    console.error('Error in refresh NAV API:', error)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
} 