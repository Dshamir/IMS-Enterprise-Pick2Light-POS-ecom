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
    const segment = sqliteHelpers.getLEDSegmentById(id)

    if (!segment) {
      return NextResponse.json(
        { error: 'LED segment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(segment)
  } catch (error: any) {
    console.error('Error fetching LED segment:', error)
    return NextResponse.json(
      { error: 'Failed to fetch LED segment' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()

    // Debug logging
    console.log('🔧 LED Segment UPDATE Request:', {
      id,
      locate_override_enabled: body.locate_override_enabled,
      locate_override_color: body.locate_override_color,
      locate_override_behavior: body.locate_override_behavior
    })

    // Check if segment exists
    const existingSegment = sqliteHelpers.getLEDSegmentById(id)
    if (!existingSegment) {
      return NextResponse.json(
        { error: 'LED segment not found' },
        { status: 404 }
      )
    }

    // Validate numeric fields if provided
    if (body.start_led !== undefined) {
      if (typeof body.start_led !== 'number' || body.start_led < 0) {
        return NextResponse.json(
          { error: 'start_led must be a non-negative number' },
          { status: 400 }
        )
      }
    }

    if (body.led_count !== undefined) {
      if (typeof body.led_count !== 'number' || body.led_count <= 0) {
        return NextResponse.json(
          { error: 'led_count must be a positive number' },
          { status: 400 }
        )
      }
    }

    // If updating device, start_led, or led_count, validate the new range
    const newDeviceId = body.wled_device_id || existingSegment.wled_device_id
    const newStartLed = body.start_led !== undefined ? body.start_led : existingSegment.start_led
    const newLedCount = body.led_count !== undefined ? body.led_count : existingSegment.led_count

    // If WLED device is changing, validate it exists
    if (body.wled_device_id && body.wled_device_id !== existingSegment.wled_device_id) {
      const device = sqliteHelpers.getWLEDDeviceById(body.wled_device_id)
      if (!device) {
        return NextResponse.json(
          { error: 'WLED device not found' },
          { status: 404 }
        )
      }

      // Validate range doesn't exceed new device capacity
      if (newStartLed + newLedCount > device.total_leds) {
        return NextResponse.json(
          { error: `LED range exceeds device capacity (${device.total_leds} LEDs)` },
          { status: 400 }
        )
      }
    }

    // Validate range doesn't conflict (excluding current segment)
    if (body.wled_device_id || body.start_led !== undefined || body.led_count !== undefined) {
      const validation = sqliteHelpers.validateLEDSegmentRange(
        newDeviceId,
        newStartLed,
        newLedCount,
        existingSegment.product_id
      )

      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.message, conflicts: validation.conflicts },
          { status: 400 }
        )
      }
    }

    // Validate enum fields if provided
    const validBehaviors = ['solid', 'flash', 'flash-solid', 'chaser-loop', 'chaser-twice', 'off']
    const validModes = ['auto', 'manual']
    const validSegmentBehaviors = ['none', 'solid', 'flash', 'flash-solid', 'chaser-loop', 'chaser-twice']

    if (body.location_behavior && !validBehaviors.includes(body.location_behavior)) {
      return NextResponse.json(
        { error: `Invalid location_behavior. Must be one of: ${validBehaviors.join(', ')}` },
        { status: 400 }
      )
    }

    if (body.stock_behavior && !validBehaviors.includes(body.stock_behavior)) {
      return NextResponse.json(
        { error: `Invalid stock_behavior. Must be one of: ${validBehaviors.join(', ')}` },
        { status: 400 }
      )
    }

    if (body.alert_behavior && !validBehaviors.includes(body.alert_behavior)) {
      return NextResponse.json(
        { error: `Invalid alert_behavior. Must be one of: ${validBehaviors.join(', ')}` },
        { status: 400 }
      )
    }

    if (body.stock_mode && !validModes.includes(body.stock_mode)) {
      return NextResponse.json(
        { error: `Invalid stock_mode. Must be one of: ${validModes.join(', ')}` },
        { status: 400 }
      )
    }

    if (body.alert_mode && !validModes.includes(body.alert_mode)) {
      return NextResponse.json(
        { error: `Invalid alert_mode. Must be one of: ${validModes.join(', ')}` },
        { status: 400 }
      )
    }

    if (body.segment_behavior && !validSegmentBehaviors.includes(body.segment_behavior)) {
      return NextResponse.json(
        { error: `Invalid segment_behavior. Must be one of: ${validSegmentBehaviors.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate locate override behavior
    if (body.locate_override_behavior && !validBehaviors.includes(body.locate_override_behavior)) {
      return NextResponse.json(
        { error: `Invalid locate_override_behavior. Must be one of: ${validBehaviors.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate locate override enabled flag
    if (body.locate_override_enabled !== undefined &&
        body.locate_override_enabled !== 0 &&
        body.locate_override_enabled !== 1) {
      return NextResponse.json(
        { error: 'Invalid locate_override_enabled. Must be 0 or 1' },
        { status: 400 }
      )
    }

    // Validate locate override color format (if provided)
    if (body.locate_override_color &&
        typeof body.locate_override_color === 'string' &&
        body.locate_override_color !== null &&
        !/^#[0-9A-Fa-f]{6}$/.test(body.locate_override_color)) {
      return NextResponse.json(
        { error: 'Invalid locate_override_color. Must be hex format (#RRGGBB)' },
        { status: 400 }
      )
    }

    const result = sqliteHelpers.updateLEDSegment(id, body)

    console.log('💾 Database update result:', {
      changes: result.changes,
      updatedFields: Object.keys(body).filter(k => body[k] !== undefined)
    })

    if (result.changes === 0) {
      console.warn('⚠️ No changes made to database')
      return NextResponse.json(
        { error: 'No changes made to LED segment' },
        { status: 400 }
      )
    }

    console.log('✅ LED segment updated in database successfully')

    return NextResponse.json({
      success: true,
      message: 'LED segment updated successfully',
      updatedSegment: sqliteHelpers.getLEDSegmentById(id)
    })

  } catch (error: any) {
    console.error('Error updating LED segment:', error)
    return NextResponse.json(
      { error: 'Failed to update LED segment' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    // Check if segment exists
    const existingSegment = sqliteHelpers.getLEDSegmentById(id)
    if (!existingSegment) {
      return NextResponse.json(
        { error: 'LED segment not found' },
        { status: 404 }
      )
    }

    const result = sqliteHelpers.deleteLEDSegment(id)

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'LED segment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'LED segment deleted successfully'
    })

  } catch (error: any) {
    console.error('Error deleting LED segment:', error)
    return NextResponse.json(
      { error: 'Failed to delete LED segment' },
      { status: 500 }
    )
  }
}