/**
 * Knowledge Base Single Item API
 *
 * GET: Get a single KB item by ID
 * PUT: Update a KB item
 * DELETE: Delete a KB item
 */

import { NextResponse } from 'next/server'
import {
  getKBItem,
  updateKBItem,
  deleteKBItem
} from '@/lib/knowledge-base/kb-database'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const item = getKBItem(id)

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ item })
  } catch (error: any) {
    console.error('Error fetching KB item:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Knowledge Base item' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = getKBItem(id)
    if (!existing) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    const updated = updateKBItem(id, {
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
    })

    return NextResponse.json({
      success: true,
      item: updated
    })
  } catch (error: any) {
    console.error('Error updating KB item:', error)
    return NextResponse.json(
      { error: 'Failed to update Knowledge Base item' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const deleted = deleteKBItem(id)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true
    })
  } catch (error: any) {
    console.error('Error deleting KB item:', error)
    return NextResponse.json(
      { error: 'Failed to delete Knowledge Base item' },
      { status: 500 }
    )
  }
}
