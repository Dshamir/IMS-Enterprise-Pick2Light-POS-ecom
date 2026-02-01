import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const versions = sqliteHelpers.getBOMVersions(id)
    return NextResponse.json(versions)
  } catch (error) {
    console.error('Error fetching BOM versions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch BOM versions' },
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
    const { version_number, description, created_by } = body

    if (!version_number) {
      return NextResponse.json(
        { error: 'Version number is required' },
        { status: 400 }
      )
    }

    const result = sqliteHelpers.createBOMVersion({
      assembly_id: id,
      version_number,
      description,
      created_by
    })

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Failed to create BOM version' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      message: 'BOM version created successfully',
      version_id: result.lastInsertRowid.toString()
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating BOM version:', error)
    return NextResponse.json(
      { error: 'Failed to create BOM version' },
      { status: 500 }
    )
  }
}