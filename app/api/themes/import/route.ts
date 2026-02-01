import { NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'
import { parseThemeFile, convertImportedTheme } from '@/lib/theme-converter'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const themeName = formData.get('theme_name') as string
    const displayName = formData.get('display_name') as string
    const description = formData.get('description') as string || null

    // Validation
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!themeName || !displayName) {
      return NextResponse.json(
        { error: 'Theme name and display name are required' },
        { status: 400 }
      )
    }

    // Read file content
    const fileContent = await file.text()

    // Parse and detect format
    const { format, data } = await parseThemeFile(fileContent)

    if (format === 'unknown' || !data) {
      return NextResponse.json(
        { error: 'Unsupported theme file format' },
        { status: 400 }
      )
    }

    // Convert to our format
    const converted = convertImportedTheme(data, format)

    if (!converted) {
      return NextResponse.json(
        { error: 'Failed to convert theme format' },
        { status: 400 }
      )
    }

    // Create theme in database with theme_source = 'imported'
    const id = sqliteHelpers.createCustomTheme({
      theme_name: themeName,
      theme_slug: themeName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      display_name: displayName,
      description,
      supports_light_variant: 1, // Assume both variants unless specified
      supports_dark_variant: 1,
      light_colors: converted.light_colors,
      dark_colors: converted.dark_colors,
      theme_source: 'imported', // Mark as imported
    })

    return NextResponse.json({
      success: true,
      id,
      message: 'Theme imported successfully',
      format: format,
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error importing theme:', error)

    // Handle unique constraint violations
    if (error.message?.includes('UNIQUE constraint')) {
      return NextResponse.json(
        { error: 'A theme with this name already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to import theme' },
      { status: 500 }
    )
  }
}
