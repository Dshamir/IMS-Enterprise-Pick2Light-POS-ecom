import { NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const item = sqliteHelpers.getNavigationItemById(id)

    if (!item) {
      return NextResponse.json(
        { error: 'Navigation item not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(item)
  } catch (error: any) {
    console.error('Error fetching navigation item:', error)
    return NextResponse.json(
      { error: 'Failed to fetch navigation item' },
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

    // Check if item exists
    const existingItem = sqliteHelpers.getNavigationItemById(id)
    if (!existingItem) {
      return NextResponse.json(
        { error: 'Navigation item not found' },
        { status: 404 }
      )
    }

    // Validate fields
    const allowedFields = [
      'name', 'href', 'icon_name', 'parent_id', 'display_order',
      'is_visible', 'is_group', 'badge_key', 'highlight', 'theme', 'theme_variant'
    ]

    const updates: Record<string, any> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Validate theme if being updated (check against database)
    if (updates.theme) {
      const themeExists = sqliteHelpers.getCustomThemeBySlug(updates.theme)
      if (!themeExists) {
        return NextResponse.json(
          { error: `Invalid theme. Theme '${updates.theme}' does not exist` },
          { status: 400 }
        )
      }
    }

    // Validate theme_variant if being updated
    const validVariants = ['light', 'dark', 'auto']
    if (updates.theme_variant && !validVariants.includes(updates.theme_variant)) {
      return NextResponse.json(
        { error: `Invalid theme variant. Must be one of: ${validVariants.join(', ')}` },
        { status: 400 }
      )
    }

    const result = sqliteHelpers.updateNavigationItem(id, updates)

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Failed to update navigation item' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Navigation item updated successfully'
    })

  } catch (error: any) {
    console.error('Error updating navigation item:', error)
    return NextResponse.json(
      { error: 'Failed to update navigation item' },
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

    // Check if item exists
    const existingItem = sqliteHelpers.getNavigationItemById(id)
    if (!existingItem) {
      return NextResponse.json(
        { error: 'Navigation item not found' },
        { status: 404 }
      )
    }

    // Check if it's a group with children
    const allItems = sqliteHelpers.getAllNavigationItems()
    const children = (allItems as any[]).filter((item: any) => item.parent_id === id)

    const result = sqliteHelpers.deleteNavigationItem(id)

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Failed to delete navigation item' },
        { status: 500 }
      )
    }

    const message = children.length > 0
      ? `Navigation item and ${children.length} child item(s) deleted successfully`
      : 'Navigation item deleted successfully'

    return NextResponse.json({
      success: true,
      message,
      childrenDeleted: children.length
    })

  } catch (error: any) {
    console.error('Error deleting navigation item:', error)
    return NextResponse.json(
      { error: 'Failed to delete navigation item' },
      { status: 500 }
    )
  }
}
