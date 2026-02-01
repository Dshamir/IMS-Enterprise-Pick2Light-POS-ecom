import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const costData = sqliteHelpers.calculateBOMCost(id)
    return NextResponse.json(costData)
  } catch (error) {
    console.error('Error calculating BOM cost:', error)
    return NextResponse.json(
      { error: 'Failed to calculate BOM cost' },
      { status: 500 }
    )
  }
}