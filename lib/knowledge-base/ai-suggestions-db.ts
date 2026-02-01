/**
 * AI Suggestions Database Operations
 *
 * CRUD operations for the ai_suggestions audit table
 * Per RAG Guide Section 4.4 - AI Suggestions Table
 *
 * This module provides:
 * - Audit logging for all AI-generated suggestions
 * - Human review queue management
 * - Suggestion history and statistics
 * - MDSAP compliance audit trail
 */

import { getDatabase } from '@/lib/database/sqlite'

// ============================================================================
// Types
// ============================================================================

export interface AISuggestion {
  id: string
  product_id: string | null
  kb_item_id: string | null
  field: 'name' | 'description' | 'price' | 'barcode' | 'part_number' | 'category'
  original_value: string | null
  suggested_value: string | null
  was_applied: boolean
  needs_human_review: boolean
  review_status: 'pending' | 'approved' | 'rejected' | 'auto_approved'
  reviewer_id: string | null
  reviewed_at: string | null
  review_notes: string | null
  confidence_score: number | null
  reasons: string[] | null
  retrieval_sources: string[] | null
  retrieval_context: string | null
  prompt_version: string
  model_version: string
  generation_time_ms: number | null
  validation_passed: boolean
  validation_errors: string[] | null
  created_at: string
  updated_at: string
}

export interface CreateSuggestionInput {
  product_id?: string
  kb_item_id?: string
  field: AISuggestion['field']
  original_value?: string
  suggested_value?: string
  was_applied?: boolean
  needs_human_review?: boolean
  confidence_score?: number
  reasons?: string[]
  retrieval_sources?: string[]
  retrieval_context?: string
  prompt_version: string
  model_version: string
  generation_time_ms?: number
  validation_passed?: boolean
  validation_errors?: string[]
}

export interface SuggestionFilters {
  field?: AISuggestion['field']
  review_status?: AISuggestion['review_status']
  needs_human_review?: boolean
  product_id?: string
  min_confidence?: number
  max_confidence?: number
  from_date?: string
  to_date?: string
}

export interface SuggestionStats {
  total: number
  pending: number
  approved: number
  rejected: number
  autoApproved: number
  avgConfidence: number
  avgGenerationTime: number
  byField: Record<string, number>
  byReviewStatus: Record<string, number>
  recentTrend: {
    date: string
    count: number
  }[]
}

// ============================================================================
// Database Migration
// ============================================================================

/**
 * Apply the ai_suggestions table migration
 * Safe to call multiple times - uses IF NOT EXISTS
 */
export function applyAISuggestionsMigration(): void {
  const db = getDatabase()

  // Create the ai_suggestions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_suggestions (
      id TEXT PRIMARY KEY,
      product_id TEXT,
      kb_item_id TEXT,
      field TEXT NOT NULL CHECK(field IN ('name', 'description', 'price', 'barcode', 'part_number', 'category')),
      original_value TEXT,
      suggested_value TEXT,
      was_applied INTEGER DEFAULT 0,
      needs_human_review INTEGER DEFAULT 0,
      review_status TEXT DEFAULT 'pending' CHECK(review_status IN ('pending', 'approved', 'rejected', 'auto_approved')),
      reviewer_id TEXT,
      reviewed_at TEXT,
      review_notes TEXT,
      confidence_score REAL CHECK(confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
      reasons TEXT,
      retrieval_sources TEXT,
      retrieval_context TEXT,
      prompt_version TEXT NOT NULL,
      model_version TEXT NOT NULL,
      generation_time_ms INTEGER,
      validation_passed INTEGER DEFAULT 1,
      validation_errors TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_ai_suggestions_product ON ai_suggestions(product_id);
    CREATE INDEX IF NOT EXISTS idx_ai_suggestions_kb_item ON ai_suggestions(kb_item_id);
    CREATE INDEX IF NOT EXISTS idx_ai_suggestions_field ON ai_suggestions(field);
    CREATE INDEX IF NOT EXISTS idx_ai_suggestions_review_status ON ai_suggestions(review_status);
    CREATE INDEX IF NOT EXISTS idx_ai_suggestions_needs_review ON ai_suggestions(needs_human_review, review_status);
    CREATE INDEX IF NOT EXISTS idx_ai_suggestions_created ON ai_suggestions(created_at);
    CREATE INDEX IF NOT EXISTS idx_ai_suggestions_confidence ON ai_suggestions(confidence_score);
  `)

  console.log('[AI Suggestions] Migration applied successfully')
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Generate a unique ID for suggestions
 */
function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

/**
 * Create a new AI suggestion record
 */
export function createAISuggestion(input: CreateSuggestionInput): AISuggestion {
  const db = getDatabase()
  const id = generateId()

  // Determine review status based on needs_human_review and confidence
  let reviewStatus: AISuggestion['review_status'] = 'pending'
  if (!input.needs_human_review) {
    reviewStatus = 'auto_approved'
  }

  const stmt = db.prepare(`
    INSERT INTO ai_suggestions (
      id, product_id, kb_item_id, field, original_value, suggested_value,
      was_applied, needs_human_review, review_status, confidence_score,
      reasons, retrieval_sources, retrieval_context,
      prompt_version, model_version, generation_time_ms,
      validation_passed, validation_errors
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    id,
    input.product_id || null,
    input.kb_item_id || null,
    input.field,
    input.original_value || null,
    input.suggested_value || null,
    input.was_applied ? 1 : 0,
    input.needs_human_review ? 1 : 0,
    reviewStatus,
    input.confidence_score ?? null,
    input.reasons ? JSON.stringify(input.reasons) : null,
    input.retrieval_sources ? JSON.stringify(input.retrieval_sources) : null,
    input.retrieval_context || null,
    input.prompt_version,
    input.model_version,
    input.generation_time_ms ?? null,
    input.validation_passed !== false ? 1 : 0,
    input.validation_errors ? JSON.stringify(input.validation_errors) : null
  )

  return getAISuggestion(id)!
}

/**
 * Get a single AI suggestion by ID
 */
export function getAISuggestion(id: string): AISuggestion | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM ai_suggestions WHERE id = ?').get(id) as any
  return row ? transformRow(row) : null
}

