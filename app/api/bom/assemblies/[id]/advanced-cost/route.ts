import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const includeLaborOverhead = searchParams.get('includeLaborOverhead') === 'true'
    
    const advancedCost = sqliteHelpers.calculateAdvancedBOMCost(id, includeLaborOverhead)
    
    // Update the cost rollup cache
    sqliteHelpers.updateBOMCostRollup(id)
    
    return NextResponse.json(advancedCost)
  } catch (error) {
    console.error('Error calculating advanced BOM cost:', error)
    return NextResponse.json(
      { error: 'Failed to calculate advanced BOM cost' },
      { status: 500 }
    )
  }
}