import { NextRequest, NextResponse } from 'next/server'
import {
  getAllWarehouseZones,
  getActiveWarehouseZones,
  createWarehouseZone,
} from '@/lib/database/sqlite'

/**
 * GET /api/command-center/warehouse-zones
 * Retrieve all warehouse zones or only active ones
 * Query params: active=true (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'

    const zones = activeOnly ? getActiveWarehouseZones() : getAllWarehouseZones()
    return NextResponse.json(zones)
  } catch (error) {
    console.error('Error fetching warehouse zones:', error)
    return NextResponse.json(
      { error: 'Failed to fetch warehouse zones' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/command-center/warehouse-zones
 * Create a new warehouse zone
 * Body: WarehouseZone data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.zone_name || !body.zone_type) {
      return NextResponse.json(
        { error: 'Missing required fields: zone_name and zone_type' },
        { status: 400 }
      )
    }

    // Ensure optional fields have proper defaults
    const zoneData = {
      ...body,
      wled_device_id: body.wled_device_id || null,
      rfid_scanner_type: body.rfid_scanner_type || null,
      rfid_scanner_range: body.rfid_scanner_range || 5.0,
      notes: body.notes || null
    }

    const id = createWarehouseZone(zoneData)

    if (!id) {
      return NextResponse.json(
        { error: 'Failed to create warehouse zone' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, id }, { status: 201 })
  } catch (error) {
    console.error('Error creating warehouse zone:', error)
    return NextResponse.json(
      { error: 'Failed to create warehouse zone' },
      { status: 500 }
    )
  }
}
