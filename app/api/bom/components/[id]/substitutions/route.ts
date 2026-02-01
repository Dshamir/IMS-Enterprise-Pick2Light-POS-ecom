import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const substitutions = sqliteHelpers.getBOMSubstitutions(id)
    return NextResponse.json(substitutions)
  } catch (error) {
    console.error('Error fetching BOM substitutions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch BOM substitutions' },
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
    const { substitute_product_id, priority, notes } = body

    if (!substitute_product_id) {
      return NextResponse.json(
        { error: 'Substitute product ID is required' },
        { status: 400 }
      )
    }

    const result = sqliteHelpers.createBOMSubstitution({
      bom_component_id: id,
      substitute_product_id,
      priority,
      notes
    })

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Failed to create BOM substitution' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      message: 'BOM substitution created successfully',
      substitution_id: result.lastInsertRowid.toString()
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating BOM substitution:', error)
    return NextResponse.json(
      { error: 'Failed to create BOM substitution' },
      { status: 500 }
    )
  }
}