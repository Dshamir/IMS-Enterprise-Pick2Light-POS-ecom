import { NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { theme_id } = body

    if (!theme_id) {
      return NextResponse.json(
        { error: 'Missing required field: theme_id' },
        { status: 400 }
      )
    }

    // Get the theme to duplicate
    const originalTheme = sqliteHelpers.getCustomThemeById(theme_id)
    if (!originalTheme) {
      return NextResponse.json(
        { error: 'Theme not found' },
        { status: 404 }
      )
    }

    // Create a new theme with " (Copy)" appended
    const newName = `${originalTheme.theme_name} (Copy)`
    const newSlug = `${originalTheme.theme_slug}-copy-${Date.now()}`
    const newDisplayName = `${originalTheme.display_name} (Copy)`

    const newId = sqliteHelpers.createCustomTheme({
      theme_name: newName,
      theme_slug: newSlug,
      display_name: newDisplayName,
      description: originalTheme.description,
      supports_light_variant: originalTheme.supports_light_variant,
      supports_dark_variant: originalTheme.supports_dark_variant,
      light_colors: originalTheme.light_colors,
      dark_colors: originalTheme.dark_colors,
      custom_css: originalTheme.custom_css,
    })

    return NextResponse.json({
      success: true,
      id: newId,
      message: 'Theme duplicated successfully',
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error duplicating theme:', error)
    return NextResponse.json(
      { error: 'Failed to duplicate theme' },
      { status: 500 }
    )
  }
}
