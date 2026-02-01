"use client"

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { hexToHSL, hslToHex } from '@/lib/theme-generator'

interface ColorPickerProps {
  label: string
  value: string // HSL format: "0 0% 100%"
  onChange: (hsl: string) => void
  description?: string
}

export function ColorPicker({ label, value, onChange, description }: ColorPickerProps) {
  const [hexValue, setHexValue] = useState('')
  const [hslValue, setHslValue] = useState(value)

  // Convert HSL to HEX when value changes
  useEffect(() => {
    try {
      const hex = hslToHex(value)
      setHexValue(hex)
      setHslValue(value)
    } catch (error) {
      console.error('Error converting HSL to HEX:', error)
    }
  }, [value])

  // Handle HEX input change
  const handleHexChange = (newHex: string) => {
    setHexValue(newHex)

    // Convert HEX to HSL and notify parent
    try {
      if (newHex.match(/^#[0-9A-F]{6}$/i)) {
        const hsl = hexToHSL(newHex)
        setHslValue(hsl)
        onChange(hsl)
      }
    } catch (error) {
      console.error('Error converting HEX to HSL:', error)
    }
  }

  // Handle HSL input change
  const handleHSLChange = (newHsl: string) => {
    setHslValue(newHsl)
    onChange(newHsl)

    // Try to convert to HEX for color picker
    try {
      const hex = hslToHex(newHsl)
      setHexValue(hex)
    } catch (error) {
      console.error('Error converting HSL to HEX:', error)
    }
  }

  return (
    <div className="space-y-2">
      <div>
        <Label htmlFor={`color-${label}`}>{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Color swatch with native color picker */}
        <div className="relative">
          <input
            type="color"
            value={hexValue}
            onChange={(e) => handleHexChange(e.target.value)}
            className="w-12 h-10 rounded-md border-2 border-gray-300 cursor-pointer"
            style={{ backgroundColor: hexValue }}
          />
        </div>

        {/* HEX input */}
        <div className="flex-1">
          <Input
            id={`color-${label}`}
            value={hexValue}
            onChange={(e) => handleHexChange(e.target.value)}
            placeholder="#FFFFFF"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">HEX</p>
        </div>

        {/* HSL input */}
        <div className="flex-1">
          <Input
            value={hslValue}
            onChange={(e) => handleHSLChange(e.target.value)}
            placeholder="0 0% 100%"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">HSL</p>
        </div>
      </div>
    </div>
  )
}
