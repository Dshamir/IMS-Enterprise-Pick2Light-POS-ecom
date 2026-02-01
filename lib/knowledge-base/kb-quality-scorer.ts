/**
 * KB Quality Scorer
 *
 * Scores KB items and documents based on completeness, accuracy, and usage patterns.
 * Used for:
 * - Reranking search results (prefer high-quality items)
 * - Identifying items needing improvement
 * - Prioritizing KB maintenance tasks
 */

import { getDB } from '../database/sqlite'

// ============================================================================
// Types
// ============================================================================

export interface KBItemQualityScore {
  id: string
  itemName: string
  // Completeness scores (0-1)
  hasDescription: boolean
  hasManufacturer: boolean
  hasPartNumber: boolean
  hasBarcode: boolean
  hasPricing: boolean
  hasCategory: boolean
  hasEmbedding: boolean
  completenessScore: number
  // Content quality (0-1)
  descriptionLength: number
  descriptionQuality: 'poor' | 'basic' | 'good' | 'excellent'
  contentScore: number
  // Usage effectiveness (0-1)
  timesRetrieved: number
  approvalRate: number
  usageScore: number
  // Overall score (weighted average)
  overallScore: number
  // Recommendations
  improvements: string[]
}

export interface DocumentQualityScore {
  id: string
  title: string
  // Completeness
  hasCategory: boolean
  hasChunks: boolean
  hasEmbeddings: boolean
  chunkCount: number
  completenessScore: number
  // Content quality
  avgChunkLength: number
  hasStructure: boolean
  contentScore: number
  // Usage
  timesSearched: number
  usageScore: number
  // Overall
  overallScore: number
  improvements: string[]
}

export interface QualitySummary {
  totalItems: number
  avgScore: number
  distribution: {
    excellent: number  // 0.8+
    good: number       // 0.6-0.8
    fair: number       // 0.4-0.6
    poor: number       // <0.4
  }
  topIssues: Array<{
    issue: string
    affectedItems: number
    severity: 'high' | 'medium' | 'low'
  }>
  improvementPriorities: Array<{
    itemId: string
    itemName: string
    currentScore: number
    potentialGain: number
    suggestedAction: string
  }>
}

// ============================================================================
// Scoring Weights
// ============================================================================

const WEIGHTS = {
  completeness: 0.35,
  content: 0.35,
  usage: 0.30
}

const COMPLETENESS_WEIGHTS = {
  description: 0.25,
  manufacturer: 0.15,
  partNumber: 0.15,
  barcode: 0.10,
  pricing: 0.15,
  category: 0.10,
  embedding: 0.10
}

// ============================================================================
// KB Item Scoring
// ============================================================================

/**
 * Score a single KB item
 */
export function scoreKBItem(item: {
  id: string
  item_name: string
  description?: string | null
  manufacturer?: string | null
  manufacturer_part_number?: string | null
  barcode?: string | null
  price_low?: number | null
  price_high?: number | null
  category?: string | null
  has_embedding?: boolean
}, usageStats?: { retrieved: number; approved: number; rejected: number }): KBItemQualityScore {
  const improvements: string[] = []

  // Completeness checks
  const hasDescription = !!(item.description && item.description.length > 10)
  const hasManufacturer = !!(item.manufacturer && item.manufacturer.length > 0)
  const hasPartNumber = !!(item.manufacturer_part_number && item.manufacturer_part_number.length > 0)
  const hasBarcode = !!(item.barcode && item.barcode.length > 0)
  const hasPricing = item.price_low !== null || item.price_high !== null
  const hasCategory = !!(item.category && item.category.length > 0)
  const hasEmbedding = !!item.has_embedding

  // Calculate completeness score
  const completenessScore =
    (hasDescription ? COMPLETENESS_WEIGHTS.description : 0) +
    (hasManufacturer ? COMPLETENESS_WEIGHTS.manufacturer : 0) +
    (hasPartNumber ? COMPLETENESS_WEIGHTS.partNumber : 0) +
    (hasBarcode ? COMPLETENESS_WEIGHTS.barcode : 0) +
    (hasPricing ? COMPLETENESS_WEIGHTS.pricing : 0) +
    (hasCategory ? COMPLETENESS_WEIGHTS.category : 0) +
    (hasEmbedding ? COMPLETENESS_WEIGHTS.embedding : 0)

  // Track missing fields
  if (!hasDescription) improvements.push('Add description (high impact)')
  if (!hasManufacturer) improvements.push('Add manufacturer')
  if (!hasPartNumber) improvements.push('Add part number')
  if (!hasPricing) improvements.push('Add pricing information')
  if (!hasCategory) improvements.push('Assign category')
  if (!hasEmbedding) improvements.push('Generate embedding for search')

  // Content quality
  const descriptionLength = item.description?.length || 0
  let descriptionQuality: 'poor' | 'basic' | 'good' | 'excellent' = 'poor'
  let contentScore = 0

  if (descriptionLength > 200) {
    descriptionQuality = 'excellent'
    contentScore = 1.0
  } else if (descriptionLength > 100) {
    descriptionQuality = 'good'
    contentScore = 0.75
  } else if (descriptionLength > 30) {
    descriptionQuality = 'basic'
    contentScore = 0.5
  } else if (descriptionLength > 0) {
    descriptionQuality = 'poor'
    contentScore = 0.25
    improvements.push('Expand description (currently too short)')
  }

  // Usage effectiveness
  let usageScore = 0.5 // Default neutral if no usage data
  let timesRetrieved = 0
  let approvalRate = 0

  if (usageStats && usageStats.retrieved > 0) {
    timesRetrieved = usageStats.retrieved
    approvalRate = (usageStats.approved / usageStats.retrieved) * 100
    usageScore = approvalRate / 100

    if (approvalRate < 50 && timesRetrieved >= 5) {
      improvements.push(`Low approval rate (${approvalRate.toFixed(0)}%) - review content accuracy`)
    }
  }

  // Calculate overall score
  const overallScore =
    (completenessScore * WEIGHTS.completeness) +
    (contentScore * WEIGHTS.content) +
    (usageScore * WEIGHTS.usage)

  return {
    id: item.id,
    itemName: item.item_name,
    hasDescription,
    hasManufacturer,
    hasPartNumber,
    hasBarcode,
    hasPricing,
    hasCategory,
    hasEmbedding,
    completenessScore,
    descriptionLength,
    descriptionQuality,
    contentScore,
    timesRetrieved,
    approvalRate,
    usageScore,
    overallScore,
    improvements
  }
}

