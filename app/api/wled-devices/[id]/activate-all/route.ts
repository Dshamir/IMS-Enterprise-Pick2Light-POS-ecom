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
    : [255, 0, 0] // Default to red
}

/**
 * Map animation behavior names to WLED effect IDs
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
 * POST /api/wled-devices/[id]/activate-all
 *
 * Bulk activate ALL segments for a device
 * This endpoint replaces clicking "Activate" 2500 times!
 *
 * Process:
 * 1. Fetch all segments for device from database
 * 2. Build comprehensive WLED state payload
 * 3. Send single HTTP request to WLED device
 * 4. Mark all segments as synced in database
 *
 * Performance: Can sync 500+ segments in ~2 seconds
 */
export async function POST(request: Request, { params }: RouteParams) {
  const startTime = Date.now()

  try {
    const { id } = await params

    // Get device info
    const device = sqliteHelpers.getWLEDDeviceById(id)
    if (!device) {
      return NextResponse.json(
        { error: 'WLED device not found' },
        { status: 404 }
      )
    }

    // Check if device is online (optional check)
    if (device.status === 'offline') {
      return NextResponse.json(
        {
          error: 'Device is offline',
          message: 'Cannot sync segments to offline device. Check device connectivity.'
        },
        { status: 503 }
      )
    }

    // Get all segments for this device
    const segments = sqliteHelpers.getLEDSegmentsByDeviceId(id)

    if (segments.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: 'No segments to sync',
          synced_count: 0,
          device_name: device.device_name
        }
      )
    }

    console.log(`🔄 Bulk activating ${segments.length} segments for device: ${device.device_name}`)

    // Get device defaults (for segments that inherit defaults)
    const deviceDefaults = {
      animation_speed: device.default_animation_speed || 128,
      animation_intensity: device.default_animation_intensity || 128,
      location_behavior: device.default_location_behavior || 'solid',
      stock_behavior: device.default_stock_behavior || 'solid',
      alert_behavior: device.default_alert_behavior || 'solid'
    }

    // Build WLED segments array - one WLED segment per product LED segment
    const wledSegments = []
    const segmentIds = []
    let failedSegments = []

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      segmentIds.push(segment.id)

      try {
        // Determine animation parameters (use device defaults if segment has use_device_defaults=1)
        const useDefaults = segment.use_device_defaults !== 0
        const animSpeed = useDefaults ? deviceDefaults.animation_speed : (segment.animation_speed || 128)
        const animIntensity = useDefaults ? deviceDefaults.animation_intensity : (segment.animation_intensity || 128)

        // Build 3 sub-segments for each product segment
        // Location section (LEDs 0-3) - OFF by default, only activated via Pick2Light Locate button
        const locationBehavior = useDefaults ? deviceDefaults.location_behavior : (segment.location_behavior || 'solid')
        const locationEffect = getBehaviorEffectId(locationBehavior, animSpeed, animIntensity)

        wledSegments.push({
          id: i * 3, // WLED segment ID (Location)
          start: segment.start_led,
          stop: segment.start_led + 4,
          col: [hexToRgb(segment.location_color || '#FF5733')],
          fx: locationEffect.fx,
          sx: locationEffect.sx,
          ix: locationEffect.ix,
          on: false,  // OFF by default - only activated via Locate button
          bri: 0      // Brightness 0 when off
        })

        // Stock section (LEDs 4-7)
        const stockBehavior = useDefaults ? deviceDefaults.stock_behavior : (segment.stock_behavior || 'solid')
        const stockEffect = getBehaviorEffectId(stockBehavior, animSpeed, animIntensity)

        if (segment.stock_mode === 'manual' && segment.stock_color_1) {
          wledSegments.push({
            id: i * 3 + 1, // WLED segment ID (Stock)
            start: segment.start_led + 4,
            stop: segment.start_led + 8,
            col: [
              hexToRgb(segment.stock_color_1 || '#4CAF50'),
              hexToRgb(segment.stock_color_2 || '#4CAF50'),
              hexToRgb(segment.stock_color_3 || '#4CAF50'),
              hexToRgb(segment.stock_color_4 || '#4CAF50')
            ],
            fx: stockEffect.fx,
            sx: stockEffect.sx,
            ix: stockEffect.ix,
            on: true,
            bri: 255
          })
        } else {
          // Auto mode: default green
          wledSegments.push({
            id: i * 3 + 1,
            start: segment.start_led + 4,
            stop: segment.start_led + 8,
            col: [hexToRgb('#4CAF50')],
            fx: stockEffect.fx,
            sx: stockEffect.sx,
            ix: stockEffect.ix,
            on: true,
            bri: 255
          })
        }

        // Alert section (LEDs 8-11)
        const alertBehavior = useDefaults ? deviceDefaults.alert_behavior : (segment.alert_behavior || 'solid')
        const alertEffect = getBehaviorEffectId(alertBehavior, animSpeed, animIntensity)

        if (segment.alert_mode === 'manual' && segment.alert_color_1) {
          wledSegments.push({
            id: i * 3 + 2, // WLED segment ID (Alert)
            start: segment.start_led + 8,
            stop: segment.start_led + 12,
            col: [
              hexToRgb(segment.alert_color_1 || '#FF0000'),
              hexToRgb(segment.alert_color_2 || '#FF0000'),
              hexToRgb(segment.alert_color_3 || '#FF0000'),
              hexToRgb(segment.alert_color_4 || '#FF0000')
            ],
            fx: alertEffect.fx,
            sx: alertEffect.sx,
            ix: alertEffect.ix,
            on: true,
            bri: 255
          })
        } else {
          // Auto mode: default red
          wledSegments.push({
            id: i * 3 + 2,
            start: segment.start_led + 8,
            stop: segment.start_led + 12,
            col: [hexToRgb('#FF0000')],
            fx: alertEffect.fx,
            sx: alertEffect.sx,
            ix: alertEffect.ix,
            on: true,
            bri: 255
          })
        }
      } catch (segError) {
        console.error(`❌ Error building segment ${segment.id}:`, segError)
        failedSegments.push(segment.id)
      }
    }

    console.log(`📦 Built ${wledSegments.length} WLED segments from ${segments.length} product segments`)

    // Create WLED API payload
    const wledPayload = {
      on: true,
      bri: 255,
      transition: 0, // No transition for instant updates
      seg: wledSegments
    }

    // Send to WLED device
    let syncSuccess = false
    let wledError = null

    try {
      const wledResponse = await fetch(`http://${device.ip_address}/json/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(wledPayload),
        signal: AbortSignal.timeout(10000) // 10 second timeout for large payloads
      })

      if (!wledResponse.ok) {
        throw new Error(`WLED device responded with status ${wledResponse.status}`)
      }

      syncSuccess = true
      console.log(`✅ Successfully synced ${segments.length} segments to ${device.device_name}`)
    } catch (fetchError: any) {
      wledError = fetchError.message
      console.error('❌ WLED communication error:', fetchError)

      // Mark segments as failed
      if (segmentIds.length > 0) {
        sqliteHelpers.markSegmentsAsFailed(segmentIds)
      }

      if (fetchError.name === 'AbortError' || fetchError.name === 'TimeoutError') {
        return NextResponse.json(
          {
            error: 'Device timeout',
            message: 'Device took too long to respond. It may be processing the request.',
            attempted_segments: segments.length
          },
          { status: 408 }
        )
      }

      return NextResponse.json(
        {
          error: 'Communication failed',
          message: `Failed to communicate with device: ${wledError}`,
          attempted_segments: segments.length
        },
        { status: 503 }
      )
    }

    // Update database: mark segments as synced
    if (syncSuccess && segmentIds.length > 0) {
      sqliteHelpers.markSegmentsAsSynced(segmentIds)
      sqliteHelpers.updateDeviceSyncTimestamp(id)
    }

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      message: `All segments synced successfully for ${device.device_name}`,
      device_id: id,
      device_name: device.device_name,
      device_ip: device.ip_address,
      synced_segments: segments.length,
      failed_segments: failedSegments.length,
      wled_segments_created: wledSegments.length,
      duration_ms: duration,
      segments_per_second: Math.round((segments.length / duration) * 1000),
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Error in bulk activation:', error)
    return NextResponse.json(
      {
        error: 'Bulk activation failed',
        message: error.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
