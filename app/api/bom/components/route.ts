import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const assemblyId = searchParams.get('assembly_id')

    if (!assemblyId) {
      return NextResponse.json(
        { error: 'Assembly ID is required' },
        { status: 400 }
      )
    }

    const components = sqliteHelpers.getBOMComponents(assemblyId)
    return NextResponse.json(components)
  } catch (error) {
    console.error('Error fetching BOM components:', error)
    return NextResponse.json(
      { error: 'Failed to fetch BOM components' },
      { status: 500 }
    )
  }
}