/**
 * Knowledge Base Database Operations
 *
 * Provides CRUD operations, statistics, and batch operations for the Knowledge Base system.
 * Uses the existing SQLite database infrastructure.
 */

import { getDatabase } from '@/lib/database/sqlite'

// Types for Knowledge Base items
export interface KBItem {
  id: string
  source_id: string | null
  source_type: string
  source_filename: string | null
  item_name: string
  description: string | null
  manufacturer: string | null
  manufacturer_part_number: string | null
  category: string | null
  price_low: number | null
  price_high: number | null
  price_unit: string
  image_url: string | null
  barcode: string | null
  sku: string | null
  metadata: string | null
  embedding_id: string | null
  has_embedding: number
  created_at: string
  updated_at: string
}

export interface KBItemInput {
  source_id?: string
  source_type: string
  source_filename?: string
  item_name: string
  description?: string
  manufacturer?: string
  manufacturer_part_number?: string
  category?: string
  price_low?: number
  price_high?: number
  price_unit?: string
  image_url?: string
  barcode?: string
  sku?: string
  metadata?: Record<string, any>
}

export interface KBSource {
  id: string
  filename: string
  file_type: string
  file_size: number | null
  items_imported: number
  items_with_price: number
  import_status: string
  error_message: string | null
  column_mapping: string | null
  created_at: string
  updated_at: string
}

export interface KBStats {
  total_items: number
  items_with_price: number
  items_with_embedding: number
  items_missing_embedding: number
  total_sources: number
  categories: string[]
  sources_by_type: Record<string, number>
}

export interface KBSearchFilters {
  query?: string
  category?: string
  source_type?: string
  has_price?: boolean
  has_embedding?: boolean
  limit?: number
  offset?: number
}

