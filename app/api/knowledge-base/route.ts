/**
 * Knowledge Base API - Main endpoint
 *
 * GET: Returns KB statistics and recent items
 * POST: Creates a new KB item manually
 */

import { NextResponse } from 'next/server'
import {
  getKBStats,
  getRecentKBItems,
  createKBItem,
  type KBItemInput
} from '@/lib/knowledge-base/kb-database'

export async function GET() {
  try {
    const stats = getKBStats()
    const recentItems = getRecentKBItems(10)

    return NextResponse.json({
      stats,
      recentItems
    })
  } catch (error: any) {
    console.error('Error fetching KB stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Knowledge Base statistics' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.item_name) {
      return NextResponse.json(
        { error: 'item_name is required' },
        { status: 400 }
      )
    }

    const itemInput: KBItemInput = {
      source_type: 'manual',
      item_name: body.item_name,
      description: body.description,
      manufacturer: body.manufacturer,
      manufacturer_part_number: body.manufacturer_part_number,
      category: body.category,
      price_low: body.price_low,
      price_high: body.price_high,
      price_unit: body.price_unit,
      image_url: body.image_url,
      barcode: body.barcode,
      sku: body.sku,
      metadata: body.metadata
    }

    const item = createKBItem(itemInput)

    return NextResponse.json({
      success: true,
      item
    })
  } catch (error: any) {
    console.error('Error creating KB item:', error)
    return NextResponse.json(
      { error: 'Failed to create Knowledge Base item' },
      { status: 500 }
    )
  }
}
