import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const flatList = sqliteHelpers.getBOMFlatList(id)
    return NextResponse.json(flatList)
  } catch (error) {
    console.error('Error fetching BOM flat list:', error)
    return NextResponse.json(
      { error: 'Failed to fetch BOM flat list' },
      { status: 500 }
    )
  }
}