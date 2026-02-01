import { NextRequest, NextResponse } from 'next/server'
import {
  getAllCommandCenterConfig,
  updateCommandCenterConfig
} from '@/lib/database/sqlite'

/**
 * GET /api/command-center/config
 * Retrieve all Command Center configuration entries
 */
export async function GET(request: NextRequest) {
  try {
    const config = getAllCommandCenterConfig()
    return NextResponse.json(config)
  } catch (error) {
    console.error('Error fetching command center config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/command-center/config
 * Update a specific configuration entry
 * Body: { key: string, value: string }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, value } = body

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: key and value' },
        { status: 400 }
      )
    }

    const success = updateCommandCenterConfig(key, String(value))

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, key, value })
  } catch (error) {
    console.error('Error updating command center config:', error)
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    )
  }
}
