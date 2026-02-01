/**
 * Feedback Analyzer
 *
 * Analyzes historical AI suggestions to identify patterns, calibrate confidence,
 * and continuously improve KB accuracy.
 *
 * Key Features:
 * - Rejection pattern analysis
 * - Confidence calibration
 * - Field-specific accuracy metrics
 * - KB item quality assessment based on usage
 */

import { getDB } from '../database/sqlite'

// ============================================================================
// Types
// ============================================================================

export interface RejectionPattern {
  field: string
  pattern: string
  frequency: number
  examples: Array<{
    original: string
    suggested: string
    correct?: string
  }>
  recommendation: string
}

export interface ConfidenceCalibration {
  field: string
  confidenceBucket: string
  totalSuggestions: number
  approved: number
  rejected: number
  approvalRate: number
  isCalibrated: boolean
  recommendedThreshold: number
}

export interface FieldAccuracy {
  field: string
  totalSuggestions: number
  approved: number
  rejected: number
  pending: number
  autoApproved: number
  approvalRate: number
  avgConfidence: number
  avgGenerationTimeMs: number
  trend: 'improving' | 'stable' | 'declining'
}

export interface KBItemUsageQuality {
  kbItemId: string
  itemName: string
  timesRetrieved: number
  timesLedToApproval: number
  timesLedToRejection: number
  effectivenessScore: number
  needsImprovement: boolean
}

export interface FeedbackAnalysis {
  overview: {
    totalSuggestions: number
    approvalRate: number
    avgConfidence: number
    topRejectionReasons: string[]
  }
  byField: FieldAccuracy[]
  calibration: ConfidenceCalibration[]
  rejectionPatterns: RejectionPattern[]
  lowQualityKBItems: KBItemUsageQuality[]
  recommendations: string[]
}

// ============================================================================
// Feedback Analysis Functions
// ============================================================================

/**
 * Get comprehensive feedback analysis
 */
export function analyzeFeedback(): FeedbackAnalysis {
  const db = getDB()

  // Check if ai_suggestions table exists
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='ai_suggestions'
  `).get()

  if (!tableExists) {
    return getEmptyAnalysis()
  }

  const overview = getOverviewMetrics(db)
  const byField = getFieldAccuracy(db)
  const calibration = getConfidenceCalibration(db)
  const rejectionPatterns = getRejectionPatterns(db)
  const lowQualityKBItems = getLowQualityKBItems(db)
  const recommendations = generateRecommendations(overview, byField, calibration, rejectionPatterns)

  return {
    overview,
    byField,
    calibration,
    rejectionPatterns,
    lowQualityKBItems,
    recommendations
  }
}

/**
 * Get overview metrics
 */
function getOverviewMetrics(db: any): FeedbackAnalysis['overview'] {
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN review_status IN ('approved', 'auto_approved') THEN 1 ELSE 0 END) as approved,
      AVG(confidence_score) as avg_confidence
    FROM ai_suggestions
  `).get() as { total: number; approved: number; avg_confidence: number }

  // Get top rejection reasons from review_notes
  const rejectionReasons = db.prepare(`
    SELECT review_notes, COUNT(*) as cnt
    FROM ai_suggestions
    WHERE review_status = 'rejected' AND review_notes IS NOT NULL AND review_notes != ''
    GROUP BY review_notes
    ORDER BY cnt DESC
    LIMIT 5
  `).all() as Array<{ review_notes: string; cnt: number }>

  return {
    totalSuggestions: stats.total || 0,
    approvalRate: stats.total > 0 ? (stats.approved / stats.total) * 100 : 0,
    avgConfidence: stats.avg_confidence || 0,
    topRejectionReasons: rejectionReasons.map(r => r.review_notes)
  }
}

/**
 * Get accuracy metrics by field
 */
