/**
 * Document Reprocess API
 *
 * POST: Trigger reprocessing of a document (re-parse, re-chunk, re-embed)
 */

import { NextResponse } from 'next/server'
import {
  getDocument,
  logDocumentAction,
} from '@/lib/knowledge-base/document-database'
import { reprocessDocument } from '@/lib/knowledge-base/document-processor'
import { removeDocumentChunks } from '@/lib/knowledge-base/document-vector-search'
import * as fs from 'fs'
import * as path from 'path'

export async function POST(
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

    // Check if we have the file path
    if (!document.file_path) {
      return NextResponse.json(
        { error: 'Document file path not available for reprocessing' },
        { status: 400 }
      )
    }

    // Verify file exists
    const fullPath = path.join(process.cwd(), 'public', document.file_path)
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json(
        { error: 'Document file not found on disk' },
        { status: 404 }
      )
    }

    // Log the reprocess action start
    logDocumentAction({
      document_id: id,
      action: 'reprocessed',
      notes: 'Document reprocessing initiated',
    })

    try {
      // Remove existing embeddings from ChromaDB
      await removeDocumentChunks(id)

      // Read the file
      const fileBuffer = fs.readFileSync(fullPath)

      // Reprocess the document using the existing function
      const result = await reprocessDocument(id, fileBuffer)

      if (!result.success) {
        // Log failure
        logDocumentAction({
          document_id: id,
          action: 'reprocessed',
          notes: `Reprocessing failed: ${result.error}`,
        })

        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        )
      }

      // Log successful reprocess
      logDocumentAction({
        document_id: id,
        action: 'reprocessed',
        notes: `Reprocessing completed. ${result.chunksCreated} chunks created.`,
      })

      // Fetch updated document
      const updatedDocument = getDocument(id)

      return NextResponse.json({
        success: true,
        message: 'Document reprocessed successfully',
        chunksCreated: result.chunksCreated,
        document: updatedDocument,
      })

    } catch (processingError: any) {
      // Log failure
      logDocumentAction({
        document_id: id,
        action: 'reprocessed',
        notes: `Reprocessing failed: ${processingError.message}`,
      })

      throw processingError
    }

  } catch (error: any) {
    console.error('Error reprocessing document:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reprocess document' },
      { status: 500 }
    )
  }
}
