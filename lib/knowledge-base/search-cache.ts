/**
 * Search Query Cache
 *
 * LRU cache for search query embeddings and results.
 * Reduces OpenAI API calls by caching:
 * 1. Query text → embedding mappings
 * 2. Query text → search results mappings
 *
 * Optimizations (December 2025):
 * - In-memory LRU cache with configurable size
 * - TTL-based expiration for embeddings and results
 * - Cache statistics for monitoring
 * - Automatic invalidation on KB updates
 */

// ============================================================================
// Configuration
// ============================================================================

const CACHE_CONFIG = {
  // Embedding cache: stores query -> embedding mappings
  embedding: {
    maxSize: 10000,      // Max number of cached embeddings
    ttlMs: 48 * 60 * 60 * 1000,  // 48 hours TTL
  },
  // Results cache: stores query+options -> search results
  results: {
    maxSize: 5000,       // Max number of cached result sets
    ttlMs: 12 * 60 * 60 * 1000,  // 12 hours TTL (shorter since KB can change)
  },
  // Answer cache: stores query -> AI-synthesized answers
  answer: {
    maxSize: 1000,       // Max number of cached answers
    ttlMs: 24 * 60 * 60 * 1000,  // 24 hours TTL
  },
}

// ============================================================================
// Types
// ============================================================================

interface CacheEntry<T> {
  value: T
  createdAt: number
  accessedAt: number
  accessCount: number
}

interface CacheStats {
  hits: number
  misses: number
  evictions: number
  size: number
  hitRate: number
}

// ============================================================================
// LRU Cache Implementation
// ============================================================================

class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>>
  private maxSize: number
  private ttlMs: number
  private stats: { hits: number; misses: number; evictions: number }

  constructor(maxSize: number, ttlMs: number) {
    this.cache = new Map()
    this.maxSize = maxSize
    this.ttlMs = ttlMs
    this.stats = { hits: 0, misses: 0, evictions: 0 }
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key)

    if (!entry) {
      this.stats.misses++
      return undefined
    }

    // Check TTL
    if (Date.now() - entry.createdAt > this.ttlMs) {
      this.cache.delete(key)
      this.stats.misses++
      return undefined
    }

    // Update access time and count (LRU tracking)
    entry.accessedAt = Date.now()
    entry.accessCount++
    this.stats.hits++

    // Move to end (most recently used)
    this.cache.delete(key)
    this.cache.set(key, entry)

    return entry.value
  }

  set(key: string, value: T): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLRU()
    }

    const entry: CacheEntry<T> = {
      value,
      createdAt: Date.now(),
      accessedAt: Date.now(),
      accessCount: 1,
    }

    this.cache.set(key, entry)
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    // Check TTL
    if (Date.now() - entry.createdAt > this.ttlMs) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0, evictions: 0 }
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      size: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    }
  }

  private evictLRU(): void {
    // Find least recently used entry
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.cache) {
      if (entry.accessedAt < oldestTime) {
        oldestTime = entry.accessedAt
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      this.stats.evictions++
    }
  }

  // Cleanup expired entries (call periodically)
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache) {
      if (now - entry.createdAt > this.ttlMs) {
        this.cache.delete(key)
        cleaned++
      }
    }

    return cleaned
  }
}

// ============================================================================
// Cache Instances
// ============================================================================

// Embedding cache: query text -> embedding vector
const embeddingCache = new LRUCache<number[]>(
  CACHE_CONFIG.embedding.maxSize,
  CACHE_CONFIG.embedding.ttlMs
)

// Results cache: cache key -> search results
const resultsCache = new LRUCache<any>(
  CACHE_CONFIG.results.maxSize,
  CACHE_CONFIG.results.ttlMs
)

// Answer cache: query hash -> AI synthesized answer
interface CachedAnswer {
  answer: string
  confidence: number
  answerType: string
  evidence: any[]
  cachedAt: number
}
const answerCache = new LRUCache<CachedAnswer>(
  CACHE_CONFIG.answer.maxSize,
  CACHE_CONFIG.answer.ttlMs
)

// Cache version for invalidation
let cacheVersion = 1

// ============================================================================
// Public API
// ============================================================================

/**
 * Generate a cache key for search results
 */
export function generateResultsCacheKey(
  query: string,
  options: Record<string, any> = {}
): string {
  const normalized = query.toLowerCase().trim()
  const optionsStr = JSON.stringify(options, Object.keys(options).sort())
  return `v${cacheVersion}:${normalized}:${optionsStr}`
}

/**
 * Get cached embedding for a query
 */
export function getCachedEmbedding(query: string): number[] | undefined {
  const key = query.toLowerCase().trim()
  return embeddingCache.get(key)
}