/**
 * Score all KB items and return summary
 */
export function scoreAllKBItems(): {
  scores: KBItemQualityScore[]
  summary: QualitySummary
} {
  const db = getDB()

  // Get all KB items
  const items = db.prepare(`
    SELECT id, item_name, description, manufacturer, manufacturer_part_number,
           barcode, price_low, price_high, category, has_embedding
    FROM kb_items
    LIMIT 10000
  `).all() as Array<{
    id: string
    item_name: string
    description: string | null
    manufacturer: string | null
    manufacturer_part_number: string | null
    barcode: string | null
    price_low: number | null
    price_high: number | null
    category: string | null
    has_embedding: boolean
  }>

  // Get usage stats from ai_suggestions if available
  const usageMap = new Map<string, { retrieved: number; approved: number; rejected: number }>()
  try {
    const usageRows = db.prepare(`
      SELECT
        retrieval_sources,
        review_status
      FROM ai_suggestions
      WHERE retrieval_sources IS NOT NULL
    `).all() as Array<{ retrieval_sources: string; review_status: string }>

    for (const row of usageRows) {
      try {
        const sources = JSON.parse(row.retrieval_sources)
        if (Array.isArray(sources)) {
          for (const source of sources) {
            const id = typeof source === 'string' ? source : source.id
            if (id) {
              const existing = usageMap.get(id) || { retrieved: 0, approved: 0, rejected: 0 }
              existing.retrieved++
              if (row.review_status === 'approved' || row.review_status === 'auto_approved') {
                existing.approved++
              } else if (row.review_status === 'rejected') {
                existing.rejected++
              }
              usageMap.set(id, existing)
            }
          }
        }
      } catch {
        // Skip malformed JSON
      }
    }
  } catch {
    // ai_suggestions table might not exist
  }

  // Score each item
  const scores = items.map(item => scoreKBItem(item, usageMap.get(item.id)))

  // Calculate summary
  const summary = calculateQualitySummary(scores)

  return { scores, summary }
}

/**
 * Calculate quality summary from scores
 */
function calculateQualitySummary(scores: KBItemQualityScore[]): QualitySummary {
  const totalItems = scores.length
  const avgScore = scores.reduce((sum, s) => sum + s.overallScore, 0) / (totalItems || 1)

  // Distribution
  const distribution = {
    excellent: scores.filter(s => s.overallScore >= 0.8).length,
    good: scores.filter(s => s.overallScore >= 0.6 && s.overallScore < 0.8).length,
    fair: scores.filter(s => s.overallScore >= 0.4 && s.overallScore < 0.6).length,
    poor: scores.filter(s => s.overallScore < 0.4).length
  }

  // Top issues
  const issueCount = {
    'Missing description': scores.filter(s => !s.hasDescription).length,
    'Missing manufacturer': scores.filter(s => !s.hasManufacturer).length,
    'Missing part number': scores.filter(s => !s.hasPartNumber).length,
    'Missing pricing': scores.filter(s => !s.hasPricing).length,
    'Missing category': scores.filter(s => !s.hasCategory).length,
    'No embedding': scores.filter(s => !s.hasEmbedding).length,
    'Low approval rate': scores.filter(s => s.approvalRate < 50 && s.timesRetrieved >= 5).length
  }

  const topIssues = Object.entries(issueCount)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([issue, affectedItems]) => ({
      issue,
      affectedItems,
      severity: (affectedItems / totalItems > 0.3 ? 'high' :
                 affectedItems / totalItems > 0.1 ? 'medium' : 'low') as 'high' | 'medium' | 'low'
    }))

  // Improvement priorities (items with low score but high potential)
  const improvementPriorities = scores
    .filter(s => s.overallScore < 0.6 && s.improvements.length > 0)
    .map(s => ({
      itemId: s.id,
      itemName: s.itemName,
      currentScore: s.overallScore,
      potentialGain: Math.min(0.3, (1 - s.overallScore) * 0.5),
      suggestedAction: s.improvements[0]
    }))
    .sort((a, b) => b.potentialGain - a.potentialGain)
    .slice(0, 10)

  return {
    totalItems,
    avgScore,
    distribution,
    topIssues,
    improvementPriorities
  }
}

