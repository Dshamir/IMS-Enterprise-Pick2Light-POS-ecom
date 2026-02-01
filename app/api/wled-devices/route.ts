import { NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

export async function GET() {
  try {
    const devices = sqliteHelpers.getAllWLEDDevices()
    return NextResponse.json(devices)
  } catch (error: any) {
    console.error('Error fetching WLED devices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch WLED devices' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { device_name, ip_address, total_leds, status } = body

    // Validate required fields
    if (!device_name || !ip_address || !total_leds) {
      return NextResponse.json(
        { error: 'Missing required fields: device_name, ip_address, total_leds' },
        { status: 400 }
      )
    }

    // Validate IP address format (basic)
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
    if (!ipRegex.test(ip_address)) {
      return NextResponse.json(
        { error: 'Invalid IP address format' },
        { status: 400 }
      )
    }

    // Validate total_leds is a positive integer
    if (typeof total_leds !== 'number' || total_leds <= 0) {
      return NextResponse.json(
        { error: 'total_leds must be a positive number' },
        { status: 400 }
      )
    }

    const result = sqliteHelpers.createWLEDDevice({
      device_name,
      ip_address,
      total_leds,
      status: status || 'online'
    })

    return NextResponse.json({
      success: true,
      id: result.lastInsertRowid,
      message: 'WLED device created successfully'
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error creating WLED device:', error)

    // Handle unique constraint violation for IP address
    if (error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'A device with this IP address already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create WLED device' },
      { status: 500 }
    )
  }
}