function getFieldAccuracy(db: any): FieldAccuracy[] {
  const results = db.prepare(`
    SELECT
      field,
      COUNT(*) as total,
      SUM(CASE WHEN review_status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN review_status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN review_status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN review_status = 'auto_approved' THEN 1 ELSE 0 END) as auto_approved,
      AVG(confidence_score) as avg_confidence,
      AVG(generation_time_ms) as avg_time
    FROM ai_suggestions
    GROUP BY field
    ORDER BY total DESC
  `).all() as Array<{
    field: string
    total: number
    approved: number
    rejected: number
    pending: number
    auto_approved: number
    avg_confidence: number
    avg_time: number
  }>

  return results.map(r => ({
    field: r.field,
    totalSuggestions: r.total,
    approved: r.approved,
    rejected: r.rejected,
    pending: r.pending,
    autoApproved: r.auto_approved,
    approvalRate: r.total > 0 ? ((r.approved + r.auto_approved) / r.total) * 100 : 0,
    avgConfidence: r.avg_confidence || 0,
    avgGenerationTimeMs: r.avg_time || 0,
    trend: 'stable' as const // Would need time-series data for real trend
  }))
}

/**
 * Get confidence calibration by field and bucket
 */
function getConfidenceCalibration(db: any): ConfidenceCalibration[] {
  const results = db.prepare(`
    SELECT
      field,
      CASE
        WHEN confidence_score >= 0.9 THEN '0.9-1.0'
        WHEN confidence_score >= 0.8 THEN '0.8-0.9'
        WHEN confidence_score >= 0.7 THEN '0.7-0.8'
        WHEN confidence_score >= 0.6 THEN '0.6-0.7'
        WHEN confidence_score >= 0.5 THEN '0.5-0.6'
        ELSE '0.0-0.5'
      END as bucket,
      COUNT(*) as total,
      SUM(CASE WHEN review_status IN ('approved', 'auto_approved') THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN review_status = 'rejected' THEN 1 ELSE 0 END) as rejected
    FROM ai_suggestions
    WHERE review_status != 'pending'
    GROUP BY field, bucket
    ORDER BY field, bucket DESC
  `).all() as Array<{
    field: string
    bucket: string
    total: number
    approved: number
    rejected: number
  }>

  return results.map(r => {
    const approvalRate = r.total > 0 ? (r.approved / r.total) * 100 : 0
    // Well-calibrated if approval rate roughly matches confidence bucket
    const bucketMidpoint = getBucketMidpoint(r.bucket)
    const isCalibrated = Math.abs(approvalRate - (bucketMidpoint * 100)) < 15

    return {
      field: r.field,
      confidenceBucket: r.bucket,
      totalSuggestions: r.total,
      approved: r.approved,
      rejected: r.rejected,
      approvalRate,
      isCalibrated,
      recommendedThreshold: calculateRecommendedThreshold(approvalRate, bucketMidpoint)
    }
  })
}

function getBucketMidpoint(bucket: string): number {
  const map: Record<string, number> = {
    '0.9-1.0': 0.95,
    '0.8-0.9': 0.85,
    '0.7-0.8': 0.75,
    '0.6-0.7': 0.65,
    '0.5-0.6': 0.55,
    '0.0-0.5': 0.25
  }
  return map[bucket] || 0.5
}

function calculateRecommendedThreshold(approvalRate: number, currentMidpoint: number): number {
  // If approval rate is low for high-confidence suggestions, recommend higher threshold
  if (approvalRate < 70 && currentMidpoint > 0.7) {
    return Math.min(0.95, currentMidpoint + 0.1)
  }
  // If approval rate is high for low-confidence suggestions, threshold might be too high
  if (approvalRate > 90 && currentMidpoint < 0.7) {
    return Math.max(0.5, currentMidpoint - 0.05)
  }
  return currentMidpoint
}

/**
 * Identify rejection patterns
 */
