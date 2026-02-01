import { NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const device = sqliteHelpers.getWLEDDeviceById(id)

    if (!device) {
      return NextResponse.json(
        { error: 'WLED device not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(device)
  } catch (error: any) {
    console.error('Error fetching WLED device:', error)
    return NextResponse.json(
      { error: 'Failed to fetch WLED device' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()

    // Check if device exists
    const existingDevice = sqliteHelpers.getWLEDDeviceById(id)
    if (!existingDevice) {
      return NextResponse.json(
        { error: 'WLED device not found' },
        { status: 404 }
      )
    }

    // Validate IP address format if provided
    if (body.ip_address) {
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
      if (!ipRegex.test(body.ip_address)) {
        return NextResponse.json(
          { error: 'Invalid IP address format' },
          { status: 400 }
        )
      }
    }

    // Validate total_leds if provided
    if (body.total_leds !== undefined) {
      if (typeof body.total_leds !== 'number' || body.total_leds <= 0) {
        return NextResponse.json(
          { error: 'total_leds must be a positive number' },
          { status: 400 }
        )
      }
    }

    // Validate status if provided
    if (body.status && !['online', 'offline'].includes(body.status)) {
      return NextResponse.json(
        { error: 'status must be either "online" or "offline"' },
        { status: 400 }
      )
    }

    const result = sqliteHelpers.updateWLEDDevice(id, body)

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'No changes made to WLED device' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'WLED device updated successfully'
    })

  } catch (error: any) {
    console.error('Error updating WLED device:', error)

    // Handle unique constraint violation for IP address
    if (error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'A device with this IP address already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update WLED device' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    // Check if device exists
    const existingDevice = sqliteHelpers.getWLEDDeviceById(id)
    if (!existingDevice) {
      return NextResponse.json(
        { error: 'WLED device not found' },
        { status: 404 }
      )
    }

    // Check if device has LED segments (for informational purposes)
    const deviceSegments = sqliteHelpers.getLEDSegmentsByDeviceId(id)
    const segmentCount = deviceSegments.length

    // Delete device (CASCADE will automatically delete associated LED segments)
    const result = sqliteHelpers.deleteWLEDDevice(id)

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'WLED device not found' },
        { status: 404 }
      )
    }

    const message = segmentCount > 0
      ? `WLED device and ${segmentCount} associated LED segment(s) deleted successfully`
      : 'WLED device deleted successfully'

    return NextResponse.json({
      success: true,
      message,
      deletedSegments: segmentCount
    })

  } catch (error: any) {
    console.error('Error deleting WLED device:', error)
    return NextResponse.json(
      { error: 'Failed to delete WLED device' },
      { status: 500 }
    )
  }
}