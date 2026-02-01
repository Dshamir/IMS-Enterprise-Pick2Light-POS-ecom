/**
 * Knowledge Base Documents API
 *
 * POST: Upload and process a new document
 * GET: List documents with filters and pagination
 */

import { NextResponse } from 'next/server'
import { processDocument, type ProcessDocumentOptions } from '@/lib/knowledge-base/document-processor'
import {
  searchDocuments,
  getDocumentCategories,
  getDocumentStats,
  type DocumentSearchFilters,
} from '@/lib/knowledge-base/document-database'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()

    // Get file
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Get metadata from form
    const title = formData.get('title') as string | null
    const description = formData.get('description') as string | null
    const category = formData.get('category') as string | null
    const generateDocNumber = formData.get('generateDocNumber') === 'true'
    const documentNumber = formData.get('documentNumber') as string | null
    const effectiveDate = formData.get('effectiveDate') as string | null
    const reviewCycleDays = formData.get('reviewCycleDays') as string | null

    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Process options
    const options: ProcessDocumentOptions = {
      title: title || undefined,
      description: description || undefined,
      category,
      generateDocumentNumber: generateDocNumber,
      documentNumber: !generateDocNumber ? (documentNumber || undefined) : undefined,
      effectiveDate: effectiveDate || undefined,
      reviewCycleDays: reviewCycleDays ? parseInt(reviewCycleDays) : undefined,
      checkDuplicates: true,
    }

    // Process the document
    const result = await processDocument(buffer, file.name, options)

    if (!result.success) {
      // Check if duplicate
      if (result.isDuplicate) {
        return NextResponse.json(
          {
            error: result.error,
            isDuplicate: true,
            existingDocumentId: result.existingDocumentId,
          },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      document: result.document,
      chunksCreated: result.chunksCreated,
    })

  } catch (error: any) {
    console.error('Document upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload document' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const filters: DocumentSearchFilters = {
      query: searchParams.get('query') || undefined,
      category: searchParams.get('category') || undefined,
      approval_status: searchParams.get('approval_status') || undefined,
      processing_status: searchParams.get('processing_status') || undefined,
      has_embedding: searchParams.get('has_embedding') === 'true' ? true :
                     searchParams.get('has_embedding') === 'false' ? false : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    }

    const { documents, total } = searchDocuments(filters)
    const categories = getDocumentCategories()
    const stats = getDocumentStats()

    return NextResponse.json({
      documents,
      total,
      categories,
      stats,
      limit: filters.limit,
      offset: filters.offset,
      hasMore: (filters.offset || 0) + documents.length < total,
    })

  } catch (error: any) {
    console.error('Error listing documents:', error)
    return NextResponse.json(
      { error: 'Failed to list documents' },
      { status: 500 }
    )
  }
}
