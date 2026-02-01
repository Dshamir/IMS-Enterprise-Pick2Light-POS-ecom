import { NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

export async function GET() {
  try {
    const items = sqliteHelpers.getAllNavigationItems()

    // Transform database format to hierarchical structure
    const topLevelItems = items.filter((item: any) => !item.parent_id)
    const itemsWithChildren = topLevelItems.map((item: any) => {
      const children = items.filter((child: any) => child.parent_id === item.id)
      return {
        ...item,
        subRoutes: children.length > 0 ? children : undefined
      }
    })

    return NextResponse.json({ items: itemsWithChildren })
  } catch (error: any) {
    console.error('Error fetching navigation items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch navigation items' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, href, icon_name, parent_id, display_order, is_visible, is_group, badge_key, highlight, theme, theme_variant } = body

    // Validate required fields
    if (!name || !icon_name) {
      return NextResponse.json(
        { error: 'Missing required fields: name, icon_name' },
        { status: 400 }
      )
    }

    // If not a group, href is required
    if (!is_group && !href) {
      return NextResponse.json(
        { error: 'Non-group items must have an href' },
        { status: 400 }
      )
    }

    // Validate theme if provided (check against database)
    if (theme) {
      const themeExists = sqliteHelpers.getCustomThemeBySlug(theme)
      if (!themeExists) {
        return NextResponse.json(
          { error: `Invalid theme. Theme '${theme}' does not exist` },
          { status: 400 }
        )
      }
    }

    // Validate theme_variant if provided
    const validVariants = ['light', 'dark', 'auto']
    if (theme_variant && !validVariants.includes(theme_variant)) {
      return NextResponse.json(
        { error: `Invalid theme variant. Must be one of: ${validVariants.join(', ')}` },
        { status: 400 }
      )
    }

    const id = sqliteHelpers.createNavigationItem({
      name,
      href,
      icon_name,
      parent_id: parent_id || null,
      display_order: display_order ?? 0,
      is_visible: is_visible ?? 1,
      is_group: is_group ?? 0,
      badge_key: badge_key || null,
      highlight: highlight ?? 0,
      theme: theme || 'standard',
      theme_variant: theme_variant || 'light'
    })

    return NextResponse.json({
      success: true,
      id,
      message: 'Navigation item created successfully'
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error creating navigation item:', error)
    return NextResponse.json(
      { error: 'Failed to create navigation item' },
      { status: 500 }
    )
  }
}
