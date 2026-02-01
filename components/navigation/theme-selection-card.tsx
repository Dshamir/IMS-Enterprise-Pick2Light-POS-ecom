"use client"

import { Badge } from '@/components/ui/badge'
import { type CustomTheme } from '@/lib/theme-generator'

interface ThemeSelectionCardProps {
  theme: CustomTheme
  selected: boolean
  onSelect: () => void
}

export function ThemeSelectionCard({ theme, selected, onSelect }: ThemeSelectionCardProps) {
  const themeSource = theme.theme_source || 'created'

  // Badge colors based on source
  const getBadgeClass = () => {
    if (themeSource === 'system') return 'bg-blue-100 text-blue-700 border-blue-200'
    if (themeSource === 'created') return 'bg-purple-100 text-purple-700 border-purple-200'
    if (themeSource === 'imported') return 'bg-green-100 text-green-700 border-green-200'
    return 'bg-gray-100 text-gray-700'
  }

  const getBadgeText = () => {
    if (themeSource === 'system') return 'System'
    if (themeSource === 'created') return 'Created'
    if (themeSource === 'imported') return 'Imported'
    return ''
  }

  // Get variant support text
  const getVariantText = () => {
    const hasLight = theme.supports_light_variant === 1
    const hasDark = theme.supports_dark_variant === 1

    if (hasLight && hasDark) return 'Light/Dark'
    if (hasDark) return 'Dark Only'
    if (hasLight) return 'Light Only'
    return ''
  }

  // Extract preview color from JSON
  const getPreviewColor = (key: string): string => {
    try {
      if (theme.light_colors) {
        const colors = JSON.parse(theme.light_colors)
        const hsl = colors[key]
        if (hsl) return `hsl(${hsl})`
      }
    } catch (error) {
      console.error('Error parsing color:', error)
    }
    return '#999999'
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`border-2 rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${
        selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
      }`}
    >
      {/* Color Preview */}
      <div className="h-12 rounded mb-2 flex items-center justify-center gap-1 p-2" style={{
        background: getPreviewColor('background')
      }}>
        <div
          className="w-3 h-3 rounded-full border"
          style={{ backgroundColor: getPreviewColor('primary') }}
          title="Primary color"
        />
        <div
          className="w-3 h-3 rounded-full border"
          style={{ backgroundColor: getPreviewColor('accent') }}
          title="Accent color"
        />
      </div>

      {/* Theme Info */}
      <p className="text-xs font-medium text-center truncate">{theme.display_name}</p>
      <p className="text-xs text-muted-foreground text-center">{getVariantText()}</p>

      {/* Badge */}
      {getBadgeText() && (
        <Badge variant="outline" className={`text-xs mt-1 w-full justify-center border ${getBadgeClass()}`}>
          {getBadgeText()}
        </Badge>
      )}
    </button>
  )
}
