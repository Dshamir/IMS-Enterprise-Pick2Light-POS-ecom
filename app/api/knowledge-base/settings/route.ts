/**
 * Knowledge Base AI Settings API
 *
 * GET: Retrieve current AI settings
 * PUT: Update AI settings
 * POST: Reset settings to defaults
 */

import { NextResponse } from 'next/server'
import {
  getKBAISettings,
  updateKBAISettings,
  resetKBAISettings,
  DEFAULT_SETTINGS
} from '@/lib/knowledge-base/kb-settings'

export async function GET() {
  try {
    const settings = getKBAISettings()

    return NextResponse.json({
      settings,
      defaults: DEFAULT_SETTINGS
    })
  } catch (error: any) {
    console.error('Error fetching KB AI settings:', error)
    return NextResponse.json(
      { error: `Failed to fetch settings: ${error.message}` },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()

    // Validate input
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Validate specific fields if provided
    if (body.price_temperature !== undefined) {
      const temp = parseFloat(body.price_temperature)
      if (isNaN(temp) || temp < 0 || temp > 2) {
        return NextResponse.json(
          { error: 'Temperature must be between 0 and 2' },
          { status: 400 }
        )
      }
      body.price_temperature = temp
    }

    if (body.price_max_tokens !== undefined) {
      const tokens = parseInt(body.price_max_tokens)
      if (isNaN(tokens) || tokens < 50 || tokens > 4000) {
        return NextResponse.json(
          { error: 'Max tokens must be between 50 and 4000' },
          { status: 400 }
        )
      }
      body.price_max_tokens = tokens
    }

    // Validate confidence thresholds
    const confidenceFields = [
      'price_high_confidence',
      'price_medium_confidence',
      'part_high_confidence',
      'part_medium_confidence'
    ]

    for (const field of confidenceFields) {
      if (body[field] !== undefined) {
        const val = parseFloat(body[field])
        if (isNaN(val) || val < 0 || val > 1) {
          return NextResponse.json(
            { error: `${field} must be between 0 and 1` },
            { status: 400 }
          )
        }
        body[field] = val
      }
    }

    // Validate search limits
    const limitFields = [
      'price_kb_search_limit',
      'barcode_kb_search_limit',
      'barcode_alternatives_count',
      'part_kb_search_limit',
      'part_return_count'
    ]

    for (const field of limitFields) {
      if (body[field] !== undefined) {
        const val = parseInt(body[field])
        if (isNaN(val) || val < 1 || val > 100) {
          return NextResponse.json(
            { error: `${field} must be between 1 and 100` },
            { status: 400 }
          )
        }
        body[field] = val
      }
    }

    // Validate barcode category prefixes if provided
    if (body.barcode_category_prefixes !== undefined) {
      if (typeof body.barcode_category_prefixes !== 'object') {
        return NextResponse.json(
          { error: 'barcode_category_prefixes must be an object' },
          { status: 400 }
        )
      }
    }

    // Validate name generation fields
    if (body.name_temperature !== undefined) {
      const temp = parseFloat(body.name_temperature)
      if (isNaN(temp) || temp < 0 || temp > 2) {
        return NextResponse.json(
          { error: 'name_temperature must be between 0 and 2' },
          { status: 400 }
        )
      }
      body.name_temperature = temp
    }
    if (body.name_max_tokens !== undefined) {
      const tokens = parseInt(body.name_max_tokens)
      if (isNaN(tokens) || tokens < 50 || tokens > 4000) {
        return NextResponse.json(
          { error: 'name_max_tokens must be between 50 and 4000' },
          { status: 400 }
        )
      }
      body.name_max_tokens = tokens
    }
    if (body.name_kb_search_limit !== undefined) {
      const val = parseInt(body.name_kb_search_limit)
      if (isNaN(val) || val < 1 || val > 100) {
        return NextResponse.json(
          { error: 'name_kb_search_limit must be between 1 and 100' },
          { status: 400 }
        )
      }
      body.name_kb_search_limit = val
    }
    if (body.name_max_length !== undefined) {
      const val = parseInt(body.name_max_length)
      if (isNaN(val) || val < 10 || val > 500) {
        return NextResponse.json(
          { error: 'name_max_length must be between 10 and 500' },
          { status: 400 }
        )
      }
      body.name_max_length = val
    }

    // Validate description enhancement fields
    if (body.description_temperature !== undefined) {
      const temp = parseFloat(body.description_temperature)
      if (isNaN(temp) || temp < 0 || temp > 2) {
        return NextResponse.json(
          { error: 'description_temperature must be between 0 and 2' },
          { status: 400 }
        )
      }
      body.description_temperature = temp
    }
    if (body.description_max_tokens !== undefined) {
      const tokens = parseInt(body.description_max_tokens)
      if (isNaN(tokens) || tokens < 50 || tokens > 4000) {
        return NextResponse.json(
          { error: 'description_max_tokens must be between 50 and 4000' },
          { status: 400 }
        )
      }
      body.description_max_tokens = tokens
    }
    if (body.description_kb_search_limit !== undefined) {
      const val = parseInt(body.description_kb_search_limit)
      if (isNaN(val) || val < 1 || val > 100) {
        return NextResponse.json(
          { error: 'description_kb_search_limit must be between 1 and 100' },
          { status: 400 }
        )
      }
      body.description_kb_search_limit = val
    }
    if (body.description_short_max_length !== undefined) {
      const val = parseInt(body.description_short_max_length)
      if (isNaN(val) || val < 50 || val > 500) {
        return NextResponse.json(
          { error: 'description_short_max_length must be between 50 and 500' },
          { status: 400 }
        )
      }
      body.description_short_max_length = val
    }
    if (body.description_long_max_length !== undefined) {
      const val = parseInt(body.description_long_max_length)
      if (isNaN(val) || val < 100 || val > 5000) {
        return NextResponse.json(
          { error: 'description_long_max_length must be between 100 and 5000' },
          { status: 400 }
        )
      }
      body.description_long_max_length = val
    }

    // Validate general settings
    if (body.auto_approve_threshold !== undefined) {
      const val = parseFloat(body.auto_approve_threshold)
      if (isNaN(val) || val < 0 || val > 1) {
        return NextResponse.json(
          { error: 'auto_approve_threshold must be between 0 and 1' },
          { status: 400 }
        )
      }
      body.auto_approve_threshold = val
    }

    // Update settings
    const updatedSettings = updateKBAISettings(body)

    return NextResponse.json({
      success: true,
      settings: updatedSettings
    })
  } catch (error: any) {
    console.error('Error updating KB AI settings:', error)
    return NextResponse.json(
      { error: `Failed to update settings: ${error.message}` },
      { status: 500 }
    )
  }
}

// POST is used for reset to defaults
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))

    if (body.action === 'reset') {
      const settings = resetKBAISettings()

      return NextResponse.json({
        success: true,
        message: 'Settings reset to defaults',
        settings
      })
    }

    return NextResponse.json(
      { error: 'Invalid action. Use { "action": "reset" } to reset settings.' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Error resetting KB AI settings:', error)
    return NextResponse.json(
      { error: `Failed to reset settings: ${error.message}` },
      { status: 500 }
    )
  }
}
