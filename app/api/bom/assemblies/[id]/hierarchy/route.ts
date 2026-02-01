import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const hierarchy = sqliteHelpers.getBOMHierarchy(id)
    return NextResponse.json(hierarchy)
  } catch (error) {
    console.error('Error fetching BOM hierarchy:', error)
    return NextResponse.json(
      { error: 'Failed to fetch BOM hierarchy' },
      { status: 500 }
    )
  }
}