import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const assembly = sqliteHelpers.getBOMAssemblyById(id)
    
    if (!assembly) {
      return NextResponse.json(
        { error: 'BOM assembly not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(assembly)
  } catch (error) {
    console.error('Error fetching BOM assembly:', error)
    return NextResponse.json(
      { error: 'Failed to fetch BOM assembly' },
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
    const { name, description, status } = body

    const result = sqliteHelpers.updateBOMAssembly(id, {
      name,
      description,
      status
    })

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'BOM assembly not found or no changes made' },
        { status: 404 }
      )
    }

    // Return the updated assembly
    const assembly = sqliteHelpers.getBOMAssemblyById(id)
    return NextResponse.json(assembly)
  } catch (error) {
    console.error('Error updating BOM assembly:', error)
    return NextResponse.json(
      { error: 'Failed to update BOM assembly' },
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
    const result = sqliteHelpers.deleteBOMAssembly(id)

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'BOM assembly not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'BOM assembly deleted successfully' })
  } catch (error) {
    console.error('Error deleting BOM assembly:', error)
    return NextResponse.json(
      { error: 'Failed to delete BOM assembly' },
      { status: 500 }
    )
  }
}