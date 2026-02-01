import { NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

interface WLEDInfo {
  ver: string // Firmware version
  vid: number // Version ID
  leds: {
    count: number
    rgbw: boolean
    wv: number
    cct: number
    maxpwr: number
    maxseg: number
    seglc: number[]
    lc: number
    seglock: boolean
  }
  wifi: {
    bssid: string
    rssi: number // Signal strength
    signal: number // Signal quality percentage
    channel: number
  }
  freeheap: number
  uptime: number
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

    // Query WLED device for real-time information
    try {
      const wledResponse = await fetch(`http://${device.ip_address}/json/info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(3000) // 3 second timeout
      })

      if (!wledResponse.ok) {
        throw new Error(`WLED device responded with status ${wledResponse.status}`)
      }

      const wledInfo: WLEDInfo = await wledResponse.json()

      // Calculate signal strength category
      const rssi = wledInfo.wifi?.rssi || -100
      let signalQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'poor'
      if (rssi >= -50) signalQuality = 'excellent'
      else if (rssi >= -65) signalQuality = 'good'
      else if (rssi >= -75) signalQuality = 'fair'

      // Update device status in database
      const now = new Date().toISOString()
      sqliteHelpers.updateWLEDDevice(id, {
        status: 'online',
        signal_strength: rssi,
        last_seen: now
      })

      return NextResponse.json({
        online: true,
        deviceId: id,
        ipAddress: device.ip_address,
        deviceName: device.device_name,
        version: wledInfo.ver,
        ledCount: wledInfo.leds?.count || device.total_leds,
        uptime: wledInfo.uptime,
        wifi: {
          rssi: rssi,
          signalQuality: signalQuality,
          signalPercentage: wledInfo.wifi?.signal || 0,
          bssid: wledInfo.wifi?.bssid || '',
          channel: wledInfo.wifi?.channel || 0
        },
        freeHeap: wledInfo.freeheap,
        lastSeen: now,
        responseTime: Date.now() // For latency calculation
      })

    } catch (fetchError: any) {
      console.error('WLED communication error:', fetchError)

      // Update device status to offline
      const now = new Date().toISOString()
      sqliteHelpers.updateWLEDDevice(id, {
        status: 'offline',
        last_seen: now
      })

      if (fetchError.name === 'AbortError' || fetchError.name === 'TimeoutError') {
        return NextResponse.json(
          {
            online: false,
            deviceId: id,
            ipAddress: device.ip_address,
            deviceName: device.device_name,
            error: 'Device timeout - not responding',
            lastSeen: now
          },
          { status: 408 }
        )
      }

      return NextResponse.json(
        {
          online: false,
          deviceId: id,
          ipAddress: device.ip_address,
          deviceName: device.device_name,
          error: `Failed to communicate with device: ${fetchError.message}`,
          lastSeen: now
        },
        { status: 503 }
      )
    }

  } catch (error: any) {
    console.error('Error fetching WLED device info:', error)
    return NextResponse.json(
      { error: 'Failed to fetch WLED device info' },
      { status: 500 }
    )
  }
}
