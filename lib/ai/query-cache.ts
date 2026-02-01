// Query Cache System - Improves performance for expensive database calculations

export interface CacheEntry {
  data: any
  timestamp: number
  ttl: number // Time to live in milliseconds
  queryHash: string
}

export class QueryCache {
  private cache: Map<string, CacheEntry> = new Map()
  private defaultTTL: number = 5 * 60 * 1000 // 5 minutes default

  // Cache configuration for different query types
  private ttlConfig: Record<string, number> = {
    // Fast queries - shorter cache
    'getAllProducts': 2 * 60 * 1000, // 2 minutes
    'getProductById': 5 * 60 * 1000, // 5 minutes
    'getProductByBarcode': 10 * 60 * 1000, // 10 minutes
    
    // Medium queries - moderate cache
    'getLowStockProducts': 3 * 60 * 1000, // 3 minutes
    'getCriticalStockItems': 3 * 60 * 1000, // 3 minutes
    'getProductsByCategory': 5 * 60 * 1000, // 5 minutes
    'getProductsByLocation': 5 * 60 * 1000, // 5 minutes
    
    // Expensive queries - longer cache
    'getInventoryTotalValue': 10 * 60 * 1000, // 10 minutes
    'getInventoryStatsByCategory': 15 * 60 * 1000, // 15 minutes
    'getTotalUnusedValue': 10 * 60 * 1000, // 10 minutes
    'getUnusedItemsList': 8 * 60 * 1000, // 8 minutes
    'getReorderRecommendations': 5 * 60 * 1000, // 5 minutes
    'getHighValueItems': 10 * 60 * 1000, // 10 minutes
    
    // Search queries - shorter cache (data changes frequently)
    'searchProducts': 2 * 60 * 1000, // 2 minutes
    'getInventoryByManufacturer': 5 * 60 * 1000, // 5 minutes
    'getProductsByPriceRange': 5 * 60 * 1000, // 5 minutes
    
    // Transaction queries - very short cache
    'getRecentTransactions': 1 * 60 * 1000, // 1 minute
  }

  // Generate cache key for function and parameters
  private generateCacheKey(functionName: string, parameters: any[] = []): string {
    const paramString = parameters.length > 0 ? JSON.stringify(parameters) : ''
    return `${functionName}:${this.hashString(paramString)}`
  }

  // Simple hash function for cache keys
  private hashString(str: string): string {
    let hash = 0
    if (str.length === 0) return hash.toString()
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36)
  }

  // Get TTL for specific function
  private getTTL(functionName: string): number {
    return this.ttlConfig[functionName] || this.defaultTTL
  }

  // Check if cache entry is valid
  private isValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl
  }

  // Get cached result if available and valid
  public get(functionName: string, parameters: any[] = []): any | null {
    const cacheKey = this.generateCacheKey(functionName, parameters)
    const entry = this.cache.get(cacheKey)
    
    if (!entry) {
      return null
    }
    
    if (this.isValid(entry)) {
      console.log(`Cache HIT: ${functionName}`)
      return entry.data
    } else {
      // Remove expired entry
      this.cache.delete(cacheKey)
      console.log(`Cache EXPIRED: ${functionName}`)
      return null
    }
  }

  // Store result in cache
  public set(functionName: string, parameters: any[] = [], data: any): void {
    const cacheKey = this.generateCacheKey(functionName, parameters)
    const ttl = this.getTTL(functionName)
    
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl,
      queryHash: cacheKey
    }
    
    this.cache.set(cacheKey, entry)
    console.log(`Cache SET: ${functionName} (TTL: ${ttl}ms)`)
    
    // Cleanup old entries periodically
    if (this.cache.size > 100) {
      this.cleanup()
    }
  }

  // Execute function with caching
  public async execute<T>(
    functionName: string, 
    executeFunction: () => T, 
    parameters: any[] = []
  ): Promise<T> {
    // Check cache first
    const cached = this.get(functionName, parameters)
    if (cached !== null) {
      return cached
    }
    
    // Execute function
    const startTime = Date.now()
    const result = executeFunction()
    const duration = Date.now() - startTime
    
    // Cache result if it took more than 50ms (expensive query)
    if (duration > 50) {
      this.set(functionName, parameters, result)
    }
    
    console.log(`Query executed: ${functionName} (${duration}ms)`)
    return result
  }

  // Invalidate cache for specific function
  public invalidate(functionName: string): void {
    const keysToDelete: string[] = []
    
    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(`${functionName}:`)) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key))
    console.log(`Cache invalidated for ${functionName}: ${keysToDelete.length} entries removed`)
  }

  // Invalidate cache for functions affected by data changes
  public invalidateRelated(operationType: 'create' | 'update' | 'delete', entityType: 'product' | 'transaction'): void {
    const functionsToInvalidate: string[] = []
    
    if (entityType === 'product') {
      functionsToInvalidate.push(
        'getAllProducts',
        'getLowStockProducts', 
        'getCriticalStockItems',
        'getInventoryTotalValue',
        'getInventoryStatsByCategory',
        'getTotalUnusedValue',
        'getUnusedItemsList',
        'getReorderRecommendations',
        'getHighValueItems',
        'searchProducts'
      )
    }
    
    if (entityType === 'transaction') {
      functionsToInvalidate.push(
        'getRecentTransactions',
        'getLowStockProducts',
        'getCriticalStockItems',
        'getInventoryTotalValue'
      )
    }
    
    functionsToInvalidate.forEach(func => this.invalidate(func))
    console.log(`Cache invalidated for ${operationType} ${entityType}: ${functionsToInvalidate.length} function types`)
  }

  // Clean up expired entries
  public cleanup(): void {
    const keysToDelete: string[] = []
    
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValid(entry)) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key))
    
    if (keysToDelete.length > 0) {
      console.log(`Cache cleanup: ${keysToDelete.length} expired entries removed`)
    }
  }

  // Clear all cache
  public clear(): void {
    const size = this.cache.size
    this.cache.clear()
    console.log(`Cache cleared: ${size} entries removed`)
  }

  // Get cache statistics
  public getStats(): {
    size: number
    entries: { key: string; age: number; ttl: number; valid: boolean }[]
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: Date.now() - entry.timestamp,
      ttl: entry.ttl,
      valid: this.isValid(entry)
    }))
    
    return {
      size: this.cache.size,
      entries
    }
  }

  // Preload frequently used queries
  public async preload(sqliteHelpers: any): Promise<void> {
    console.log('Preloading frequently used queries...')
    
    try {
      // Preload expensive calculations
      await this.execute('getInventoryTotalValue', () => sqliteHelpers.getInventoryTotalValue())
      await this.execute('getTotalUnusedValue', () => sqliteHelpers.getTotalUnusedValue())
      await this.execute('getLowStockProducts', () => sqliteHelpers.getLowStockProducts())
      await this.execute('getInventoryStatsByCategory', () => sqliteHelpers.getInventoryStatsByCategory())
      
      console.log('Cache preload completed')
    } catch (error) {
      console.warn('Cache preload failed:', error)
    }
  }
}

// Export singleton instance
export const queryCache = new QueryCache()