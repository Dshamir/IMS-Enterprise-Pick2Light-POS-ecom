/**
 * Answer Feedback System for Knowledge Base
 *
 * Tracks user feedback (thumbs up/down) on extracted answers to improve
 * answer quality over time and enable learning from user corrections.
 */

import { getDatabase } from '@/lib/database/sqlite'
import crypto from 'crypto'

// Types
export interface AnswerFeedback {
  id: string
  query: string
  query_hash: string
  answer_text: string
  answer_hash: string
  is_positive: boolean
  comment: string | null
  source_type: string | null
  source_id: string | null
  confidence_score: number | null
  created_at: string
}

export interface FeedbackInput {
  query: string
  answer: string
  isPositive: boolean
  comment?: string
  sourceType?: string
  sourceId?: string
  confidenceScore?: number
}

export interface FeedbackStats {
  total: number
  positive: number
  negative: number
  positiveRate: number
  recentFeedback: AnswerFeedback[]
  topQueriesWithNegativeFeedback: Array<{
    query: string
    negativeCount: number
    positiveCount: number
  }>
}

// Hash helpers
function hashText(text: string): string {
  return crypto.createHash('md5').update(text.toLowerCase().trim()).digest('hex')
}

/**
 * Initialize the kb_answer_feedback table if it doesn't exist
 */
