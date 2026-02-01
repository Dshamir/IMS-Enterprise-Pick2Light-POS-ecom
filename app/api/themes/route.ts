import { NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

export async function GET() {
  try {
    const themes = sqliteHelpers.getAllCustomThemes()

    return NextResponse.json({ themes })
  } catch (error: any) {
    console.error('Error fetching themes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch themes' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      theme_name,
      theme_slug,
      display_name,
      description,
      supports_light_variant,
      supports_dark_variant,
      light_colors,
      dark_colors,
      custom_css,
    } = body

    // Validation
    if (!theme_name || !theme_slug || !display_name) {
      return NextResponse.json(
        { error: 'Missing required fields: theme_name, theme_slug, display_name' },
        { status: 400 }
      )
    }

    // Validate slug format (lowercase, hyphens only)
    if (!/^[a-z0-9-]+$/.test(theme_slug)) {
      return NextResponse.json(
        { error: 'Theme slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      )
    }

    // Check if at least one variant is supported
    if (!supports_light_variant && !supports_dark_variant) {
      return NextResponse.json(
        { error: 'Theme must support at least one variant (light or dark)' },
        { status: 400 }
      )
    }

    // Create theme
    const id = sqliteHelpers.createCustomTheme({
      theme_name,
      theme_slug,
      display_name,
      description: description || null,
      supports_light_variant: supports_light_variant ? 1 : 0,
      supports_dark_variant: supports_dark_variant ? 1 : 0,
      light_colors,
      dark_colors,
      custom_css,
    })

    return NextResponse.json({
      success: true,
      id,
      message: 'Theme created successfully',
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error creating theme:', error)

    // Handle unique constraint violations
    if (error.message?.includes('UNIQUE constraint')) {
      return NextResponse.json(
        { error: 'A theme with this name or slug already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create theme' },
      { status: 500 }
    )
  }
}
