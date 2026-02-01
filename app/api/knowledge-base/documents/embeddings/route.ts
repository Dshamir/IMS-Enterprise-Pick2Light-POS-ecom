/**
 * Document Embeddings API
 *
 * GET: Get embedding stats for documents
 * POST: Generate embeddings for document chunks
 */

import { NextResponse } from 'next/server'
import { generateMissingEmbeddings, getDocumentEmbeddingStats } from '@/lib/knowledge-base/document-vector-search'

export async function GET() {
  try {
    const stats = await getDocumentEmbeddingStats()

    return NextResponse.json({
      success: true,
      stats,
    })

  } catch (error: any) {
    console.error('Error getting embedding stats:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get embedding stats' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const batchSize = body.batchSize || 50

    console.log('🔄 Starting document embedding generation...')

    const result = await generateMissingEmbeddings(batchSize)

    return NextResponse.json({
      success: true,
      message: `Generated embeddings for ${result.added} chunks`,
      ...result,
    })

  } catch (error: any) {
    console.error('Error generating embeddings:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate embeddings' },
      { status: 500 }
    )
  }
}
