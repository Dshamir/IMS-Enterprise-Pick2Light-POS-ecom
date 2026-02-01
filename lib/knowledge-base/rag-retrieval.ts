/**
 * RAG Retrieval Module
 *
 * Document-type aware retrieval strategies for AI product generation
 * Per RAG Guide Section 6 - Retrieval Strategies by Button
 *
 * This module provides:
 * - Document type filtering (vendor_purchase, cqo_inspection, policy, part_sheet)
 * - Button-specific retrieval strategies
 * - Context formatting for prompt injection
 * - Source tracking for audit logging
 */

import { searchKBByText, searchKBByProduct } from './kb-vector-search'
import { searchDocumentChunks, type ChunkSearchResult } from './document-vector-search'
import { searchDocuments as searchDocumentsList, getDocument, getDocumentChunks } from './document-database'
import { getDatabase } from '@/lib/database/sqlite'

// ============================================================================
// Types
// ============================================================================

export type DocumentType =
  | 'vendor_purchase'    // Vendor purchase orders with pricing
  | 'cqo_inspection'     // Quality/inspection reports
  | 'policy'             // Corporate policies and procedures
  | 'part_sheet'         // Part specifications and data sheets
  | 'user_guide'         // User documentation
  | 'training'           // Training materials
  | 'reference'          // Reference documents
  | 'general'            // General documents

export type RetrievalStrategy =
  | 'name_generation'
  | 'description_enhancement'
  | 'price_lookup'
  | 'part_number_validation'
  | 'barcode_classification'
  | 'manufacturer_identification'

export interface RetrievedDocument {
  id: string
  type: DocumentType
  title: string
  content: string
  relevance: number
  source: 'kb_item' | 'document_chunk' | 'product'
  metadata: {
    documentNumber?: string
    category?: string
    approvalStatus?: string
    pageNumber?: number
    sectionTitle?: string
    manufacturer?: string
    partNumber?: string
    price?: number
    currency?: string
  }
}

export interface RetrievalResult {
  documents: RetrievedDocument[]
  sources: string[]
  totalFound: number
  strategy: RetrievalStrategy
  documentTypesSearched: DocumentType[]
}

export interface RetrievalOptions {
  limit?: number
  minRelevance?: number
  documentTypes?: DocumentType[]
  categoryFilter?: string
}

// ============================================================================
// Document Type Mapping
// ============================================================================

/**
 * Map document categories to document types
 * This bridges KB document categories to retrieval document types
 */
const CATEGORY_TO_DOCTYPE: Record<string, DocumentType> = {
  // Quality/Inspection categories
  'quality-assurance': 'cqo_inspection',
  'qa': 'cqo_inspection',
  'inspection': 'cqo_inspection',
  'cqo': 'cqo_inspection',
  'quality': 'cqo_inspection',

  // Policy categories
  'policies': 'policy',
  'policy': 'policy',
  'procedures': 'policy',
  'sop': 'policy',
  'standards': 'policy',

  // Part sheet categories
  'specifications': 'part_sheet',
  'specs': 'part_sheet',
  'datasheets': 'part_sheet',
  'technical': 'part_sheet',
  'parts': 'part_sheet',

  // Purchase/Vendor categories
  'purchasing': 'vendor_purchase',
  'vendor': 'vendor_purchase',
  'procurement': 'vendor_purchase',
  'pricing': 'vendor_purchase',
  'quotes': 'vendor_purchase',

  // User guides
  'user-guides': 'user_guide',
  'manuals': 'user_guide',
  'documentation': 'user_guide',

  // Training
  'training': 'training',
  'learning': 'training',

  // Reference
  'reference': 'reference',
  'general': 'general',
}

/**
 * Get document type from category string
 */
export function getDocumentType(category: string): DocumentType {
  const normalized = category.toLowerCase().replace(/[_\s]+/g, '-')
  return CATEGORY_TO_DOCTYPE[normalized] || 'general'
}

// ============================================================================
// Strategy-Specific Document Types
// ============================================================================

/**
 * Document types to search for each retrieval strategy
 * Per RAG Guide Section 6.1
 */
const STRATEGY_DOCUMENT_TYPES: Record<RetrievalStrategy, DocumentType[]> = {
  name_generation: ['policy', 'reference'],
  description_enhancement: ['cqo_inspection', 'policy', 'part_sheet'],
  price_lookup: ['vendor_purchase'],
  part_number_validation: ['part_sheet', 'reference'],
  barcode_classification: ['policy', 'reference'],
  manufacturer_identification: ['part_sheet', 'vendor_purchase'],
}

