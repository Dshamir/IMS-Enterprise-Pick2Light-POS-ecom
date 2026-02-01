import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const components = sqliteHelpers.getBOMComponents(id)
    return NextResponse.json(components)
  } catch (error) {
    console.error('Error fetching BOM components:', error)
    return NextResponse.json(
      { error: 'Failed to fetch BOM components' },
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
    const { component_product_id, quantity, notes } = body

    if (!component_product_id || !quantity) {
      return NextResponse.json(
        { error: 'Component product ID and quantity are required' },
        { status: 400 }
      )
    }

    const result = sqliteHelpers.createBOMComponent({
      assembly_id: id,
      component_product_id,
      quantity,
      notes
    })

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Failed to create BOM component' },
        { status: 500 }
      )
    }

    // Return the updated components list
    const components = sqliteHelpers.getBOMComponents(id)
    return NextResponse.json(components, { status: 201 })
  } catch (error) {
    console.error('Error creating BOM component:', error)
    return NextResponse.json(
      { error: 'Failed to create BOM component' },
      { status: 500 }
    )
  }
}