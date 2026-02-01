import { NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

export async function GET() {
  try {
    const units = sqliteHelpers.getAllUnits()
    return NextResponse.json({ units })
  } catch (error: any) {
    console.error('Error fetching units:', error)
    return NextResponse.json(
      { error: 'Failed to fetch units' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { name, display_name, symbol } = await request.json()
    
    if (!name || !display_name || !symbol) {
      return NextResponse.json(
        { error: 'Name, display_name, and symbol are required' },
        { status: 400 }
      )
    }

    const result = sqliteHelpers.createUnit(name, display_name, symbol)
    
    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Failed to create unit' },
        { status: 500 }
      )
    }

    // Return the created unit
    const createdUnit = sqliteHelpers.getUnitById(result.lastInsertRowid as string)
    return NextResponse.json({ unit: createdUnit }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating unit:', error)
    
    if (error.message?.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'Unit name already exists' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create unit' },
      { status: 500 }
    )
  }
}