// ============================================================================
// Core Retrieval Functions
// ============================================================================

/**
 * Retrieve documents based on strategy and product information
 */
export async function retrieveForStrategy(
  strategy: RetrievalStrategy,
  productInfo: {
    name?: string
    description?: string
    manufacturer?: string
    partNumber?: string
    category?: string
    currentPrice?: number
  },
  options: RetrievalOptions = {}
): Promise<RetrievalResult> {
  const documentTypes = options.documentTypes || STRATEGY_DOCUMENT_TYPES[strategy]
  const limit = options.limit || 10
  const minRelevance = options.minRelevance || 0.3

  const allDocuments: RetrievedDocument[] = []
  const allSources: Set<string> = new Set()

  // Build search query from product info
  const searchQuery = buildSearchQuery(strategy, productInfo)

  // Search KB items (products) for similar products
  if (strategy !== 'price_lookup') {
    const kbResults = await searchKBByProduct({
      name: productInfo.name || '',
      description: productInfo.description,
      manufacturer: productInfo.manufacturer,
      partNumber: productInfo.partNumber,
      category: productInfo.category,
    }, Math.ceil(limit / 2))

    for (const result of kbResults) {
      if (result.similarity >= minRelevance) {
        // Note: searchKBByProduct returns KBItem objects directly, not with metadata wrapper
        allDocuments.push({
          id: result.id,
          type: 'reference',
          title: result.item_name || 'Unknown Product',
          content: formatKBItemContent(result),
          relevance: result.similarity,
          source: 'kb_item',
          metadata: {
            manufacturer: result.manufacturer,
            partNumber: result.manufacturer_part_number,
            category: result.category,
          }
        })
        allSources.add(`kb_item:${result.id}`)
      }
    }
  }

  // Search document chunks with type filtering
  const chunkResults = await searchDocumentChunks(searchQuery, limit * 2)

  for (const chunk of chunkResults) {
    if (chunk.similarity < minRelevance) continue

    // Get document to check category/type
    const document = getDocument(chunk.documentId)
    if (!document) continue

    const docType = getDocumentType(document.category)

    // Filter by document type if specified
    if (!documentTypes.includes(docType) && !documentTypes.includes('general')) {
      continue
    }

    // Apply category filter if specified
    if (options.categoryFilter && document.category !== options.categoryFilter) {
      continue
    }

    allDocuments.push({
      id: chunk.chunkId,
      type: docType,
      title: chunk.metadata.sectionTitle || document.title,
      content: chunk.content,
      relevance: chunk.similarity,
      source: 'document_chunk',
      metadata: {
        documentNumber: document.document_number || undefined,
        category: document.category,
        approvalStatus: document.approval_status,
        pageNumber: chunk.metadata.pageNumber || undefined,
        sectionTitle: chunk.metadata.sectionTitle || undefined,
      }
    })
    allSources.add(`document:${chunk.documentId}:chunk:${chunk.chunkId}`)
  }

  // Sort by relevance and limit
  allDocuments.sort((a, b) => b.relevance - a.relevance)
  const limitedDocuments = allDocuments.slice(0, limit)

  return {
    documents: limitedDocuments,
    sources: Array.from(allSources),
    totalFound: allDocuments.length,
    strategy,
    documentTypesSearched: documentTypes,
  }
}

// ============================================================================
// Strategy-Specific Retrieval Functions
// ============================================================================

/**
 * Retrieve context for name generation
 * Focus: Policies (naming conventions) + Similar products
 */
export async function retrieveForNameGeneration(
  productInfo: {
    name?: string
    description?: string
    manufacturer?: string
    category?: string
  },
  options: RetrievalOptions = {}
): Promise<{
  policies: string[]
  similarProducts: string[]
  sources: string[]
}> {
  const result = await retrieveForStrategy('name_generation', productInfo, {
    ...options,
    documentTypes: ['policy', 'reference'],
    limit: options.limit || 8,
  })

  const policies: string[] = []
  const similarProducts: string[] = []

  for (const doc of result.documents) {
    if (doc.type === 'policy') {
      policies.push(formatForContext(doc, 'policy'))
    } else if (doc.source === 'kb_item') {
      similarProducts.push(formatForContext(doc, 'product'))
    }
  }

  return {
    policies,
    similarProducts,
    sources: result.sources,
  }
}

/**
 * Retrieve context for description enhancement
 * Focus: CQO/QA reports + Policies + Product specs
 */
