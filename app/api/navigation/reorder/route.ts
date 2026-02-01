import { NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { updates } = body

    // Validate request body
    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Invalid request: updates must be an array' },
        { status: 400 }
      )
    }

    // Validate each update object
    for (const update of updates) {
      if (!update.id || typeof update.display_order !== 'number') {
        return NextResponse.json(
          { error: 'Invalid update object: must have id and display_order' },
          { status: 400 }
        )
      }
    }

    // Perform bulk update
    sqliteHelpers.reorderNavigationItems(updates)

    return NextResponse.json({
      success: true,
      message: `Successfully reordered ${updates.length} navigation item(s)`,
      updatedCount: updates.length
    })

  } catch (error: any) {
    console.error('Error reordering navigation items:', error)
    return NextResponse.json(
      { error: 'Failed to reorder navigation items' },
      { status: 500 }
    )
  }
}
