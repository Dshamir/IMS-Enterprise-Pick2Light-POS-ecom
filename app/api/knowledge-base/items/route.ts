/**
 * Knowledge Base Items API
 *
 * GET: List and search KB items with pagination and filters
 * DELETE: Bulk delete items
 */

import { NextResponse } from 'next/server'
import {
  searchKBItems,
  deleteKBItemsBatch,
  type KBSearchFilters
} from '@/lib/knowledge-base/kb-database'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const filters: KBSearchFilters = {
      query: searchParams.get('query') || undefined,
      category: searchParams.get('category') || undefined,
      source_type: searchParams.get('source_type') || undefined,
      has_price: searchParams.get('has_price') === 'true' ? true :
                 searchParams.get('has_price') === 'false' ? false : undefined,
      has_embedding: searchParams.get('has_embedding') === 'true' ? true :
                     searchParams.get('has_embedding') === 'false' ? false : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    }

    const { items, total } = searchKBItems(filters)

    return NextResponse.json({
      items,
      total,
      limit: filters.limit,
      offset: filters.offset,
      hasMore: (filters.offset || 0) + items.length < total
    })
  } catch (error: any) {
    console.error('Error listing KB items:', error)
    return NextResponse.json(
      { error: 'Failed to list Knowledge Base items' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json()

    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json(
        { error: 'ids array is required' },
        { status: 400 }
      )
    }

    const deleted = deleteKBItemsBatch(body.ids)

    return NextResponse.json({
      success: true,
      deleted
    })
  } catch (error: any) {
    console.error('Error deleting KB items:', error)
    return NextResponse.json(
      { error: 'Failed to delete Knowledge Base items' },
      { status: 500 }
    )
  }
}
