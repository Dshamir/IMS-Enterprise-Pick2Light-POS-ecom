/**
 * Document Vector Search
 *
 * ChromaDB integration for document chunks.
 * Provides embedding generation and semantic search capabilities.
 * Follows the same pattern as kb-vector-search.ts for KB items.
 *
 * Optimizations (December 2025):
 * - Query embedding cache (48-hour TTL, reduces OpenAI API calls by 60-80%)
 * - Results cache (12-hour TTL, instant repeat queries)
 * - Performance logging for monitoring
 */

import OpenAI from 'openai'
import {
  getChunksWithoutEmbeddings,
  markChunksWithEmbedding,
  getDocumentChunks,
  type KBDocumentChunk,
} from './document-database'
import {
  getEmbeddingWithCache,
  searchWithCache,
  invalidateResultsCache,
} from './search-cache'

// Performance monitoring
const ENABLE_PERF_LOGGING = process.env.NODE_ENV === 'development'

function logPerf(operation: string, durationMs: number, extra?: Record<string, any>) {
  if (ENABLE_PERF_LOGGING) {
    console.log(`[Doc Vector Search] ${operation}: ${durationMs}ms`, extra || '')
  }
}

// ChromaDB types
type ChromaApi = any
type Collection = any

// ChromaDB client singleton
let chromaClient: ChromaApi | null = null
let docChunksCollection: Collection | null = null

// OpenAI client for embeddings
let openai: OpenAI | null = null

// Collection name for document chunks
const COLLECTION_NAME = 'kb_document_chunks'

// ============================================================================
// Client Initialization
// ============================================================================

/**
 * Initialize OpenAI client
 */
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

/**
 * Initialize ChromaDB client
 */
async function getChromaClient(): Promise<ChromaApi | null> {
  if (chromaClient) return chromaClient

  try {
    const chromaModule = await import('chromadb')
    const ChromaClient = chromaModule.ChromaClient

    if (!ChromaClient) {
      console.warn('ChromaDB client not found in module')
      return null
    }

    chromaClient = new ChromaClient({
      host: 'localhost',
      port: 8000,
      ssl: false
    })

    // Test connection
    await chromaClient.heartbeat()
    console.log('✅ ChromaDB connected for Document Chunks')

    return chromaClient
  } catch (error: any) {
    console.warn('ChromaDB not available:', error.message)
    return null
  }
}

/**
 * Initialize document chunks collection in ChromaDB
 */
async function getDocChunksCollection(): Promise<Collection | null> {
  if (docChunksCollection) return docChunksCollection

  const client = await getChromaClient()
  if (!client) return null

  try {
    docChunksCollection = await client.getOrCreateCollection({
      name: COLLECTION_NAME,
      metadata: { description: 'Knowledge Base document chunk embeddings for semantic search' }
    })
    return docChunksCollection
  } catch (error: any) {
    console.error('Failed to get/create document chunks collection:', error.message)
    return null
  }
}

// ============================================================================
// Embedding Generation
// ============================================================================

/**
 * Generate embedding for text using OpenAI
 */
async function generateEmbedding(text: string): Promise<number[] | null> {
  const client = getOpenAIClient()
  if (!client) {
    console.warn('OpenAI client not available for embeddings')
    return null
  }

  try {
    // Truncate text to avoid token limits (8191 tokens max for ada-002)
    const truncatedText = text.substring(0, 8000)

    const response = await client.embeddings.create({
      model: 'text-embedding-ada-002',
      input: truncatedText,
    })

    return response.data[0].embedding
  } catch (error: any) {
    console.error('Failed to generate embedding:', error.message)
    return null
  }
}

/**
 * Add document chunks to ChromaDB
 */
