/**
 * Knowledge Base Column Configuration
 *
 * Defines all available columns for KB items display with configurable visibility,
 * formatting, and ordering. Supports dynamic metadata field extraction.
 */

export type ColumnFormat = 'text' | 'number' | 'currency' | 'date' | 'badge' | 'image' | 'boolean'

export interface ColumnConfig {
  id: string           // Field name: 'item_name', 'metadata.custom_field'
  label: string        // Display label: 'Item Name'
  visible: boolean     // Default visibility
  sortable: boolean    // Allow sorting
  format?: ColumnFormat
  width?: number       // Fixed width in pixels (optional)
  minWidth?: number    // Minimum width
  align?: 'left' | 'center' | 'right'
  description?: string // Tooltip description
}

export interface ColumnPreferences {
  visibleColumns: string[]  // Array of column IDs that are visible
  columnOrder: string[]     // Array of column IDs in display order
}

// All available columns for KB items
export const KB_ITEMS_ALL_COLUMNS: ColumnConfig[] = [
  // Core identification fields
  {
    id: 'item_name',
    label: 'Item Name',
    visible: true,
    sortable: true,
    minWidth: 200,
    description: 'Product or item name'
  },
  {
    id: 'description',
    label: 'Description',
    visible: false,
    sortable: false,
    minWidth: 200,
    description: 'Detailed item description'
  },

  // Manufacturer/Source fields
  {
    id: 'manufacturer',
    label: 'Manufacturer',
    visible: true,
    sortable: true,
    minWidth: 120,
    description: 'Manufacturer or brand name'
  },
  {
    id: 'manufacturer_part_number',
    label: 'Part #',
    visible: true,
    sortable: true,
    minWidth: 100,
    description: 'Manufacturer part number'
  },

  // Classification fields
  {
    id: 'category',
    label: 'Category',
    visible: true,
    sortable: true,
    format: 'badge',
    minWidth: 100,
    description: 'Product category'
  },
  {
    id: 'barcode',
    label: 'Barcode',
    visible: false,
    sortable: true,
    minWidth: 120,
    description: 'EAN/UPC barcode'
  },
  {
    id: 'sku',
    label: 'SKU',
    visible: false,
    sortable: true,
    minWidth: 100,
    description: 'Stock Keeping Unit'
  },

  // Pricing fields
  {
    id: 'price_low',
    label: 'Price Low',
    visible: false,
    sortable: true,
    format: 'currency',
    align: 'right',
    minWidth: 80,
    description: 'Minimum/cost price'
  },
  {
    id: 'price_high',
    label: 'Price High',
    visible: false,
    sortable: true,
    format: 'currency',
    align: 'right',
    minWidth: 80,
    description: 'Maximum/MSRP price'
  },
  {
    id: 'price_unit',
    label: 'Currency',
    visible: false,
    sortable: true,
    minWidth: 60,
    description: 'Price currency (USD, EUR, etc.)'
  },

  // Media
  {
    id: 'image_url',
    label: 'Image',
    visible: false,
    sortable: false,
    format: 'image',
    width: 60,
    align: 'center',
    description: 'Product image'
  },

  // Source tracking
  {
    id: 'source_type',
    label: 'Source Type',
    visible: true,
    sortable: true,
    format: 'badge',
    minWidth: 80,
    description: 'Import source type (xlsx, csv, api)'
  },
  {
    id: 'source_filename',
    label: 'Source File',
    visible: false,
    sortable: true,
    minWidth: 150,
    description: 'Original import filename'
  },

  // Embedding/AI status
  {
    id: 'has_embedding',
    label: 'Has Embedding',
    visible: false,
    sortable: true,
    format: 'boolean',
    align: 'center',
    width: 100,
    description: 'Vector embedding generated'
  },
  {
    id: 'embedding_id',
    label: 'Embedding ID',
    visible: false,
    sortable: false,
    minWidth: 120,
    description: 'ChromaDB embedding reference'
  },

  // Timestamps
  {
    id: 'created_at',
    label: 'Created',
    visible: false,
    sortable: true,
    format: 'date',
    minWidth: 140,
    description: 'Record creation date'
  },
  {
    id: 'updated_at',
    label: 'Updated',
    visible: false,
    sortable: true,
    format: 'date',
    minWidth: 140,
    description: 'Last modification date'
  },

  // Internal ID (usually hidden)
  {
    id: 'id',
    label: 'ID',
    visible: false,
    sortable: false,
    minWidth: 100,
    description: 'Internal record ID'
  },
  {
    id: 'source_id',
    label: 'Source ID',
    visible: false,
    sortable: false,
    minWidth: 100,
    description: 'Import batch ID'
  },
]

// Default visible columns (matches current hardcoded display)
export const KB_ITEMS_DEFAULT_VISIBLE: string[] = [
  'item_name',
  'manufacturer',
  'manufacturer_part_number',
  'category',
  'price_low',
  'price_high',
  'source_type',
]

// Default column order
export const KB_ITEMS_DEFAULT_ORDER: string[] = KB_ITEMS_ALL_COLUMNS.map(col => col.id)