function getRejectionPatterns(db: any): RejectionPattern[] {
  const patterns: RejectionPattern[] = []

  // Pattern 1: Price suggestions that are way off
  const pricePatterns = db.prepare(`
    SELECT
      original_value,
      suggested_value,
      review_notes
    FROM ai_suggestions
    WHERE field = 'price' AND review_status = 'rejected'
    LIMIT 20
  `).all() as Array<{ original_value: string; suggested_value: string; review_notes: string }>

  if (pricePatterns.length > 3) {
    patterns.push({
      field: 'price',
      pattern: 'Price mismatch',
      frequency: pricePatterns.length,
      examples: pricePatterns.slice(0, 3).map(p => ({
        original: p.original_value,
        suggested: p.suggested_value,
        correct: p.review_notes
      })),
      recommendation: 'Review KB items used for price lookup. Consider stricter similarity threshold for price retrieval.'
    })
  }

  // Pattern 2: Name generation issues
  const namePatterns = db.prepare(`
    SELECT
      original_value,
      suggested_value,
      review_notes
    FROM ai_suggestions
    WHERE field = 'name' AND review_status = 'rejected'
    LIMIT 20
  `).all() as Array<{ original_value: string; suggested_value: string; review_notes: string }>

  if (namePatterns.length > 3) {
    patterns.push({
      field: 'name',
      pattern: 'Naming convention mismatch',
      frequency: namePatterns.length,
      examples: namePatterns.slice(0, 3).map(p => ({
        original: p.original_value,
        suggested: p.suggested_value,
        correct: p.review_notes
      })),
      recommendation: 'Update naming convention rules in prompt templates. Add rejected names to banned patterns.'
    })
  }

  // Pattern 3: Category/barcode misclassification
  const categoryPatterns = db.prepare(`
    SELECT
      original_value,
      suggested_value,
      review_notes
    FROM ai_suggestions
    WHERE field IN ('barcode', 'category') AND review_status = 'rejected'
    LIMIT 20
  `).all() as Array<{ original_value: string; suggested_value: string; review_notes: string }>

  if (categoryPatterns.length > 3) {
    patterns.push({
      field: 'barcode/category',
      pattern: 'Misclassification',
      frequency: categoryPatterns.length,
      examples: categoryPatterns.slice(0, 3).map(p => ({
        original: p.original_value,
        suggested: p.suggested_value,
        correct: p.review_notes
      })),
      recommendation: 'Review category prefix mappings. Consider adding more specific subcategories.'
    })
  }

  return patterns
}

/**
 * Identify KB items that frequently lead to rejections
 */
function getLowQualityKBItems(db: any): KBItemUsageQuality[] {
  // This requires parsing retrieval_sources JSON field
  // For now, return placeholder - would need proper implementation
  try {
    const results = db.prepare(`
      SELECT
        retrieval_sources,
        review_status
      FROM ai_suggestions
      WHERE retrieval_sources IS NOT NULL AND retrieval_sources != ''
      LIMIT 1000
    `).all() as Array<{ retrieval_sources: string; review_status: string }>

    // Parse and aggregate KB item usage
    const kbItemStats = new Map<string, { approved: number; rejected: number; name: string }>()

    for (const row of results) {
      try {
        const sources = JSON.parse(row.retrieval_sources)
        if (Array.isArray(sources)) {
          for (const source of sources) {
            const id = source.id || source.kbItemId || source
            if (typeof id === 'string') {
              const existing = kbItemStats.get(id) || { approved: 0, rejected: 0, name: source.name || id }
              if (row.review_status === 'rejected') {
                existing.rejected++
              } else if (row.review_status === 'approved' || row.review_status === 'auto_approved') {
                existing.approved++
              }
              kbItemStats.set(id, existing)
            }
          }
        }
      } catch {
        // Skip malformed JSON
      }
    }

    // Convert to array and filter low quality items
    return Array.from(kbItemStats.entries())
      .map(([id, stats]) => {
        const total = stats.approved + stats.rejected
        const effectivenessScore = total > 0 ? stats.approved / total : 0.5
        return {
          kbItemId: id,
          itemName: stats.name,
          timesRetrieved: total,
          timesLedToApproval: stats.approved,
          timesLedToRejection: stats.rejected,
          effectivenessScore,
          needsImprovement: effectivenessScore < 0.5 && total >= 3
        }
      })
      .filter(item => item.needsImprovement)
      .sort((a, b) => a.effectivenessScore - b.effectivenessScore)
      .slice(0, 20)
  } catch {
    return []
  }
}

/**
 * Generate actionable recommendations
 */
