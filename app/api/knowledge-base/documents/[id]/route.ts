/**
 * Single Document API
 *
 * GET: Get document details
 * PUT: Update document metadata
 * DELETE: Delete document
 */

import { NextResponse } from 'next/server'
import {
  getDocument,
  updateDocument,
  deleteDocument,
  getDocumentChunks,
} from '@/lib/knowledge-base/document-database'
import { removeDocumentChunks } from '@/lib/knowledge-base/document-vector-search'

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

    // Get chunks count and embedding status
    const chunks = getDocumentChunks(id)
    const chunksWithEmbedding = chunks.filter(c => c.has_embedding === 1).length

    return NextResponse.json({
      document,
      chunks: {
        total: chunks.length,
        withEmbedding: chunksWithEmbedding,
        withoutEmbedding: chunks.length - chunksWithEmbedding,
      }
    })

  } catch (error: any) {
    console.error('Error getting document:', error)
    return NextResponse.json(
      { error: 'Failed to get document' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const document = getDocument(id)
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Extract updateable fields
    const updates: any = {}

    const allowedFields = [
      'title', 'description', 'category', 'sub_category', 'tags',
      'document_number', 'version', 'effective_date', 'expiry_date',
      'review_cycle_days', 'approval_status', 'approved_by', 'approved_at'
    ]

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Add updated_by if provided
    if (body.updated_by) {
      updates.updated_by = body.updated_by
    }

    const updated = updateDocument(id, updates)

    return NextResponse.json({
      success: true,
      document: updated,
    })

  } catch (error: any) {
    console.error('Error updating document:', error)
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Remove from ChromaDB first
    await removeDocumentChunks(id)

    // Delete from SQLite (cascade deletes chunks)
    const deleted = deleteDocument(id)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Document "${document.title}" deleted`,
    })

  } catch (error: any) {
    console.error('Error deleting document:', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}
