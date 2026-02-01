"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  GripVertical,
  FolderPlus,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Home,
  Settings,
  Package,
  Link as LinkIcon,
} from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { NavigationItemDialog } from './navigation-item-dialog'
import { DraggableNavigationItem } from './draggable-navigation-item'

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
  subRoutes?: NavigationItem[]
}

export function NavigationEditor() {
  const [items, setItems] = useState<NavigationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<NavigationItem | null>(null)
  const [createAsGroup, setCreateAsGroup] = useState(false)

  // Map icon name to icon component
  const getIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName] || LinkIcon
    return IconComponent
  }

  // Get all groups for parent selection
  const groups = items.filter((item) => item.is_group === 1)

  useEffect(() => {
    loadNavigationItems()
  }, [])

  async function loadNavigationItems() {
    try {
      const response = await fetch('/api/navigation')
      const data = await response.json()
      setItems(data.items || [])
    } catch (error) {
      console.error('Failed to load navigation:', error)
      toast.error('Failed to load navigation items')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteItem(id: string, name: string) {
    try {
      const response = await fetch(`/api/navigation/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        loadNavigationItems()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete item')
      }
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error('Failed to delete navigation item')
    }
  }

  async function handleToggleVisibility(id: string, currentVisibility: number) {
    try {
      const response = await fetch(`/api/navigation/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_visible: currentVisibility ? 0 : 1 }),
      })

      if (response.ok) {
        toast.success('Visibility updated')
        loadNavigationItems()
      } else {
        toast.error('Failed to update visibility')
      }
    } catch (error) {
      console.error('Error updating visibility:', error)
      toast.error('Failed to update visibility')
    }
  }

  async function handleResetToDefault() {
    try {
      const response = await fetch('/api/navigation/reset', {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Navigation menu reset to default')
        loadNavigationItems()
      } else {
        toast.error('Failed to reset navigation menu')
      }
    } catch (error) {
      console.error('Error resetting navigation:', error)
      toast.error('Failed to reset navigation menu')
    }
  }

  function handleCreateLink() {
    setEditingItem(null)
    setCreateAsGroup(false)
    setDialogOpen(true)
  }

  function handleCreateGroup() {
    setEditingItem(null)
    setCreateAsGroup(true)
    setDialogOpen(true)
  }

  function handleEditItem(item: NavigationItem) {
    setEditingItem(item)
    setCreateAsGroup(false)
    setDialogOpen(true)
  }

  function handleDialogSuccess() {
    loadNavigationItems()
  }

  function handleMoveItem(dragIndex: number, hoverIndex: number) {
    const newItems = [...items]
    const dragItem = newItems[dragIndex]
    newItems.splice(dragIndex, 1)
    newItems.splice(hoverIndex, 0, dragItem)
    setItems(newItems)
  }

  async function handleSaveOrder() {
    try {
      // Update display_order for all items based on their current position
      const updates = items.map((item, index) => ({
        id: item.id,
        display_order: index,
      }))

      const response = await fetch('/api/navigation/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })

      if (response.ok) {
        toast.success('Navigation order saved')
        loadNavigationItems()
      } else {
        toast.error('Failed to save navigation order')
      }
    } catch (error) {
      console.error('Error saving navigation order:', error)
      toast.error('Failed to save navigation order')
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    )
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {items.length} navigation items
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCreateLink}>
              <Plus className="h-4 w-4 mr-2" />
              Create Link
            </Button>
            <Button variant="outline" size="sm" onClick={handleCreateGroup}>
              <FolderPlus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
            <Button variant="default" size="sm" onClick={handleSaveOrder}>
              Save Order
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Default
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset to Default Navigation</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will restore the original navigation menu structure.
                    All your custom changes will be lost. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetToDefault}>
                    Reset
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Navigation Items List */}
        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No navigation items found. Click "Reset to Default" to restore original navigation.
            </div>
          ) : (
            items.map((item, index) => (
              <DraggableNavigationItem
                key={item.id}
                item={item}
                index={index}
                getIcon={getIcon}
                onMove={handleMoveItem}
                onToggleVisibility={handleToggleVisibility}
                onEdit={handleEditItem}
                onDelete={handleDeleteItem}
              />
            ))
          )}
        </div>

        {/* Create/Edit Dialog */}
        <NavigationItemDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          item={editingItem}
          groups={groups}
          onSuccess={handleDialogSuccess}
          initialIsGroup={createAsGroup}
        />
      </div>
    </DndProvider>
  )
}
