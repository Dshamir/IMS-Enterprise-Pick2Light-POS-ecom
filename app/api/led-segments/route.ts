import { NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')

    if (!productId) {
      return NextResponse.json(
        { error: 'product_id parameter is required' },
        { status: 400 }
      )
    }

    const segments = sqliteHelpers.getLEDSegmentsByProductId(productId)
    return NextResponse.json(segments)
  } catch (error: any) {
    console.error('Error fetching LED segments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch LED segments' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      product_id,
      wled_device_id,
      start_led,
      led_count = 12,
      location_color = '#FF5733',
      location_behavior = 'solid',
      stock_mode = 'auto',
      stock_color_1 = '#4CAF50',
      stock_color_2 = '#4CAF50',
      stock_color_3 = '#4CAF50',
      stock_color_4 = '#4CAF50',
      stock_behavior = 'solid',
      alert_mode = 'auto',
      alert_color_1 = '#333333',
      alert_color_2 = '#333333',
      alert_color_3 = '#333333',
      alert_color_4 = '#333333',
      alert_behavior = 'solid',
      segment_behavior = 'none',
      animation_speed = 128,
      animation_intensity = 128,
      animation_duration = 3000
    } = body

    // Validate required fields
    if (!product_id || !wled_device_id || start_led === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: product_id, wled_device_id, start_led' },
        { status: 400 }
      )
    }

    // Validate numeric fields
    if (typeof start_led !== 'number' || start_led < 0) {
      return NextResponse.json(
        { error: 'start_led must be a non-negative number' },
        { status: 400 }
      )
    }

    if (typeof led_count !== 'number' || led_count <= 0) {
      return NextResponse.json(
        { error: 'led_count must be a positive number' },
        { status: 400 }
      )
    }

    // Validate that the WLED device exists
    const device = sqliteHelpers.getWLEDDeviceById(wled_device_id)
    if (!device) {
      return NextResponse.json(
        { error: 'WLED device not found' },
        { status: 404 }
      )
    }

    // Validate that start_led + led_count doesn't exceed device capacity
    if (start_led + led_count > device.total_leds) {
      return NextResponse.json(
        { error: `LED range exceeds device capacity (${device.total_leds} LEDs)` },
        { status: 400 }
      )
    }

    // Validate that the product exists
    const product = sqliteHelpers.getProductById(product_id)
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Validate LED segment range doesn't conflict
    const validation = sqliteHelpers.validateLEDSegmentRange(
      wled_device_id,
      start_led,
      led_count,
      product_id
    )

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.message, conflicts: validation.conflicts },
        { status: 400 }
      )
    }

    const result = sqliteHelpers.createLEDSegment({
      product_id,
      wled_device_id,
      start_led,
      led_count,
      location_color,
      location_behavior,
      stock_mode,
      stock_color_1,
      stock_color_2,
      stock_color_3,
      stock_color_4,
      stock_behavior,
      alert_mode,
      alert_color_1,
      alert_color_2,
      alert_color_3,
      alert_color_4,
      alert_behavior,
      segment_behavior,
      animation_speed,
      animation_intensity,
      animation_duration
    })

    return NextResponse.json({
      success: true,
      id: result.lastInsertRowid,
      message: 'LED segment created successfully'
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error creating LED segment:', error)
    return NextResponse.json(
      { error: 'Failed to create LED segment' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')

    if (!productId) {
      return NextResponse.json(
        { error: 'product_id parameter is required' },
        { status: 400 }
      )
    }

    // Validate that the product exists
    const product = sqliteHelpers.getProductById(productId)
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const result = sqliteHelpers.deleteLEDSegmentsByProductId(productId)

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.changes} LED segments for product`,
      deleted_count: result.changes
    })

  } catch (error: any) {
    console.error('Error deleting LED segments:', error)
    return NextResponse.json(
      { error: 'Failed to delete LED segments' },
      { status: 500 }
    )
  }
}