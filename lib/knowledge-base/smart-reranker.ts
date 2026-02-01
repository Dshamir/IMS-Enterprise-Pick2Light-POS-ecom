/**
 * Smart Reranker
 *
 * Reranks search results using multiple signals:
 * - KB item quality scores
 * - Semantic similarity
 * - Keyword match strength
 * - Recency/freshness
 * - Usage effectiveness
 * - Diversity (avoid redundant results)
 *
 * This significantly improves search relevance beyond raw similarity scores.
 */

import { getItemQualityScore, type KBItemQualityScore } from './kb-quality-scorer'

// ============================================================================
// Types
// ============================================================================

export interface RerankableResult {
  id: string
  item_name?: string
  title?: string
  similarity: number
  keywordScore?: number
  content?: string
  metadata?: Record<string, any>
}

export interface RerankedResult extends RerankableResult {
  // Original scores
  originalRank: number
  originalSimilarity: number
  // Reranking components
  qualityScore: number
  diversityPenalty: number
  boostFactors: string[]
  // Final score
  rerankScore: number
  newRank: number
}

export interface RerankOptions {
  // Weight configuration
  weights?: {
    similarity?: number    // Default 0.40
    quality?: number       // Default 0.25
    keyword?: number       // Default 0.20
    freshness?: number     // Default 0.10
    diversity?: number     // Default 0.05
  }
  // Diversity settings
  diversityThreshold?: number  // Similarity threshold for duplicate detection (default 0.9)
  diversityPenalty?: number    // Penalty for similar results (default 0.3)
  // Boosting rules
  boostExactMatch?: boolean    // Boost results with exact query term match
  boostManufacturer?: string   // Boost results from specific manufacturer
  boostCategory?: string       // Boost results in specific category
  // Result limits
  maxResults?: number
}

// ============================================================================
// Default Weights
// ============================================================================

const DEFAULT_WEIGHTS = {
  similarity: 0.40,
  quality: 0.25,
  keyword: 0.20,
  freshness: 0.10,
  diversity: 0.05
}

// ============================================================================
// Reranking Functions
// ============================================================================

/**
 * Rerank search results using multiple signals
 */
