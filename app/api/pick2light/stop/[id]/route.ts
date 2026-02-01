import { NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * Helper function to calculate Stock/Alert dynamic colors based on stock levels
 */
function getStockAlertColors(stockQuantity: number, minStockLevel: number) {
  // Stock section color (LEDs 4-7)
  const stockColor = stockQuantity < minStockLevel ? '#FF8C00' : '#4CAF50' // Orange or Green

  // Alert section color (LEDs 8-11)
  const alertColor = stockQuantity === 0 ? '#EF4444' : '#333333' // Red or Dark Gray

  return { stockColor, alertColor }
}

/**
 * Convert hex color to RGB array
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [255, 0, 0]
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    // Get product
    const product = sqliteHelpers.getProductById(id)
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Get LED segments for this product
    const segments = sqliteHelpers.getLEDSegmentsByProductId(id)

    if (segments.length === 0) {
      return NextResponse.json(
        { error: 'No LED segments configured for this product' },
        { status: 404 }
      )
    }

    // Turn off Location section and restore Stock/Alert sections
    const results = []
    for (const segment of segments) {
      try {
        const device = sqliteHelpers.getWLEDDeviceById(segment.wled_device_id)
        if (!device) {
          console.warn(`WLED device not found: ${segment.wled_device_id}`)
          continue
        }

        // Calculate dynamic colors for Stock and Alert sections
        const { stockColor, alertColor } = getStockAlertColors(
          product.stock_quantity,
          product.min_stock_level
        )

        // Prepare WLED payloads for all 3 sections
        const sectionPayloads = [
          // Location section (LEDs 0-3): Turn OFF
          {
            id: 0,
            start: segment.start_led,
            stop: segment.start_led + 4,
            on: false,
            name: 'Location (OFF)'
          },
          // Stock section (LEDs 4-7): Restore dynamic color
          {
            id: 1,
            start: segment.start_led + 4,
            stop: segment.start_led + 8,
            col: [hexToRgb(stockColor)],
            fx: 0, // Solid
            sx: 128,
            ix: 128,
            on: true,
            bri: 255,
            name: `Stock (${stockColor})`
          },
          // Alert section (LEDs 8-11): Restore dynamic color
          {
            id: 2,
            start: segment.start_led + 8,
            stop: segment.start_led + 12,
            col: [hexToRgb(alertColor)],
            fx: 0, // Solid
            sx: 128,
            ix: 128,
            on: true,
            bri: 255,
            name: `Alert (${alertColor})`
          }
        ]

        let successCount = 0
        for (const payload of sectionPayloads) {
          const wledPayload = {
            seg: {
              id: payload.id,
              start: payload.start,
              stop: payload.stop,
              ...(payload.on === false ? { on: false } : {
                col: payload.col,
                fx: payload.fx,
                sx: payload.sx,
                ix: payload.ix,
                on: payload.on,
              })
            },
            on: true,
            ...(payload.on !== false && { bri: payload.bri })
          }

          try {
            const wledResponse = await fetch(`http://${device.ip_address}/json/state`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(wledPayload),
              signal: AbortSignal.timeout(5000)
            })

            if (wledResponse.ok) successCount++
          } catch (error) {
            console.warn(`Failed to update ${payload.name}:`, error)
          }
        }

        if (successCount > 0) {
          results.push({
            device: device.device_name,
            ip: device.ip_address,
            segment: `LEDs ${segment.start_led}-${segment.start_led + 11}`,
            success: true,
            sectionsUpdated: successCount
          })
        } else {
          results.push({
            device: device.device_name,
            ip: device.ip_address,
            segment: `LEDs ${segment.start_led}-${segment.start_led + 11}`,
            success: false,
            error: 'Failed to update all sections'
          })
        }
      } catch (error: any) {
        console.error(`Error stopping LED for segment:`, error)
        results.push({
          device: 'Unknown',
          segment: `LEDs ${segment.start_led}-${segment.start_led + segment.led_count - 1}`,
          success: false,
          error: error.message
        })
      }
    }

    const successCount = results.filter(r => r.success).length

    return NextResponse.json({
      success: successCount > 0,
      message: `Stopped locate and restored ${successCount} of ${results.length} LED segments`,
      segments: results
    })
  } catch (error: any) {
    console.error('Error stopping LED indicators:', error)
    return NextResponse.json(
      { error: 'Failed to stop LED indicators' },
      { status: 500 }
    )
  }
}
