/**
 * Knowledge Base Document Database Operations
 *
 * Provides CRUD operations for documents, chunks, categories, and audit logging.
 * Supports MDSAP compliance with full audit trail and versioning.
 */

import { getDatabase } from '@/lib/database/sqlite'
import crypto from 'crypto'

// ============================================================================
// Type Definitions
// ============================================================================

export interface KBDocument {
  id: string
  source_type: string
  filename: string
  file_path: string | null
  file_size: number | null
  file_hash: string | null
  title: string
  description: string | null
  category: string
  sub_category: string | null
  tags: string | null
  processing_status: string
  processing_error: string | null
  chunks_count: number
  document_number: string | null
  version: string
  revision_number: number
  effective_date: string | null
  expiry_date: string | null
  approval_status: string
  approved_by: string | null
  approved_at: string | null
  review_cycle_days: number | null
  created_by: string | null
  created_at: string
  updated_by: string | null
  updated_at: string
}

export interface KBDocumentInput {
  source_type: string
  filename: string
  file_path?: string
  file_size?: number
  file_hash?: string
  title: string
  description?: string
  category: string
  sub_category?: string
  tags?: string[]
  document_number?: string
  version?: string
  revision_number?: number
  effective_date?: string
  expiry_date?: string
  review_cycle_days?: number
  approval_status?: string
  approved_by?: string
  approved_at?: string
  processing_status?: string
  processing_error?: string | null
  chunks_count?: number
  created_by?: string
}

export interface KBDocumentChunk {
  id: string
  document_id: string
  chunk_index: number
  content: string
  content_type: string
  page_number: number | null
  section_title: string | null
  section_path: string | null
  embedding_id: string | null
  has_embedding: number
  word_count: number | null
  token_estimate: number | null
  created_at: string
}

export interface KBDocumentChunkInput {
  document_id: string
  chunk_index: number
  content: string
  content_type?: string
  page_number?: number
  section_title?: string
  section_path?: string
  word_count?: number
  token_estimate?: number
}

export interface KBDocumentCategory {
  id: string
  name: string
  slug: string
  description: string | null
  parent_id: string | null
  icon: string | null
  sort_order: number
  created_at: string
}

export interface KBDocumentAuditEntry {
  id: string
  document_id: string
  action: string
  field_changed: string | null
  old_value: string | null
  new_value: string | null
  performed_by: string | null
  performed_at: string
  notes: string | null
}

export interface DocumentSearchFilters {
  query?: string
  category?: string
  approval_status?: string
  processing_status?: string
  has_embedding?: boolean
  limit?: number
  offset?: number
}

// ============================================================================
// Document CRUD Operations
// ============================================================================

/**
 * Create a new document
 */
