/**
 * Knowledge Base Answer Feedback API
 *
 * POST - Record feedback (thumbs up/down) for an extracted answer
 * GET - Get feedback statistics
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  recordFeedback,
  getFeedbackStats,
  getAnswersByFeedback,
  generateQueryHash,
  generateAnswerHash
} from '@/lib/knowledge-base/answer-feedback'
import { learnFromAnswerFeedback } from '@/lib/knowledge-base/negative-examples'
import { invalidateResultsCache } from '@/lib/knowledge-base/search-cache'

/**
 * POST /api/knowledge-base/answer/feedback
 *
 * Record user feedback for an extracted answer
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { query, answer, isPositive, comment, sourceType, sourceId, confidenceScore } = body

    // Validate required fields
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      )
    }

    if (!answer || typeof answer !== 'string') {
      return NextResponse.json(
        { error: 'Answer is required and must be a string' },
        { status: 400 }
      )
    }

    if (typeof isPositive !== 'boolean') {
      return NextResponse.json(
        { error: 'isPositive is required and must be a boolean' },
        { status: 400 }
      )
    }

    // Record the feedback
    const feedback = recordFeedback({
      query,
      answer,
      isPositive,
      comment: comment || undefined,
      sourceType: sourceType || undefined,
      sourceId: sourceId || undefined,
      confidenceScore: confidenceScore !== undefined ? Number(confidenceScore) : undefined
    })

    // If negative feedback, auto-learn to avoid similar bad answers in the future
    let learnedPattern = null
    if (!isPositive) {
      try {
        learnedPattern = learnFromAnswerFeedback({
          query,
          badAnswer: answer,
          comment: comment || undefined,
          sourceType: sourceType || undefined,
          confidence: confidenceScore !== undefined ? Number(confidenceScore) : undefined
        })

        if (learnedPattern) {
          console.log(`[Feedback API] Learned negative example for query: "${query.substring(0, 50)}..."`)
          // Invalidate cache so future searches don't return the same bad answer
          invalidateResultsCache()
        }
      } catch (learnError) {
        // Don't fail the feedback recording if learning fails
        console.error('[Feedback API] Failed to learn from negative feedback:', learnError)
      }
    }

    return NextResponse.json({
      success: true,
      feedback: {
        id: feedback.id,
        isPositive: feedback.is_positive,
        queryHash: feedback.query_hash,
        answerHash: feedback.answer_hash,
        createdAt: feedback.created_at
      },
      learned: learnedPattern ? {
        patternId: learnedPattern.id,
        field: learnedPattern.field,
        frequency: learnedPattern.frequency
      } : null
    })
  } catch (error: any) {
    console.error('Error recording answer feedback:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to record feedback' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/knowledge-base/answer/feedback
 *
 * Get feedback statistics or filter by positive/negative
 *
 * Query params:
 * - filter: 'positive' | 'negative' | undefined (for stats)
 * - limit: number (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    // If filter is specified, return filtered feedback
    if (filter === 'positive') {
      const feedback = getAnswersByFeedback(true, limit)
      return NextResponse.json({
        filter: 'positive',
        count: feedback.length,
        feedback
      })
    }

    if (filter === 'negative') {
      const feedback = getAnswersByFeedback(false, limit)
      return NextResponse.json({
        filter: 'negative',
        count: feedback.length,
        feedback
      })
    }

    // Default: return stats
    const stats = getFeedbackStats()

    return NextResponse.json({
      stats: {
        total: stats.total,
        positive: stats.positive,
        negative: stats.negative,
        positiveRate: Math.round(stats.positiveRate * 10) / 10, // Round to 1 decimal
        positiveRateFormatted: `${Math.round(stats.positiveRate)}%`
      },
      recentFeedback: stats.recentFeedback.slice(0, 5).map(f => ({
        id: f.id,
        query: f.query.substring(0, 100) + (f.query.length > 100 ? '...' : ''),
        isPositive: f.is_positive,
        createdAt: f.created_at
      })),
      topQueriesWithNegativeFeedback: stats.topQueriesWithNegativeFeedback.slice(0, 5)
    })
  } catch (error: any) {
    console.error('Error getting answer feedback:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get feedback' },
      { status: 500 }
    )
  }
}
