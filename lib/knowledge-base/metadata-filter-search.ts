/**
 * Metadata Filter Search
 *
 * Enhanced ChromaDB search with metadata filtering support.
 * Allows filtering by category, manufacturer, price range, etc.
 *
 * Key Features (December 2025):
 * - Pre-filtering by metadata before vector similarity
 * - Complex filter expressions (AND, OR, comparison operators)
 * - Price range queries
 * - Category hierarchy filtering
 * - Combined with embedding cache for efficiency
 */

import OpenAI from 'openai'
import { getEmbeddingWithCache } from './search-cache'
import { type KBItem } from './kb-database'

// ChromaDB types
type Collection = any

// OpenAI client singleton
let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY
  const isValidKey = apiKey &&
    apiKey !== 'fake-key' &&
    !apiKey.startsWith('your-') &&
    (apiKey.startsWith('sk-') || apiKey.startsWith('sk-proj-'))

  if (!openai && isValidKey) {
    openai = new OpenAI({ apiKey })
  }
  return openai
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  const client = getOpenAIClient()
  if (!client) return null

  try {
    const response = await client.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text.substring(0, 8000)
    })
    return response.data[0].embedding
  } catch (error: any) {
    console.error('Failed to generate embedding:', error.message)
    return null
  }
}

// ============================================================================
// Types
// ============================================================================

export interface MetadataFilter {
  // Exact match filters
  category?: string | string[]
  manufacturer?: string | string[]

  // Range filters
  priceMin?: number
  priceMax?: number

  // Text filters (partial match)
  itemNameContains?: string
  descriptionContains?: string

  // Boolean filters
  hasEmbedding?: boolean
}

export interface FilteredSearchOptions {
  limit?: number
  minSimilarity?: number
  filters?: MetadataFilter
}

export interface FilteredSearchResult {
  id: string
  item_name: string
  description: string | null
  manufacturer: string | null
  manufacturer_part_number: string | null
  category: string | null
  barcode: string | null
  price_low: number | null
  price_high: number | null
  similarity: number
  matchedFilters: string[]
}

// ============================================================================
// Filter Building
// ============================================================================

/**
 * Build ChromaDB where clause from MetadataFilter
 */
export function buildChromaWhereClause(filters: MetadataFilter): Record<string, any> | undefined {
  const conditions: Record<string, any>[] = []

  // Category filter
  if (filters.category) {
    if (Array.isArray(filters.category)) {
      conditions.push({
        category: { $in: filters.category }
      })
    } else {
      conditions.push({ category: filters.category })
    }
  }

  // Manufacturer filter
  if (filters.manufacturer) {
    if (Array.isArray(filters.manufacturer)) {
      conditions.push({
        manufacturer: { $in: filters.manufacturer }
      })
    } else {
      conditions.push({ manufacturer: filters.manufacturer })
    }
  }

  // Price range filters
  if (filters.priceMin !== undefined) {
    conditions.push({
      price_low: { $gte: filters.priceMin.toString() }
    })
  }
  if (filters.priceMax !== undefined) {
    conditions.push({
      price_high: { $lte: filters.priceMax.toString() }
    })
  }

  // Combine conditions with AND
  if (conditions.length === 0) {
    return undefined
  }

  if (conditions.length === 1) {
    return conditions[0]
  }

  return { $and: conditions }
}

/**
 * Post-filter results that can't be filtered in ChromaDB
 */
function applyPostFilters(
  results: FilteredSearchResult[],
  filters: MetadataFilter
): FilteredSearchResult[] {
  return results.filter(result => {
    // Item name contains
    if (filters.itemNameContains) {
      const searchTerm = filters.itemNameContains.toLowerCase()
      if (!result.item_name.toLowerCase().includes(searchTerm)) {
        return false
      }
      result.matchedFilters.push('itemNameContains')
    }

    // Description contains
    if (filters.descriptionContains) {
      const searchTerm = filters.descriptionContains.toLowerCase()
      if (!result.description?.toLowerCase().includes(searchTerm)) {
        return false
      }
      result.matchedFilters.push('descriptionContains')
    }

    return true
  })
}

// ============================================================================
// Filtered Search
// ============================================================================

/**
 * Search KB items with metadata filtering
 *
 * Combines ChromaDB pre-filtering with post-filtering for comprehensive results.
 */