/**
 * Cache an embedding for a query
 */
export function cacheEmbedding(query: string, embedding: number[]): void {
  const key = query.toLowerCase().trim()
  embeddingCache.set(key, embedding)
}

/**
 * Get cached search results
 */
export function getCachedResults<T>(cacheKey: string): T | undefined {
  return resultsCache.get(cacheKey) as T | undefined
}

/**
 * Cache search results
 */
export function cacheResults<T>(cacheKey: string, results: T): void {
  resultsCache.set(cacheKey, results)
}

/**
 * Check if embedding is cached
 */
export function hasEmbeddingCached(query: string): boolean {
  const key = query.toLowerCase().trim()
  return embeddingCache.has(key)
}

/**
 * Check if results are cached
 */
export function hasResultsCached(cacheKey: string): boolean {
  return resultsCache.has(cacheKey)
}

// ============================================================================
// Answer Cache API
// ============================================================================

/**
 * Generate a cache key for answers
 */
export function generateAnswerCacheKey(query: string): string {
  return `v${cacheVersion}:answer:${query.toLowerCase().trim()}`
}

/**
 * Get cached answer for a query
 */
export function getCachedAnswer(query: string): CachedAnswer | undefined {
  const key = generateAnswerCacheKey(query)
  return answerCache.get(key)
}

/**
 * Cache an answer for a query
 */
export function cacheAnswer(query: string, answer: {
  answer: string
  confidence: number
  answerType: string
  evidence: any[]
}): void {
  const key = generateAnswerCacheKey(query)
  answerCache.set(key, {
    ...answer,
    cachedAt: Date.now()
  })
}

/**
 * Check if answer is cached
 */
export function hasAnswerCached(query: string): boolean {
  const key = generateAnswerCacheKey(query)
  return answerCache.has(key)
}

/**
 * Invalidate all caches (call when KB is updated)
 */
export function invalidateAllCaches(): void {
  cacheVersion++
  resultsCache.clear()
  // Note: We keep embeddings since they're query-specific, not KB-specific
  console.log('[Search Cache] Invalidated results cache, version:', cacheVersion)
}

/**
 * Invalidate results cache only (call for minor updates)
 */
export function invalidateResultsCache(): void {
  cacheVersion++
  resultsCache.clear()
}

/**
 * Clear all caches (full reset)
 */
export function clearAllCaches(): void {
  embeddingCache.clear()
  resultsCache.clear()
  answerCache.clear()
  cacheVersion++
  console.log('[Search Cache] Cleared all caches')
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  embedding: CacheStats
  results: CacheStats
  answer: CacheStats
  version: number
} {
  return {
    embedding: embeddingCache.getStats(),
    results: resultsCache.getStats(),
    answer: answerCache.getStats(),
    version: cacheVersion,
  }
}

/**
 * Cleanup expired entries from all caches
 */
export function cleanupCaches(): { embedding: number; results: number; answer: number } {
  return {
    embedding: embeddingCache.cleanup(),
    results: resultsCache.cleanup(),
    answer: answerCache.cleanup(),
  }
}

// ============================================================================
// Cached Search Wrapper
// ============================================================================

/**
 * Wrapper for embedding generation with caching
 */
export async function getEmbeddingWithCache(
  query: string,
  generateFn: (text: string) => Promise<number[] | null>
): Promise<number[] | null> {
  // Check cache first
  const cached = getCachedEmbedding(query)
  if (cached) {
    return cached
  }

  // Generate new embedding
  const embedding = await generateFn(query)

  // Cache if successful
  if (embedding) {
    cacheEmbedding(query, embedding)
  }

  return embedding
}

/**
 * Wrapper for search with result caching
 */
export async function searchWithCache<T>(
  query: string,
  options: Record<string, any>,
  searchFn: () => Promise<T>
): Promise<T> {
  const cacheKey = generateResultsCacheKey(query, options)

  // Check cache first
  const cached = getCachedResults<T>(cacheKey)
  if (cached !== undefined) {
    return cached
  }

  // Execute search
  const results = await searchFn()

  // Cache results
  cacheResults(cacheKey, results)

  return results
}

// ============================================================================
// Periodic Cleanup (optional)
// ============================================================================

// Run cleanup every hour
let cleanupInterval: NodeJS.Timeout | null = null

export function startPeriodicCleanup(intervalMs: number = 60 * 60 * 1000): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
  }

  cleanupInterval = setInterval(() => {
    const cleaned = cleanupCaches()
    if (cleaned.embedding > 0 || cleaned.results > 0) {
      console.log('[Search Cache] Cleanup:', cleaned)
    }
  }, intervalMs)
}

export function stopPeriodicCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
  }
}
