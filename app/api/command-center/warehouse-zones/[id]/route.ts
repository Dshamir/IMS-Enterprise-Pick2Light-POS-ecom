import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, updateWarehouseZone, deleteWarehouseZone } from '@/lib/database/sqlite'

/**
 * GET /api/command-center/warehouse-zones/[id]
 * Get a specific warehouse zone
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDatabase()
    const zone = db.prepare('SELECT * FROM warehouse_zones WHERE id = ?').get(params.id)

    if (!zone) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 })
    }

    return NextResponse.json(zone)
  } catch (error) {
    console.error('Error fetching warehouse zone:', error)
    return NextResponse.json(
      { error: 'Failed to fetch warehouse zone' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/command-center/warehouse-zones/[id]
 * Update a warehouse zone
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      rotation_degrees: body.rotation_degrees ?? 0, // Default to 0 if not provided
      wled_device_id: body.wled_device_id || null,
      rfid_scanner_type: body.rfid_scanner_type || null,
      rfid_scanner_range: body.rfid_scanner_range || 5.0,
      notes: body.notes || null
    }

    console.log('Updating zone:', params.id, 'with data:', JSON.stringify(zoneData, null, 2))

    // Test database connection first
    const db = getDatabase()
    console.log('Database initialized:', !!db)

    const success = updateWarehouseZone(params.id, zoneData)

    if (!success) {
      console.error('updateWarehouseZone returned false for zone:', params.id)
      return NextResponse.json(
        { error: 'Failed to update warehouse zone - check server logs' },
        { status: 500 }
      )
    }

    console.log('Successfully updated zone:', params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating warehouse zone:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
    return NextResponse.json(
      { error: 'Failed to update warehouse zone: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/command-center/warehouse-zones/[id]
 * Delete a warehouse zone
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = deleteWarehouseZone(params.id)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete warehouse zone' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting warehouse zone:', error)
    return NextResponse.json(
      { error: 'Failed to delete warehouse zone' },
      { status: 500 }
    )
  }
}