/**
 * Get low-quality items that need attention
 */
export function getLowQualityItems(threshold: number = 0.5, limit: number = 50): KBItemQualityScore[] {
  const { scores } = scoreAllKBItems()

  return scores
    .filter(s => s.overallScore < threshold)
    .sort((a, b) => a.overallScore - b.overallScore)
    .slice(0, limit)
}

/**
 * Get quality score for a specific item
 */
export function getItemQualityScore(itemId: string): KBItemQualityScore | null {
  const db = getDB()

  const item = db.prepare(`
    SELECT id, item_name, description, manufacturer, manufacturer_part_number,
           barcode, price_low, price_high, category, has_embedding
    FROM kb_items
    WHERE id = ?
  `).get(itemId) as {
    id: string
    item_name: string
    description: string | null
    manufacturer: string | null
    manufacturer_part_number: string | null
    barcode: string | null
    price_low: number | null
    price_high: number | null
    category: string | null
    has_embedding: boolean
  } | undefined

  if (!item) return null

  return scoreKBItem(item)
}

// ============================================================================
// Document Quality Scoring
// ============================================================================

/**
 * Score a document's quality
 */
export function scoreDocument(docId: string): DocumentQualityScore | null {
  const db = getDB()

  const doc = db.prepare(`
    SELECT id, title, category, processing_status
    FROM kb_documents
    WHERE id = ?
  `).get(docId) as {
    id: string
    title: string
    category: string | null
    processing_status: string
  } | undefined

  if (!doc) return null

  // Get chunk info
  const chunkStats = db.prepare(`
    SELECT
      COUNT(*) as chunk_count,
      AVG(LENGTH(content)) as avg_length,
      SUM(CASE WHEN has_embedding = 1 THEN 1 ELSE 0 END) as with_embeddings
    FROM kb_document_chunks
    WHERE document_id = ?
  `).get(docId) as { chunk_count: number; avg_length: number; with_embeddings: number }

  const improvements: string[] = []

  // Completeness
  const hasCategory = !!doc.category
  const hasChunks = chunkStats.chunk_count > 0
  const hasEmbeddings = chunkStats.with_embeddings > 0

  if (!hasCategory) improvements.push('Assign document category')
  if (!hasChunks) improvements.push('Document needs processing')
  if (hasChunks && !hasEmbeddings) improvements.push('Generate embeddings for chunks')

  const completenessScore =
    (hasCategory ? 0.3 : 0) +
    (hasChunks ? 0.4 : 0) +
    (hasEmbeddings ? 0.3 : 0)

  // Content quality
  const avgChunkLength = chunkStats.avg_length || 0
  const hasStructure = chunkStats.chunk_count > 1

  let contentScore = 0
  if (avgChunkLength > 500) contentScore = 1.0
  else if (avgChunkLength > 200) contentScore = 0.7
  else if (avgChunkLength > 50) contentScore = 0.4
  else contentScore = 0.1

  if (avgChunkLength < 100) improvements.push('Chunks are too short - consider re-chunking')

  // Usage (placeholder - would need search log tracking)
  const usageScore = 0.5
  const timesSearched = 0

  const overallScore =
    (completenessScore * 0.4) +
    (contentScore * 0.4) +
    (usageScore * 0.2)

  return {
    id: doc.id,
    title: doc.title,
    hasCategory,
    hasChunks,
    hasEmbeddings,
    chunkCount: chunkStats.chunk_count,
    completenessScore,
    avgChunkLength,
    hasStructure,
    contentScore,
    timesSearched,
    usageScore,
    overallScore,
    improvements
  }
}

/**
 * Get quality scores for all documents
 */
export function scoreAllDocuments(): DocumentQualityScore[] {
  const db = getDB()

  try {
    const docs = db.prepare(`
      SELECT id FROM kb_documents LIMIT 1000
    `).all() as Array<{ id: string }>

    return docs
      .map(doc => scoreDocument(doc.id))
      .filter((score): score is DocumentQualityScore => score !== null)
  } catch {
    return []
  }
}
