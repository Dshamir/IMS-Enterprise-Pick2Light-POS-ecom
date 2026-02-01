/**
 * Hybrid Search
 *
 * Combines vector (semantic) search with keyword (FTS5) search for better results.
 * Uses Reciprocal Rank Fusion (RRF) to merge rankings from both methods.
 *
 * Key Optimizations (December 2025):
 * - Parallel execution of vector and keyword searches
 * - RRF for robust rank merging
 * - Configurable weighting between semantic and keyword
 * - Performance monitoring
 */

import { searchKBByText, type KBItem } from './kb-vector-search'
import { getDB } from '../database/sqlite'

// ============================================================================
// Configuration
// ============================================================================

const HYBRID_CONFIG = {
  // Default weights for combining results
  vectorWeight: 0.6,   // Semantic similarity weight
  keywordWeight: 0.4,  // Keyword match weight
  // RRF constant (60 is standard)
  rrfK: 60,
  // Minimum similarity threshold
  minSimilarity: 0.3,
  // Performance logging
  enableLogging: process.env.NODE_ENV === 'development',
}

// ============================================================================
// Types
// ============================================================================

export interface HybridSearchOptions {
  limit?: number
  vectorWeight?: number
  keywordWeight?: number
  minSimilarity?: number
  category?: string
  manufacturer?: string
}

export interface HybridSearchResult {
  id: string
  item_name: string
  description: string | null
  manufacturer: string | null
  manufacturer_part_number: string | null
  category: string | null
  barcode: string | null
  price_low: number | null
  price_high: number | null
  // Scoring
  hybridScore: number
  vectorScore: number | null
  keywordScore: number | null
  matchType: 'vector' | 'keyword' | 'both'
}

// ============================================================================
// Keyword Search (SQLite FTS5)
// ============================================================================

/**
 * Check if FTS5 index exists for KB items
 */
function checkFTSIndexExists(): boolean {
  try {
    const db = getDB()
    const result = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='kb_items_fts'
    `).get()
    return !!result
  } catch {
    return false
  }
}

/**
 * Create FTS5 index if it doesn't exist
 */
export function ensureFTSIndex(): boolean {
  try {
    const db = getDB()

    // Check if already exists
    if (checkFTSIndexExists()) {
      return true
    }

    // Create FTS5 virtual table
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS kb_items_fts USING fts5(
        id UNINDEXED,
        item_name,
        description,
        manufacturer,
        manufacturer_part_number,
        category,
        content='kb_items',
        content_rowid='rowid'
      );
    `)

    // Populate the FTS table
    db.exec(`
      INSERT INTO kb_items_fts(kb_items_fts) VALUES('rebuild');
    `)

    console.log('[Hybrid Search] FTS5 index created successfully')
    return true
  } catch (error: any) {
    console.error('[Hybrid Search] Failed to create FTS5 index:', error.message)
    return false
  }
}

/**
 * Search KB items using keyword matching (FTS5)
 */
export function searchKBByKeyword(
  query: string,
  limit: number = 20,
  filters?: { category?: string; manufacturer?: string }
): (KBItem & { keywordRank: number })[] {
  try {
    // Ensure FTS index exists
    if (!checkFTSIndexExists()) {
      if (!ensureFTSIndex()) {
        return []
      }
    }

    const db = getDB()

    // Escape special FTS5 characters
    const escapedQuery = escapeForFTS5(query)

    // Build filter conditions
    const conditions: string[] = []
    const params: any[] = [escapedQuery, limit]

    if (filters?.category) {
      conditions.push('k.category = ?')
      params.splice(1, 0, filters.category)
    }
    if (filters?.manufacturer) {
      conditions.push('k.manufacturer = ?')
      params.splice(conditions.length, 0, filters.manufacturer)
    }

    const whereClause = conditions.length > 0
      ? `AND ${conditions.join(' AND ')}`
      : ''

    const results = db.prepare(`
      SELECT
        k.*,
        bm25(kb_items_fts) as keyword_rank
      FROM kb_items_fts fts
      JOIN kb_items k ON fts.id = k.id
      WHERE kb_items_fts MATCH ?
      ${whereClause}
      ORDER BY bm25(kb_items_fts)
      LIMIT ?
    `).all(...params) as (KBItem & { keyword_rank: number })[]

    // Normalize ranks (BM25 returns negative values, more negative = better)
    // Convert to positive score where higher = better
    const maxRank = Math.min(...results.map(r => r.keyword_rank), 0)
    const minRank = Math.max(...results.map(r => r.keyword_rank), -100)
    const range = maxRank - minRank || 1

    return results.map(r => ({
      ...r,
      keywordRank: 1 - (r.keyword_rank - minRank) / range, // Normalize to 0-1
    }))
  } catch (error: any) {
    console.error('[Hybrid Search] Keyword search error:', error.message)
    return []
  }
}

/**
 * Escape special characters for FTS5 query
 */
