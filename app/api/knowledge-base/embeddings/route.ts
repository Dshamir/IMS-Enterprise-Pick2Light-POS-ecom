/**
 * Knowledge Base Embeddings API
 *
 * GET: Get embedding statistics and health status
 * POST: Generate embeddings for items without them
 */

import { NextResponse } from 'next/server'
import { getKBStats, getItemsWithoutEmbeddings } from '@/lib/knowledge-base/kb-database'
import {
  generateMissingEmbeddings,
  checkKBVectorSearchHealth
} from '@/lib/knowledge-base/kb-vector-search'

export async function GET() {
  try {
    const stats = getKBStats()
    const health = await checkKBVectorSearchHealth()
    const pendingItems = getItemsWithoutEmbeddings(1)

    return NextResponse.json({
      total_items: stats.total_items,
      items_with_embedding: stats.items_with_embedding,
      items_missing_embedding: stats.items_missing_embedding,
      vector_search_available: health.available,
      chromadb_status: health.chromaStatus,
      openai_status: health.openaiStatus,
      vector_store_count: health.itemCount,
      has_pending_items: pendingItems.length > 0
    })
  } catch (error: any) {
    console.error('Error fetching embedding stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch embedding statistics' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Handle empty body gracefully
    let batchSize = 100
    try {
      const text = await request.text()
      if (text) {
        const body = JSON.parse(text)
        batchSize = body.batchSize || 100
      }
    } catch {
      // Use default batchSize if no body or invalid JSON
    }

    // Check if vector search is available
    const health = await checkKBVectorSearchHealth()
    if (!health.available) {
      return NextResponse.json(
        {
          error: 'Vector search is not available',
          chromadb_status: health.chromaStatus,
          openai_status: health.openaiStatus
        },
        { status: 503 }
      )
    }

    // Start generating embeddings
    const result = await generateMissingEmbeddings(batchSize, (completed, total, message) => {
      // Progress callback - could be used for SSE in the future
      console.log(`Embedding progress: ${completed}/${total} - ${message}`)
    })

    return NextResponse.json({
      success: true,
      processed: result.processed,
      added: result.added,
      failed: result.failed
    })
  } catch (error: any) {
    console.error('Error generating embeddings:', error)
    return NextResponse.json(
      { error: `Failed to generate embeddings: ${error.message}` },
      { status: 500 }
    )
  }
}
