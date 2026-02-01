/**
 * Document Chunks API
 *
 * GET: Get all chunks for a document
 */

import { NextResponse } from 'next/server'
import {
  getDocument,
  getDocumentChunks,
} from '@/lib/knowledge-base/document-database'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const document = getDocument(id)
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    const chunks = getDocumentChunks(id)

    return NextResponse.json({
      documentId: id,
      documentTitle: document.title,
      total: chunks.length,
      chunks: chunks.map(chunk => ({
        id: chunk.id,
        index: chunk.chunk_index,
        content: chunk.content,
        contentType: chunk.content_type,
        sectionTitle: chunk.section_title,
        sectionPath: chunk.section_path,
        pageNumber: chunk.page_number,
        wordCount: chunk.word_count,
        tokenEstimate: chunk.token_estimate,
        hasEmbedding: chunk.has_embedding === 1,
      }))
    })

  } catch (error: any) {
    console.error('Error getting document chunks:', error)
    return NextResponse.json(
      { error: 'Failed to get document chunks' },
      { status: 500 }
    )
  }
}
