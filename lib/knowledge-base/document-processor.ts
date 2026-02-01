/**
 * Document Processor
 *
 * Main processing pipeline for documents:
 * 1. Parse document (PDF, DOCX, MD)
 * 2. Chunk into manageable pieces
 * 3. Store in database
 * 4. Queue for embedding generation
 */

import { parseDocument, detectDocumentType, isSupportedDocumentType } from './document-parsers'
import { chunkDocument, type ChunkingOptions, type DocumentChunk } from './document-chunker'
import {
  createDocument,
  getDocument,
  updateDocument,
  createChunksBatch,
  deleteDocumentChunks,
  calculateFileHash,
  getDocumentByHash,
  generateDocumentNumber,
  updateDocumentProcessingStatus,
  type KBDocument,
  type KBDocumentInput,
  type KBDocumentChunkInput,
} from './document-database'

// ============================================================================
// Type Definitions
// ============================================================================

export interface ProcessDocumentOptions {
  // Document metadata
  title?: string
  description?: string
  category: string
  subCategory?: string
  tags?: string[]
  documentNumber?: string
  effectiveDate?: string
  reviewCycleDays?: number
  createdBy?: string

  // Processing options
  chunkingOptions?: Partial<ChunkingOptions>
  generateDocumentNumber?: boolean
  checkDuplicates?: boolean
}

export interface ProcessDocumentResult {
  success: boolean
  document?: KBDocument
  chunksCreated: number
  error?: string
  isDuplicate?: boolean
  existingDocumentId?: string
}

export interface ReprocessDocumentResult {
  success: boolean
  chunksCreated: number
  error?: string
}

// ============================================================================
// Main Processing Function
// ============================================================================

/**
 * Process a document file
 * Parses, chunks, and stores the document
 */
export async function processDocument(
  fileBuffer: Buffer,
  filename: string,
  options: ProcessDocumentOptions
): Promise<ProcessDocumentResult> {
  console.log(`📄 Processing document: ${filename}`)

  try {
    // Validate file type
    if (!isSupportedDocumentType(filename)) {
      return {
        success: false,
        chunksCreated: 0,
        error: `Unsupported file type: ${filename}. Supported types: PDF, DOCX, MD`,
      }
    }

    // Check for duplicates if enabled
    if (options.checkDuplicates !== false) {
      const fileHash = calculateFileHash(fileBuffer)
      const existingDoc = getDocumentByHash(fileHash)

      if (existingDoc) {
        console.log(`⚠️ Duplicate document detected: ${existingDoc.title}`)
        return {
          success: false,
          chunksCreated: 0,
          isDuplicate: true,
          existingDocumentId: existingDoc.id,
          error: `Duplicate document: "${existingDoc.title}" (ID: ${existingDoc.id})`,
        }
      }
    }

    // Parse the document
    console.log('🔍 Parsing document...')
    const parsed = await parseDocument(fileBuffer, filename)

    // Generate document number if requested
    let documentNumber = options.documentNumber
    if (options.generateDocumentNumber && !documentNumber) {
      documentNumber = generateDocumentNumber(options.category)
      console.log(`📝 Generated document number: ${documentNumber}`)
    }

    // Determine title
    const title = options.title || parsed.metadata.title || filename.replace(/\.[^/.]+$/, '')

    // Create document record
    const docInput: KBDocumentInput = {
      source_type: detectDocumentType(filename),
      filename,
      file_size: fileBuffer.length,
      file_hash: calculateFileHash(fileBuffer),
      title,
      description: options.description || parsed.metadata.subject,
      category: options.category,
      sub_category: options.subCategory,
      tags: options.tags || parsed.metadata.keywords,
      document_number: documentNumber,
      effective_date: options.effectiveDate,
      review_cycle_days: options.reviewCycleDays,
      created_by: options.createdBy,
    }

    const document = createDocument(docInput)
    console.log(`✅ Document created: ${document.id}`)

    // Update status to processing
    updateDocumentProcessingStatus(document.id, 'processing')

    // Chunk the document
    console.log('✂️ Chunking document...')
    const chunks = chunkDocument(parsed, options.chunkingOptions)
    console.log(`📦 Created ${chunks.length} chunks`)

    // Store chunks
    if (chunks.length > 0) {
      const chunkInputs: KBDocumentChunkInput[] = chunks.map((chunk, index) => ({
        document_id: document.id,
        chunk_index: index,
        content: chunk.content,
        content_type: chunk.contentType,
        page_number: chunk.pageNumber,
        section_title: chunk.sectionTitle,
        section_path: chunk.sectionPath,
        word_count: chunk.wordCount,
        token_estimate: chunk.tokenEstimate,
      }))

      const { inserted, errors } = createChunksBatch(chunkInputs)

      if (errors.length > 0) {
        console.warn('⚠️ Chunk insertion errors:', errors)
      }

      console.log(`✅ Stored ${inserted} chunks`)

      // Update status to completed
      updateDocumentProcessingStatus(document.id, 'completed')

      // Refresh document to get updated chunks_count
      const updatedDoc = getDocument(document.id)

      return {
        success: true,
        document: updatedDoc || document,
        chunksCreated: inserted,
      }
    }

    // No chunks created (empty document?)
    updateDocumentProcessingStatus(document.id, 'completed')

    return {
      success: true,
      document,
      chunksCreated: 0,
    }

  } catch (error) {
    console.error('❌ Document processing error:', error)

    return {
      success: false,
      chunksCreated: 0,
      error: error instanceof Error ? error.message : 'Unknown error during processing',
    }
  }
}

