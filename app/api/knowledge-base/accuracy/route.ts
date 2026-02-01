/**
 * KB Accuracy Monitoring API
 *
 * Provides comprehensive metrics and management for KB training and accuracy.
 *
 * GET /api/knowledge-base/accuracy
 *   - Full accuracy report with feedback analysis
 *   - KB quality summary
 *   - Negative example stats
 *   - Recommendations
 *
 * POST /api/knowledge-base/accuracy/learn
 *   - Trigger learning from historical rejections
 *
 * POST /api/knowledge-base/accuracy/negative-example
 *   - Add a new negative example manually
 *
 * GET /api/knowledge-base/accuracy/quality
 *   - Get KB item quality scores
 */

import { NextRequest, NextResponse } from 'next/server'
import { analyzeFeedback, type FeedbackAnalysis } from '@/lib/knowledge-base/feedback-analyzer'
import { scoreAllKBItems, getLowQualityItems, type QualitySummary } from '@/lib/knowledge-base/kb-quality-scorer'
import {
  getNegativeExampleStats,
  learnFromHistoricalRejections,
  addNegativeExample,
  getAllNegativeExamples
} from '@/lib/knowledge-base/negative-examples'
import { getCacheStats } from '@/lib/knowledge-base/search-cache'
import { getHybridSearchStats } from '@/lib/knowledge-base/hybrid-search'

// ============================================================================
// GET - Full Accuracy Report
// ============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const section = searchParams.get('section')

  try {
    // Return specific section if requested
    if (section === 'feedback') {
      const feedback = analyzeFeedback()
      return NextResponse.json(feedback)
    }

    if (section === 'quality') {
      const { summary } = scoreAllKBItems()
      const lowQuality = getLowQualityItems(0.5, 20)
      return NextResponse.json({ summary, lowQualityItems: lowQuality })
    }

    if (section === 'negative-examples') {
      const stats = getNegativeExampleStats()
      const examples = getAllNegativeExamples().slice(0, 50)
      return NextResponse.json({ stats, examples })
    }

    if (section === 'cache') {
      const cacheStats = getCacheStats()
      return NextResponse.json(cacheStats)
    }

    // Full report
    const report = generateFullAccuracyReport()
    return NextResponse.json(report)

  } catch (error: any) {
    console.error('[Accuracy API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate accuracy report', details: error.message },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST - Actions
// ============================================================================

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  try {
    const body = await request.json().catch(() => ({}))

    // Learn from historical rejections
    if (action === 'learn') {
      const result = learnFromHistoricalRejections()
      return NextResponse.json({
        success: true,
        message: `Learned from ${result.learned} rejections, skipped ${result.skipped}`,
        ...result
      })
    }

    // Add negative example manually
    if (action === 'negative-example') {
      if (!body.field || !body.wrongValue || !body.reason) {
        return NextResponse.json(
          { error: 'Missing required fields: field, wrongValue, reason' },
          { status: 400 }
        )
      }

      const example = addNegativeExample({
        field: body.field,
        wrongValue: body.wrongValue,
        correctValue: body.correctValue,
        reason: body.reason,
        patternType: body.patternType || 'exact'
      })

      return NextResponse.json({
        success: true,
        message: 'Negative example added',
        example
      })
    }

    return NextResponse.json(
      { error: 'Unknown action. Valid actions: learn, negative-example' },
      { status: 400 }
    )

  } catch (error: any) {
    console.error('[Accuracy API] POST Error:', error)
    return NextResponse.json(
      { error: 'Action failed', details: error.message },
      { status: 500 }
    )
  }
}

// ============================================================================
// Full Report Generation
// ============================================================================

interface FullAccuracyReport {
  generatedAt: string
  summary: {
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor'
    overallScore: number
    totalKBItems: number
    totalDocuments: number
    suggestionsToday: number
    approvalRateLast7Days: number
  }
  feedback: FeedbackAnalysis
  kbQuality: QualitySummary
  negativeExamples: {
    totalPatterns: number
    byField: Record<string, { count: number; totalRejections: number }>
    topIssues: Array<{ field: string; wrongValue: string; frequency: number }>
  }
  searchPerformance: {
    cacheHitRate: number
    avgSearchTimeMs: number
    hybridSearchEnabled: boolean
  }
  recommendations: string[]
}

function generateFullAccuracyReport(): FullAccuracyReport {
  // Gather all metrics
  const feedback = analyzeFeedback()
  const { summary: kbQuality } = scoreAllKBItems()
  const negativeStats = getNegativeExampleStats()
  const cacheStats = getCacheStats()

  let hybridEnabled = false
  try {
    const hybridStats = getHybridSearchStats()
    hybridEnabled = hybridStats.ftsIndexExists
  } catch {
    // Hybrid search might not be available
  }

  // Calculate overall health
  const approvalRate = feedback.overview.approvalRate
  const avgQuality = kbQuality.avgScore
  const cacheHitRate = cacheStats.results.hitRate

  let overallScore = (approvalRate / 100 * 0.4) + (avgQuality * 0.4) + (cacheHitRate * 0.2)
  let overallHealth: 'excellent' | 'good' | 'fair' | 'poor'

  if (overallScore >= 0.8) overallHealth = 'excellent'
  else if (overallScore >= 0.6) overallHealth = 'good'
  else if (overallScore >= 0.4) overallHealth = 'fair'
  else overallHealth = 'poor'

  // Compile recommendations
  const recommendations: string[] = [...feedback.recommendations]

  // Add quality-based recommendations
  if (kbQuality.avgScore < 0.6) {
    recommendations.push(`📊 KB Quality is ${(kbQuality.avgScore * 100).toFixed(0)}%. Focus on improving ${kbQuality.topIssues[0]?.issue || 'item completeness'}.`)
  }

  // Add cache recommendations
  if (cacheHitRate < 0.3) {
    recommendations.push('⚡ Cache hit rate is low. Consider warming cache with common queries.')
  }

  // Add negative example recommendations
  if (negativeStats.totalPatterns > 20) {
    recommendations.push(`🚫 ${negativeStats.totalPatterns} negative patterns tracked. Review and consolidate if needed.`)
  }

  // Add hybrid search recommendation
  if (!hybridEnabled) {
    recommendations.push('🔍 Enable hybrid search (FTS5 index) for better keyword matching.')
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      overallHealth,
      overallScore,
      totalKBItems: kbQuality.totalItems,
      totalDocuments: 0, // Would need document count
      suggestionsToday: 0, // Would need today's count
      approvalRateLast7Days: approvalRate
    },
    feedback,
    kbQuality,
    negativeExamples: {
      totalPatterns: negativeStats.totalPatterns,
      byField: negativeStats.byField,
      topIssues: negativeStats.mostFrequent
    },
    searchPerformance: {
      cacheHitRate,
      avgSearchTimeMs: 0, // Would need performance tracking
      hybridSearchEnabled: hybridEnabled
    },
    recommendations
  }
}