export async function retrieveForDescriptionEnhancement(
  productInfo: {
    name?: string
    description?: string
    manufacturer?: string
    partNumber?: string
    category?: string
  },
  options: RetrievalOptions = {}
): Promise<{
  cqoReports: string[]
  policies: string[]
  partSheets: string[]
  sources: string[]
}> {
  const result = await retrieveForStrategy('description_enhancement', productInfo, {
    ...options,
    documentTypes: ['cqo_inspection', 'policy', 'part_sheet'],
    limit: options.limit || 12,
  })

  const cqoReports: string[] = []
  const policies: string[] = []
  const partSheets: string[] = []

  for (const doc of result.documents) {
    switch (doc.type) {
      case 'cqo_inspection':
        cqoReports.push(formatForContext(doc, 'cqo'))
        break
      case 'policy':
        policies.push(formatForContext(doc, 'policy'))
        break
      case 'part_sheet':
        partSheets.push(formatForContext(doc, 'spec'))
        break
    }
  }

  return {
    cqoReports,
    policies,
    partSheets,
    sources: result.sources,
  }
}

/**
 * Retrieve context for price lookup
 * Focus: Vendor purchase history with pricing data
 */
export async function retrieveForPriceLookup(
  productInfo: {
    name?: string
    description?: string
    manufacturer?: string
    partNumber?: string
  },
  options: RetrievalOptions = {}
): Promise<{
  purchaseHistory: string[]
  sources: string[]
}> {
  const db = getDatabase()
  const purchaseHistory: string[] = []
  const sources: string[] = []

  // First, try to find direct product matches with prices in KB
  const searchText = [
    productInfo.name,
    productInfo.manufacturer,
    productInfo.partNumber,
  ].filter(Boolean).join(' ')

  const kbResults = await searchKBByText(searchText, 10)

  for (const result of kbResults) {
    if (result.metadata.price_low || result.metadata.price_high) {
      const priceLow = parseFloat(result.metadata.price_low || '0')
      const priceHigh = parseFloat(result.metadata.price_high || '0')

      if (priceLow > 0 || priceHigh > 0) {
        purchaseHistory.push(formatPriceRecord({
          itemName: result.metadata.item_name,
          manufacturer: result.metadata.manufacturer,
          priceLow,
          priceHigh,
          similarity: result.similarity,
        }))
        sources.push(`kb_item:${result.id}`)
      }
    }
  }

  // Also search document chunks for purchase-related info
  const docResult = await retrieveForStrategy('price_lookup', productInfo, {
    ...options,
    documentTypes: ['vendor_purchase'],
    limit: 5,
  })

  for (const doc of docResult.documents) {
    if (doc.type === 'vendor_purchase') {
      purchaseHistory.push(formatForContext(doc, 'purchase'))
    }
  }

  return {
    purchaseHistory: purchaseHistory.slice(0, options.limit || 5),
    sources: [...sources, ...docResult.sources],
  }
}

/**
 * Retrieve context for part number validation
 * Focus: Part sheets + Products with part numbers
 */
export async function retrieveForPartNumberValidation(
  productInfo: {
    name?: string
    category?: string
    manufacturer?: string
    currentPartNumber?: string
  },
  options: RetrievalOptions = {}
): Promise<{
  partSheets: string[]
  similarProducts: string[]
  sources: string[]
}> {
  const result = await retrieveForStrategy('part_number_validation', productInfo, {
    ...options,
    documentTypes: ['part_sheet', 'reference'],
    limit: options.limit || 10,
  })

  const partSheets: string[] = []
  const similarProducts: string[] = []

  for (const doc of result.documents) {
    if (doc.type === 'part_sheet') {
      partSheets.push(formatForContext(doc, 'spec'))
    } else if (doc.source === 'kb_item' && doc.metadata.partNumber) {
      similarProducts.push(formatForContext(doc, 'product_with_part'))
    }
  }

  return {
    partSheets,
    similarProducts,
    sources: result.sources,
  }
}

/**
 * Retrieve context for barcode classification
 * Focus: Category mappings + Similar products
 */
export async function retrieveForBarcodeClassification(
  productInfo: {
    name?: string
    description?: string
    manufacturer?: string
  },
  options: RetrievalOptions = {}
): Promise<{
  categoryPolicies: string[]
  similarProducts: string[]
  sources: string[]
}> {
  const result = await retrieveForStrategy('barcode_classification', productInfo, {
    ...options,
    documentTypes: ['policy', 'reference'],
    limit: options.limit || 8,
  })

  const categoryPolicies: string[] = []
  const similarProducts: string[] = []

  for (const doc of result.documents) {
    if (doc.type === 'policy') {
      categoryPolicies.push(formatForContext(doc, 'policy'))
    } else if (doc.source === 'kb_item') {
      similarProducts.push(formatForContext(doc, 'product'))
    }
  }

  return {
    categoryPolicies,
    similarProducts,
    sources: result.sources,
  }
}

