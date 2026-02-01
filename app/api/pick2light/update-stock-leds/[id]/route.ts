import { NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

interface RouteParams {
  params: Promise<{
    id: string
  }>
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

/**
 * Get WLED effect parameters based on behavior
 */
function getBehaviorEffectId(
  behavior: string,
  speed: number = 128,
  intensity: number = 128
): { fx: number; sx: number; ix: number } {
  const sx = Math.max(0, Math.min(255, speed))
  const ix = Math.max(0, Math.min(255, intensity))

  switch (behavior) {
    case 'solid':
      return { fx: 0, sx, ix }
    case 'flash':
      return { fx: 1, sx, ix }
    case 'flash-solid':
      return { fx: 2, sx, ix }
    case 'chaser-loop':
      return { fx: 28, sx, ix }
    case 'chaser-twice':
      return { fx: 28, sx, ix }
    case 'off':
      return { fx: 0, sx: 0, ix: 0 }
    default:
      return { fx: 0, sx, ix }
  }
}

/**
 * Calculate dynamic color based on stock level
 */
function getDynamicStockColor(
  stockQuantity: number,
  minStockLevel: number,
  section: 'stock' | 'alert',
  configuredColor: string
): string {
  if (section === 'stock') {
    // Stock section (LEDs 4-7): Orange if below minimum threshold (including zero)
    if (stockQuantity < minStockLevel) {
      return '#FF8C00' // Orange warning
    }
  } else if (section === 'alert') {
    // Alert section (LEDs 8-11): Red if out of stock
    if (stockQuantity === 0) {
      return '#EF4444' // Red critical alert
    }
  }

  // Otherwise use configured color
  return configuredColor
}

/**
 * Update physical WLED LEDs based on stock levels
 * This endpoint updates ONLY the Stock (4-7) and Alert (8-11) sections
 * Location section (0-3) is controlled separately by the Locate button
 *
 * WLED Segment ID Allocation:
 * - Segment 0: Location section (LEDs 0-3) - controlled by Locate button
 * - Segment 1: Stock section (LEDs 4-7) - dynamic colors based on stock level
 * - Segment 2: Alert section (LEDs 8-11) - dynamic colors based on stock level
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    // Get product with current stock levels
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

    const results = []

    // Update each segment
    for (const segment of segments) {
      try {
        const device = sqliteHelpers.getWLEDDeviceById(segment.wled_device_id)
        if (!device) {
          console.warn(`WLED device not found: ${segment.wled_device_id}`)
          continue
        }

        // Get animation parameters
        const animationSpeed = segment.animation_speed || 128
        const animationIntensity = segment.animation_intensity || 255

        // === STOCK SECTION (LEDs 4-7) ===
        const stockBehavior = segment.stock_behavior || 'solid'
        const { fx: stockFx, sx: stockSx, ix: stockIx } = getBehaviorEffectId(stockBehavior, animationSpeed, animationIntensity)

        // Get configured or auto-mode color
        let stockColor = '#4CAF50' // Default green
        if (segment.stock_mode === 'manual' && segment.stock_color_1) {
          stockColor = segment.stock_color_1
        }

        // Apply dynamic color override based on stock level
        const dynamicStockColor = getDynamicStockColor(
          product.stock_quantity,
          product.min_stock_level,
          'stock',
          stockColor
        )

        const stockRgb = hexToRgb(dynamicStockColor)

        // === ALERT SECTION (LEDs 8-11) ===
        const alertBehavior = segment.alert_behavior || 'solid'
        const { fx: alertFx, sx: alertSx, ix: alertIx } = getBehaviorEffectId(alertBehavior, animationSpeed, animationIntensity)

        // Get configured or auto-mode color
        let alertColor = '#333333' // Default dark gray
        if (segment.alert_mode === 'manual' && segment.alert_color_1) {
          alertColor = segment.alert_color_1
        }

        // Apply dynamic color override based on stock level
        const dynamicAlertColor = getDynamicStockColor(
          product.stock_quantity,
          product.min_stock_level,
          'alert',
          alertColor
        )

        const alertRgb = hexToRgb(dynamicAlertColor)

        // Send WLED commands for Stock section (LEDs 4-7)
        const stockStart = segment.start_led + 4
        const stockStop = segment.start_led + 8

        const stockPayload = {
          seg: {
            id: 1,
            start: stockStart,
            stop: stockStop,
            col: [stockRgb],
            fx: stockFx,
            sx: stockSx,
            ix: stockIx,
            on: true
          },
          on: true,
          bri: 255
        }

        const stockResponse = await fetch(`http://${device.ip_address}/json/state`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stockPayload),
          signal: AbortSignal.timeout(5000)
        })

        // Send WLED commands for Alert section (LEDs 8-11)
        const alertStart = segment.start_led + 8
        const alertStop = segment.start_led + 12

        const alertPayload = {
          seg: {
            id: 2,
            start: alertStart,
            stop: alertStop,
            col: [alertRgb],
            fx: alertFx,
            sx: alertSx,
            ix: alertIx,
            on: true
          },
          on: true,
          bri: 255
        }

        const alertResponse = await fetch(`http://${device.ip_address}/json/state`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alertPayload),
          signal: AbortSignal.timeout(5000)
        })

        results.push({
          device: device.device_name,
          ip: device.ip_address,
          stock_section: `LEDs ${stockStart}-${stockStop - 1}`,
          stock_color: dynamicStockColor,
          stock_success: stockResponse.ok,
          alert_section: `LEDs ${alertStart}-${alertStop - 1}`,
          alert_color: dynamicAlertColor,
          alert_success: alertResponse.ok,
          success: stockResponse.ok && alertResponse.ok
        })
      } catch (error: any) {
        console.error(`Error updating LED segment:`, error)
        results.push({
          device: 'Unknown',
          success: false,
          error: error.message
        })
      }
    }

    const successCount = results.filter(r => r.success).length

    return NextResponse.json({
      success: successCount > 0,
      message: `Updated ${successCount} of ${results.length} LED segments`,
      stock_quantity: product.stock_quantity,
      min_stock_level: product.min_stock_level,
      segments: results
    })
  } catch (error: any) {
    console.error('Error updating stock LEDs:', error)
    return NextResponse.json(
      { error: 'Failed to update LED colors' },
      { status: 500 }
    )
  }
}
