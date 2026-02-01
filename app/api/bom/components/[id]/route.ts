import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { quantity, notes } = body

    const result = sqliteHelpers.updateBOMComponent(id, {
      quantity,
      notes
    })

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'BOM component not found or no changes made' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'BOM component updated successfully' })
  } catch (error) {
    console.error('Error updating BOM component:', error)
    return NextResponse.json(
      { error: 'Failed to update BOM component' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = sqliteHelpers.deleteBOMComponent(id)

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'BOM component not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'BOM component deleted successfully' })
  } catch (error) {
    console.error('Error deleting BOM component:', error)
    return NextResponse.json(
      { error: 'Failed to delete BOM component' },
      { status: 500 }
    )
  }
}