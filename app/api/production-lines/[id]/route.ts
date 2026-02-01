import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const productionLine = sqliteHelpers.getProductionLineById(id)
    
    if (!productionLine) {
      return NextResponse.json(
        { error: 'Production line not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(productionLine)
  } catch (error) {
    console.error('Error fetching production line:', error)
    return NextResponse.json(
      { error: 'Failed to fetch production line' },
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
    const { 
      name, 
      description, 
      schedule_type, 
      capacity, 
      location, 
      notes, 
      status,
      hourly_rate,
      shift_hours,
      department,
      image_url
    } = body

    const result = sqliteHelpers.updateProductionLine(id, {
      name,
      description,
      schedule_type,
      capacity,
      location,
      notes,
      status,
      hourly_rate,
      shift_hours,
      department,
      image_url
    })

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Production line not found or no changes made' },
        { status: 404 }
      )
    }

    // Return the updated production line
    const productionLine = sqliteHelpers.getProductionLineById(id)
    return NextResponse.json(productionLine)
  } catch (error) {
    console.error('Error updating production line:', error)
    return NextResponse.json(
      { error: 'Failed to update production line' },
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
    const result = sqliteHelpers.deleteProductionLine(id)

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Production line not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Production line deleted successfully' })
  } catch (error) {
    console.error('Error deleting production line:', error)
    return NextResponse.json(
      { error: 'Failed to delete production line' },
      { status: 500 }
    )
  }
}