export async function addDocumentChunks(
  chunks: KBDocumentChunk[],
  progressCallback?: (progress: { current: number; total: number; status: string }) => void
): Promise<{ added: number; failed: number }> {
  const collection = await getDocChunksCollection()
  if (!collection) {
    console.warn('ChromaDB collection not available')
    return { added: 0, failed: chunks.length }
  }

  let added = 0
  let failed = 0

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]

    try {
      // Generate embedding
      const embedding = await generateEmbedding(chunk.content)
      if (!embedding) {
        failed++
        continue
      }

      // Add to ChromaDB
      await collection.add({
        ids: [chunk.id],
        embeddings: [embedding],
        documents: [chunk.content],
        metadatas: [{
          document_id: chunk.document_id,
          chunk_index: chunk.chunk_index,
          content_type: chunk.content_type,
          section_title: chunk.section_title || '',
          section_path: chunk.section_path || '',
          page_number: chunk.page_number || 0,
          word_count: chunk.word_count || 0,
        }]
      })

      // Mark as having embedding in SQLite
      markChunksWithEmbedding([chunk.id], [chunk.id])
      added++

      // Progress callback
      if (progressCallback) {
        progressCallback({
          current: i + 1,
          total: chunks.length,
          status: `Processing chunk ${i + 1}/${chunks.length}`,
        })
      }

      // Rate limiting delay
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }

    } catch (error: any) {
      console.error(`Failed to add chunk ${chunk.id}:`, error.message)
      failed++
    }
  }

  return { added, failed }
}

/**
 * Generate embeddings for all chunks without embeddings
 */
export async function generateMissingEmbeddings(
  batchSize: number = 100,
  progressCallback?: (progress: { current: number; total: number; status: string }) => void
): Promise<{ added: number; failed: number; total: number }> {
  const chunksWithoutEmbeddings = getChunksWithoutEmbeddings()
  const total = chunksWithoutEmbeddings.length

  if (total === 0) {
    console.log('✅ All document chunks already have embeddings')
    return { added: 0, failed: 0, total: 0 }
  }

  console.log(`🔄 Generating embeddings for ${total} document chunks...`)

  let totalAdded = 0
  let totalFailed = 0

  // Process in batches
  for (let i = 0; i < chunksWithoutEmbeddings.length; i += batchSize) {
    const batch = chunksWithoutEmbeddings.slice(i, i + batchSize)

    const { added, failed } = await addDocumentChunks(batch, (progress) => {
      if (progressCallback) {
        progressCallback({
          current: i + progress.current,
          total,
          status: progress.status,
        })
      }
    })

    totalAdded += added
    totalFailed += failed

    console.log(`  Batch ${Math.floor(i / batchSize) + 1}: ${added} added, ${failed} failed`)

    // Delay between batches
    if (i + batchSize < chunksWithoutEmbeddings.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  console.log(`✅ Embedding generation complete: ${totalAdded} added, ${totalFailed} failed`)

  return { added: totalAdded, failed: totalFailed, total }
}

// ============================================================================
// Search Functions
// ============================================================================

export interface ChunkSearchResult {
  chunkId: string
  documentId: string
  content: string
  similarity: number
  metadata: {
    chunkIndex: number
    contentType: string
    sectionTitle: string | null
    sectionPath: string | null
    pageNumber: number | null
    wordCount: number
  }
}

/**
 * Search document chunks by text query
 *
 * OPTIMIZED: Uses embedding cache and results cache for 60-80% API cost reduction
 */
export async function searchDocumentChunks(
  query: string,
  limit: number = 10,
  filters?: {
    documentId?: string
    category?: string
  }
): Promise<ChunkSearchResult[]> {
  const startTime = Date.now()

  // Use results cache for repeat queries
  return searchWithCache(query, { limit, type: 'document_chunks', ...filters }, async () => {
    const collection = await getDocChunksCollection()
    if (!collection) {
      console.warn('ChromaDB collection not available for search')
      return []
    }

    try {
      // Use embedding cache for query vector
      const queryEmbedding = await getEmbeddingWithCache(query, generateEmbedding)
      if (!queryEmbedding) {
        console.warn('Failed to generate query embedding')
        return []
      }

      // Build where clause for filters
      let whereClause: Record<string, any> | undefined
      if (filters?.documentId) {
        whereClause = { document_id: filters.documentId }
      }

      // Query ChromaDB
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: limit,
        where: whereClause,
      })

      if (!results.ids || !results.ids[0]) {
        logPerf('searchDocumentChunks', Date.now() - startTime, { query: query.substring(0, 30), results: 0 })
        return []
      }

      // Transform results
      const searchResults: ChunkSearchResult[] = []

      for (let i = 0; i < results.ids[0].length; i++) {
        const id = results.ids[0][i]
        const document = results.documents?.[0]?.[i] || ''
        const metadata = results.metadatas?.[0]?.[i] || {}
        const distance = results.distances?.[0]?.[i] || 0

        // Convert distance to similarity (1 - normalized distance)
        const similarity = 1 - Math.min(distance / 2, 1)

        searchResults.push({
          chunkId: id,
          documentId: metadata.document_id || '',
          content: document,
          similarity,
          metadata: {
            chunkIndex: metadata.chunk_index || 0,
            contentType: metadata.content_type || 'text',
            sectionTitle: metadata.section_title || null,
            sectionPath: metadata.section_path || null,
            pageNumber: metadata.page_number || null,
            wordCount: metadata.word_count || 0,
          }
        })
      }

      logPerf('searchDocumentChunks', Date.now() - startTime, {
        query: query.substring(0, 30),
        results: searchResults.length
      })

      return searchResults

    } catch (error: any) {
      console.error('Document chunk search error:', error.message)
      return []
    }
  })
}