function escapeForFTS5(query: string): string {
  // Remove special FTS5 operators and wrap in quotes for phrase matching
  // Also handle common search patterns
  const cleaned = query
    .replace(/['"]/g, '') // Remove quotes
    .replace(/[-+*()]/g, ' ') // Remove operators
    .trim()

  // Split into words and search for each
  const words = cleaned.split(/\s+/).filter(w => w.length > 1)

  if (words.length === 0) return cleaned

  // Use OR search for better recall
  return words.map(w => `"${w}"*`).join(' OR ')
}

// ============================================================================
// Hybrid Search
// ============================================================================

/**
 * Hybrid search combining vector and keyword search
 *
 * Uses Reciprocal Rank Fusion (RRF) to combine rankings:
 * RRF_score = Σ (1 / (k + rank))
 *
 * This method is robust to different score distributions and works well
 * when combining results from different retrieval methods.
 */
export async function hybridSearch(
  query: string,
  options: HybridSearchOptions = {}
): Promise<HybridSearchResult[]> {
  const startTime = Date.now()

  const limit = options.limit || 20
  const vectorWeight = options.vectorWeight ?? HYBRID_CONFIG.vectorWeight
  const keywordWeight = options.keywordWeight ?? HYBRID_CONFIG.keywordWeight
  const minSimilarity = options.minSimilarity ?? HYBRID_CONFIG.minSimilarity

  // Execute searches in parallel
  const [vectorResults, keywordResults] = await Promise.all([
    searchKBByText(query, limit * 2).catch(err => {
      console.warn('[Hybrid Search] Vector search failed:', err.message)
      return []
    }),
    Promise.resolve(searchKBByKeyword(query, limit * 2, {
      category: options.category,
      manufacturer: options.manufacturer
    }))
  ])

  // Build result map with RRF scoring
  const resultMap = new Map<string, HybridSearchResult>()

  // Process vector results
  vectorResults.forEach((item, rank) => {
    if (item.similarity < minSimilarity) return

    const rrfScore = vectorWeight * (1 / (HYBRID_CONFIG.rrfK + rank))

    resultMap.set(item.id, {
      id: item.id,
      item_name: item.item_name,
      description: item.description,
      manufacturer: item.manufacturer,
      manufacturer_part_number: item.manufacturer_part_number,
      category: item.category,
      barcode: item.barcode,
      price_low: item.price_low,
      price_high: item.price_high,
      hybridScore: rrfScore,
      vectorScore: item.similarity,
      keywordScore: null,
      matchType: 'vector'
    })
  })

  // Process keyword results and merge
  keywordResults.forEach((item, rank) => {
    const rrfScore = keywordWeight * (1 / (HYBRID_CONFIG.rrfK + rank))
    const existing = resultMap.get(item.id)

    if (existing) {
      // Item found in both - add RRF scores
      existing.hybridScore += rrfScore
      existing.keywordScore = item.keywordRank
      existing.matchType = 'both'
    } else {
      // Keyword only result
      resultMap.set(item.id, {
        id: item.id,
        item_name: item.item_name,
        description: item.description || null,
        manufacturer: item.manufacturer || null,
        manufacturer_part_number: item.manufacturer_part_number || null,
        category: item.category || null,
        barcode: item.barcode || null,
        price_low: item.price_low ?? null,
        price_high: item.price_high ?? null,
        hybridScore: rrfScore,
        vectorScore: null,
        keywordScore: item.keywordRank,
        matchType: 'keyword'
      })
    }
  })

  // Sort by hybrid score and apply limit
  const results = Array.from(resultMap.values())
    .sort((a, b) => b.hybridScore - a.hybridScore)
    .slice(0, limit)

  // Performance logging
  if (HYBRID_CONFIG.enableLogging) {
    const duration = Date.now() - startTime
    console.log(`[Hybrid Search] ${duration}ms | vector: ${vectorResults.length} | keyword: ${keywordResults.length} | merged: ${results.length}`)
  }

  return results
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Rebuild FTS index (call after bulk imports)
 */
export function rebuildFTSIndex(): boolean {
  try {
    const db = getDB()

    // Drop and recreate
    db.exec(`DROP TABLE IF EXISTS kb_items_fts`)

    return ensureFTSIndex()
  } catch (error: any) {
    console.error('[Hybrid Search] Failed to rebuild FTS index:', error.message)
    return false
  }
}

/**
 * Get hybrid search statistics
 */
export function getHybridSearchStats(): {
  ftsIndexExists: boolean
  ftsIndexSize: number
  defaultWeights: { vector: number; keyword: number }
} {
  let ftsIndexSize = 0

  try {
    const db = getDB()
    const result = db.prepare(`
      SELECT COUNT(*) as count FROM kb_items_fts
    `).get() as { count: number }
    ftsIndexSize = result.count
  } catch {
    // Index doesn't exist
  }

  return {
    ftsIndexExists: checkFTSIndexExists(),
    ftsIndexSize,
    defaultWeights: {
      vector: HYBRID_CONFIG.vectorWeight,
      keyword: HYBRID_CONFIG.keywordWeight
    }
  }
}