export function createDocument(input: KBDocumentInput): KBDocument {
  const db = getDatabase()

  const stmt = db.prepare(`
    INSERT INTO kb_documents (
      source_type, filename, file_path, file_size, file_hash,
      title, description, category, sub_category, tags,
      document_number, version, effective_date, expiry_date, review_cycle_days,
      created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const result = stmt.run(
    input.source_type,
    input.filename,
    input.file_path || null,
    input.file_size || null,
    input.file_hash || null,
    input.title,
    input.description || null,
    input.category,
    input.sub_category || null,
    input.tags ? JSON.stringify(input.tags) : null,
    input.document_number || null,
    input.version || '1.0',
    input.effective_date || null,
    input.expiry_date || null,
    input.review_cycle_days || null,
    input.created_by || null
  )

  const inserted = db.prepare('SELECT * FROM kb_documents WHERE rowid = ?').get(result.lastInsertRowid) as KBDocument

  // Log creation
  logDocumentAction({
    document_id: inserted.id,
    action: 'created',
    performed_by: input.created_by,
    notes: `Document "${input.title}" created`
  })

  return inserted
}

/**
 * Get a single document by ID
 */
export function getDocument(id: string): KBDocument | null {
  const db = getDatabase()
  return db.prepare('SELECT * FROM kb_documents WHERE id = ?').get(id) as KBDocument | null
}

/**
 * Get document by file hash (for deduplication)
 */
export function getDocumentByHash(fileHash: string): KBDocument | null {
  const db = getDatabase()
  return db.prepare('SELECT * FROM kb_documents WHERE file_hash = ?').get(fileHash) as KBDocument | null
}

/**
 * Update a document
 */
export function updateDocument(
  id: string,
  updates: Partial<KBDocumentInput> & { updated_by?: string }
): KBDocument | null {
  const db = getDatabase()

  // Get current document for audit logging
  const current = getDocument(id)
  if (!current) return null

  // Build dynamic update query
  const fields: string[] = []
  const values: any[] = []

  const updateableFields = [
    'title', 'description', 'category', 'sub_category', 'tags',
    'document_number', 'version', 'effective_date', 'expiry_date',
    'review_cycle_days', 'processing_status', 'processing_error', 'chunks_count',
    'approval_status', 'approved_by', 'approved_at'
  ]

  for (const field of updateableFields) {
    if (field in updates) {
      fields.push(`${field} = ?`)
      let value = (updates as any)[field]
      if (field === 'tags' && Array.isArray(value)) {
        value = JSON.stringify(value)
      }
      values.push(value)

      // Log field change
      const oldValue = (current as any)[field]
      if (oldValue !== value) {
        logDocumentAction({
          document_id: id,
          action: 'updated',
          field_changed: field,
          old_value: String(oldValue ?? ''),
          new_value: String(value ?? ''),
          performed_by: updates.updated_by
        })
      }
    }
  }

  if (fields.length === 0) return current

  // Add updated_at and updated_by
  fields.push('updated_at = datetime("now")')
  if (updates.updated_by) {
    fields.push('updated_by = ?')
    values.push(updates.updated_by)
  }

  values.push(id)

  const stmt = db.prepare(`UPDATE kb_documents SET ${fields.join(', ')} WHERE id = ?`)
  stmt.run(...values)

  return getDocument(id)
}

/**
 * Delete a document and its chunks
 */
export function deleteDocument(id: string, performedBy?: string): boolean {
  const db = getDatabase()

  const doc = getDocument(id)
  if (!doc) return false

  // Log deletion before deleting
  logDocumentAction({
    document_id: id,
    action: 'deleted',
    performed_by: performedBy,
    notes: `Document "${doc.title}" deleted`
  })

  // Delete document (chunks cascade delete)
  const result = db.prepare('DELETE FROM kb_documents WHERE id = ?').run(id)
  return result.changes > 0
}

/**
 * Search documents with filters
 */
export function searchDocuments(filters: DocumentSearchFilters = {}): { documents: KBDocument[]; total: number } {
  const db = getDatabase()

  const conditions: string[] = []
  const values: any[] = []

  if (filters.query) {
    conditions.push(`(
      title LIKE ? OR
      description LIKE ? OR
      filename LIKE ? OR
      document_number LIKE ?
    )`)
    const searchPattern = `%${filters.query}%`
    values.push(searchPattern, searchPattern, searchPattern, searchPattern)
  }

  if (filters.category) {
    conditions.push('category = ?')
    values.push(filters.category)
  }

  if (filters.approval_status) {
    conditions.push('approval_status = ?')
    values.push(filters.approval_status)
  }

  if (filters.processing_status) {
    conditions.push('processing_status = ?')
    values.push(filters.processing_status)
  }

  if (filters.has_embedding === true) {
    conditions.push('chunks_count > 0 AND EXISTS (SELECT 1 FROM kb_document_chunks WHERE document_id = kb_documents.id AND has_embedding = 1)')
  } else if (filters.has_embedding === false) {
    conditions.push('chunks_count = 0 OR NOT EXISTS (SELECT 1 FROM kb_document_chunks WHERE document_id = kb_documents.id AND has_embedding = 1)')
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Get total count
  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM kb_documents ${whereClause}`)
  const { count: total } = countStmt.get(...values) as { count: number }

  // Get documents with pagination
  const limit = filters.limit || 50
  const offset = filters.offset || 0

  const docsStmt = db.prepare(`
    SELECT * FROM kb_documents
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `)
  const documents = docsStmt.all(...values, limit, offset) as KBDocument[]

  return { documents, total }
}

// ============================================================================
// Document Chunks Operations
// ============================================================================

/**
 * Create document chunks in batch
 */
