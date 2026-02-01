import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const items = sqliteHelpers.getBOMItems(id)
    return NextResponse.json(items)
  } catch (error) {
    console.error('Error fetching BOM items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch BOM items' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { product_id, quantity, notes } = body

    if (!product_id || !quantity) {
      return NextResponse.json(
        { error: 'Product ID and quantity are required' },
        { status: 400 }
      )
    }

    const result = sqliteHelpers.createBOMItem({
      bom_id: id,
      product_id,
      quantity,
      notes
    })

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Failed to create BOM item' },
        { status: 500 }
      )
    }

    // Return the updated items list
    const items = sqliteHelpers.getBOMItems(id)
    return NextResponse.json(items, { status: 201 })
  } catch (error) {
    console.error('Error creating BOM item:', error)
    return NextResponse.json(
      { error: 'Failed to create BOM item' },
      { status: 500 }
    )
  }
}