/**
 * Unified Search
 *
 * Combines search across KB items (products) and document chunks.
 * Provides a single interface for semantic search across all knowledge base content.
 *
 * Optimizations (December 2025):
 * - Parallel search execution for products and documents
 * - Raised similarity threshold from 0.1 to 0.45 for better relevance
 * - Performance logging for monitoring
 */

import { searchKBByText } from './kb-vector-search'
import { searchDocumentChunks, type ChunkSearchResult } from './document-vector-search'
import { getDocument, type KBDocument } from './document-database'

// Performance monitoring
const ENABLE_SEARCH_LOGGING = process.env.NODE_ENV === 'development'

function logSearchPerformance(
  operation: string,
  duration: number,
  resultCount: number,
  extra?: Record<string, any>
) {
  if (ENABLE_SEARCH_LOGGING) {
    console.log(`[Search Performance] ${operation}: ${duration}ms, ${resultCount} results`, extra || '')
  }
}

// ============================================================================
// Type Definitions
// ============================================================================

export type SearchScope = 'all' | 'products' | 'documents'

export interface UnifiedSearchOptions {
  scope: SearchScope
  limit: number
  productLimit?: number
  documentLimit?: number
  documentCategory?: string
  minSimilarity?: number
}

export interface ProductSearchResult {
  type: 'kb_item'
  id: string
  title: string
  excerpt: string
  similarity: number
  metadata: {
    manufacturer?: string
    partNumber?: string
    category?: string
    priceRange?: string
  }
}

export interface DocumentSearchResult {
  type: 'document_chunk'
  id: string          // Chunk ID
  documentId: string
  documentTitle: string
  title: string       // Section title or document title
  excerpt: string     // Chunk content
  similarity: number
  metadata: {
    chunkIndex: number
    sectionPath?: string
    pageNumber?: number
    documentCategory?: string
    documentNumber?: string
    approvalStatus?: string
  }
}

export type UnifiedSearchResult = ProductSearchResult | DocumentSearchResult

// ============================================================================
// Unified Search Function
// ============================================================================

/**
 * Search across products and/or documents
 *
 * Optimized for performance:
 * - Parallel execution when searching both products and documents
 * - Higher similarity threshold (0.45) to reduce noise
 * - Performance logging for monitoring
 */
export async function unifiedSearch(
  query: string,
  options: Partial<UnifiedSearchOptions> = {}
): Promise<UnifiedSearchResult[]> {
  const startTime = Date.now()

  const opts: UnifiedSearchOptions = {
    scope: options.scope || 'all',
    limit: options.limit || 20,
    productLimit: options.productLimit,
    documentLimit: options.documentLimit,
    documentCategory: options.documentCategory,
    // OPTIMIZATION: Raised from 0.1 to 0.45 for better relevance
    minSimilarity: options.minSimilarity ?? 0.45,
  }

  const results: UnifiedSearchResult[] = []

  // Calculate limits per type
  const productLimit = opts.productLimit || Math.ceil(opts.limit / 2)
  const documentLimit = opts.documentLimit || Math.ceil(opts.limit / 2)

  // OPTIMIZATION: Execute searches in parallel when scope is 'all'
  const searchProducts = opts.scope === 'all' || opts.scope === 'products'
  const searchDocs = opts.scope === 'all' || opts.scope === 'documents'

  // Create search promises
  const productSearchPromise = searchProducts
    ? searchKBByText(query, productLimit).catch(error => {
        console.warn('Product search error:', error)
        return []
      })
    : Promise.resolve([])

  const documentSearchPromise = searchDocs
    ? searchDocumentChunks(query, documentLimit).catch(error => {
        console.warn('Document search error:', error)
        return []
      })
    : Promise.resolve([])

  // Execute in parallel
  const [productResults, chunkResults] = await Promise.all([
    productSearchPromise,
    documentSearchPromise
  ])

  // Process product results
  if (searchProducts && productResults.length > 0) {
    for (const result of productResults) {
      if (result.similarity >= opts.minSimilarity) {
        results.push({
          type: 'kb_item',
          id: result.id,
          title: result.item_name,
          excerpt: result.description || `${result.manufacturer || ''} ${result.manufacturer_part_number || ''}`.trim(),
          similarity: result.similarity,
          metadata: {
            manufacturer: result.manufacturer || undefined,
            partNumber: result.manufacturer_part_number || undefined,
            category: result.category || undefined,
            priceRange: formatPriceRange(result.price_low, result.price_high),
          }
        })
      }
    }
  }

  // Process document results
  if (searchDocs && chunkResults.length > 0) {
    // Group by document and take best chunk per document to avoid duplicates
    const documentBestChunks = new Map<string, ChunkSearchResult>()

    for (const result of chunkResults) {
      const existing = documentBestChunks.get(result.documentId)
      if (!existing || result.similarity > existing.similarity) {
        documentBestChunks.set(result.documentId, result)
      }
    }

    // Convert to unified results
    for (const [documentId, chunkResult] of documentBestChunks) {
      if (chunkResult.similarity >= opts.minSimilarity) {
        // Get document details
        const document = getDocument(documentId)

        // Filter by category if specified
        if (opts.documentCategory && document?.category !== opts.documentCategory) {
          continue
        }

        results.push({
          type: 'document_chunk',
          id: chunkResult.chunkId,
          documentId,
          documentTitle: document?.title || 'Unknown Document',
          title: chunkResult.metadata.sectionTitle || document?.title || 'Unknown',
          excerpt: truncateExcerpt(chunkResult.content, 200),
          similarity: chunkResult.similarity,
          metadata: {
            chunkIndex: chunkResult.metadata.chunkIndex,
            sectionPath: chunkResult.metadata.sectionPath || undefined,
            pageNumber: chunkResult.metadata.pageNumber || undefined,
            documentCategory: document?.category,
            documentNumber: document?.document_number || undefined,
            approvalStatus: document?.approval_status,
          }
        })
      }
    }
  }

  // Sort by similarity (highest first)
  results.sort((a, b) => b.similarity - a.similarity)

  // Log performance
  const duration = Date.now() - startTime
  logSearchPerformance('unifiedSearch', duration, results.length, {
    query: query.substring(0, 50),
    scope: opts.scope,
    productResults: productResults.length,
    documentResults: chunkResults.length,
    filteredResults: results.length,
    minSimilarity: opts.minSimilarity
  })

  // Apply overall limit
  return results.slice(0, opts.limit)
}