export async function searchWithFilters(
  query: string,
  collection: Collection,
  options: FilteredSearchOptions = {}
): Promise<FilteredSearchResult[]> {
  const limit = options.limit || 20
  const minSimilarity = options.minSimilarity || 0.3
  const filters = options.filters || {}

  // Generate query embedding with cache
  const queryEmbedding = await getEmbeddingWithCache(query, generateEmbedding)
  if (!queryEmbedding) {
    return []
  }

  // Build ChromaDB where clause
  const whereClause = buildChromaWhereClause(filters)

  try {
    // Query ChromaDB with metadata filtering
    // Request more results for post-filtering
    const chromaLimit = filters.itemNameContains || filters.descriptionContains
      ? limit * 3
      : limit

    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: chromaLimit,
      where: whereClause,
    })

    if (!results.ids || !results.ids[0]) {
      return []
    }

    // Transform results
    const searchResults: FilteredSearchResult[] = []

    for (let i = 0; i < results.ids[0].length; i++) {
      const id = results.ids[0][i]
      const document = results.documents?.[0]?.[i] || ''
      const metadata = results.metadatas?.[0]?.[i] || {}
      const distance = results.distances?.[0]?.[i] || 0

      // Convert distance to similarity
      const similarity = 1 - (distance / 2)

      if (similarity < minSimilarity) continue

      const matchedFilters: string[] = []

      // Track which filters matched
      if (filters.category && metadata.category === filters.category) {
        matchedFilters.push('category')
      }
      if (filters.manufacturer && metadata.manufacturer === filters.manufacturer) {
        matchedFilters.push('manufacturer')
      }
      if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
        matchedFilters.push('priceRange')
      }

      searchResults.push({
        id,
        item_name: metadata.item_name || '',
        description: document || null,
        manufacturer: metadata.manufacturer || null,
        manufacturer_part_number: metadata.part_number || null,
        category: metadata.category || null,
        barcode: null,
        price_low: metadata.price_low ? parseFloat(metadata.price_low) : null,
        price_high: metadata.price_high ? parseFloat(metadata.price_high) : null,
        similarity,
        matchedFilters,
      })
    }

    // Apply post-filters (text contains, etc.)
    const filteredResults = applyPostFilters(searchResults, filters)

    // Sort by similarity and apply limit
    return filteredResults
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)

  } catch (error: any) {
    console.error('[Metadata Filter Search] Search error:', error.message)
    return []
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Search by category
 */
export async function searchByCategory(
  query: string,
  category: string | string[],
  collection: Collection,
  limit: number = 20
): Promise<FilteredSearchResult[]> {
  return searchWithFilters(query, collection, {
    limit,
    filters: { category }
  })
}

/**
 * Search by manufacturer
 */
export async function searchByManufacturer(
  query: string,
  manufacturer: string | string[],
  collection: Collection,
  limit: number = 20
): Promise<FilteredSearchResult[]> {
  return searchWithFilters(query, collection, {
    limit,
    filters: { manufacturer }
  })
}

/**
 * Search by price range
 */
export async function searchByPriceRange(
  query: string,
  priceMin: number,
  priceMax: number,
  collection: Collection,
  limit: number = 20
): Promise<FilteredSearchResult[]> {
  return searchWithFilters(query, collection, {
    limit,
    filters: { priceMin, priceMax }
  })
}

/**
 * Get available filter values from collection
 */
export async function getAvailableFilterValues(collection: Collection): Promise<{
  categories: string[]
  manufacturers: string[]
  priceRange: { min: number; max: number }
}> {
  try {
    // Get all items to extract unique values
    const allResults = await collection.get({
      limit: 10000,
      include: ['metadatas']
    })

    const categories = new Set<string>()
    const manufacturers = new Set<string>()
    let minPrice = Infinity
    let maxPrice = -Infinity

    for (const metadata of allResults.metadatas || []) {
      if (metadata.category) categories.add(metadata.category)
      if (metadata.manufacturer) manufacturers.add(metadata.manufacturer)

      const priceLow = metadata.price_low ? parseFloat(metadata.price_low) : null
      const priceHigh = metadata.price_high ? parseFloat(metadata.price_high) : null

      if (priceLow !== null && !isNaN(priceLow)) {
        minPrice = Math.min(minPrice, priceLow)
        maxPrice = Math.max(maxPrice, priceLow)
      }
      if (priceHigh !== null && !isNaN(priceHigh)) {
        minPrice = Math.min(minPrice, priceHigh)
        maxPrice = Math.max(maxPrice, priceHigh)
      }
    }

    return {
      categories: Array.from(categories).sort(),
      manufacturers: Array.from(manufacturers).sort(),
      priceRange: {
        min: minPrice === Infinity ? 0 : minPrice,
        max: maxPrice === -Infinity ? 0 : maxPrice
      }
    }
  } catch (error: any) {
    console.error('[Metadata Filter Search] Error getting filter values:', error.message)
    return {
      categories: [],
      manufacturers: [],
      priceRange: { min: 0, max: 0 }
    }
  }
}
