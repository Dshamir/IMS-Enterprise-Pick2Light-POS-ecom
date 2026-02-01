import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

export async function GET() {
  try {
    const productionLines = sqliteHelpers.getAllProductionLines()
    return NextResponse.json(productionLines)
  } catch (error) {
    console.error('Error fetching production lines:', error)
    return NextResponse.json(
      { error: 'Failed to fetch production lines' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      name, 
      description, 
      schedule_type = 'continuous', 
      capacity = 1, 
      status = 'active',
      location, 
      notes,
      hourly_rate = 0,
      shift_hours = 8,
      department,
      image_url
    } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Production line name is required' },
        { status: 400 }
      )
    }

    const result = sqliteHelpers.createProductionLine({
      name,
      description,
      schedule_type,
      capacity,
      status,
      location,
      notes,
      hourly_rate,
      shift_hours,
      department,
      image_url
    })

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Failed to create production line' },
        { status: 500 }
      )
    }

    // Return the created production line
    const productionLine = sqliteHelpers.getProductionLineById(result.lastInsertRowid.toString())
    return NextResponse.json(productionLine, { status: 201 })
  } catch (error) {
    console.error('Error creating production line:', error)
    return NextResponse.json(
      { error: 'Failed to create production line' },
      { status: 500 }
    )
  }
}