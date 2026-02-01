import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const bom = sqliteHelpers.getManufacturingBOMById(id)
    
    if (!bom) {
      return NextResponse.json(
        { error: 'Manufacturing BOM not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(bom)
  } catch (error) {
    console.error('Error fetching manufacturing BOM:', error)
    return NextResponse.json(
      { error: 'Failed to fetch manufacturing BOM' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, quantity, notes, status, image_url } = body

    const result = sqliteHelpers.updateManufacturingBOM(id, {
      name,
      description,
      quantity,
      notes,
      status,
      image_url
    })

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Manufacturing BOM not found or no changes made' },
        { status: 404 }
      )
    }

    // Return the updated BOM
    const bom = sqliteHelpers.getManufacturingBOMById(id)
    return NextResponse.json(bom)
  } catch (error) {
    console.error('Error updating manufacturing BOM:', error)
    return NextResponse.json(
      { error: 'Failed to update manufacturing BOM' },
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
    const result = sqliteHelpers.deleteManufacturingBOM(id)

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Manufacturing BOM not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Manufacturing BOM deleted successfully' })
  } catch (error) {
    console.error('Error deleting manufacturing BOM:', error)
    return NextResponse.json(
      { error: 'Failed to delete manufacturing BOM' },
      { status: 500 }
    )
  }
}