export function createChunksBatch(chunks: KBDocumentChunkInput[]): { inserted: number; errors: string[] } {
  const db = getDatabase()
  const errors: string[] = []
  let inserted = 0

  const stmt = db.prepare(`
    INSERT INTO kb_document_chunks (
      document_id, chunk_index, content, content_type,
      page_number, section_title, section_path, word_count, token_estimate
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertMany = db.transaction((chunks: KBDocumentChunkInput[]) => {
    for (const chunk of chunks) {
      try {
        stmt.run(
          chunk.document_id,
          chunk.chunk_index,
          chunk.content,
          chunk.content_type || 'text',
          chunk.page_number || null,
          chunk.section_title || null,
          chunk.section_path || null,
          chunk.word_count || null,
          chunk.token_estimate || null
        )
        inserted++
      } catch (error: any) {
        errors.push(`Chunk ${chunk.chunk_index}: ${error.message}`)
      }
    }
  })

  insertMany(chunks)

  // Update document chunks_count
  if (chunks.length > 0) {
    const documentId = chunks[0].document_id
    db.prepare(`
      UPDATE kb_documents
      SET chunks_count = (SELECT COUNT(*) FROM kb_document_chunks WHERE document_id = ?),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(documentId, documentId)
  }

  return { inserted, errors }
}

/**
 * Get chunks for a document
 */
export function getDocumentChunks(documentId: string): KBDocumentChunk[] {
  const db = getDatabase()
  return db.prepare(`
    SELECT * FROM kb_document_chunks
    WHERE document_id = ?
    ORDER BY chunk_index ASC
  `).all(documentId) as KBDocumentChunk[]
}

/**
 * Delete all chunks for a document
 */
export function deleteDocumentChunks(documentId: string): number {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM kb_document_chunks WHERE document_id = ?').run(documentId)

  // Update document chunks_count
  db.prepare('UPDATE kb_documents SET chunks_count = 0, updated_at = datetime("now") WHERE id = ?').run(documentId)

  return result.changes
}

/**
 * Mark chunks as having embeddings
 */
export function markChunksWithEmbedding(chunkIds: string[], embeddingIds: string[]): number {
  const db = getDatabase()
  let updated = 0

  const stmt = db.prepare(`
    UPDATE kb_document_chunks
    SET has_embedding = 1, embedding_id = ?
    WHERE id = ?
  `)

  const updateMany = db.transaction(() => {
    for (let i = 0; i < chunkIds.length; i++) {
      stmt.run(embeddingIds[i] || chunkIds[i], chunkIds[i])
      updated++
    }
  })

  updateMany()
  return updated
}

/**
 * Get chunks without embeddings
 */
export function getChunksWithoutEmbeddings(limit?: number): KBDocumentChunk[] {
  const db = getDatabase()
  const stmt = db.prepare(`
    SELECT * FROM kb_document_chunks
    WHERE has_embedding = 0
    ORDER BY created_at ASC
    ${limit ? `LIMIT ${limit}` : ''}
  `)
  return stmt.all() as KBDocumentChunk[]
}

// ============================================================================
// Document Categories Operations
// ============================================================================

/**
 * Get all document categories
 */
export function getDocumentCategories(): KBDocumentCategory[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM kb_document_categories ORDER BY sort_order ASC').all() as KBDocumentCategory[]
}

/**
 * Create a new category
 */
