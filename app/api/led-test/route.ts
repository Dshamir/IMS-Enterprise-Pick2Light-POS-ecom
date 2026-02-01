import { NextResponse } from 'next/server'

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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      wled_ip,
      start_led,
      led_count = 12,
      test_color = '#FF0000',
      behavior = 'solid',
      animation_speed = 128,
      animation_intensity = 128
    } = body

    // Validate required fields
    if (!wled_ip || start_led === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: wled_ip, start_led' },
        { status: 400 }
      )
    }

    // Validate IP address format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
    if (!ipRegex.test(wled_ip)) {
      return NextResponse.json(
        { error: 'Invalid IP address format' },
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

    // Convert hex color to RGB
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 255, g: 0, b: 0 }
    }

    const { r, g, b } = hexToRgb(test_color)

    // Get effect parameters based on behavior with dynamic speed and intensity
    const { fx, sx, ix } = getBehaviorEffectId(behavior, animation_speed, animation_intensity)

    // Create WLED API payload to test the LED segment
    // This creates a temporary effect that lights up the specified range
    const wledPayload = {
      seg: {
        id: 0, // Use segment 0
        start: start_led,
        stop: start_led + led_count,
        col: [[r, g, b]], // Set color
        fx: fx, // Effect based on behavior
        sx: sx, // Speed based on behavior
        ix: ix, // Intensity based on behavior
        on: true
      },
      tt: 3000, // Transition time (3 seconds)
      on: true,
      bri: 255 // Full brightness
    }

    // Send request to WLED device
    try {
      const wledResponse = await fetch(`http://${wled_ip}/json/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(wledPayload),
        // Short timeout for local network
        signal: AbortSignal.timeout(5000)
      })

      if (!wledResponse.ok) {
        throw new Error(`WLED device responded with status ${wledResponse.status}`)
      }

      // After 3 seconds, turn off the test LEDs
      setTimeout(async () => {
        try {
          await fetch(`http://${wled_ip}/json/state`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              seg: {
                id: 0,
                start: start_led,
                stop: start_led + led_count,
                col: [[0, 0, 0]], // Turn off
                on: false
              }
            }),
            signal: AbortSignal.timeout(2000)
          })
        } catch (cleanupError) {
          console.warn('Failed to cleanup test LEDs:', cleanupError)
        }
      }, 3000)

      return NextResponse.json({
        success: true,
        message: `LED test signal sent to ${wled_ip}. LEDs ${start_led}-${start_led + led_count - 1} should light up for 3 seconds.`
      })

    } catch (fetchError: any) {
      console.error('WLED communication error:', fetchError)

      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Timeout communicating with WLED device. Check IP address and network connectivity.' },
          { status: 408 }
        )
      }

      return NextResponse.json(
        { error: `Failed to communicate with WLED device: ${fetchError.message}` },
        { status: 503 }
      )
    }

  } catch (error: any) {
    console.error('Error testing LED segment:', error)
    return NextResponse.json(
      { error: 'Failed to test LED segment' },
      { status: 500 }
    )
  }
}