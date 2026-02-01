import { NextRequest, NextResponse } from 'next/server'
import { getRecentDynamicUpdates } from '@/lib/audit-log'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    
    const recentUpdates = await getRecentDynamicUpdates(limit)
    
    return NextResponse.json({
      success: true,
      data: recentUpdates
    })
  } catch (error) {
    console.error('Failed to fetch audit logs:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}