function generateRecommendations(
  overview: FeedbackAnalysis['overview'],
  byField: FieldAccuracy[],
  calibration: ConfidenceCalibration[],
  patterns: RejectionPattern[]
): string[] {
  const recommendations: string[] = []

  // Overall accuracy
  if (overview.approvalRate < 70) {
    recommendations.push(`⚠️ Overall approval rate is ${overview.approvalRate.toFixed(1)}%. Consider reviewing prompt templates and retrieval strategies.`)
  }

  // Field-specific issues
  for (const field of byField) {
    if (field.approvalRate < 60 && field.totalSuggestions >= 10) {
      recommendations.push(`🔴 ${field.field}: Low approval rate (${field.approvalRate.toFixed(1)}%). Review ${field.field}-specific prompts and KB items.`)
    }
  }

  // Calibration issues
  const miscalibratedFields = calibration.filter(c => !c.isCalibrated && c.totalSuggestions >= 5)
  if (miscalibratedFields.length > 0) {
    const fields = [...new Set(miscalibratedFields.map(c => c.field))]
    recommendations.push(`📊 Confidence miscalibration detected for: ${fields.join(', ')}. Adjust auto-approval thresholds.`)
  }

  // Pattern-specific recommendations
  for (const pattern of patterns) {
    recommendations.push(`📝 ${pattern.field}: ${pattern.recommendation}`)
  }

  // General recommendations if none specific
  if (recommendations.length === 0) {
    recommendations.push('✅ KB performance looks healthy. Continue monitoring for trends.')
  }

  return recommendations
}

function getEmptyAnalysis(): FeedbackAnalysis {
  return {
    overview: {
      totalSuggestions: 0,
      approvalRate: 0,
      avgConfidence: 0,
      topRejectionReasons: []
    },
    byField: [],
    calibration: [],
    rejectionPatterns: [],
    lowQualityKBItems: [],
    recommendations: ['No AI suggestion data available yet. Start using AI features to collect feedback data.']
  }
}

// ============================================================================
// Feedback Recording
// ============================================================================

export interface SuggestionFeedback {
  suggestionId: string
  feedbackType: 'content_wrong' | 'confidence_mismatch' | 'context_missing' | 'format_error' | 'other'
  specificIssue?: string
  correctedValue?: string
}

/**
 * Record detailed feedback for a suggestion
 */
export function recordSuggestionFeedback(feedback: SuggestionFeedback): boolean {
  try {
    const db = getDB()

    // Check if feedback table exists, create if not
    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_suggestion_feedback (
        id TEXT PRIMARY KEY,
        suggestion_id TEXT NOT NULL,
        feedback_type TEXT NOT NULL,
        specific_issue TEXT,
        corrected_value TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (suggestion_id) REFERENCES ai_suggestions(id)
      )
    `)

    const id = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    db.prepare(`
      INSERT INTO ai_suggestion_feedback (id, suggestion_id, feedback_type, specific_issue, corrected_value)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, feedback.suggestionId, feedback.feedbackType, feedback.specificIssue || null, feedback.correctedValue || null)

    return true
  } catch (error) {
    console.error('[Feedback Analyzer] Error recording feedback:', error)
    return false
  }
}

/**
 * Get feedback statistics
 */
export function getFeedbackStats(): {
  byType: Record<string, number>
  total: number
  recentFeedback: Array<{ type: string; issue: string; created: string }>
} {
  try {
    const db = getDB()

    const byType = db.prepare(`
      SELECT feedback_type, COUNT(*) as cnt
      FROM ai_suggestion_feedback
      GROUP BY feedback_type
    `).all() as Array<{ feedback_type: string; cnt: number }>

    const recent = db.prepare(`
      SELECT feedback_type, specific_issue, created_at
      FROM ai_suggestion_feedback
      ORDER BY created_at DESC
      LIMIT 10
    `).all() as Array<{ feedback_type: string; specific_issue: string; created_at: string }>

    return {
      byType: Object.fromEntries(byType.map(r => [r.feedback_type, r.cnt])),
      total: byType.reduce((sum, r) => sum + r.cnt, 0),
      recentFeedback: recent.map(r => ({
        type: r.feedback_type,
        issue: r.specific_issue || '',
        created: r.created_at
      }))
    }
  } catch {
    return { byType: {}, total: 0, recentFeedback: [] }
  }
}
