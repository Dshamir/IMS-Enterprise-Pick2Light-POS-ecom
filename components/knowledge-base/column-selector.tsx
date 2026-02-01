"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Columns3,
  RotateCcw,
  CheckSquare,
  Square,
  GripVertical,
} from "lucide-react"
import {
  type ColumnConfig,
  type ColumnPreferences,
  KB_ITEMS_ALL_COLUMNS,
  getDefaultColumnPreferences,
} from "@/lib/knowledge-base/column-config"

interface ColumnSelectorProps {
  preferences: ColumnPreferences
  onPreferencesChange: (preferences: ColumnPreferences) => void
  dynamicColumns?: ColumnConfig[]  // Additional columns from metadata
  disabled?: boolean
}

export function ColumnSelector({
  preferences,
  onPreferencesChange,
  dynamicColumns = [],
  disabled = false,
}: ColumnSelectorProps) {
  const [open, setOpen] = useState(false)
  const [localPrefs, setLocalPrefs] = useState<ColumnPreferences>(preferences)

  // Combine static and dynamic columns
  const allColumns = [...KB_ITEMS_ALL_COLUMNS, ...dynamicColumns]

  // Sync local state with props
  useEffect(() => {
    setLocalPrefs(preferences)
  }, [preferences])

  const handleColumnToggle = (columnId: string, checked: boolean) => {
    const newVisible = checked
      ? [...localPrefs.visibleColumns, columnId]
      : localPrefs.visibleColumns.filter(id => id !== columnId)

    const newPrefs = {
      ...localPrefs,
      visibleColumns: newVisible,
    }
    setLocalPrefs(newPrefs)
    onPreferencesChange(newPrefs)
  }

  const handleSelectAll = () => {
    const allIds = allColumns.map(col => col.id)
    const newPrefs = {
      ...localPrefs,
      visibleColumns: allIds,
    }
    setLocalPrefs(newPrefs)
    onPreferencesChange(newPrefs)
  }

  const handleDeselectAll = () => {
    // Keep at least the item_name column visible
    const newPrefs = {
      ...localPrefs,
      visibleColumns: ['item_name'],
    }
    setLocalPrefs(newPrefs)
    onPreferencesChange(newPrefs)
  }

  const handleResetToDefault = () => {
    const defaultPrefs = getDefaultColumnPreferences()
    setLocalPrefs(defaultPrefs)
    onPreferencesChange(defaultPrefs)
  }

  const visibleCount = localPrefs.visibleColumns.length
  const totalCount = allColumns.length

  // Group columns by category for better UX
  const columnGroups = [
    {
      label: 'Core Fields',
      columns: allColumns.filter(c =>
        ['item_name', 'description', 'manufacturer', 'manufacturer_part_number'].includes(c.id)
      ),
    },
    {
      label: 'Classification',
      columns: allColumns.filter(c =>
        ['category', 'barcode', 'sku'].includes(c.id)
      ),
    },
    {
      label: 'Pricing',
      columns: allColumns.filter(c =>
        ['price_low', 'price_high', 'price_unit'].includes(c.id)
      ),
    },
    {
      label: 'Media',
      columns: allColumns.filter(c =>
        ['image_url'].includes(c.id)
      ),
    },
    {
      label: 'Source',
      columns: allColumns.filter(c =>
        ['source_type', 'source_filename', 'source_id'].includes(c.id)
      ),
    },
    {
      label: 'AI/Embeddings',
      columns: allColumns.filter(c =>
        ['has_embedding', 'embedding_id'].includes(c.id)
      ),
    },
    {
      label: 'Timestamps',
      columns: allColumns.filter(c =>
        ['created_at', 'updated_at', 'id'].includes(c.id)
      ),
    },
    {
      label: 'Custom Fields',
      columns: allColumns.filter(c => c.id.startsWith('metadata.')),
    },
  ].filter(group => group.columns.length > 0)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="gap-2"
        >
          <Columns3 className="h-4 w-4" />
          Columns ({visibleCount}/{totalCount})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm">Visible Columns</h4>
            <span className="text-xs text-muted-foreground">
              {visibleCount} of {totalCount} selected
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-7"
              onClick={handleSelectAll}
            >
              <CheckSquare className="h-3 w-3 mr-1" />
              All
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-7"
              onClick={handleDeselectAll}
            >
              <Square className="h-3 w-3 mr-1" />
              None
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-7"
              onClick={handleResetToDefault}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          <div className="p-3 space-y-4">
            {columnGroups.map((group) => (
              <div key={group.label}>
                <h5 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                  {group.label}
                </h5>
                <div className="space-y-1">
                  {group.columns.map((column) => {
                    const isVisible = localPrefs.visibleColumns.includes(column.id)
                    const isRequired = column.id === 'item_name' // Always require item_name

                    return (
                      <div
                        key={column.id}
                        className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 transition-colors"
                      >
                        <GripVertical className="h-3 w-3 text-muted-foreground/50 cursor-grab" />
                        <Checkbox
                          id={`col-${column.id}`}
                          checked={isVisible}
                          disabled={isRequired}
                          onCheckedChange={(checked) =>
                            handleColumnToggle(column.id, checked as boolean)
                          }
                        />
                        <Label
                          htmlFor={`col-${column.id}`}
                          className="flex-1 text-sm cursor-pointer"
                          title={column.description}
                        >
                          {column.label}
                          {column.format && column.format !== 'text' && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({column.format})
                            </span>
                          )}
                        </Label>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-3 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground">
            Tip: Custom fields from imported data appear under &quot;Custom Fields&quot;
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