export function rerankResults(
  results: RerankableResult[],
  query: string,
  options: RerankOptions = {}
): RerankedResult[] {
  const weights = { ...DEFAULT_WEIGHTS, ...options.weights }
  const diversityThreshold = options.diversityThreshold ?? 0.9
  const diversityPenaltyValue = options.diversityPenalty ?? 0.3
  const maxResults = options.maxResults ?? results.length

  // Cache quality scores
  const qualityCache = new Map<string, number>()

  // Process each result
  const rerankedResults: RerankedResult[] = results.map((result, originalRank) => {
    const boostFactors: string[] = []
    let qualityScore = 0.5 // Default neutral quality

    // 1. Get quality score
    try {
      if (!qualityCache.has(result.id)) {
        const quality = getItemQualityScore(result.id)
        qualityCache.set(result.id, quality?.overallScore ?? 0.5)
      }
      qualityScore = qualityCache.get(result.id) || 0.5
    } catch {
      // Quality scoring not available
    }

    // 2. Apply boosting rules
    let boostMultiplier = 1.0

    // Exact match boost
    if (options.boostExactMatch) {
      const name = result.item_name || result.title || ''
      const queryLower = query.toLowerCase()
      if (name.toLowerCase().includes(queryLower)) {
        boostMultiplier *= 1.2
        boostFactors.push('exact_match')
      }
    }

    // Manufacturer boost
    if (options.boostManufacturer && result.metadata?.manufacturer) {
      if (result.metadata.manufacturer.toLowerCase() === options.boostManufacturer.toLowerCase()) {
        boostMultiplier *= 1.15
        boostFactors.push('manufacturer_match')
      }
    }

    // Category boost
    if (options.boostCategory && result.metadata?.category) {
      if (result.metadata.category.toLowerCase() === options.boostCategory.toLowerCase()) {
        boostMultiplier *= 1.1
        boostFactors.push('category_match')
      }
    }

    // 3. Calculate keyword component
    const keywordScore = result.keywordScore ?? calculateKeywordScore(result, query)

    // 4. Calculate freshness (if available)
    const freshnessScore = calculateFreshnessScore(result)

    // 5. Calculate base rerank score (before diversity penalty)
    const baseScore = (
      (result.similarity * weights.similarity) +
      (qualityScore * weights.quality) +
      (keywordScore * weights.keyword) +
      (freshnessScore * weights.freshness)
    ) * boostMultiplier

    return {
      ...result,
      originalRank,
      originalSimilarity: result.similarity,
      qualityScore,
      diversityPenalty: 0, // Will be calculated in next step
      boostFactors,
      rerankScore: baseScore,
      newRank: 0 // Will be assigned after sorting
    }
  })

  // 6. Apply diversity penalty (penalize results too similar to higher-ranked ones)
  const sortedByScore = [...rerankedResults].sort((a, b) => b.rerankScore - a.rerankScore)

  for (let i = 0; i < sortedByScore.length; i++) {
    const current = sortedByScore[i]

    // Check similarity to all higher-ranked results
    for (let j = 0; j < i; j++) {
      const higher = sortedByScore[j]
      const textSimilarity = calculateTextSimilarity(
        current.item_name || current.title || '',
        higher.item_name || higher.title || ''
      )

      if (textSimilarity > diversityThreshold) {
        current.diversityPenalty = Math.max(current.diversityPenalty, diversityPenaltyValue)
        current.boostFactors.push('diversity_penalty')
        break
      }
    }

    // Apply diversity penalty to final score
    current.rerankScore = current.rerankScore * (1 - current.diversityPenalty * weights.diversity)
  }

  // 7. Final sort and assign ranks
  sortedByScore.sort((a, b) => b.rerankScore - a.rerankScore)
  sortedByScore.forEach((result, index) => {
    result.newRank = index
  })

  return sortedByScore.slice(0, maxResults)
}

/**
 * Calculate keyword match score for a result
 */
function calculateKeywordScore(result: RerankableResult, query: string): number {
  const searchText = [
    result.item_name,
    result.title,
    result.content,
    result.metadata?.manufacturer,
    result.metadata?.category
  ].filter(Boolean).join(' ').toLowerCase()

  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2)

  if (queryTerms.length === 0) return 0.5

  let matchedTerms = 0
  for (const term of queryTerms) {
    if (searchText.includes(term)) {
      matchedTerms++
    }
  }

  return matchedTerms / queryTerms.length
}

/**
 * Calculate freshness score based on update time
 */
function calculateFreshnessScore(result: RerankableResult): number {
  // If we have updated_at metadata, use it
  const updatedAt = result.metadata?.updated_at || result.metadata?.created_at

  if (!updatedAt) return 0.5 // Neutral if no date

  try {
    const updateDate = new Date(updatedAt)
    const now = new Date()
    const daysSinceUpdate = (now.getTime() - updateDate.getTime()) / (1000 * 60 * 60 * 24)

    // Recent items get higher scores
    if (daysSinceUpdate < 7) return 1.0
    if (daysSinceUpdate < 30) return 0.8
    if (daysSinceUpdate < 90) return 0.6
    if (daysSinceUpdate < 365) return 0.4
    return 0.2
  } catch {
    return 0.5
  }
}

/**
 * Calculate text similarity between two strings (simple Jaccard-like)
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/))
  const words2 = new Set(text2.toLowerCase().split(/\s+/))

  if (words1.size === 0 || words2.size === 0) return 0

  const intersection = [...words1].filter(w => words2.has(w)).length
  const union = new Set([...words1, ...words2]).size

  return intersection / union
}

// ============================================================================
// Specialized Rerankers
// ============================================================================

/**
 * Rerank for price lookup (prioritize items with pricing info)
 */
