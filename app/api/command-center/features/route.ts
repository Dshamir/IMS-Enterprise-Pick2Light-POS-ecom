import { NextRequest, NextResponse } from 'next/server'
import {
  getAllCommandCenterFeatures,
  updateCommandCenterFeature
} from '@/lib/database/sqlite'

/**
 * GET /api/command-center/features
 * Retrieve all Command Center features
 */
export async function GET(request: NextRequest) {
  try {
    const features = getAllCommandCenterFeatures()
    return NextResponse.json(features)
  } catch (error) {
    console.error('Error fetching command center features:', error)
    return NextResponse.json(
      { error: 'Failed to fetch features' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/command-center/features
 * Update a specific feature's enabled status
 * Body: { feature_key: string, is_enabled: boolean }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { feature_key, is_enabled } = body

    if (!feature_key || is_enabled === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: feature_key and is_enabled' },
        { status: 400 }
      )
    }

    const success = updateCommandCenterFeature(feature_key, is_enabled)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update feature' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, feature_key, is_enabled })
  } catch (error) {
    console.error('Error updating command center feature:', error)
    return NextResponse.json(
      { error: 'Failed to update feature' },
      { status: 500 }
    )
  }
}