/**
 * Quick search with default options
 */
export async function quickSearch(
  query: string,
  limit: number = 10
): Promise<UnifiedSearchResult[]> {
  return unifiedSearch(query, {
    scope: 'all',
    limit,
    minSimilarity: 0.2,
  })
}

/**
 * Search only products
 */
export async function searchProducts(
  query: string,
  limit: number = 20
): Promise<ProductSearchResult[]> {
  const results = await unifiedSearch(query, {
    scope: 'products',
    limit,
  })
  return results.filter((r): r is ProductSearchResult => r.type === 'kb_item')
}

/**
 * Search only documents
 */
export async function searchDocuments(
  query: string,
  limit: number = 20,
  category?: string
): Promise<DocumentSearchResult[]> {
  const results = await unifiedSearch(query, {
    scope: 'documents',
    limit,
    documentCategory: category,
  })
  return results.filter((r): r is DocumentSearchResult => r.type === 'document_chunk')
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format price range for display
 */
function formatPriceRange(low: number | null, high: number | null): string | undefined {
  if (low === null && high === null) return undefined

  if (low !== null && high !== null && low !== high) {
    return `$${low.toFixed(2)} - $${high.toFixed(2)}`
  }

  const price = low ?? high
  if (price !== null) {
    return `$${price.toFixed(2)}`
  }

  return undefined
}

/**
 * Truncate excerpt to specified length
 */
function truncateExcerpt(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text

  // Try to truncate at a sentence or word boundary
  const truncated = text.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  const lastSentence = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('! '),
    truncated.lastIndexOf('? ')
  )

  if (lastSentence > maxLength * 0.7) {
    return truncated.substring(0, lastSentence + 1)
  }

  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...'
  }

  return truncated + '...'
}

// ============================================================================
// Search Statistics
// ============================================================================

/**
 * Get unified search statistics
 */
export async function getUnifiedSearchStats(): Promise<{
  productsAvailable: boolean
  documentsAvailable: boolean
  message: string
}> {
  let productsAvailable = false
  let documentsAvailable = false
  const messages: string[] = []

  try {
    const { checkKBVectorSearchHealth } = await import('./kb-vector-search')
    const productHealth = await checkKBVectorSearchHealth()
    productsAvailable = productHealth.healthy
    if (!productsAvailable) {
      messages.push(`Products: ${productHealth.message}`)
    }
  } catch (error) {
    messages.push('Products: Search unavailable')
  }

  try {
    const { checkDocumentVectorSearchHealth } = await import('./document-vector-search')
    const docHealth = await checkDocumentVectorSearchHealth()
    documentsAvailable = docHealth.healthy
    if (!documentsAvailable) {
      messages.push(`Documents: ${docHealth.message}`)
    }
  } catch (error) {
    messages.push('Documents: Search unavailable')
  }

  return {
    productsAvailable,
    documentsAvailable,
    message: messages.length > 0 ? messages.join('; ') : 'Unified search ready',
  }
}
