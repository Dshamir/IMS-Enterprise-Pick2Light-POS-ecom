import { NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

export async function POST(request: Request) {
  try {
    // Reset navigation to default structure
    sqliteHelpers.resetNavigationToDefault()

    // Fetch the new navigation structure
    const items = sqliteHelpers.getAllNavigationItems()

    return NextResponse.json({
      success: true,
      message: 'Navigation menu reset to default structure successfully',
      itemCount: (items as any[]).length
    })

  } catch (error: any) {
    console.error('Error resetting navigation menu:', error)
    return NextResponse.json(
      { error: 'Failed to reset navigation menu' },
      { status: 500 }
    )
  }
}
