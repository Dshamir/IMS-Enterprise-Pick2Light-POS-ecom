import { NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * Map animation behavior names to WLED effect IDs with dynamic speed and intensity
 * Based on WLED v0.13+ effect library
 *
 * @param behavior - Animation behavior name
 * @param speed - Speed value (0-255, default 128)
 * @param intensity - Intensity value (0-255, default 128)
 */
function getBehaviorEffectId(
  behavior: string,
  speed: number = 128,
  intensity: number = 128
): { fx: number; sx: number; ix: number } {
  // Clamp values to valid WLED range (0-255)
  const sx = Math.max(0, Math.min(255, speed))
  const ix = Math.max(0, Math.min(255, intensity))

  switch (behavior) {
    case 'solid':
      return { fx: 0, sx, ix } // Solid color
    case 'flash':
      return { fx: 1, sx, ix } // Blink/Strobe
    case 'flash-solid':
      return { fx: 2, sx, ix } // Breathe
    case 'chaser-loop':
      return { fx: 28, sx, ix } // Chase - continuous loop
    case 'chaser-twice':
      return { fx: 28, sx, ix } // Chase - limited runs
    case 'off':
      return { fx: 0, sx: 0, ix: 0 } // Off state
    default:
      return { fx: 0, sx, ix } // Default to solid
  }
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [255, 0, 0] // Default to red
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { segmentId } = body

    if (!segmentId) {
      return NextResponse.json(
        { error: 'Missing required field: segmentId' },
        { status: 400 }
      )
    }

    // Get device info
    const device = sqliteHelpers.getWLEDDeviceById(id)
    if (!device) {
      return NextResponse.json(
        { error: 'WLED device not found' },
        { status: 404 }
      )
    }

    // Get segment configuration
    const segments = sqliteHelpers.getLEDSegmentsByDeviceId(id)
    const segment = segments.find(s => s.id === segmentId)

    if (!segment) {
      return NextResponse.json(
        { error: 'LED segment not found for this device' },
        { status: 404 }
      )
    }

    // Get animation parameters from segment (with defaults)
    const animationSpeed = segment.animation_speed || 128
    const animationIntensity = segment.animation_intensity || 128

    // Build WLED segments payload with full configuration
    const wledSegments = []

    // Segment 0: Location LEDs (0-3)
    const locationEffect = getBehaviorEffectId(segment.location_behavior || 'solid', animationSpeed, animationIntensity)
    wledSegments.push({
      id: 0,
      start: segment.start_led,
      stop: segment.start_led + 4, // LEDs 0-3
      col: [hexToRgb(segment.location_color)],
      fx: locationEffect.fx,
      sx: locationEffect.sx,
      ix: locationEffect.ix,
      on: true
    })

    // Segment 1: Stock LEDs (4-7)
    const stockEffect = getBehaviorEffectId(segment.stock_behavior || 'solid', animationSpeed, animationIntensity)
    if (segment.stock_mode === 'manual' && segment.stock_color_1) {
      // Use manual colors
      wledSegments.push({
        id: 1,
        start: segment.start_led + 4,
        stop: segment.start_led + 8, // LEDs 4-7
        col: [
          hexToRgb(segment.stock_color_1 || '#4CAF50'),
          hexToRgb(segment.stock_color_2 || '#4CAF50'),
          hexToRgb(segment.stock_color_3 || '#4CAF50'),
          hexToRgb(segment.stock_color_4 || '#4CAF50')
        ],
        fx: stockEffect.fx,
        sx: stockEffect.sx,
        ix: stockEffect.ix,
        on: true
      })
    } else {
      // Auto mode: use default green
      wledSegments.push({
        id: 1,
        start: segment.start_led + 4,
        stop: segment.start_led + 8,
        col: [hexToRgb('#4CAF50')],
        fx: stockEffect.fx,
        sx: stockEffect.sx,
        ix: stockEffect.ix,
        on: true
      })
    }

    // Segment 2: Alert LEDs (8-11)
    const alertEffect = getBehaviorEffectId(segment.alert_behavior || 'solid', animationSpeed, animationIntensity)
    if (segment.alert_mode === 'manual' && segment.alert_color_1) {
      // Use manual colors
      wledSegments.push({
        id: 2,
        start: segment.start_led + 8,
        stop: segment.start_led + 12, // LEDs 8-11
        col: [
          hexToRgb(segment.alert_color_1 || '#FF0000'),
          hexToRgb(segment.alert_color_2 || '#FF0000'),
          hexToRgb(segment.alert_color_3 || '#FF0000'),
          hexToRgb(segment.alert_color_4 || '#FF0000')
        ],
        fx: alertEffect.fx,
        sx: alertEffect.sx,
        ix: alertEffect.ix,
        on: true
      })
    } else {
      // Auto mode: use default dark gray/red
      wledSegments.push({
        id: 2,
        start: segment.start_led + 8,
        stop: segment.start_led + 12,
        col: [hexToRgb('#FF0000')],
        fx: alertEffect.fx,
        sx: alertEffect.sx,
        ix: alertEffect.ix,
        on: true
      })
    }

    // Create WLED API payload
    const wledPayload = {
      on: true,
      bri: 255, // Full brightness
      seg: wledSegments
    }

    // Send to WLED device
    try {
      const wledResponse = await fetch(`http://${device.ip_address}/json/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(wledPayload),
        signal: AbortSignal.timeout(5000)
      })

      if (!wledResponse.ok) {
        throw new Error(`WLED device responded with status ${wledResponse.status}`)
      }

      return NextResponse.json({
        success: true,
        message: `Segment profile activated on ${device.device_name}`,
        segmentCount: wledSegments.length,
        ledRange: {
          start: segment.start_led,
          end: segment.start_led + 11,
          total: 12
        }
      })

    } catch (fetchError: any) {
      console.error('WLED communication error:', fetchError)

      if (fetchError.name === 'AbortError' || fetchError.name === 'TimeoutError') {
        return NextResponse.json(
          { error: 'Device timeout - not responding. Check network connectivity.' },
          { status: 408 }
        )
      }

      return NextResponse.json(
        { error: `Failed to communicate with device: ${fetchError.message}` },
        { status: 503 }
      )
    }

  } catch (error: any) {
    console.error('Error syncing WLED device state:', error)
    return NextResponse.json(
      { error: 'Failed to sync device state' },
      { status: 500 }
    )
  }
}
