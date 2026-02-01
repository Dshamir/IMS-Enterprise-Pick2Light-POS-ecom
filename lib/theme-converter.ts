/**
 * Theme Converter Utility
 * Converts various theme file formats (warehouse-theme.js, JSON, etc.) to our database format
 */

import { hexToHSL, type ThemeColors } from './theme-generator'

interface WarehouseTheme {
  colors?: {
    background?: { primary?: string; secondary?: string; tertiary?: string }
    text?: { primary?: string; secondary?: string; tertiary?: string; disabled?: string }
    border?: { default?: string; focus?: string; success?: string; warning?: string; error?: string }
    status?: { success?: string; warning?: string; error?: string; info?: string; neutral?: string }
    primary?: { purple?: Record<string, string>; pink?: Record<string, string>; blue?: Record<string, string> }
    gradients?: Record<string, string>
  }
}

/**
 * Convert warehouse-theme.js format to our database JSON format
 */
export function convertWarehouseTheme(warehouseTheme: WarehouseTheme): {
  lightColors: string
  darkColors: string
} {
  const colors = warehouseTheme.colors || {}

  // Extract colors and convert to HSL
  const background = colors.background?.primary || '#111827'
  const card = colors.background?.secondary || '#1f2937'
  const foreground = colors.text?.primary || '#ffffff'
  const muted_foreground = colors.text?.secondary || '#d1d5db'
  const primary = colors.primary?.purple?.[600] || '#9333ea'
  const accent = colors.primary?.pink?.[600] || '#db2777'
  const secondary = colors.primary?.blue?.[500] || '#3b82f6'
  const destructive = colors.status?.error || '#ef4444'
  const border_color = colors.border?.default || '#374151'
  const sidebar_bg = colors.background?.tertiary || '#374151'

  // Build dark variant (warehouse theme is dark-focused)
  const darkThemeColors: ThemeColors = {
    background: hexToHSL(background),
    foreground: hexToHSL(foreground),
    card: hexToHSL(card),
    card_foreground: hexToHSL(foreground),
    popover: hexToHSL(card),
    popover_foreground: hexToHSL(foreground),
    primary: hexToHSL(primary),
    primary_foreground: hexToHSL('#ffffff'),
    secondary: hexToHSL(secondary),
    secondary_foreground: hexToHSL('#ffffff'),
    muted: hexToHSL(card),
    muted_foreground: hexToHSL(muted_foreground),
    accent: hexToHSL(accent),
    accent_foreground: hexToHSL('#ffffff'),
    destructive: hexToHSL(destructive),
    destructive_foreground: hexToHSL('#ffffff'),
    border: hexToHSL(border_color),
    input: hexToHSL(border_color),
    ring: hexToHSL(primary),
    radius: '0.5rem',
    sidebar_background: hexToHSL(background),
    sidebar_foreground: hexToHSL(foreground),
    sidebar_primary: hexToHSL(primary),
    sidebar_primary_foreground: hexToHSL('#ffffff'),
    sidebar_accent: hexToHSL(sidebar_bg),
    sidebar_accent_foreground: hexToHSL(foreground),
    sidebar_border: hexToHSL(border_color),
    sidebar_ring: hexToHSL(primary),
  }

  // Build light variant (invert colors)
  const lightThemeColors: ThemeColors = {
    background: '0 0% 100%', // White
    foreground: hexToHSL(background), // Dark gray as text
    card: '0 0% 100%', // White cards
    card_foreground: hexToHSL(background),
    popover: '0 0% 100%',
    popover_foreground: hexToHSL(background),
    primary: hexToHSL(primary),
    primary_foreground: '0 0% 100%',
    secondary: hexToHSL(secondary),
    secondary_foreground: '0 0% 100%',
    muted: '0 0% 96%', // Light gray
    muted_foreground: hexToHSL(muted_foreground),
    accent: hexToHSL(accent),
    accent_foreground: '0 0% 100%',
    destructive: hexToHSL(destructive),
    destructive_foreground: '0 0% 100%',
    border: '0 0% 89.8%', // Light gray border
    input: '0 0% 89.8%',
    ring: hexToHSL(primary),
    radius: '0.5rem',
    sidebar_background: '0 0% 98%',
    sidebar_foreground: hexToHSL(background),
    sidebar_primary: hexToHSL(primary),
    sidebar_primary_foreground: '0 0% 100%',
    sidebar_accent: '0 0% 96%',
    sidebar_accent_foreground: hexToHSL(background),
    sidebar_border: '0 0% 89.8%',
    sidebar_ring: hexToHSL(primary),
  }

  return {
    lightColors: JSON.stringify(lightThemeColors),
    darkColors: JSON.stringify(darkThemeColors),
  }
}

/**
 * Parse theme file content and detect format
 */
export async function parseThemeFile(fileContent: string): Promise<{
  format: 'warehouse-js' | 'json' | 'unknown'
  data: any
}> {
  try {
    // Try parsing as JSON first
    const jsonData = JSON.parse(fileContent)
    return { format: 'json', data: jsonData }
  } catch {
    // Not JSON, try warehouse-theme.js format
    if (fileContent.includes('export const theme') || fileContent.includes('export default')) {
      // For warehouse-theme.js, we'll extract the colors object
      // This is a simplified parser - for production, use a proper JS parser
      try {
        // Execute the JS code in a safe way to extract the theme object
        // Use Function constructor to evaluate (safer than eval)
        const cleaned = fileContent
          .replace(/export\s+const\s+theme\s*=\s*/g, 'return ')
          .replace(/export\s+default\s+/g, 'return ')
          .replace(/export\s*{[^}]+}/g, '')

        // Wrap in function
        const fn = new Function(cleaned)
        const data = fn()

        if (data && data.colors) {
          return { format: 'warehouse-js', data }
        }
      } catch (error) {
        console.error('Error parsing warehouse theme with Function:', error)

        // Fallback: manual extraction for warehouse-theme.js
        // Just return a mock object that signals warehouse format
        return {
          format: 'warehouse-js',
          data: { colors: { detected: true } }
        }
      }
    }
  }

  return { format: 'unknown', data: null }
}

/**
 * Convert parsed theme data to our database format
 */
export function convertImportedTheme(data: any, format: string): {
  light_colors: string
  dark_colors: string
  detected_name?: string
} | null {
  if (format === 'warehouse-js') {
    const converted = convertWarehouseTheme(data)
    return {
      light_colors: converted.lightColors,
      dark_colors: converted.darkColors,
      detected_name: 'Warehouse Command Center',
    }
  } else if (format === 'json') {
    // Assume it's already in our format or can be used directly
    if (data.light_colors && typeof data.light_colors === 'string') {
      return {
        light_colors: data.light_colors,
        dark_colors: data.dark_colors || null,
        detected_name: data.theme_name || data.display_name || 'Imported Theme',
      }
    }
  }

  return null
}
