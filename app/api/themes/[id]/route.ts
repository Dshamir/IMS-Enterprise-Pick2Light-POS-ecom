import { NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const theme = sqliteHelpers.getCustomThemeById(id)

    if (!theme) {
      return NextResponse.json(
        { error: 'Theme not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(theme)
  } catch (error: any) {
    console.error('Error fetching theme:', error)
    return NextResponse.json(
      { error: 'Failed to fetch theme' },
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

    // Check if theme exists
    const existingTheme = sqliteHelpers.getCustomThemeById(id)
    if (!existingTheme) {
      return NextResponse.json(
        { error: 'Theme not found' },
        { status: 404 }
      )
    }

    // Prevent editing system themes
    if (existingTheme.is_system_theme === 1) {
      return NextResponse.json(
        { error: 'Cannot edit system themes' },
        { status: 403 }
      )
    }

    // Prepare updates
    const updates: Record<string, any> = {}
    const allowedFields = [
      'theme_name', 'display_name', 'description',
      'supports_light_variant', 'supports_dark_variant',
      'light_colors', 'dark_colors', 'custom_css', 'is_active'
    ]

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

    const result = sqliteHelpers.updateCustomTheme(id, updates)

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Failed to update theme' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Theme updated successfully',
    })

  } catch (error: any) {
    console.error('Error updating theme:', error)
    return NextResponse.json(
      { error: 'Failed to update theme' },
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

    // Check if theme exists
    const existingTheme = sqliteHelpers.getCustomThemeById(id)
    if (!existingTheme) {
      return NextResponse.json(
        { error: 'Theme not found' },
        { status: 404 }
      )
    }

    // Prevent deleting system themes
    if (existingTheme.is_system_theme === 1) {
      return NextResponse.json(
        { error: 'Cannot delete system themes' },
        { status: 403 }
      )
    }

    const result = sqliteHelpers.deleteCustomTheme(id)

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Failed to delete theme' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Theme deleted successfully',
    })

  } catch (error: any) {
    console.error('Error deleting theme:', error)
    return NextResponse.json(
      { error: 'Failed to delete theme' },
      { status: 500 }
    )
  }
}
