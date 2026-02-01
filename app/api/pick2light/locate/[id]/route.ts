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

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { duration_seconds = 5, mode = 'single' } = body

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

    // Get animation duration from first segment (they should all have the same value)
    const animationDuration = segments[0]?.animation_duration || 12000

    // Trigger LED on each device
    const results = []
    for (const segment of segments) {
      try {
        const device = sqliteHelpers.getWLEDDeviceById(segment.wled_device_id)
        if (!device) {
          console.warn(`WLED device not found: ${segment.wled_device_id}`)
          continue
        }

        // Get animation parameters
        const animationSpeed = segment.animation_speed || 200
        const animationIntensity = segment.animation_intensity || 255

        // Check if locate override is enabled
        const overrideEnabled = segment.locate_override_enabled === 1
        const overrideColor = segment.locate_override_color
        const useOverride = overrideEnabled && overrideColor

        if (useOverride) {
          // OVERRIDE MODE: Light up ALL LEDs (0-11) with override color
          const overrideBehavior = segment.locate_override_behavior || 'flash'
          const { fx, sx, ix } = getBehaviorEffectId(overrideBehavior, animationSpeed, animationIntensity)
          const color = hexToRgb(overrideColor!)

          // Send 3 separate WLED segment commands to light up all sections
          const segmentConfigs = [
            { id: 0, start: segment.start_led, stop: segment.start_led + 4, name: 'Location' },  // LEDs 0-3
            { id: 1, start: segment.start_led + 4, stop: segment.start_led + 8, name: 'Stock' },  // LEDs 4-7
            { id: 2, start: segment.start_led + 8, stop: segment.start_led + 12, name: 'Alert' }  // LEDs 8-11
          ]

          let successCount = 0
          for (const config of segmentConfigs) {
            const wledPayload = {
              seg: {
                id: config.id,
                start: config.start,
                stop: config.stop,
                col: [color],
                fx,
                sx,
                ix,
                on: true
              },
              on: true,
              bri: 255,
              tt: Math.min(duration_seconds * 1000, 5000)
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
              console.warn(`Failed to set ${config.name} section:`, error)
            }
          }

          if (successCount > 0) {
            results.push({
              device: device.device_name,
              ip: device.ip_address,
              segment: `LEDs ${segment.start_led}-${segment.start_led + 11} (ALL - Override)`,
              success: true
            })
          } else {
            results.push({
              device: device.device_name,
              ip: device.ip_address,
              segment: `LEDs ${segment.start_led}-${segment.start_led + 11}`,
              success: false,
              error: 'Failed to set all sections'
            })
          }
        } else {
          // NORMAL MODE: Only light up Location section (LEDs 0-3)
          const behavior = segment.location_behavior || 'flash'
          const { fx, sx, ix } = getBehaviorEffectId(behavior, animationSpeed, animationIntensity)
          const color = hexToRgb(segment.location_color || '#FFD60A')

          const wledPayload = {
            seg: {
              id: 0,
              start: segment.start_led,
              stop: segment.start_led + 4,  // Only LEDs 0-3 (Location section)
              col: [color],
              fx,
              sx,
              ix,
              on: true
            },
            on: true,
            bri: 255,
            tt: Math.min(duration_seconds * 1000, 5000)
          }

          const wledResponse = await fetch(`http://${device.ip_address}/json/state`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(wledPayload),
            signal: AbortSignal.timeout(5000)
          })

          if (wledResponse.ok) {
            results.push({
              device: device.device_name,
              ip: device.ip_address,
              segment: `LEDs ${segment.start_led}-${segment.start_led + 3} (Location)`,
              success: true
            })

            // Only turn off after duration if in single mode (not continuous)
            if (mode === 'single') {
              setTimeout(async () => {
                try {
                  await fetch(`http://${device.ip_address}/json/state`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      seg: { id: 0, start: segment.start_led, stop: segment.start_led + 4, on: false }
                    }),
                    signal: AbortSignal.timeout(2000)
                  })
                } catch (cleanupError) {
                  console.warn('Failed to cleanup LED segment:', cleanupError)
                }
              }, duration_seconds * 1000)
            }
          } else {
            results.push({
              device: device.device_name,
              ip: device.ip_address,
              segment: `LEDs ${segment.start_led}-${segment.start_led + 3}`,
              success: false,
              error: `HTTP ${wledResponse.status}`
            })
          }
        }
      } catch (error: any) {
        console.error(`Error triggering LED for segment:`, error)
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
      message: `Activated ${successCount} of ${results.length} LED segments`,
      segments: results,
      duration_seconds,
      animation_duration: animationDuration
    })
  } catch (error: any) {
    console.error('Error locating product with LEDs:', error)
    return NextResponse.json(
      { error: 'Failed to trigger LED location' },
      { status: 500 }
    )
  }
}