export function initAnswerFeedbackTable(): void {
  const db = getDatabase()

  // Check if table exists
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='kb_answer_feedback'
  `).get()

  if (!tableExists) {
    console.log('🔄 Creating kb_answer_feedback table...')

    db.exec(`
      CREATE TABLE IF NOT EXISTS kb_answer_feedback (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        query TEXT NOT NULL,
        query_hash TEXT NOT NULL,
        answer_text TEXT NOT NULL,
        answer_hash TEXT NOT NULL,
        is_positive INTEGER NOT NULL,
        comment TEXT,
        source_type TEXT,
        source_id TEXT,
        confidence_score REAL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Index for efficient lookup by query hash
      CREATE INDEX IF NOT EXISTS idx_kb_answer_feedback_query_hash ON kb_answer_feedback(query_hash);

      -- Index for finding negative feedback
      CREATE INDEX IF NOT EXISTS idx_kb_answer_feedback_is_positive ON kb_answer_feedback(is_positive);

      -- Index for answer lookup
      CREATE INDEX IF NOT EXISTS idx_kb_answer_feedback_answer_hash ON kb_answer_feedback(answer_hash);

      -- Index for recent feedback
      CREATE INDEX IF NOT EXISTS idx_kb_answer_feedback_created_at ON kb_answer_feedback(created_at);
    `)

    console.log('✅ kb_answer_feedback table created')
  }
}

/**
 * Record feedback for an answer
 */
export function recordFeedback(input: FeedbackInput): AnswerFeedback {
  const db = getDatabase()

  // Ensure table exists
  initAnswerFeedbackTable()

  const queryHash = hashText(input.query)
  const answerHash = hashText(input.answer)

  const stmt = db.prepare(`
    INSERT INTO kb_answer_feedback (
      query, query_hash, answer_text, answer_hash, is_positive,
      comment, source_type, source_id, confidence_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const result = stmt.run(
    input.query,
    queryHash,
    input.answer,
    answerHash,
    input.isPositive ? 1 : 0,
    input.comment || null,
    input.sourceType || null,
    input.sourceId || null,
    input.confidenceScore || null
  )

  // Get the inserted record
  const inserted = db.prepare('SELECT * FROM kb_answer_feedback WHERE rowid = ?')
    .get(result.lastInsertRowid) as any

  return {
    ...inserted,
    is_positive: Boolean(inserted.is_positive)
  }
}

/**
 * Get feedback statistics
 */
export function getFeedbackStats(): FeedbackStats {
  const db = getDatabase()

  // Ensure table exists
  initAnswerFeedbackTable()

  // Total counts
  const totals = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN is_positive = 1 THEN 1 ELSE 0 END) as positive,
      SUM(CASE WHEN is_positive = 0 THEN 1 ELSE 0 END) as negative
    FROM kb_answer_feedback
  `).get() as { total: number; positive: number; negative: number }

  // Recent feedback (last 10)
  const recentFeedback = db.prepare(`
    SELECT * FROM kb_answer_feedback
    ORDER BY created_at DESC
    LIMIT 10
  `).all() as any[]

  // Queries with most negative feedback (content gaps to address)
  const topNegative = db.prepare(`
    SELECT
      query,
      SUM(CASE WHEN is_positive = 0 THEN 1 ELSE 0 END) as negativeCount,
      SUM(CASE WHEN is_positive = 1 THEN 1 ELSE 0 END) as positiveCount
    FROM kb_answer_feedback
    GROUP BY query_hash
    HAVING negativeCount > 0
    ORDER BY negativeCount DESC
    LIMIT 10
  `).all() as Array<{ query: string; negativeCount: number; positiveCount: number }>

  return {
    total: totals.total || 0,
    positive: totals.positive || 0,
    negative: totals.negative || 0,
    positiveRate: totals.total > 0 ? (totals.positive / totals.total) * 100 : 0,
    recentFeedback: recentFeedback.map(f => ({
      ...f,
      is_positive: Boolean(f.is_positive)
    })),
    topQueriesWithNegativeFeedback: topNegative
  }
}

/**
 * Get all feedback by positive/negative status
 */
export function getAnswersByFeedback(positive: boolean, limit: number = 50): AnswerFeedback[] {
  const db = getDatabase()

  // Ensure table exists
  initAnswerFeedbackTable()

  const results = db.prepare(`
    SELECT * FROM kb_answer_feedback
    WHERE is_positive = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(positive ? 1 : 0, limit) as any[]

  return results.map(f => ({
    ...f,
    is_positive: Boolean(f.is_positive)
  }))
}

/**
 * Check if a user has already provided feedback for a specific query-answer pair
 * (for preventing double-voting in UI)
 */
export function hasFeedbackForAnswer(queryHash: string, answerHash: string): boolean {
  const db = getDatabase()

  // Ensure table exists
  initAnswerFeedbackTable()

  const result = db.prepare(`
    SELECT COUNT(*) as count FROM kb_answer_feedback
    WHERE query_hash = ? AND answer_hash = ?
  `).get(queryHash, answerHash) as { count: number }

  return result.count > 0
}

/**
 * Get feedback for a specific query (to show existing votes)
 */
export function getFeedbackForQuery(query: string): AnswerFeedback[] {
  const db = getDatabase()

  // Ensure table exists
  initAnswerFeedbackTable()

  const queryHash = hashText(query)

  const results = db.prepare(`
    SELECT * FROM kb_answer_feedback
    WHERE query_hash = ?
    ORDER BY created_at DESC
  `).all(queryHash) as any[]

  return results.map(f => ({
    ...f,
    is_positive: Boolean(f.is_positive)
  }))
}

/**
 * Generate hash for a query (useful for tracking in UI)
 */
export function generateQueryHash(query: string): string {
  return hashText(query)
}

/**
 * Generate hash for an answer (useful for tracking in UI)
 */
export function generateAnswerHash(answer: string): string {
  return hashText(answer)
}

/**
 * Get feedback count for a specific answer
 */
export function getAnswerFeedbackCount(answerHash: string): { positive: number; negative: number } {
  const db = getDatabase()

  // Ensure table exists
  initAnswerFeedbackTable()

  const result = db.prepare(`
    SELECT
      SUM(CASE WHEN is_positive = 1 THEN 1 ELSE 0 END) as positive,
      SUM(CASE WHEN is_positive = 0 THEN 1 ELSE 0 END) as negative
    FROM kb_answer_feedback
    WHERE answer_hash = ?
  `).get(answerHash) as { positive: number | null; negative: number | null }

  return {
    positive: result.positive || 0,
    negative: result.negative || 0
  }
}