// Create a single KB item
export function createKBItem(item: KBItemInput): KBItem {
  const db = getDatabase()

  const stmt = db.prepare(`
    INSERT INTO kb_items (
      source_id, source_type, source_filename, item_name, description,
      manufacturer, manufacturer_part_number, category, price_low, price_high,
      price_unit, image_url, barcode, sku, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const result = stmt.run(
    item.source_id || null,
    item.source_type,
    item.source_filename || null,
    item.item_name,
    item.description || null,
    item.manufacturer || null,
    item.manufacturer_part_number || null,
    item.category || null,
    item.price_low || null,
    item.price_high || null,
    item.price_unit || 'USD',
    item.image_url || null,
    item.barcode || null,
    item.sku || null,
    item.metadata ? JSON.stringify(item.metadata) : null
  )

  // Get the inserted item
  const inserted = db.prepare('SELECT * FROM kb_items WHERE rowid = ?').get(result.lastInsertRowid) as KBItem
  return inserted
}

// Create multiple KB items in batch (more efficient for imports)
export function createKBItemsBatch(items: KBItemInput[], sourceId?: string): { inserted: number; errors: string[] } {
  const db = getDatabase()
  const errors: string[] = []
  let inserted = 0

  const stmt = db.prepare(`
    INSERT INTO kb_items (
      source_id, source_type, source_filename, item_name, description,
      manufacturer, manufacturer_part_number, category, price_low, price_high,
      price_unit, image_url, barcode, sku, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  // Use a transaction for batch insert
  const insertMany = db.transaction((items: KBItemInput[]) => {
    for (const item of items) {
      try {
        stmt.run(
          sourceId || item.source_id || null,
          item.source_type,
          item.source_filename || null,
          item.item_name,
          item.description || null,
          item.manufacturer || null,
          item.manufacturer_part_number || null,
          item.category || null,
          item.price_low || null,
          item.price_high || null,
          item.price_unit || 'USD',
          item.image_url || null,
          item.barcode || null,
          item.sku || null,
          item.metadata ? JSON.stringify(item.metadata) : null
        )
        inserted++
      } catch (error: any) {
        errors.push(`Failed to insert "${item.item_name}": ${error.message}`)
      }
    }
  })

  insertMany(items)

  return { inserted, errors }
}

// Get a single KB item by ID
export function getKBItem(id: string): KBItem | null {
  const db = getDatabase()
  return db.prepare('SELECT * FROM kb_items WHERE id = ?').get(id) as KBItem | null
}

// Update a KB item
export function updateKBItem(id: string, updates: Partial<KBItemInput>): KBItem | null {
  const db = getDatabase()

  // Build dynamic update query
  const fields: string[] = []
  const values: any[] = []

  if (updates.item_name !== undefined) {
    fields.push('item_name = ?')
    values.push(updates.item_name)
  }
  if (updates.description !== undefined) {
    fields.push('description = ?')
    values.push(updates.description)
  }
  if (updates.manufacturer !== undefined) {
    fields.push('manufacturer = ?')
    values.push(updates.manufacturer)
  }
  if (updates.manufacturer_part_number !== undefined) {
    fields.push('manufacturer_part_number = ?')
    values.push(updates.manufacturer_part_number)
  }
  if (updates.category !== undefined) {
    fields.push('category = ?')
    values.push(updates.category)
  }
  if (updates.price_low !== undefined) {
    fields.push('price_low = ?')
    values.push(updates.price_low)
  }
  if (updates.price_high !== undefined) {
    fields.push('price_high = ?')
    values.push(updates.price_high)
  }
  if (updates.price_unit !== undefined) {
    fields.push('price_unit = ?')
    values.push(updates.price_unit)
  }
  if (updates.image_url !== undefined) {
    fields.push('image_url = ?')
    values.push(updates.image_url)
  }
  if (updates.barcode !== undefined) {
    fields.push('barcode = ?')
    values.push(updates.barcode)
  }
  if (updates.sku !== undefined) {
    fields.push('sku = ?')
    values.push(updates.sku)
  }
  if (updates.metadata !== undefined) {
    fields.push('metadata = ?')
    values.push(JSON.stringify(updates.metadata))
  }

  if (fields.length === 0) {
    return getKBItem(id)
  }

  // Always update updated_at
  fields.push("updated_at = datetime('now')")
  values.push(id)

  const stmt = db.prepare(`UPDATE kb_items SET ${fields.join(', ')} WHERE id = ?`)
  stmt.run(...values)

  return getKBItem(id)
}

// Delete a KB item
export function deleteKBItem(id: string): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM kb_items WHERE id = ?').run(id)
  return result.changes > 0
}

// Delete multiple KB items
export function deleteKBItemsBatch(ids: string[]): number {
  const db = getDatabase()
  const placeholders = ids.map(() => '?').join(', ')
  const result = db.prepare(`DELETE FROM kb_items WHERE id IN (${placeholders})`).run(...ids)
  return result.changes
}

// Delete all items from a specific source
export function deleteKBItemsBySource(sourceId: string): number {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM kb_items WHERE source_id = ?').run(sourceId)
  return result.changes
}

// Search KB items with filters
export function searchKBItems(filters: KBSearchFilters = {}): { items: KBItem[]; total: number } {
  const db = getDatabase()

  const conditions: string[] = []
  const values: any[] = []

  if (filters.query) {
    conditions.push(`(
      item_name LIKE ? OR
      description LIKE ? OR
      manufacturer LIKE ? OR
      manufacturer_part_number LIKE ?
    )`)
    const searchPattern = `%${filters.query}%`
    values.push(searchPattern, searchPattern, searchPattern, searchPattern)
  }

  if (filters.category) {
    conditions.push('category = ?')
    values.push(filters.category)
  }

  if (filters.source_type) {
    conditions.push('source_type = ?')
    values.push(filters.source_type)
  }

  if (filters.has_price === true) {
    conditions.push('(price_low IS NOT NULL OR price_high IS NOT NULL)')
  } else if (filters.has_price === false) {
    conditions.push('price_low IS NULL AND price_high IS NULL')
  }

  if (filters.has_embedding === true) {
    conditions.push('has_embedding = 1')
  } else if (filters.has_embedding === false) {
    conditions.push('has_embedding = 0')
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Get total count
  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM kb_items ${whereClause}`)
  const { count: total } = countStmt.get(...values) as { count: number }

  // Get items with pagination
  const limit = filters.limit || 50
  const offset = filters.offset || 0

  const itemsStmt = db.prepare(`
    SELECT * FROM kb_items
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `)
  const items = itemsStmt.all(...values, limit, offset) as KBItem[]

  return { items, total }
}

// Get recent KB items
export function getRecentKBItems(limit: number = 10): KBItem[] {
  const db = getDatabase()
  return db.prepare(`
    SELECT * FROM kb_items
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit) as KBItem[]
}

// Get KB statistics
export function getKBStats(): KBStats {
  const db = getDatabase()

  // Total items
  const { total_items } = db.prepare('SELECT COUNT(*) as total_items FROM kb_items').get() as { total_items: number }

  // Items with price
  const { items_with_price } = db.prepare(`
    SELECT COUNT(*) as items_with_price FROM kb_items
    WHERE price_low IS NOT NULL OR price_high IS NOT NULL
  `).get() as { items_with_price: number }

  // Items with embedding
  const { items_with_embedding } = db.prepare(`
    SELECT COUNT(*) as items_with_embedding FROM kb_items
    WHERE has_embedding = 1
  `).get() as { items_with_embedding: number }

  // Total sources
  const { total_sources } = db.prepare('SELECT COUNT(*) as total_sources FROM kb_sources').get() as { total_sources: number }

  // Categories
  const categoriesResult = db.prepare(`
    SELECT DISTINCT category FROM kb_items
    WHERE category IS NOT NULL AND category != ''
    ORDER BY category
  `).all() as { category: string }[]
  const categories = categoriesResult.map(r => r.category)

  // Sources by type
  const sourcesByTypeResult = db.prepare(`
    SELECT source_type, COUNT(*) as count FROM kb_items
    GROUP BY source_type
  `).all() as { source_type: string; count: number }[]
  const sources_by_type: Record<string, number> = {}
  sourcesByTypeResult.forEach(r => {
    sources_by_type[r.source_type] = r.count
  })

  return {
    total_items,
    items_with_price,
    items_with_embedding,
    items_missing_embedding: total_items - items_with_embedding,
    total_sources,
    categories,
    sources_by_type
  }
}

// KB Sources operations

// Create a new source record
export function createKBSource(source: {
  filename: string
  file_type: string
  file_size?: number
  column_mapping?: Record<string, string>
}): KBSource {
  const db = getDatabase()

  const stmt = db.prepare(`
    INSERT INTO kb_sources (filename, file_type, file_size, column_mapping, import_status)
    VALUES (?, ?, ?, ?, 'pending')
  `)

  const result = stmt.run(
    source.filename,
    source.file_type,
    source.file_size || null,
    source.column_mapping ? JSON.stringify(source.column_mapping) : null
  )

  return db.prepare('SELECT * FROM kb_sources WHERE rowid = ?').get(result.lastInsertRowid) as KBSource
}

// Update source status after import
export function updateKBSourceStatus(
  sourceId: string,
  status: 'pending' | 'importing' | 'completed' | 'failed',
  stats?: { items_imported?: number; items_with_price?: number; error_message?: string }
): void {
  const db = getDatabase()

  const fields = ["import_status = ?", "updated_at = datetime('now')"]
  const values: any[] = [status]

  if (stats?.items_imported !== undefined) {
    fields.push('items_imported = ?')
    values.push(stats.items_imported)
  }
  if (stats?.items_with_price !== undefined) {
    fields.push('items_with_price = ?')
    values.push(stats.items_with_price)
  }
  if (stats?.error_message !== undefined) {
    fields.push('error_message = ?')
    values.push(stats.error_message)
  }

  values.push(sourceId)

  db.prepare(`UPDATE kb_sources SET ${fields.join(', ')} WHERE id = ?`).run(...values)
}

// Get all sources
export function getKBSources(): KBSource[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM kb_sources ORDER BY created_at DESC').all() as KBSource[]
}

// Get source by ID
export function getKBSource(id: string): KBSource | null {
  const db = getDatabase()
  return db.prepare('SELECT * FROM kb_sources WHERE id = ?').get(id) as KBSource | null
}

// Delete a source and optionally its items
export function deleteKBSource(id: string, deleteItems: boolean = false): boolean {
  const db = getDatabase()

  if (deleteItems) {
    deleteKBItemsBySource(id)
  }

  const result = db.prepare('DELETE FROM kb_sources WHERE id = ?').run(id)
  return result.changes > 0
}

// Update embedding status for items
export function markItemsWithEmbedding(itemIds: string[]): void {
  if (itemIds.length === 0) return

  const db = getDatabase()
  const placeholders = itemIds.map(() => '?').join(', ')
  db.prepare(`
    UPDATE kb_items
    SET has_embedding = 1, updated_at = datetime('now')
    WHERE id IN (${placeholders})
  `).run(...itemIds)
}

// Get items without embeddings (for batch processing)
export function getItemsWithoutEmbeddings(limit: number = 100): KBItem[] {
  const db = getDatabase()
  return db.prepare(`
    SELECT * FROM kb_items
    WHERE has_embedding = 0
    ORDER BY created_at ASC
    LIMIT ?
  `).all(limit) as KBItem[]
}

// Get items that claim to have embeddings (for sync verification)
export function getItemsWithEmbeddings(limit: number = 1000): KBItem[] {
  const db = getDatabase()
  return db.prepare(`
    SELECT * FROM kb_items
    WHERE has_embedding = 1
    ORDER BY created_at ASC
    LIMIT ?
  `).all(limit) as KBItem[]
}

// Clear embedding flag for items (when ChromaDB doesn't have them)
export function clearItemEmbeddingFlag(itemIds: string[]): void {
  if (itemIds.length === 0) return

  const db = getDatabase()
  const placeholders = itemIds.map(() => '?').join(', ')
  db.prepare(`
    UPDATE kb_items
    SET has_embedding = 0, updated_at = datetime('now')
    WHERE id IN (${placeholders})
  `).run(...itemIds)
}

// Get count of items with embedding flag
export function getEmbeddingFlagCounts(): { withEmbedding: number; withoutEmbedding: number; total: number } {
  const db = getDatabase()
  const result = db.prepare(`
    SELECT
      SUM(CASE WHEN has_embedding = 1 THEN 1 ELSE 0 END) as withEmbedding,
      SUM(CASE WHEN has_embedding = 0 THEN 1 ELSE 0 END) as withoutEmbedding,
      COUNT(*) as total
    FROM kb_items
  `).get() as { withEmbedding: number; withoutEmbedding: number; total: number }
  return result
}

// Get all unique categories
export function getKBCategories(): { name: string; count: number }[] {
  const db = getDatabase()
  return db.prepare(`
    SELECT category as name, COUNT(*) as count
    FROM kb_items
    WHERE category IS NOT NULL AND category != ''
    GROUP BY category
    ORDER BY count DESC
  `).all() as { name: string; count: number }[]
}
