/**
 * Redis Cache Client
 *
 * Provides caching functionality for the IMS application.
 * Falls back gracefully when Redis is not available (development).
 *
 * Environment Variables:
 *   - REDIS_URL: Redis connection URL (e.g., redis://localhost:6379)
 *
 * Cache Patterns Supported:
 *   - Simple key-value storage with TTL
 *   - Hash storage for structured data
 *   - Lists for queues and recent items
 *   - Sets for unique collections
 */

import Redis from 'ioredis'

// Initialize Redis client only if URL is configured
let redis: Redis | null = null

if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        // Exponential backoff with max 30 seconds
        const delay = Math.min(times * 500, 30000)
        return delay
      },
      lazyConnect: true,
    })

    // Handle connection errors gracefully
    redis.on('error', (error) => {
      console.warn('[Redis] Connection error:', error.message)
    })

    redis.on('connect', () => {
      console.log('[Redis] Connected successfully')
    })
  } catch (error) {
    console.warn('[Redis] Failed to initialize:', error)
    redis = null
  }
}

// Default TTL values (in seconds)
export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
  WEEK: 604800, // 7 days
}

// Cache key prefixes for different data types
export const CACHE_PREFIX = {
  PRODUCT: 'product:',
  CATEGORY: 'category:',
  INVENTORY: 'inventory:',
  NAVIGATION: 'navigation:',
  THEME: 'theme:',
  AI_RESPONSE: 'ai:',
  SESSION: 'session:',
  ANALYTICS: 'analytics:',
}

/**
 * Get a value from cache
 *
 * @param key - Cache key
 * @returns Parsed value or null if not found
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null

  try {
    const value = await redis.get(key)
    return value ? JSON.parse(value) : null
  } catch (error) {
    console.warn('[Redis] GET error:', error)
    return null
  }
}

/**
 * Set a value in cache with optional TTL
 *
 * @param key - Cache key
 * @param value - Value to store (will be JSON serialized)
 * @param ttlSeconds - Time to live in seconds (default: 1 hour)
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number = CACHE_TTL.LONG
): Promise<void> {
  if (!redis) return

  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value))
  } catch (error) {
    console.warn('[Redis] SET error:', error)
  }
}

/**
 * Delete a key from cache
 *
 * @param key - Cache key to delete
 */
export async function cacheDelete(key: string): Promise<void> {
  if (!redis) return

  try {
    await redis.del(key)
  } catch (error) {
    console.warn('[Redis] DEL error:', error)
  }
}

/**
 * Delete all keys matching a pattern
 *
 * @param pattern - Pattern to match (e.g., "product:*")
 */
export async function cacheDeletePattern(pattern: string): Promise<number> {
  if (!redis) return 0

  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      return await redis.del(...keys)
    }
    return 0
  } catch (error) {
    console.warn('[Redis] DEL pattern error:', error)
    return 0
  }
}

/**
 * Get or set a cached value (cache-aside pattern)
 *
 * @param key - Cache key
 * @param fetchFn - Function to fetch data if not cached
 * @param ttlSeconds - Cache TTL in seconds
 * @returns Cached or freshly fetched value
 */
export async function cacheGetOrSet<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = CACHE_TTL.LONG
): Promise<T> {
  // Try to get from cache
  const cached = await cacheGet<T>(key)
  if (cached !== null) {
    return cached
  }

  // Fetch fresh data
  const data = await fetchFn()

  // Store in cache (async, don't wait)
  cacheSet(key, data, ttlSeconds).catch(() => {})

  return data
}

/**
 * Increment a counter in cache
 *
 * @param key - Counter key
 * @param increment - Amount to increment (default: 1)
 * @returns New counter value
 */
export async function cacheIncrement(
  key: string,
  increment: number = 1
): Promise<number> {
  if (!redis) return 0

  try {
    return await redis.incrby(key, increment)
  } catch (error) {
    console.warn('[Redis] INCR error:', error)
    return 0
  }
}

/**
 * Store a hash (object with multiple fields)
 *
 * @param key - Hash key
 * @param data - Object to store
 * @param ttlSeconds - Optional TTL
 */
export async function cacheHashSet(
  key: string,
  data: Record<string, string | number>,
  ttlSeconds?: number
): Promise<void> {
  if (!redis) return

  try {
    await redis.hset(key, data)
    if (ttlSeconds) {
      await redis.expire(key, ttlSeconds)
    }
  } catch (error) {
    console.warn('[Redis] HSET error:', error)
  }
}

/**
 * Get all fields from a hash
 *
 * @param key - Hash key
 * @returns Object with all fields
 */
export async function cacheHashGetAll(
  key: string
): Promise<Record<string, string> | null> {
  if (!redis) return null

  try {
    const data = await redis.hgetall(key)
    return Object.keys(data).length > 0 ? data : null
  } catch (error) {
    console.warn('[Redis] HGETALL error:', error)
    return null
  }
}

/**
 * Add items to a set
 *
 * @param key - Set key
 * @param members - Items to add
 */
export async function cacheSetAdd(
  key: string,
  ...members: string[]
): Promise<void> {
  if (!redis) return

  try {
    await redis.sadd(key, ...members)
  } catch (error) {
    console.warn('[Redis] SADD error:', error)
  }
}

/**
 * Get all members of a set
 *
 * @param key - Set key
 * @returns Array of members
 */
export async function cacheSetMembers(key: string): Promise<string[]> {
  if (!redis) return []

  try {
    return await redis.smembers(key)
  } catch (error) {
    console.warn('[Redis] SMEMBERS error:', error)
    return []
  }
}

/**
 * Push items to a list (left push - most recent first)
 *
 * @param key - List key
 * @param items - Items to push
 * @param maxLength - Optional max list length (will trim old items)
 */
export async function cacheListPush(
  key: string,
  items: string[],
  maxLength?: number
): Promise<void> {
  if (!redis) return

  try {
    await redis.lpush(key, ...items)
    if (maxLength) {
      await redis.ltrim(key, 0, maxLength - 1)
    }
  } catch (error) {
    console.warn('[Redis] LPUSH error:', error)
  }
}

/**
 * Get items from a list
 *
 * @param key - List key
 * @param start - Start index (0-based)
 * @param stop - Stop index (-1 for end)
 * @returns Array of items
 */
export async function cacheListRange(
  key: string,
  start: number = 0,
  stop: number = -1
): Promise<string[]> {
  if (!redis) return []

  try {
    return await redis.lrange(key, start, stop)
  } catch (error) {
    console.warn('[Redis] LRANGE error:', error)
    return []
  }
}

/**
 * Check if Redis is connected
 *
 * @returns true if connected
 */
export function isRedisConnected(): boolean {
  return redis?.status === 'ready'
}

/**
 * Close Redis connection (for cleanup)
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit()
    redis = null
  }
}

// Export the raw Redis instance for advanced use cases
export { redis }

// Export configuration for debugging
export const cacheConfig = {
  enabled: !!redis,
  url: process.env.REDIS_URL ? '(configured)' : '(not configured)',
}