export function createCategory(input: {
  name: string
  slug: string
  description?: string
  parent_id?: string
  icon?: string
}): KBDocumentCategory {
  const db = getDatabase()

  // Get max sort_order
  const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM kb_document_categories').get() as { max: number | null }
  const sortOrder = (maxOrder?.max || 0) + 1

  const stmt = db.prepare(`
    INSERT INTO kb_document_categories (name, slug, description, parent_id, icon, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const result = stmt.run(
    input.name,
    input.slug,
    input.description || null,
    input.parent_id || null,
    input.icon || null,
    sortOrder
  )

  return db.prepare('SELECT * FROM kb_document_categories WHERE rowid = ?').get(result.lastInsertRowid) as KBDocumentCategory
}

/**
 * Delete a category
 */
export function deleteCategory(id: string): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM kb_document_categories WHERE id = ?').run(id)
  return result.changes > 0
}

// ============================================================================
// Audit Log Operations
// ============================================================================

/**
 * Log a document action
 */
export function logDocumentAction(input: {
  document_id: string
  action: string
  field_changed?: string
  old_value?: string
  new_value?: string
  performed_by?: string
  notes?: string
}): void {
  const db = getDatabase()

  db.prepare(`
    INSERT INTO kb_document_audit_log (
      document_id, action, field_changed, old_value, new_value, performed_by, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.document_id,
    input.action,
    input.field_changed || null,
    input.old_value || null,
    input.new_value || null,
    input.performed_by || null,
    input.notes || null
  )
}

/**
 * Get audit history for a document
 */
export function getDocumentHistory(documentId: string): KBDocumentAuditEntry[] {
  const db = getDatabase()
  return db.prepare(`
    SELECT * FROM kb_document_audit_log
    WHERE document_id = ?
    ORDER BY performed_at DESC
  `).all(documentId) as KBDocumentAuditEntry[]
}

// ============================================================================
// Document Number Generation
// ============================================================================

/**
 * Generate a sequential document number
 * Format: {PREFIX}-{COUNTER} where PREFIX is derived from category
 * Example: SOP-QA-001, WI-MFG-042
 */
export function generateDocumentNumber(category: string): string {
  const db = getDatabase()

  // Map categories to prefixes
  const prefixMap: Record<string, string> = {
    'quality-assurance': 'SOP-QA',
    'manufacturing': 'WI-MFG',
    'user-guides': 'UG',
    'reference': 'REF',
    'training': 'TRN',
  }

  const prefix = prefixMap[category] || category.substring(0, 3).toUpperCase()

  // Get or create counter for this prefix
  let counter = db.prepare(`
    SELECT current_counter FROM kb_document_number_counters WHERE category_prefix = ?
  `).get(prefix) as { current_counter: number } | undefined

  if (!counter) {
    // Create counter
    db.prepare(`
      INSERT INTO kb_document_number_counters (category_prefix, current_counter)
      VALUES (?, 0)
    `).run(prefix)
    counter = { current_counter: 0 }
  }

  // Increment counter
  const newCounter = counter.current_counter + 1
  const documentNumber = `${prefix}-${String(newCounter).padStart(3, '0')}`

  // Update counter
  db.prepare(`
    UPDATE kb_document_number_counters
    SET current_counter = ?, last_generated_number = ?, updated_at = datetime('now')
    WHERE category_prefix = ?
  `).run(newCounter, documentNumber, prefix)

  return documentNumber
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate file hash for deduplication
 */
export function calculateFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

/**
 * Get document statistics
 */
export function getDocumentStats(): {
  total_documents: number
  documents_by_category: Record<string, number>
  documents_by_status: Record<string, number>
  documents_with_embeddings: number
  total_chunks: number
  pending_processing: number
} {
  const db = getDatabase()

  const total = db.prepare('SELECT COUNT(*) as count FROM kb_documents').get() as { count: number }

  const byCategory = db.prepare(`
    SELECT category, COUNT(*) as count FROM kb_documents GROUP BY category
  `).all() as { category: string; count: number }[]

  const byStatus = db.prepare(`
    SELECT approval_status, COUNT(*) as count FROM kb_documents GROUP BY approval_status
  `).all() as { approval_status: string; count: number }[]

  const withEmbeddings = db.prepare(`
    SELECT COUNT(DISTINCT document_id) as count FROM kb_document_chunks WHERE has_embedding = 1
  `).get() as { count: number }

  const totalChunks = db.prepare('SELECT COUNT(*) as count FROM kb_document_chunks').get() as { count: number }

  const pending = db.prepare(`
    SELECT COUNT(*) as count FROM kb_documents WHERE processing_status = 'pending'
  `).get() as { count: number }

  return {
    total_documents: total.count,
    documents_by_category: Object.fromEntries(byCategory.map(r => [r.category, r.count])),
    documents_by_status: Object.fromEntries(byStatus.map(r => [r.approval_status, r.count])),
    documents_with_embeddings: withEmbeddings.count,
    total_chunks: totalChunks.count,
    pending_processing: pending.count,
  }
}

/**
 * Update document processing status
 */
export function updateDocumentProcessingStatus(
  documentId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  error?: string
): void {
  const db = getDatabase()
  db.prepare(`
    UPDATE kb_documents
    SET processing_status = ?, processing_error = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(status, error || null, documentId)
}
