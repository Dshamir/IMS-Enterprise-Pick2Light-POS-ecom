/**
 * Search Analytics Module
 *
 * Tracks and analyzes search patterns in the Knowledge Base.
 * Provides insights into:
 * - Popular search queries
 * - Zero-result queries (content gaps)
 * - Search performance metrics
 * - Cache efficiency
 *
 * December 2025
 */

import { getDatabase } from '@/lib/database/sqlite'

// ============================================================================
// Types
// ============================================================================

export interface SearchLogEntry {
  id: string
  query: string
  query_hash: string
  results_count: number
  response_time_ms: number
  cached: boolean
  search_type: 'semantic' | 'keyword' | 'hybrid'
  filters_used: string | null
  user_session?: string
  created_at: string
}

export interface TopQuery {
  query: string
  search_count: number
  avg_results: number
  avg_response_time_ms: number
  last_searched: string
}

export interface ZeroResultQuery {
  query: string
  search_count: number
  last_searched: string
  first_searched: string
}

export interface AnalyticsSummary {
  totalSearches: number
  uniqueQueries: number
  avgResponseTime: number
  cacheHitRate: number
  zeroResultRate: number
  searchesLast24h: number
  searchesLast7d: number
  topQueries: TopQuery[]
  zeroResultQueries: ZeroResultQuery[]
  searchesByHour: { hour: number; count: number }[]
  searchesByDay: { date: string; count: number }[]
}

// ============================================================================
// Table Initialization
// ============================================================================

let tableInitialized = false

function initSearchAnalyticsTable(): void {
  if (tableInitialized) return

  const db = getDatabase()

  db.exec(`
    CREATE TABLE IF NOT EXISTS kb_search_analytics (
      id TEXT PRIMARY KEY,
      query TEXT NOT NULL,
      query_hash TEXT NOT NULL,
      results_count INTEGER NOT NULL DEFAULT 0,
      response_time_ms INTEGER NOT NULL DEFAULT 0,
      cached INTEGER NOT NULL DEFAULT 0,
      search_type TEXT NOT NULL DEFAULT 'semantic',
      filters_used TEXT,
      user_session TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // Create indexes for efficient querying
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_kb_search_analytics_query_hash
    ON kb_search_analytics(query_hash)
  `)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_kb_search_analytics_created_at
    ON kb_search_analytics(created_at)
  `)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_kb_search_analytics_results_count
    ON kb_search_analytics(results_count)
  `)

  tableInitialized = true
}

// ============================================================================
// Utility Functions
// ============================================================================

function generateId(): string {
  return `sa_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function hashQuery(query: string): string {
  // Simple hash for grouping similar queries
  const normalized = query.toLowerCase().trim()
  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(16)
}

// ============================================================================
// Logging Functions
// ============================================================================

/**
 * Log a search query and its results
 */
export function logSearch(params: {
  query: string
  resultsCount: number
  responseTimeMs: number
  cached: boolean
  searchType?: 'semantic' | 'keyword' | 'hybrid'
  filtersUsed?: Record<string, any>
  userSession?: string
}): SearchLogEntry {
  const db = getDatabase()
  initSearchAnalyticsTable()

  const id = generateId()
  const queryHash = hashQuery(params.query)
  const filtersJson = params.filtersUsed ? JSON.stringify(params.filtersUsed) : null

  const stmt = db.prepare(`
    INSERT INTO kb_search_analytics (
      id, query, query_hash, results_count, response_time_ms,
      cached, search_type, filters_used, user_session, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `)

  stmt.run(
    id,
    params.query,
    queryHash,
    params.resultsCount,
    params.responseTimeMs,
    params.cached ? 1 : 0,
    params.searchType || 'semantic',
    filtersJson,
    params.userSession || null
  )

  return {
    id,
    query: params.query,
    query_hash: queryHash,
    results_count: params.resultsCount,
    response_time_ms: params.responseTimeMs,
    cached: params.cached,
    search_type: params.searchType || 'semantic',
    filters_used: filtersJson,
    user_session: params.userSession,
    created_at: new Date().toISOString()
  }
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get top searched queries
 */
export function getTopQueries(limit: number = 20): TopQuery[] {
  const db = getDatabase()
  initSearchAnalyticsTable()

  const rows = db.prepare(`
    SELECT
      query,
      COUNT(*) as search_count,
      ROUND(AVG(results_count), 1) as avg_results,
      ROUND(AVG(response_time_ms), 0) as avg_response_time_ms,
      MAX(created_at) as last_searched
    FROM kb_search_analytics
    GROUP BY query_hash
    ORDER BY search_count DESC
    LIMIT ?
  `).all(limit) as any[]

  return rows.map(row => ({
    query: row.query,
    search_count: row.search_count,
    avg_results: row.avg_results || 0,
    avg_response_time_ms: row.avg_response_time_ms || 0,
    last_searched: row.last_searched
  }))
}

/**
 * Get queries with zero results (content gaps)
 */
export function getZeroResultQueries(limit: number = 20): ZeroResultQuery[] {
  const db = getDatabase()
  initSearchAnalyticsTable()

  const rows = db.prepare(`
    SELECT
      query,
      COUNT(*) as search_count,
      MAX(created_at) as last_searched,
      MIN(created_at) as first_searched
    FROM kb_search_analytics
    WHERE results_count = 0
    GROUP BY query_hash
    ORDER BY search_count DESC
    LIMIT ?
  `).all(limit) as any[]

  return rows.map(row => ({
    query: row.query,
    search_count: row.search_count,
    last_searched: row.last_searched,
    first_searched: row.first_searched
  }))
}

/**
 * Get average response time
 */
export function getAverageResponseTime(): number {
  const db = getDatabase()
  initSearchAnalyticsTable()

  const result = db.prepare(`
    SELECT AVG(response_time_ms) as avg_time
    FROM kb_search_analytics
  `).get() as any

  return Math.round(result?.avg_time || 0)
}

/**
 * Get cache hit rate
 */
export function getCacheHitRate(): number {
  const db = getDatabase()
  initSearchAnalyticsTable()

  const result = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN cached = 1 THEN 1 ELSE 0 END) as cached_count
    FROM kb_search_analytics
  `).get() as any

  if (!result || result.total === 0) return 0
  return Math.round((result.cached_count / result.total) * 100)
}