/**
 * Retrieve context for manufacturer identification
 * Focus: Part sheets + Vendor documents
 */
export async function retrieveForManufacturerIdentification(
  productInfo: {
    name?: string
    description?: string
    partNumber?: string
  },
  options: RetrievalOptions = {}
): Promise<{
  partSheets: string[]
  vendorDocs: string[]
  similarProducts: string[]
  sources: string[]
}> {
  const result = await retrieveForStrategy('manufacturer_identification', productInfo, {
    ...options,
    documentTypes: ['part_sheet', 'vendor_purchase'],
    limit: options.limit || 10,
  })

  const partSheets: string[] = []
  const vendorDocs: string[] = []
  const similarProducts: string[] = []

  for (const doc of result.documents) {
    switch (doc.type) {
      case 'part_sheet':
        partSheets.push(formatForContext(doc, 'spec'))
        break
      case 'vendor_purchase':
        vendorDocs.push(formatForContext(doc, 'vendor'))
        break
      default:
        if (doc.source === 'kb_item') {
          similarProducts.push(formatForContext(doc, 'product'))
        }
    }
  }

  return {
    partSheets,
    vendorDocs,
    similarProducts,
    sources: result.sources,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build search query optimized for the retrieval strategy
 */
function buildSearchQuery(
  strategy: RetrievalStrategy,
  productInfo: {
    name?: string
    description?: string
    manufacturer?: string
    partNumber?: string
    category?: string
  }
): string {
  const parts: string[] = []

  switch (strategy) {
    case 'name_generation':
      // Focus on category and type of product
      if (productInfo.category) parts.push(productInfo.category)
      if (productInfo.manufacturer) parts.push(productInfo.manufacturer)
      if (productInfo.description) parts.push(productInfo.description.substring(0, 200))
      parts.push('naming convention product name standard')
      break

    case 'description_enhancement':
      // Focus on specifications and technical details
      if (productInfo.name) parts.push(productInfo.name)
      if (productInfo.manufacturer) parts.push(productInfo.manufacturer)
      if (productInfo.partNumber) parts.push(productInfo.partNumber)
      parts.push('specifications technical details compliance')
      break

    case 'price_lookup':
      // Focus on product identification for price matching
      if (productInfo.name) parts.push(productInfo.name)
      if (productInfo.manufacturer) parts.push(productInfo.manufacturer)
      if (productInfo.partNumber) parts.push(productInfo.partNumber)
      parts.push('price cost purchase quote')
      break

    case 'part_number_validation':
      // Focus on part number patterns and category
      if (productInfo.partNumber) parts.push(productInfo.partNumber)
      if (productInfo.category) parts.push(productInfo.category)
      if (productInfo.manufacturer) parts.push(productInfo.manufacturer)
      parts.push('part number format prefix suffix')
      break

    case 'barcode_classification':
      // Focus on category and classification
      if (productInfo.name) parts.push(productInfo.name)
      if (productInfo.description) parts.push(productInfo.description.substring(0, 200))
      parts.push('category classification barcode prefix')
      break

    case 'manufacturer_identification':
      // Focus on brand and part identification
      if (productInfo.name) parts.push(productInfo.name)
      if (productInfo.partNumber) parts.push(productInfo.partNumber)
      parts.push('manufacturer brand vendor supplier')
      break

    default:
      // General search
      if (productInfo.name) parts.push(productInfo.name)
      if (productInfo.description) parts.push(productInfo.description.substring(0, 200))
  }

  return parts.filter(Boolean).join(' ')
}

/**
 * Format KB item metadata for context
 * Handles both KBItem objects and metadata objects from different sources
 */
function formatKBItemContent(item: Record<string, any>): string {
  const parts: string[] = []

  if (item.item_name) parts.push(`Product: ${item.item_name}`)
  if (item.manufacturer) parts.push(`Manufacturer: ${item.manufacturer}`)
  if (item.category) parts.push(`Category: ${item.category}`)
  // Handle both part_number and manufacturer_part_number
  const partNumber = item.part_number || item.manufacturer_part_number
  if (partNumber) parts.push(`Part Number: ${partNumber}`)
  if (item.price_low || item.price_high) {
    const low = typeof item.price_low === 'number' ? item.price_low : parseFloat(item.price_low || '0')
    const high = typeof item.price_high === 'number' ? item.price_high : parseFloat(item.price_high || item.price_low || '0')
    if (low === high && low > 0) {
      parts.push(`Price: $${low.toFixed(2)}`)
    } else if (low > 0 || high > 0) {
      parts.push(`Price Range: $${low.toFixed(2)} - $${high.toFixed(2)}`)
    }
  }

  return parts.join(' | ')
}

/**
 * Format price record for purchase history context
 */
function formatPriceRecord(record: {
  itemName: string
  manufacturer?: string
  priceLow: number
  priceHigh: number
  similarity: number
}): string {
  const parts: string[] = []

  parts.push(`Product: ${record.itemName}`)
  if (record.manufacturer) parts.push(`Manufacturer: ${record.manufacturer}`)

  if (record.priceLow === record.priceHigh) {
    parts.push(`Price: $${record.priceLow.toFixed(2)}`)
  } else {
    parts.push(`Price Range: $${record.priceLow.toFixed(2)} - $${record.priceHigh.toFixed(2)}`)
  }

  parts.push(`Match: ${Math.round(record.similarity * 100)}%`)

  return parts.join(' | ')
}

/**
 * Format document for context injection
 */
function formatForContext(
  doc: RetrievedDocument,
  format: 'policy' | 'cqo' | 'spec' | 'purchase' | 'vendor' | 'product' | 'product_with_part'
): string {
  const header: string[] = []
  const content = doc.content.substring(0, 800) // Limit content length

  switch (format) {
    case 'policy':
      header.push(`[Policy: ${doc.title}]`)
      if (doc.metadata.documentNumber) header.push(`Doc#: ${doc.metadata.documentNumber}`)
      break

    case 'cqo':
      header.push(`[QA Report: ${doc.title}]`)
      if (doc.metadata.documentNumber) header.push(`Doc#: ${doc.metadata.documentNumber}`)
      if (doc.metadata.approvalStatus) header.push(`Status: ${doc.metadata.approvalStatus}`)
      break

    case 'spec':
      header.push(`[Specification: ${doc.title}]`)
      if (doc.metadata.partNumber) header.push(`Part#: ${doc.metadata.partNumber}`)
      break

    case 'purchase':
      header.push(`[Purchase Record: ${doc.title}]`)
      if (doc.metadata.manufacturer) header.push(`Vendor: ${doc.metadata.manufacturer}`)
      break

    case 'vendor':
      header.push(`[Vendor Document: ${doc.title}]`)
      if (doc.metadata.manufacturer) header.push(`Vendor: ${doc.metadata.manufacturer}`)
      break

    case 'product':
      header.push(`[Similar Product: ${doc.title}]`)
      if (doc.metadata.manufacturer) header.push(`Mfr: ${doc.metadata.manufacturer}`)
      if (doc.metadata.category) header.push(`Cat: ${doc.metadata.category}`)
      break

    case 'product_with_part':
      header.push(`[Product with Part#: ${doc.title}]`)
      if (doc.metadata.partNumber) header.push(`Part#: ${doc.metadata.partNumber}`)
      if (doc.metadata.manufacturer) header.push(`Mfr: ${doc.metadata.manufacturer}`)
      break
  }

  return `${header.join(' | ')}\n${content}`
}

// ============================================================================
// Context Aggregation
// ============================================================================

/**
 * Build complete retrieval context for prompt templates
 */
export async function buildRetrievalContext(
  strategy: RetrievalStrategy,
  productInfo: {
    name?: string
    description?: string
    manufacturer?: string
    partNumber?: string
    category?: string
    currentPrice?: number
  }
): Promise<{
  policies?: string[]
  similarProducts?: string[]
  cqoReports?: string[]
  partSheets?: string[]
  purchaseHistory?: string[]
  sources: string[]
}> {
  switch (strategy) {
    case 'name_generation':
      return retrieveForNameGeneration(productInfo)

    case 'description_enhancement':
      return retrieveForDescriptionEnhancement(productInfo)

    case 'price_lookup':
      return retrieveForPriceLookup(productInfo)

    case 'part_number_validation':
      return retrieveForPartNumberValidation(productInfo)

    case 'barcode_classification':
      return retrieveForBarcodeClassification(productInfo)

    case 'manufacturer_identification':
      return retrieveForManufacturerIdentification(productInfo)

    default:
      // Generic retrieval
      const result = await retrieveForStrategy(strategy, productInfo)
      return {
        similarProducts: result.documents.map(d => formatForContext(d, 'product')),
        sources: result.sources,
      }
  }
}

// ============================================================================
// Utility Exports
// ============================================================================

export {
  STRATEGY_DOCUMENT_TYPES,
  CATEGORY_TO_DOCTYPE,
}