/**
 * Get suggestions with optional filters
 */
export function getAISuggestions(
  filters: SuggestionFilters = {},
  limit: number = 50,
  offset: number = 0
): { suggestions: AISuggestion[]; total: number } {
  const db = getDatabase()

  // Build WHERE clause dynamically
  const conditions: string[] = []
  const params: any[] = []

  if (filters.field) {
    conditions.push('field = ?')
    params.push(filters.field)
  }

  if (filters.review_status) {
    conditions.push('review_status = ?')
    params.push(filters.review_status)
  }

  if (filters.needs_human_review !== undefined) {
    conditions.push('needs_human_review = ?')
    params.push(filters.needs_human_review ? 1 : 0)
  }

  if (filters.product_id) {
    conditions.push('product_id = ?')
    params.push(filters.product_id)
  }

  if (filters.min_confidence !== undefined) {
    conditions.push('confidence_score >= ?')
    params.push(filters.min_confidence)
  }

  if (filters.max_confidence !== undefined) {
    conditions.push('confidence_score <= ?')
    params.push(filters.max_confidence)
  }

  if (filters.from_date) {
    conditions.push('created_at >= ?')
    params.push(filters.from_date)
  }

  if (filters.to_date) {
    conditions.push('created_at <= ?')
    params.push(filters.to_date)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Get total count
  const countRow = db.prepare(`
    SELECT COUNT(*) as count FROM ai_suggestions ${whereClause}
  `).get(...params) as { count: number }

  // Get paginated results
  const rows = db.prepare(`
    SELECT * FROM ai_suggestions
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as any[]

  return {
    suggestions: rows.map(transformRow),
    total: countRow.count
  }
}

/**
 * Get suggestions pending human review
 */
export function getPendingReviewSuggestions(
  limit: number = 50,
  offset: number = 0
): { suggestions: AISuggestion[]; total: number } {
  return getAISuggestions({
    needs_human_review: true,
    review_status: 'pending'
  }, limit, offset)
}

/**
 * Update suggestion review status (approve/reject)
 */
export function reviewSuggestion(
  id: string,
  reviewerId: string,
  decision: 'approved' | 'rejected',
  notes?: string
): AISuggestion | null {
  const db = getDatabase()

  db.prepare(`
    UPDATE ai_suggestions SET
      review_status = ?,
      reviewer_id = ?,
      reviewed_at = datetime('now'),
      review_notes = ?,
      was_applied = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    decision,
    reviewerId,
    notes || null,
    decision === 'approved' ? 1 : 0,
    id
  )

  return getAISuggestion(id)
}

/**
 * Mark a suggestion as applied
 */
export function markSuggestionApplied(id: string): AISuggestion | null {
  const db = getDatabase()

  db.prepare(`
    UPDATE ai_suggestions SET
      was_applied = 1,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(id)

  return getAISuggestion(id)
}

/**
 * Get suggestion history for a specific product
 */
export function getProductSuggestionHistory(
  productId: string,
  field?: AISuggestion['field'],
  limit: number = 20
): AISuggestion[] {
  const db = getDatabase()

  let query = 'SELECT * FROM ai_suggestions WHERE product_id = ?'
  const params: any[] = [productId]

  if (field) {
    query += ' AND field = ?'
    params.push(field)
  }

  query += ' ORDER BY created_at DESC LIMIT ?'
  params.push(limit)

  return db.prepare(query).all(...params).map(transformRow)
}

/**
 * Get suggestion history for a KB item
 */
export function getKBItemSuggestionHistory(
  kbItemId: string,
  field?: AISuggestion['field'],
  limit: number = 20
): AISuggestion[] {
  const db = getDatabase()

  let query = 'SELECT * FROM ai_suggestions WHERE kb_item_id = ?'
  const params: any[] = [kbItemId]

  if (field) {
    query += ' AND field = ?'
    params.push(field)
  }

  query += ' ORDER BY created_at DESC LIMIT ?'
  params.push(limit)

  return db.prepare(query).all(...params).map(transformRow)
}

// ============================================================================
// Statistics & Analytics
// ============================================================================

/**
 * Get aggregated statistics for AI suggestions
 */
export function getAISuggestionStats(): SuggestionStats {
  const db = getDatabase()

  // Basic counts and averages
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN review_status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN review_status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN review_status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN review_status = 'auto_approved' THEN 1 ELSE 0 END) as auto_approved,
      AVG(confidence_score) as avg_confidence,
      AVG(generation_time_ms) as avg_generation_time
    FROM ai_suggestions
  `).get() as any

  // Counts by field
  const byFieldRows = db.prepare(`
    SELECT field, COUNT(*) as count
    FROM ai_suggestions
    GROUP BY field
  `).all() as { field: string; count: number }[]

  // Counts by review status
  const byStatusRows = db.prepare(`
    SELECT review_status, COUNT(*) as count
    FROM ai_suggestions
    GROUP BY review_status
  `).all() as { review_status: string; count: number }[]

  // Recent trend (last 7 days)
  const trendRows = db.prepare(`
    SELECT
      date(created_at) as date,
      COUNT(*) as count
    FROM ai_suggestions
    WHERE created_at >= datetime('now', '-7 days')
    GROUP BY date(created_at)
    ORDER BY date DESC
  `).all() as { date: string; count: number }[]

  return {
    total: stats.total || 0,
    pending: stats.pending || 0,
    approved: stats.approved || 0,
    rejected: stats.rejected || 0,
    autoApproved: stats.auto_approved || 0,
    avgConfidence: stats.avg_confidence ? Math.round(stats.avg_confidence * 100) / 100 : 0,
    avgGenerationTime: stats.avg_generation_time ? Math.round(stats.avg_generation_time) : 0,
    byField: Object.fromEntries(byFieldRows.map(r => [r.field, r.count])),
    byReviewStatus: Object.fromEntries(byStatusRows.map(r => [r.review_status, r.count])),
    recentTrend: trendRows
  }
}

/**
 * Get approval rate for a specific field
 */
export function getFieldApprovalRate(field: AISuggestion['field']): {
  total: number
  approved: number
  rejected: number
  rate: number
} {
  const db = getDatabase()

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN review_status = 'approved' OR review_status = 'auto_approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN review_status = 'rejected' THEN 1 ELSE 0 END) as rejected
    FROM ai_suggestions
    WHERE field = ?
  `).get(field) as any

  const total = stats.total || 0
  const approved = stats.approved || 0

  return {
    total,
    approved,
    rejected: stats.rejected || 0,
    rate: total > 0 ? Math.round((approved / total) * 100) : 0
  }
}

// ============================================================================
// Cleanup & Maintenance
// ============================================================================

/**
 * Delete old suggestions (for data retention compliance)
 */
export function deleteOldSuggestions(daysOld: number = 90): number {
  const db = getDatabase()

  const result = db.prepare(`
    DELETE FROM ai_suggestions
    WHERE created_at < datetime('now', '-' || ? || ' days')
    AND review_status != 'pending'
  `).run(daysOld)

  return result.changes
}

/**
 * Delete a specific suggestion
 */
export function deleteSuggestion(id: string): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM ai_suggestions WHERE id = ?').run(id)
  return result.changes > 0
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Transform database row to AISuggestion type
 */
function transformRow(row: any): AISuggestion {
  return {
    id: row.id,
    product_id: row.product_id,
    kb_item_id: row.kb_item_id,
    field: row.field,
    original_value: row.original_value,
    suggested_value: row.suggested_value,
    was_applied: Boolean(row.was_applied),
    needs_human_review: Boolean(row.needs_human_review),
    review_status: row.review_status,
    reviewer_id: row.reviewer_id,
    reviewed_at: row.reviewed_at,
    review_notes: row.review_notes,
    confidence_score: row.confidence_score,
    reasons: row.reasons ? JSON.parse(row.reasons) : null,
    retrieval_sources: row.retrieval_sources ? JSON.parse(row.retrieval_sources) : null,
    retrieval_context: row.retrieval_context,
    prompt_version: row.prompt_version,
    model_version: row.model_version,
    generation_time_ms: row.generation_time_ms,
    validation_passed: Boolean(row.validation_passed),
    validation_errors: row.validation_errors ? JSON.parse(row.validation_errors) : null,
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

/**
 * Check if the ai_suggestions table exists
 */
export function isAISuggestionsTableReady(): boolean {
  try {
    const db = getDatabase()
    const result = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='ai_suggestions'
    `).get()
    return !!result
  } catch {
    return false
  }
}