export function rerankForPriceLookup(
  results: RerankableResult[],
  query: string,
  preferredManufacturer?: string
): RerankedResult[] {
  return rerankResults(results, query, {
    weights: {
      similarity: 0.35,
      quality: 0.30,  // Higher quality weight
      keyword: 0.20,
      freshness: 0.15, // Fresher prices preferred
      diversity: 0.00
    },
    boostExactMatch: true,
    boostManufacturer: preferredManufacturer,
    diversityThreshold: 0.95 // Allow similar items for price comparison
  })
}

/**
 * Rerank for description generation (prioritize diverse, high-quality content)
 */
export function rerankForDescription(
  results: RerankableResult[],
  query: string,
  category?: string
): RerankedResult[] {
  return rerankResults(results, query, {
    weights: {
      similarity: 0.30,
      quality: 0.35,  // Quality descriptions matter most
      keyword: 0.15,
      freshness: 0.05,
      diversity: 0.15 // Want diverse information
    },
    boostCategory: category,
    diversityPenalty: 0.4 // Strong diversity enforcement
  })
}

/**
 * Rerank for barcode classification (prioritize category matches)
 */
export function rerankForBarcode(
  results: RerankableResult[],
  query: string,
  expectedCategory?: string
): RerankedResult[] {
  return rerankResults(results, query, {
    weights: {
      similarity: 0.40,
      quality: 0.20,
      keyword: 0.25,  // Keywords matter for classification
      freshness: 0.05,
      diversity: 0.10
    },
    boostCategory: expectedCategory,
    boostExactMatch: true
  })
}

/**
 * Rerank for general search (balanced approach)
 */
export function rerankForGeneralSearch(
  results: RerankableResult[],
  query: string
): RerankedResult[] {
  return rerankResults(results, query, {
    // Use defaults
    boostExactMatch: true,
    diversityThreshold: 0.85
  })
}

// ============================================================================
// Analysis Functions
// ============================================================================

/**
 * Analyze reranking impact
 */
export function analyzeRerankingImpact(
  original: RerankableResult[],
  reranked: RerankedResult[]
): {
  avgRankChange: number
  maxRankChange: number
  qualityImprovement: number
  diversityScore: number
  boostBreakdown: Record<string, number>
} {
  let totalRankChange = 0
  let maxRankChange = 0
  const boostBreakdown: Record<string, number> = {}

  for (const result of reranked) {
    const rankChange = Math.abs(result.originalRank - result.newRank)
    totalRankChange += rankChange
    maxRankChange = Math.max(maxRankChange, rankChange)

    for (const boost of result.boostFactors) {
      boostBreakdown[boost] = (boostBreakdown[boost] || 0) + 1
    }
  }

  // Calculate quality improvement (avg quality of top 5 original vs reranked)
  const topOriginal = original.slice(0, 5)
  const topReranked = reranked.slice(0, 5)

  let originalQuality = 0
  let rerankedQuality = 0

  for (let i = 0; i < 5; i++) {
    if (topOriginal[i]) {
      const score = getItemQualityScore(topOriginal[i].id)
      originalQuality += score?.overallScore ?? 0.5
    }
    if (topReranked[i]) {
      rerankedQuality += topReranked[i].qualityScore
    }
  }

  // Diversity score (1 - avg similarity between adjacent results)
  let diversityScore = 1.0
  if (reranked.length > 1) {
    let totalSim = 0
    for (let i = 1; i < Math.min(reranked.length, 10); i++) {
      totalSim += calculateTextSimilarity(
        reranked[i].item_name || reranked[i].title || '',
        reranked[i-1].item_name || reranked[i-1].title || ''
      )
    }
    diversityScore = 1 - (totalSim / Math.min(reranked.length - 1, 9))
  }

  return {
    avgRankChange: reranked.length > 0 ? totalRankChange / reranked.length : 0,
    maxRankChange,
    qualityImprovement: (rerankedQuality - originalQuality) / 5,
    diversityScore,
    boostBreakdown
  }
}
