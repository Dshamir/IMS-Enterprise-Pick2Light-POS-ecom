/**
 * Theme Generation Utilities
 * Converts theme JSON configurations to CSS strings and handles color conversions
 */

export interface ThemeColors {
  // Background colors
  background: string
  foreground: string
  card: string
  card_foreground: string
  popover: string
  popover_foreground: string

  // Interactive colors
  primary: string
  primary_foreground: string
  secondary: string
  secondary_foreground: string
  muted: string
  muted_foreground: string
  accent: string
  accent_foreground: string

  // Status colors
  destructive: string
  destructive_foreground: string

  // Form elements
  border: string
  input: string
  ring: string
  radius: string

  // Sidebar colors
  sidebar_background: string
  sidebar_foreground: string
  sidebar_primary: string
  sidebar_primary_foreground: string
  sidebar_accent: string
  sidebar_accent_foreground: string
  sidebar_border: string
  sidebar_ring: string
}

export interface CustomTheme {
  id: string
  theme_name: string
  theme_slug: string
  display_name: string
  description?: string
  supports_light_variant: number
  supports_dark_variant: number
  is_system_theme: number
  is_active: number
  theme_source?: string // 'system', 'created', 'imported'
  light_colors: string // JSON
  dark_colors?: string | null // JSON
  custom_css?: string | null
}

/**
 * Generate CSS class string from theme configuration
 */
export function generateThemeCSS(theme: CustomTheme): string {
  const { theme_slug, light_colors, dark_colors, custom_css } = theme

  let css = ''

  // Generate light variant CSS
  if (light_colors) {
    try {
      const colors: ThemeColors = JSON.parse(light_colors)
      css += `.theme-${theme_slug} {\n`
      css += generateCSSVariables(colors)
      css += '}\n\n'
    } catch (error) {
      console.error(`Error parsing light_colors for theme ${theme_slug}:`, error)
    }
  }

  // Generate dark variant CSS
  if (dark_colors) {
    try {
      const colors: ThemeColors = JSON.parse(dark_colors)
      css += `.theme-${theme_slug}.dark {\n`
      css += generateCSSVariables(colors)
      css += '}\n\n'
    } catch (error) {
      console.error(`Error parsing dark_colors for theme ${theme_slug}:`, error)
    }
  }

  // Add custom CSS if provided
  if (custom_css) {
    css += `/* Custom CSS for ${theme_slug} */\n`
    css += custom_css + '\n\n'
  }

  return css
}

/**
 * Generate CSS variable declarations from color object
 */
function generateCSSVariables(colors: ThemeColors): string {
  let css = ''

  // Convert object keys to CSS variable format
  Object.entries(colors).forEach(([key, value]) => {
    const cssVarName = `--${key.replace(/_/g, '-')}`
    css += `  ${cssVarName}: ${value};\n`
  })

  return css
}

/**
 * Validate that theme has all required color variables
 */
export function validateThemeColors(colorsJson: string): { valid: boolean; missing: string[] } {
  const requiredFields = [
    'background', 'foreground', 'card', 'card_foreground',
    'primary', 'primary_foreground', 'accent', 'accent_foreground',
    'border', 'input', 'ring'
  ]

  try {
    const colors = JSON.parse(colorsJson)
    const missing = requiredFields.filter(field => !colors[field])

    return {
      valid: missing.length === 0,
      missing
    }
  } catch (error) {
    return {
      valid: false,
      missing: ['Invalid JSON format']
    }
  }
}

/**
 * Convert HEX color to HSL format for CSS variables
 * Example: #FF6B9D → "340 91% 71%"
 */
export function hexToHSL(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '')

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  h = Math.round(h * 360)
  s = Math.round(s * 100)
  const lPercent = Math.round(l * 100)

  return `${h} ${s}% ${lPercent}%`
}

/**
 * Convert HSL format to HEX color
 * Example: "340 91% 71%" → "#FF6B9D"
 */
export function hslToHex(hsl: string): string {
  // Parse HSL string
  const parts = hsl.split(/\s+/)
  const h = parseInt(parts[0]) / 360
  const s = parseInt(parts[1]) / 100
  const l = parseInt(parts[2]) / 100

  let r, g, b

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q

    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

/**
 * Get default theme colors structure
 */
export function getDefaultThemeColors(): ThemeColors {
  return {
    background: '0 0% 100%',
    foreground: '0 0% 3.9%',
    card: '0 0% 100%',
    card_foreground: '0 0% 3.9%',
    popover: '0 0% 100%',
    popover_foreground: '0 0% 3.9%',
    primary: '0 0% 9%',
    primary_foreground: '0 0% 98%',
    secondary: '0 0% 96.1%',
    secondary_foreground: '0 0% 9%',
    muted: '0 0% 96.1%',
    muted_foreground: '0 0% 45.1%',
    accent: '0 0% 96.1%',
    accent_foreground: '0 0% 9%',
    destructive: '0 84.2% 60.2%',
    destructive_foreground: '0 0% 98%',
    border: '0 0% 89.8%',
    input: '0 0% 89.8%',
    ring: '0 0% 3.9%',
    radius: '0.5rem',
    sidebar_background: '0 0% 98%',
    sidebar_foreground: '240 5.3% 26.1%',
    sidebar_primary: '240 5.9% 10%',
    sidebar_primary_foreground: '0 0% 98%',
    sidebar_accent: '240 4.8% 95.9%',
    sidebar_accent_foreground: '240 5.9% 10%',
    sidebar_border: '220 13% 91%',
    sidebar_ring: '217.2 91.2% 59.8%'
  }
}

/**
 * Inject custom theme CSS into the document
 */
export function injectThemeCSS(css: string, themeId: string) {
  // Remove existing custom theme style tag if present
  const existingStyle = document.getElementById(`custom-theme-${themeId}`)
  if (existingStyle) {
    existingStyle.remove()
  }

  // Create new style tag
  const styleTag = document.createElement('style')
  styleTag.id = `custom-theme-${themeId}`
  styleTag.innerHTML = css
  document.head.appendChild(styleTag)
}

/**
 * Remove custom theme CSS from document
 */
export function removeThemeCSS(themeId: string) {
  const styleTag = document.getElementById(`custom-theme-${themeId}`)
  if (styleTag) {
    styleTag.remove()
  }
}