/**
 * Reprocess an existing document
 * Deletes existing chunks and re-parses the file
 */
export async function reprocessDocument(
  documentId: string,
  fileBuffer?: Buffer,
  options?: Partial<ChunkingOptions>
): Promise<ReprocessDocumentResult> {
  console.log(`🔄 Reprocessing document: ${documentId}`)

  try {
    const document = getDocument(documentId)
    if (!document) {
      return {
        success: false,
        chunksCreated: 0,
        error: 'Document not found',
      }
    }

    // If no buffer provided, we can't reprocess
    if (!fileBuffer) {
      return {
        success: false,
        chunksCreated: 0,
        error: 'File buffer required for reprocessing. Please re-upload the document.',
      }
    }

    // Update status
    updateDocumentProcessingStatus(documentId, 'processing')

    // Delete existing chunks
    const deletedChunks = deleteDocumentChunks(documentId)
    console.log(`🗑️ Deleted ${deletedChunks} existing chunks`)

    // Re-parse the document
    console.log('🔍 Re-parsing document...')
    const parsed = await parseDocument(fileBuffer, document.filename)

    // Re-chunk
    console.log('✂️ Re-chunking document...')
    const chunks = chunkDocument(parsed, options)
    console.log(`📦 Created ${chunks.length} chunks`)

    // Store new chunks
    if (chunks.length > 0) {
      const chunkInputs: KBDocumentChunkInput[] = chunks.map((chunk, index) => ({
        document_id: documentId,
        chunk_index: index,
        content: chunk.content,
        content_type: chunk.contentType,
        page_number: chunk.pageNumber,
        section_title: chunk.sectionTitle,
        section_path: chunk.sectionPath,
        word_count: chunk.wordCount,
        token_estimate: chunk.tokenEstimate,
      }))

      const { inserted, errors } = createChunksBatch(chunkInputs)

      if (errors.length > 0) {
        console.warn('⚠️ Chunk insertion errors:', errors)
      }

      console.log(`✅ Stored ${inserted} new chunks`)

      // Update status
      updateDocumentProcessingStatus(documentId, 'completed')

      return {
        success: true,
        chunksCreated: inserted,
      }
    }

    updateDocumentProcessingStatus(documentId, 'completed')

    return {
      success: true,
      chunksCreated: 0,
    }

  } catch (error) {
    console.error('❌ Reprocessing error:', error)

    // Update status to failed
    updateDocumentProcessingStatus(
      documentId,
      'failed',
      error instanceof Error ? error.message : 'Unknown error'
    )

    return {
      success: false,
      chunksCreated: 0,
      error: error instanceof Error ? error.message : 'Unknown error during reprocessing',
    }
  }
}

/**
 * Get processing statistics
 */
export function getProcessingStats(): {
  supportedTypes: string[]
  defaultChunkSize: number
  defaultOverlap: number
} {
  return {
    supportedTypes: ['pdf', 'docx', 'md'],
    defaultChunkSize: 500,
    defaultOverlap: 50,
  }
}
