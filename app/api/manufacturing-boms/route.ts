import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

export async function GET() {
  try {
    const boms = sqliteHelpers.getAllManufacturingBOMs()
    return NextResponse.json(boms)
  } catch (error) {
    console.error('Error fetching manufacturing BOMs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch manufacturing BOMs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, type, project_id, production_line_id, quantity, notes, image_url } = body

    if (!name || !type) {
      return NextResponse.json(
        { error: 'BOM name and type are required' },
        { status: 400 }
      )
    }

    if (type === 'project' && !project_id) {
      return NextResponse.json(
        { error: 'Project ID is required for project BOMs' },
        { status: 400 }
      )
    }

    if (type === 'production_line' && !production_line_id) {
      return NextResponse.json(
        { error: 'Production line ID is required for production line BOMs' },
        { status: 400 }
      )
    }

    const result = sqliteHelpers.createManufacturingBOM({
      name,
      description,
      type,
      project_id,
      production_line_id,
      quantity,
      notes,
      image_url
    })

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Failed to create manufacturing BOM' },
        { status: 500 }
      )
    }

    // Return the created BOM using the UUID returned from the database
    const bom = sqliteHelpers.getManufacturingBOMById(result.id)
    return NextResponse.json(bom, { status: 201 })
  } catch (error) {
    console.error('Error creating manufacturing BOM:', error)
    return NextResponse.json(
      { error: 'Failed to create manufacturing BOM' },
      { status: 500 }
    )
  }
}