"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { ThemeSelectionCard } from './theme-selection-card'
import { type CustomTheme } from '@/lib/theme-generator'

interface NavigationItem {
  id: string
  name: string
  href?: string | null
  icon_name: string
  parent_id?: string | null
  display_order: number
  is_visible: number
  is_group: number
  badge_key?: string | null
  highlight?: number
  theme?: string | null
  theme_variant?: string | null
}

interface NavigationItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: NavigationItem | null
  groups?: NavigationItem[]
  onSuccess: () => void
  initialIsGroup?: boolean
}

// Popular Lucide icons for navigation
const POPULAR_ICONS = [
  'Home', 'LayoutDashboard', 'Package', 'ShoppingCart', 'Users',
  'Settings', 'AlertTriangle', 'BarChart3', 'Barcode', 'Bot',
  'Wrench', 'Image', 'Factory', 'Hash', 'Search', 'Zap',
  'BookOpen', 'Network', 'Database', 'Shield', 'Bell',
  'FileText', 'Folder', 'FolderOpen', 'FolderPlus', 'File',
  'Link', 'Mail', 'Phone', 'Calendar', 'Clock',
]

export function NavigationItemDialog({
  open,
  onOpenChange,
  item,
  groups = [],
  onSuccess,
  initialIsGroup = false,
}: NavigationItemDialogProps) {
  const [name, setName] = useState('')
  const [href, setHref] = useState('')
  const [iconName, setIconName] = useState('Link')
  const [parentId, setParentId] = useState<string>('none')
  const [isVisible, setIsVisible] = useState(true)
  const [isGroup, setIsGroup] = useState(false)
  const [badgeKey, setBadgeKey] = useState('')
  const [highlight, setHighlight] = useState(false)
  const [theme, setTheme] = useState<string>('standard')
  const [themeVariant, setThemeVariant] = useState<string>('light')
  const [loading, setLoading] = useState(false)
  const [availableThemes, setAvailableThemes] = useState<CustomTheme[]>([])

  const isEdit = !!item

  // Fetch available themes when dialog opens
  useEffect(() => {
    async function fetchThemes() {
      try {
        const response = await fetch('/api/themes')
        if (response.ok) {
          const data = await response.json()
          setAvailableThemes(data.themes || [])
        }
      } catch (error) {
        console.error('Error fetching themes:', error)
      }
    }

    if (open) {
      fetchThemes()
    }
  }, [open])

  // Load item data when editing
  useEffect(() => {
    if (item) {
      setName(item.name)
      setHref(item.href || '')
      setIconName(item.icon_name)
      setParentId(item.parent_id || 'none')
      setIsVisible(item.is_visible === 1)
      setIsGroup(item.is_group === 1)
      setBadgeKey(item.badge_key || '')
      setHighlight(item.highlight === 1)
      setTheme(item.theme || 'standard')
      setThemeVariant(item.theme_variant || 'light')
    } else {
      // Reset form for create mode
      setName('')
      setHref('')
      setIconName('Link')
      setParentId('none')
      setIsVisible(true)
      setIsGroup(initialIsGroup)
      setBadgeKey('')
      setHighlight(false)
      setTheme('standard')
      setThemeVariant('light')
    }
  }, [item, open, initialIsGroup])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validation
    if (!name.trim()) {
      toast.error('Please enter a name')
      return
    }

    if (!isGroup && !href.trim()) {
      toast.error('Non-group items must have a URL path')
      return
    }

    if (!iconName) {
      toast.error('Please select an icon')
      return
    }

    setLoading(true)

    try {
      const body = {
        name: name.trim(),
        href: isGroup ? null : href.trim(),
        icon_name: iconName,
        parent_id: parentId === 'none' ? null : parentId,
        is_visible: isVisible ? 1 : 0,
        is_group: isGroup ? 1 : 0,
        badge_key: badgeKey.trim() || null,
        highlight: highlight ? 1 : 0,
        theme: theme || 'standard',
        theme_variant: themeVariant || 'light',
      }

      const url = isEdit ? `/api/navigation/${item.id}` : '/api/navigation'
      const method = isEdit ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        toast.success(isEdit ? 'Navigation item updated' : 'Navigation item created')
        onOpenChange(false)
        onSuccess()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save navigation item')
      }
    } catch (error) {
      console.error('Error saving navigation item:', error)
      toast.error('Failed to save navigation item')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Navigation Item' : 'Create Navigation Item'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the navigation item details.' : 'Add a new link or group to your navigation menu.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Dashboard"
              required
            />
          </div>

          {/* Is Group Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is-group">This is a group</Label>
              <div className="text-xs text-muted-foreground">
                Groups can contain sub-items
              </div>
            </div>
            <Switch
              id="is-group"
              checked={isGroup}
              onCheckedChange={setIsGroup}
            />
          </div>

          {/* Href (only if not a group) */}
          {!isGroup && (
            <div className="space-y-2">
              <Label htmlFor="href">URL Path *</Label>
              <Input
                id="href"
                value={href}
                onChange={(e) => setHref(e.target.value)}
                placeholder="/dashboard"
                required
              />
              <p className="text-xs text-muted-foreground">
                The route path this item links to
              </p>
            </div>
          )}

          {/* Icon Selection */}
          <div className="space-y-2">
            <Label htmlFor="icon">Icon *</Label>
            <Select value={iconName} onValueChange={setIconName}>
              <SelectTrigger id="icon">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {POPULAR_ICONS.map((icon) => (
                  <SelectItem key={icon} value={icon}>
                    {icon}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Parent Group */}
          <div className="space-y-2">
            <Label htmlFor="parent">Parent Group</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger id="parent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Top Level)</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Badge Key */}
          <div className="space-y-2">
            <Label htmlFor="badge">Badge Key</Label>
            <Input
              id="badge"
              value={badgeKey}
              onChange={(e) => setBadgeKey(e.target.value)}
              placeholder="e.g., lowStockCount"
            />
            <p className="text-xs text-muted-foreground">
              Optional: Key for dynamic badges (e.g., notification counts)
            </p>
          </div>

          {/* Visible Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="visible">Visible in navigation</Label>
              <div className="text-xs text-muted-foreground">
                Show this item in the sidebar
              </div>
            </div>
            <Switch
              id="visible"
              checked={isVisible}
              onCheckedChange={setIsVisible}
            />
          </div>

          {/* Highlight Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="highlight">Highlight</Label>
              <div className="text-xs text-muted-foreground">
                Apply highlight styling
              </div>
            </div>
            <Switch
              id="highlight"
              checked={highlight}
              onCheckedChange={setHighlight}
            />
          </div>

          {/* Theme Selection */}
          <div className="space-y-3 pt-4 border-t">
            <div>
              <Label>Page Theme</Label>
              <div className="text-xs text-muted-foreground mt-1">
                Select the color theme for this page ({availableThemes.length} available)
              </div>
            </div>

            {/* Dynamic Theme Preview Cards */}
            <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
              {availableThemes.map((themeData) => (
                <ThemeSelectionCard
                  key={themeData.theme_slug}
                  theme={themeData}
                  selected={theme === themeData.theme_slug}
                  onSelect={() => {
                    setTheme(themeData.theme_slug)
                    // Auto-set variant if theme only supports dark
                    if (themeData.supports_light_variant === 0 && themeData.supports_dark_variant === 1) {
                      setThemeVariant('dark')
                    }
                  }}
                />
              ))}
            </div>

            {/* Theme Variant Selector (conditional) */}
            {(() => {
              const selectedTheme = availableThemes.find(t => t.theme_slug === theme)
              const supportsLight = selectedTheme?.supports_light_variant === 1
              return supportsLight && (
                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="theme-variant">Theme Variant</Label>
                  <Select value={themeVariant} onValueChange={setThemeVariant}>
                    <SelectTrigger id="theme-variant" className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="auto">Auto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )
            })()}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
