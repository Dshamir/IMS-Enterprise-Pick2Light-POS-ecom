import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

export async function GET() {
  try {
    const assemblies = sqliteHelpers.getAllBOMAssemblies()
    return NextResponse.json(assemblies)
  } catch (error) {
    console.error('Error fetching BOM assemblies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch BOM assemblies' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { product_id, name, description, status } = body

    if (!product_id || !name) {
      return NextResponse.json(
        { error: 'Product ID and name are required' },
        { status: 400 }
      )
    }

    const result = sqliteHelpers.createBOMAssembly({
      product_id,
      name,
      description,
      status
    })

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Failed to create BOM assembly' },
        { status: 500 }
      )
    }

    // Return the created assembly
    const assembly = sqliteHelpers.getBOMAssemblyById(result.lastInsertRowid.toString())
    return NextResponse.json(assembly, { status: 201 })
  } catch (error) {
    console.error('Error creating BOM assembly:', error)
    return NextResponse.json(
      { error: 'Failed to create BOM assembly' },
      { status: 500 }
    )
  }
}