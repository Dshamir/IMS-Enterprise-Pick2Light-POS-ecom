"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ColorPicker } from './color-picker'
import { ThemePreview } from './theme-preview'
import { getDefaultThemeColors, type ThemeColors, type CustomTheme } from '@/lib/theme-generator'
import { toast } from 'sonner'
import { Palette, Eye } from 'lucide-react'

interface ThemeEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  theme?: CustomTheme | null
  onSuccess: () => void
}

export function ThemeEditorDialog({ open, onOpenChange, theme, onSuccess }: ThemeEditorDialogProps) {
  const [themeName, setThemeName] = useState('')
  const [themeSlug, setThemeSlug] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [supportsLight, setSupportsLight] = useState(true)
  const [supportsDark, setSupportsDark] = useState(true)
  const [lightColors, setLightColors] = useState<ThemeColors>(getDefaultThemeColors())
  const [darkColors, setDarkColors] = useState<ThemeColors>(getDefaultThemeColors())
  const [customCSS, setCustomCSS] = useState('')
  const [loading, setLoading] = useState(false)
  const [previewVariant, setPreviewVariant] = useState<'light' | 'dark'>('light')

  const isEdit = !!theme
  const isSystemTheme = theme?.is_system_theme === 1

  // Load theme data when editing
  useEffect(() => {
    if (theme) {
      setThemeName(theme.theme_name)
      setThemeSlug(theme.theme_slug)
      setDisplayName(theme.display_name)
      setDescription(theme.description || '')
      setSupportsLight(theme.supports_light_variant === 1)
      setSupportsDark(theme.supports_dark_variant === 1)
      setCustomCSS(theme.custom_css || '')

      // Parse color JSONs
      if (theme.light_colors) {
        try {
          setLightColors(JSON.parse(theme.light_colors))
        } catch (error) {
          console.error('Error parsing light_colors:', error)
        }
      }

      if (theme.dark_colors) {
        try {
          setDarkColors(JSON.parse(theme.dark_colors))
        } catch (error) {
          console.error('Error parsing dark_colors:', error)
        }
      }
    } else {
      // Reset for create mode
      setThemeName('')
      setThemeSlug('')
      setDisplayName('')
      setDescription('')
      setSupportsLight(true)
      setSupportsDark(true)
      setLightColors(getDefaultThemeColors())
      setDarkColors(getDefaultThemeColors())
      setCustomCSS('')
    }
  }, [theme, open])

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setThemeName(name)
    if (!isEdit) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      setThemeSlug(slug)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!themeName.trim()) {
      toast.error('Please enter a theme name')
      return
    }

    if (!themeSlug.trim()) {
      toast.error('Please enter a theme slug')
      return
    }

    if (!displayName.trim()) {
      toast.error('Please enter a display name')
      return
    }

    if (!supportsLight && !supportsDark) {
      toast.error('Theme must support at least one variant (light or dark)')
      return
    }

    setLoading(true)

    try {
      const body = {
        theme_name: themeName.trim(),
        theme_slug: themeSlug.trim(),
        display_name: displayName.trim(),
        description: description.trim() || null,
        supports_light_variant: supportsLight ? 1 : 0,
        supports_dark_variant: supportsDark ? 1 : 0,
        light_colors: supportsLight ? JSON.stringify(lightColors) : null,
        dark_colors: supportsDark ? JSON.stringify(darkColors) : null,
        custom_css: customCSS.trim() || null,
      }

      const url = isEdit ? `/api/themes/${theme.id}` : '/api/themes'
      const method = isEdit ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        toast.success(isEdit ? 'Theme updated successfully' : 'Theme created successfully')
        onOpenChange(false)
        onSuccess()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save theme')
      }
    } catch (error) {
      console.error('Error saving theme:', error)
      toast.error('Failed to save theme')
    } finally {
      setLoading(false)
    }
  }

  const updateLightColor = (key: keyof ThemeColors, value: string) => {
    setLightColors(prev => ({ ...prev, [key]: value }))
  }

  const updateDarkColor = (key: keyof ThemeColors, value: string) => {
    setDarkColors(prev => ({ ...prev, [key]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            {isEdit ? 'Edit Theme' : 'Create New Theme'}
            {isSystemTheme && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">System Theme</span>}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modify theme colors and configuration' : 'Create a custom color theme for your application'}
            {isSystemTheme && ' (View only - system themes cannot be modified)'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="theme-name">Theme Name *</Label>
              <Input
                id="theme-name"
                value={themeName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="My Custom Theme"
                required
                disabled={isSystemTheme}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme-slug">Theme Slug *</Label>
              <Input
                id="theme-slug"
                value={themeSlug}
                onChange={(e) => setThemeSlug(e.target.value)}
                placeholder="my-custom-theme"
                required
                disabled={isEdit || isSystemTheme}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">Used in CSS class names</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name *</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="My Custom Theme"
              required
              disabled={isSystemTheme}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe when to use this theme..."
              rows={2}
              disabled={isSystemTheme}
            />
          </div>

          {/* Variant Support */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="supports-light">Supports Light Variant</Label>
                <p className="text-xs text-muted-foreground">Enable light mode colors</p>
              </div>
              <Switch
                id="supports-light"
                checked={supportsLight}
                onCheckedChange={setSupportsLight}
                disabled={isSystemTheme}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="supports-dark">Supports Dark Variant</Label>
                <p className="text-xs text-muted-foreground">Enable dark mode colors</p>
              </div>
              <Switch
                id="supports-dark"
                checked={supportsDark}
                onCheckedChange={setSupportsDark}
                disabled={isSystemTheme}
              />
            </div>
          </div>

          {/* Color Configuration Tabs */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="h-5 w-5" />
              <h3 className="font-semibold">Color Configuration</h3>
            </div>

            <Tabs value={previewVariant} onValueChange={(v) => setPreviewVariant(v as 'light' | 'dark')}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="light" disabled={!supportsLight}>
                  Light Variant
                </TabsTrigger>
                <TabsTrigger value="dark" disabled={!supportsDark}>
                  Dark Variant
                </TabsTrigger>
                <TabsTrigger value="preview">
                  <Eye className="h-4 w-4 mr-2" />
                  Live Preview
                </TabsTrigger>
              </TabsList>

              {/* Light Variant Colors */}
              <TabsContent value="light" className="space-y-6 max-h-[400px] overflow-y-auto p-4">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm border-b pb-2">Background Colors</h4>
                  <ColorPicker
                    label="Background"
                    value={lightColors.background}
                    onChange={(v) => updateLightColor('background', v)}
                    description="Main page background"
                  />
                  <ColorPicker
                    label="Foreground"
                    value={lightColors.foreground}
                    onChange={(v) => updateLightColor('foreground', v)}
                    description="Main text color"
                  />
                  <ColorPicker
                    label="Card Background"
                    value={lightColors.card}
                    onChange={(v) => updateLightColor('card', v)}
                    description="Card/panel background"
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm border-b pb-2">Interactive Colors</h4>
                  <ColorPicker
                    label="Primary"
                    value={lightColors.primary}
                    onChange={(v) => updateLightColor('primary', v)}
                    description="Primary buttons and links"
                  />
                  <ColorPicker
                    label="Accent"
                    value={lightColors.accent}
                    onChange={(v) => updateLightColor('accent', v)}
                    description="Highlights and focus states"
                  />
                  <ColorPicker
                    label="Secondary"
                    value={lightColors.secondary}
                    onChange={(v) => updateLightColor('secondary', v)}
                    description="Secondary elements"
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm border-b pb-2">Form Elements</h4>
                  <ColorPicker
                    label="Border"
                    value={lightColors.border}
                    onChange={(v) => updateLightColor('border', v)}
                    description="Borders and dividers"
                  />
                  <ColorPicker
                    label="Input"
                    value={lightColors.input}
                    onChange={(v) => updateLightColor('input', v)}
                    description="Input field backgrounds"
                  />
                </div>
              </TabsContent>

              {/* Dark Variant Colors */}
              <TabsContent value="dark" className="space-y-6 max-h-[400px] overflow-y-auto p-4">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm border-b pb-2">Background Colors</h4>
                  <ColorPicker
                    label="Background"
                    value={darkColors.background}
                    onChange={(v) => updateDarkColor('background', v)}
                    description="Main page background (dark mode)"
                  />
                  <ColorPicker
                    label="Foreground"
                    value={darkColors.foreground}
                    onChange={(v) => updateDarkColor('foreground', v)}
                    description="Main text color (dark mode)"
                  />
                  <ColorPicker
                    label="Card Background"
                    value={darkColors.card}
                    onChange={(v) => updateDarkColor('card', v)}
                    description="Card/panel background (dark mode)"
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm border-b pb-2">Interactive Colors</h4>
                  <ColorPicker
                    label="Primary"
                    value={darkColors.primary}
                    onChange={(v) => updateDarkColor('primary', v)}
                    description="Primary buttons and links (dark mode)"
                  />
                  <ColorPicker
                    label="Accent"
                    value={darkColors.accent}
                    onChange={(v) => updateDarkColor('accent', v)}
                    description="Highlights and focus states (dark mode)"
                  />
                  <ColorPicker
                    label="Secondary"
                    value={darkColors.secondary}
                    onChange={(v) => updateDarkColor('secondary', v)}
                    description="Secondary elements (dark mode)"
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm border-b pb-2">Form Elements</h4>
                  <ColorPicker
                    label="Border"
                    value={darkColors.border}
                    onChange={(v) => updateDarkColor('border', v)}
                    description="Borders and dividers (dark mode)"
                  />
                  <ColorPicker
                    label="Input"
                    value={darkColors.input}
                    onChange={(v) => updateDarkColor('input', v)}
                    description="Input field backgrounds (dark mode)"
                  />
                </div>
              </TabsContent>

              {/* Live Preview */}
              <TabsContent value="preview" className="p-4">
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={previewVariant === 'light' ? 'default' : 'outline'}
                      onClick={() => setPreviewVariant('light')}
                      disabled={!supportsLight}
                    >
                      Preview Light
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={previewVariant === 'dark' ? 'default' : 'outline'}
                      onClick={() => setPreviewVariant('dark')}
                      disabled={!supportsDark}
                    >
                      Preview Dark
                    </Button>
                  </div>

                  <ThemePreview themeSlug={themeSlug || 'standard'} variant={previewVariant} />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Advanced: Custom CSS */}
          {!isSystemTheme && (
            <div className="space-y-2">
              <Label htmlFor="custom-css">Custom CSS (Advanced)</Label>
              <Textarea
                id="custom-css"
                value={customCSS}
                onChange={(e) => setCustomCSS(e.target.value)}
                placeholder="/* Add custom CSS classes for advanced styling */\n.theme-my-custom .special-class {\n  /* ... */\n}"
                rows={4}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Optional: Add custom CSS classes for advanced theme-specific styling
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            {!isSystemTheme && (
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : isEdit ? 'Update Theme' : 'Create Theme'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
