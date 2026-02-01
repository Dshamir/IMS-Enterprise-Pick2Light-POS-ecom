"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ThemeEditorDialog } from './theme-editor-dialog'
import { ImportThemeDialog } from './import-theme-dialog'
import { type CustomTheme } from '@/lib/theme-generator'
import { toast } from 'sonner'
import {
  Plus, Search, Edit, Copy, Trash2, Eye, Palette,
  RefreshCw, CheckCircle2, Circle, Upload, Download
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function ThemeManager() {
  const [themes, setThemes] = useState<CustomTheme[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [editingTheme, setEditingTheme] = useState<CustomTheme | null>(null)
  const [deleteTheme, setDeleteTheme] = useState<CustomTheme | null>(null)

  useEffect(() => {
    loadThemes()
  }, [])

  const loadThemes = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/themes')
      if (response.ok) {
        const data = await response.json()
        setThemes(data.themes || [])
      } else {
        toast.error('Failed to load themes')
      }
    } catch (error) {
      console.error('Error loading themes:', error)
      toast.error('Failed to load themes')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = () => {
    setEditingTheme(null)
    setDialogOpen(true)
  }

  const handleEdit = (theme: CustomTheme) => {
    setEditingTheme(theme)
    setDialogOpen(true)
  }

  const handleDuplicate = async (theme: CustomTheme) => {
    try {
      const response = await fetch('/api/themes/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme_id: theme.id }),
      })

      if (response.ok) {
        toast.success(`Theme "${theme.display_name}" duplicated successfully`)
        loadThemes()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to duplicate theme')
      }
    } catch (error) {
      console.error('Error duplicating theme:', error)
      toast.error('Failed to duplicate theme')
    }
  }

  const handleDelete = async (theme: CustomTheme) => {
    if (theme.is_system_theme) {
      toast.error('Cannot delete system themes')
      return
    }

    setDeleteTheme(theme)
  }

  const confirmDelete = async () => {
    if (!deleteTheme) return

    try {
      const response = await fetch(`/api/themes/${deleteTheme.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success(`Theme "${deleteTheme.display_name}" deleted successfully`)
        loadThemes()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete theme')
      }
    } catch (error) {
      console.error('Error deleting theme:', error)
      toast.error('Failed to delete theme')
    } finally {
      setDeleteTheme(null)
    }
  }

  const filteredThemes = themes.filter(theme =>
    theme.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    theme.theme_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (theme.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const systemThemes = filteredThemes.filter(t => t.is_system_theme === 1)
  const customThemes = filteredThemes.filter(t => t.is_system_theme === 0 && (t as any).theme_source === 'created')
  const importedThemes = filteredThemes.filter(t => (t as any).theme_source === 'imported')

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex gap-2">
          <Button onClick={handleCreateNew} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New Theme
          </Button>
          <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import Theme
          </Button>
          <Button variant="outline" onClick={loadThemes}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search themes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Themes</p>
                <p className="text-2xl font-bold">{themes.length}</p>
              </div>
              <Palette className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">System Themes</p>
                <p className="text-2xl font-bold">{systemThemes.length}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Custom Themes</p>
                <p className="text-2xl font-bold">{customThemes.length}</p>
              </div>
              <Circle className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Imported Themes</p>
                <p className="text-2xl font-bold">{importedThemes.length}</p>
              </div>
              <Download className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Themes Section */}
      {systemThemes.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-500" />
              System Themes
            </h3>
            <p className="text-sm text-muted-foreground">Built-in themes (read-only)</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {systemThemes.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Custom Themes Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Circle className="h-5 w-5 text-purple-500" />
            Custom Themes
          </h3>
          <p className="text-sm text-muted-foreground">
            {customThemes.length > 0
              ? 'Your custom themes (fully editable)'
              : 'No custom themes yet. Click "Create New Theme" to get started!'}
          </p>
        </div>

        {customThemes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {customThemes.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Palette className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No custom themes yet</p>
              <Button onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Theme
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Imported Themes Section */}
      {importedThemes.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Download className="h-5 w-5 text-green-500" />
              Imported Themes
            </h3>
            <p className="text-sm text-muted-foreground">Themes imported from external files (fully editable)</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {importedThemes.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Theme Editor Dialog */}
      <ThemeEditorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        theme={editingTheme}
        onSuccess={loadThemes}
      />

      {/* Import Theme Dialog */}
      <ImportThemeDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={loadThemes}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTheme} onOpenChange={() => setDeleteTheme(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Theme</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTheme?.display_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete Theme
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Theme Card Component
function ThemeCard({
  theme,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  theme: CustomTheme
  onEdit: (theme: CustomTheme) => void
  onDuplicate: (theme: CustomTheme) => void
  onDelete: (theme: CustomTheme) => void
}) {
  const isSystem = theme.is_system_theme === 1
  const themeSource = (theme as any).theme_source || 'created'

  // Badge colors based on source
  const getBadgeClass = () => {
    if (themeSource === 'system') return 'bg-blue-100 text-blue-700 border-blue-200'
    if (themeSource === 'created') return 'bg-purple-100 text-purple-700 border-purple-200'
    if (themeSource === 'imported') return 'bg-green-100 text-green-700 border-green-200'
    return 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const getBadgeText = () => {
    if (themeSource === 'system') return 'System'
    if (themeSource === 'created') return 'Created'
    if (themeSource === 'imported') return 'Imported'
    return 'Unknown'
  }

  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              {theme.display_name}
              <Badge variant="outline" className={`text-xs border ${getBadgeClass()}`}>
                {getBadgeText()}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {theme.description || 'No description'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Variant Indicators */}
        <div className="flex gap-2">
          {theme.supports_light_variant === 1 && (
            <Badge variant="outline" className="text-xs">
              Light
            </Badge>
          )}
          {theme.supports_dark_variant === 1 && (
            <Badge variant="outline" className="text-xs">
              Dark
            </Badge>
          )}
        </div>

        {/* Color Preview Dots */}
        <div className="flex gap-1 flex-wrap">
          {theme.light_colors && (
            <div
              className="w-6 h-6 rounded-full border-2"
              style={{ backgroundColor: getPreviewColor(theme.light_colors, 'primary') }}
              title="Primary color"
            />
          )}
          {theme.light_colors && (
            <div
              className="w-6 h-6 rounded-full border-2"
              style={{ backgroundColor: getPreviewColor(theme.light_colors, 'accent') }}
              title="Accent color"
            />
          )}
          {theme.light_colors && (
            <div
              className="w-6 h-6 rounded-full border-2"
              style={{ backgroundColor: getPreviewColor(theme.light_colors, 'secondary') }}
              title="Secondary color"
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(theme)}
            className="flex-1"
          >
            <Eye className="h-3 w-3 mr-1" />
            {isSystem ? 'View' : 'Edit'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onDuplicate(theme)}
          >
            <Copy className="h-3 w-3" />
          </Button>

          {!isSystem && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(theme)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Helper to extract preview color from JSON
function getPreviewColor(colorsJson: string, key: string): string {
  try {
    const colors = JSON.parse(colorsJson)
    const hsl = colors[key]
    if (hsl) {
      return `hsl(${hsl})`
    }
  } catch (error) {
    console.error('Error parsing color:', error)
  }
  return '#999999'
}
