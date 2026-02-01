"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Loader2,
  Eye,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  Check,
  X,
} from "lucide-react"
import {
  type ColumnConfig,
  type ColumnPreferences,
  getVisibleColumns,
  getColumnValue,
  formatColumnValue,
} from "@/lib/knowledge-base/column-config"

interface KBItem {
  id: string
  item_name: string
  description: string | null
  manufacturer: string | null
  manufacturer_part_number: string | null
  category: string | null
  price_low: number | null
  price_high: number | null
  price_unit?: string
  source_type: string
  source_filename: string | null
  source_id?: string | null
  has_embedding: number
  embedding_id?: string | null
  image_url?: string | null
  barcode?: string | null
  sku?: string | null
  metadata?: string | null
  created_at: string
  updated_at?: string
}

interface DynamicDataTableProps {
  items: KBItem[]
  preferences: ColumnPreferences
  dynamicColumns?: ColumnConfig[]
  isLoading?: boolean
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  onSort?: (column: string) => void
  onViewItem?: (item: KBItem) => void
  onDeleteItem?: (itemId: string) => void
}

export function DynamicDataTable({
  items,
  preferences,
  dynamicColumns = [],
  isLoading = false,
  sortColumn,
  sortDirection,
  onSort,
  onViewItem,
  onDeleteItem,
}: DynamicDataTableProps) {
  // Get visible columns based on preferences
  const allColumns = [
    ...getVisibleColumns(preferences),
    ...dynamicColumns.filter(dc =>
      preferences.visibleColumns.includes(dc.id)
    ),
  ]

  // Render cell value based on column format
  const renderCellValue = (item: KBItem, column: ColumnConfig) => {
    const value = getColumnValue(item, column.id)
    const priceUnit = (item as any).price_unit || 'USD'

    // Special rendering for certain formats
    switch (column.format) {
      case 'badge':
        if (!value) return <span className="text-muted-foreground">—</span>
        return (
          <Badge variant="outline" className="font-normal">
            {String(value)}
          </Badge>
        )

      case 'image':
        if (!value) return <span className="text-muted-foreground">—</span>
        return (
          <div className="w-10 h-10 relative rounded overflow-hidden bg-muted">
            <img
              src={value}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
                const parent = (e.target as HTMLImageElement).parentElement
                if (parent) {
                  parent.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>'
                }
              }}
            />
          </div>
        )

      case 'boolean':
        return value ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <X className="h-4 w-4 text-muted-foreground" />
        )

      case 'currency':
        // For price columns, show combined price if it's the low price and high exists
        if (column.id === 'price_low' && item.price_high) {
          const formattedLow = formatColumnValue(value, 'currency', priceUnit)
          const formattedHigh = formatColumnValue(item.price_high, 'currency', priceUnit)
          if (formattedLow !== '—' && formattedHigh !== '—' && value !== item.price_high) {
            return `${formattedLow} - ${formattedHigh}`
          }
        }
        return formatColumnValue(value, column.format, priceUnit)

      default:
        const formatted = formatColumnValue(value, column.format, priceUnit)
        // Truncate long text
        if (formatted.length > 50) {
          return (
            <span title={formatted}>
              {formatted.substring(0, 47)}...
            </span>
          )
        }
        return formatted
    }
  }

  // Render sort indicator
  const renderSortIndicator = (column: ColumnConfig) => {
    if (!column.sortable || !onSort) return null

    const isActive = sortColumn === column.id
    const Icon = isActive
      ? sortDirection === 'asc'
        ? ArrowUp
        : ArrowDown
      : ArrowUpDown

    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 ml-1"
        onClick={() => onSort(column.id)}
      >
        <Icon className={`h-3 w-3 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
      </Button>
    )
  }

  // Calculate column width style
  const getColumnStyle = (column: ColumnConfig) => {
    const style: React.CSSProperties = {}

    if (column.width) {
      style.width = column.width
      style.minWidth = column.width
    } else if (column.minWidth) {
      style.minWidth = column.minWidth
    }

    return style
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No items found
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {allColumns.map((column) => (
              <TableHead
                key={column.id}
                style={getColumnStyle(column)}
                className={column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''}
              >
                <div className="flex items-center">
                  {column.label}
                  {renderSortIndicator(column)}
                </div>
              </TableHead>
            ))}
            {(onViewItem || onDeleteItem) && (
              <TableHead className="w-[100px]">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              {allColumns.map((column) => (
                <TableCell
                  key={`${item.id}-${column.id}`}
                  style={getColumnStyle(column)}
                  className={`${
                    column.align === 'right'
                      ? 'text-right'
                      : column.align === 'center'
                      ? 'text-center'
                      : ''
                  } ${column.id === 'item_name' ? 'font-medium' : ''}`}
                >
                  {renderCellValue(item, column)}
                </TableCell>
              ))}
              {(onViewItem || onDeleteItem) && (
                <TableCell>
                  <div className="flex gap-1">
                    {onViewItem && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onViewItem(item)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {onDeleteItem && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onDeleteItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
