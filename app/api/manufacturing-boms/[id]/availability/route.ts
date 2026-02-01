import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const availabilityData = sqliteHelpers.checkBOMAvailability(id)
    return NextResponse.json(availabilityData)
  } catch (error) {
    console.error('Error checking BOM availability:', error)
    return NextResponse.json(
      { error: 'Failed to check BOM availability' },
      { status: 500 }
    )
  }
}