/**
 * Remove document chunks from ChromaDB
 */
export async function removeDocumentChunks(documentId: string): Promise<boolean> {
  const collection = await getDocChunksCollection()
  if (!collection) return false

  try {
    // Get chunk IDs for this document
    const chunks = getDocumentChunks(documentId)
    const chunkIds = chunks.map(c => c.id)

    if (chunkIds.length > 0) {
      await collection.delete({ ids: chunkIds })
      console.log(`🗑️ Removed ${chunkIds.length} chunks from ChromaDB for document ${documentId}`)

      // Invalidate results cache since documents have changed
      invalidateResultsCache()
    }

    return true
  } catch (error: any) {
    console.error('Failed to remove document chunks from ChromaDB:', error.message)
    return false
  }
}

// ============================================================================
// Health Check and Stats
// ============================================================================

/**
 * Check ChromaDB health and get stats
 */
export async function getDocumentEmbeddingStats(): Promise<{
  available: boolean
  chromadbStatus: string
  openaiStatus: string
  totalChunksInChroma: number
  chunksWithoutEmbeddings: number
}> {
  const client = await getChromaClient()
  const openaiClient = getOpenAIClient()
  const chunksWithoutEmbeddings = getChunksWithoutEmbeddings()

  let chromadbStatus = 'disconnected'
  let totalChunksInChroma = 0

  if (client) {
    try {
      await client.heartbeat()
      chromadbStatus = 'connected'

      const collection = await getDocChunksCollection()
      if (collection) {
        totalChunksInChroma = await collection.count()
      }
    } catch (error) {
      chromadbStatus = 'error'
    }
  }

  return {
    available: chromadbStatus === 'connected' && openaiClient !== null,
    chromadbStatus,
    openaiStatus: openaiClient ? 'configured' : 'not_configured',
    totalChunksInChroma,
    chunksWithoutEmbeddings: chunksWithoutEmbeddings.length,
  }
}

/**
 * Check if document vector search is healthy
 */
export async function checkDocumentVectorSearchHealth(): Promise<{
  healthy: boolean
  message: string
}> {
  const stats = await getDocumentEmbeddingStats()

  if (!stats.available) {
    const issues: string[] = []
    if (stats.chromadbStatus !== 'connected') {
      issues.push('ChromaDB not connected')
    }
    if (stats.openaiStatus !== 'configured') {
      issues.push('OpenAI API key not configured')
    }

    return {
      healthy: false,
      message: issues.join(', '),
    }
  }

  return {
    healthy: true,
    message: `Connected. ${stats.totalChunksInChroma} chunks indexed, ${stats.chunksWithoutEmbeddings} pending.`,
  }
}