// Storage key for localStorage
export const KB_COLUMN_PREFERENCES_KEY = 'kb_items_column_preferences'

/**
 * Get default column preferences
 */
export function getDefaultColumnPreferences(): ColumnPreferences {
  return {
    visibleColumns: KB_ITEMS_DEFAULT_VISIBLE,
    columnOrder: KB_ITEMS_DEFAULT_ORDER,
  }
}

/**
 * Load column preferences from localStorage
 */
export function loadColumnPreferences(): ColumnPreferences {
  if (typeof window === 'undefined') {
    return getDefaultColumnPreferences()
  }

  try {
    const stored = localStorage.getItem(KB_COLUMN_PREFERENCES_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as ColumnPreferences
      // Validate structure
      if (Array.isArray(parsed.visibleColumns) && Array.isArray(parsed.columnOrder)) {
        return parsed
      }
    }
  } catch (error) {
    console.warn('Failed to load column preferences:', error)
  }

  return getDefaultColumnPreferences()
}

/**
 * Save column preferences to localStorage
 */
export function saveColumnPreferences(preferences: ColumnPreferences): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(KB_COLUMN_PREFERENCES_KEY, JSON.stringify(preferences))
  } catch (error) {
    console.warn('Failed to save column preferences:', error)
  }
}

/**
 * Get columns in display order with visibility applied
 */
export function getVisibleColumns(preferences: ColumnPreferences): ColumnConfig[] {
  const columnMap = new Map(KB_ITEMS_ALL_COLUMNS.map(col => [col.id, col]))

  // Return columns in order, filtering to visible only
  return preferences.columnOrder
    .filter(id => preferences.visibleColumns.includes(id))
    .map(id => columnMap.get(id))
    .filter((col): col is ColumnConfig => col !== undefined)
}

/**
 * Get all columns in display order (for column selector)
 */
export function getAllColumnsOrdered(preferences: ColumnPreferences): ColumnConfig[] {
  const columnMap = new Map(KB_ITEMS_ALL_COLUMNS.map(col => [col.id, col]))

  // Start with ordered columns
  const ordered = preferences.columnOrder
    .map(id => columnMap.get(id))
    .filter((col): col is ColumnConfig => col !== undefined)

  // Add any missing columns at the end
  const orderedIds = new Set(preferences.columnOrder)
  const missing = KB_ITEMS_ALL_COLUMNS.filter(col => !orderedIds.has(col.id))

  return [...ordered, ...missing]
}

/**
 * Extract dynamic columns from metadata JSON field
 * Scans items and extracts unique metadata keys as additional columns
 */
export function extractMetadataColumns(items: Array<{ metadata?: string | null }>): ColumnConfig[] {
  const metadataKeys = new Set<string>()

  for (const item of items) {
    if (item.metadata) {
      try {
        const meta = typeof item.metadata === 'string'
          ? JSON.parse(item.metadata)
          : item.metadata

        if (meta && typeof meta === 'object') {
          Object.keys(meta).forEach(key => metadataKeys.add(key))
        }
      } catch {
        // Skip invalid JSON
      }
    }
  }

  // Convert metadata keys to column configs
  return Array.from(metadataKeys).map(key => ({
    id: `metadata.${key}`,
    label: formatMetadataLabel(key),
    visible: false,
    sortable: true,
    description: `Custom field from metadata: ${key}`,
  }))
}

/**
 * Format metadata key as display label
 * e.g., 'custom_field_name' -> 'Custom Field Name'
 */
function formatMetadataLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, l => l.toUpperCase())
}

/**
 * Get value from item by column ID (supports metadata.{key} notation)
 */
export function getColumnValue(item: Record<string, any>, columnId: string): any {
  if (columnId.startsWith('metadata.')) {
    const metaKey = columnId.substring('metadata.'.length)
    if (item.metadata) {
      try {
        const meta = typeof item.metadata === 'string'
          ? JSON.parse(item.metadata)
          : item.metadata
        return meta?.[metaKey]
      } catch {
        return undefined
      }
    }
    return undefined
  }

  return item[columnId]
}

/**
 * Format value based on column format type
 */
export function formatColumnValue(
  value: any,
  format?: ColumnFormat,
  priceUnit?: string
): string {
  if (value === null || value === undefined) {
    return '—'
  }

  switch (format) {
    case 'currency':
      const num = parseFloat(value)
      if (isNaN(num)) return '—'
      const currency = priceUnit || 'USD'
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
      }).format(num)

    case 'number':
      const numVal = parseFloat(value)
      if (isNaN(numVal)) return '—'
      return new Intl.NumberFormat('en-US').format(numVal)

    case 'date':
      try {
        const date = new Date(value)
        if (isNaN(date.getTime())) return '—'
        return new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(date)
      } catch {
        return String(value)
      }

    case 'boolean':
      return value ? 'Yes' : 'No'

    case 'badge':
    case 'image':
    case 'text':
    default:
      return String(value)
  }
}