/**
 * Get zero result rate
 */
export function getZeroResultRate(): number {
  const db = getDatabase()
  initSearchAnalyticsTable()

  const result = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN results_count = 0 THEN 1 ELSE 0 END) as zero_count
    FROM kb_search_analytics
  `).get() as any

  if (!result || result.total === 0) return 0
  return Math.round((result.zero_count / result.total) * 100)
}

/**
 * Get search count for time period
 */
export function getSearchCount(hoursAgo: number = 24): number {
  const db = getDatabase()
  initSearchAnalyticsTable()

  const result = db.prepare(`
    SELECT COUNT(*) as count
    FROM kb_search_analytics
    WHERE created_at >= datetime('now', '-' || ? || ' hours')
  `).get(hoursAgo) as any

  return result?.count || 0
}

/**
 * Get unique query count
 */
export function getUniqueQueryCount(): number {
  const db = getDatabase()
  initSearchAnalyticsTable()

  const result = db.prepare(`
    SELECT COUNT(DISTINCT query_hash) as count
    FROM kb_search_analytics
  `).get() as any

  return result?.count || 0
}

/**
 * Get total search count
 */
export function getTotalSearchCount(): number {
  const db = getDatabase()
  initSearchAnalyticsTable()

  const result = db.prepare(`
    SELECT COUNT(*) as count
    FROM kb_search_analytics
  `).get() as any

  return result?.count || 0
}

/**
 * Get searches by hour (last 24 hours)
 */
export function getSearchesByHour(): { hour: number; count: number }[] {
  const db = getDatabase()
  initSearchAnalyticsTable()

  const rows = db.prepare(`
    SELECT
      CAST(strftime('%H', created_at) AS INTEGER) as hour,
      COUNT(*) as count
    FROM kb_search_analytics
    WHERE created_at >= datetime('now', '-24 hours')
    GROUP BY hour
    ORDER BY hour
  `).all() as any[]

  // Fill in missing hours with 0
  const result: { hour: number; count: number }[] = []
  for (let h = 0; h < 24; h++) {
    const found = rows.find(r => r.hour === h)
    result.push({ hour: h, count: found?.count || 0 })
  }

  return result
}

/**
 * Get searches by day (last 30 days)
 */
export function getSearchesByDay(): { date: string; count: number }[] {
  const db = getDatabase()
  initSearchAnalyticsTable()

  const rows = db.prepare(`
    SELECT
      DATE(created_at) as date,
      COUNT(*) as count
    FROM kb_search_analytics
    WHERE created_at >= datetime('now', '-30 days')
    GROUP BY date
    ORDER BY date
  `).all() as any[]

  return rows.map(row => ({
    date: row.date,
    count: row.count
  }))
}

/**
 * Get comprehensive analytics summary
 */
export function getAnalyticsSummary(): AnalyticsSummary {
  return {
    totalSearches: getTotalSearchCount(),
    uniqueQueries: getUniqueQueryCount(),
    avgResponseTime: getAverageResponseTime(),
    cacheHitRate: getCacheHitRate(),
    zeroResultRate: getZeroResultRate(),
    searchesLast24h: getSearchCount(24),
    searchesLast7d: getSearchCount(24 * 7),
    topQueries: getTopQueries(10),
    zeroResultQueries: getZeroResultQueries(10),
    searchesByHour: getSearchesByHour(),
    searchesByDay: getSearchesByDay()
  }
}

/**
 * Clear old analytics data (keep last N days)
 */
export function cleanupOldAnalytics(keepDays: number = 90): number {
  const db = getDatabase()
  initSearchAnalyticsTable()

  const result = db.prepare(`
    DELETE FROM kb_search_analytics
    WHERE created_at < datetime('now', '-' || ? || ' days')
  `).run(keepDays)

  return result.changes
}

/**
 * Export analytics data for backup
 */
export function exportAnalytics(limit: number = 10000): SearchLogEntry[] {
  const db = getDatabase()
  initSearchAnalyticsTable()

  const rows = db.prepare(`
    SELECT *
    FROM kb_search_analytics
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit) as any[]

  return rows.map(row => ({
    ...row,
    cached: row.cached === 1
  }))
}
