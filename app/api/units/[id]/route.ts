import { NextResponse } from 'next/server'
import { sqliteHelpers, getDatabase } from '@/lib/database/sqlite'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const unit = sqliteHelpers.getUnitById(id)
    
    if (!unit) {
      return NextResponse.json(
        { error: 'Unit not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ unit })
  } catch (error: any) {
    console.error('Error fetching unit:', error)
    return NextResponse.json(
      { error: 'Failed to fetch unit' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { name, display_name, symbol } = await request.json()
    
    if (!name || !display_name || !symbol) {
      return NextResponse.json(
        { error: 'Name, display_name, and symbol are required' },
        { status: 400 }
      )
    }

    const result = sqliteHelpers.updateUnit(id, name, display_name, symbol)
    
    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Unit not found or no changes made' },
        { status: 404 }
      )
    }

    // Return the updated unit
    const updatedUnit = sqliteHelpers.getUnitById(id)
    return NextResponse.json({ unit: updatedUnit })
  } catch (error: any) {
    console.error('Error updating unit:', error)
    
    if (error.message?.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'Unit name already exists' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update unit' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Check if any products are using this unit
    const db = getDatabase()
    const productsUsingUnit = db.prepare(
      'SELECT COUNT(*) as count FROM products WHERE unit_id = ?'
    ).get(id) as { count: number }
    
    if (productsUsingUnit.count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete unit that is in use by products' },
        { status: 400 }
      )
    }

    const result = sqliteHelpers.deleteUnit(id)
    
    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Unit not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Unit deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting unit:', error)
    return NextResponse.json(
      { error: 'Failed to delete unit' },
      { status: 500 }
    )
  }
}