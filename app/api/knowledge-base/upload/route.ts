/**
 * Knowledge Base File Upload API
 *
 * POST: Upload and import a file (XLSX, CSV)
 * Supports column mapping preview and immediate embedding generation
 */

import { NextResponse } from 'next/server'
import {
  importKBFile,
  previewFile,
  getFileType,
  type ColumnMapping
} from '@/lib/knowledge-base/kb-import'
import { addKBItemsBatch } from '@/lib/knowledge-base/kb-vector-search'
import { searchKBItems } from '@/lib/knowledge-base/kb-database'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const previewOnly = formData.get('preview') === 'true'
    const mappingJson = formData.get('mapping') as string | null
    const generateEmbeddings = formData.get('generateEmbeddings') !== 'false' // Default true

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    const filename = file.name
    const fileType = getFileType(filename)

    if (fileType === 'unknown') {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload XLSX or CSV files.' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Preview mode - return headers and suggested mapping
    if (previewOnly) {
      const preview = await previewFile(buffer, filename, fileType)
      return NextResponse.json({
        preview: true,
        ...preview
      })
    }

    // Import mode
    const mapping: ColumnMapping | undefined = mappingJson
      ? JSON.parse(mappingJson)
      : undefined

    const result = await importKBFile(
      buffer,
      filename,
      fileType,
      mapping
    )

    // Generate embeddings immediately if requested
    let embeddingResult = { added: 0, failed: 0, queued: false }
    if (result.success && generateEmbeddings) {
      try {
        // Get the newly imported items (items from this source)
        const { items } = searchKBItems({
          source_type: fileType,
          has_embedding: false,
          limit: result.itemsImported
        })

        if (items.length > 0) {
          // Generate embeddings synchronously so we can verify success
          const batchResult = await addKBItemsBatch(items)
          embeddingResult = {
            added: batchResult.added,
            failed: batchResult.failed,
            queued: false
          }
          console.log(`Embedding generation complete: ${batchResult.added} added, ${batchResult.failed} failed`)
        }
      } catch (embeddingError: any) {
        console.warn('Embedding generation failed:', embeddingError.message)
        embeddingResult = { added: 0, failed: result.itemsImported, queued: false }
      }
    }

    return NextResponse.json({
      success: result.success,
      sourceId: result.sourceId,
      itemsImported: result.itemsImported,
      itemsWithPrice: result.itemsWithPrice,
      errors: result.errors,
      embeddings: {
        requested: generateEmbeddings,
        added: embeddingResult.added,
        failed: embeddingResult.failed
      }
    })
  } catch (error: any) {
    console.error('Error uploading KB file:', error)
    return NextResponse.json(
      { error: `Failed to import file: ${error.message}` },
      { status: 500 }
    )
  }
}

// Increase body size limit for file uploads
export const config = {
  api: {
    bodyParser: false
  }
}
