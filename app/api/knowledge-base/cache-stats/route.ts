/**
 * Knowledge Base Cache Stats API
 *
 * GET - Get cache performance statistics
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCacheStats, cleanupCaches, clearAllCaches } from '@/lib/knowledge-base/search-cache'

// OpenAI embedding cost estimate (per 1K tokens, text-embedding-ada-002)
const EMBEDDING_COST_PER_1K_TOKENS = 0.0001 // $0.0001 per 1K tokens
const AVG_TOKENS_PER_QUERY = 20 // Average tokens in a search query

/**
 * GET /api/knowledge-base/cache-stats
 *
 * Returns cache performance metrics including:
 * - Embedding cache hits/misses
 * - Results cache hits/misses
 * - Hit rates
 * - Estimated cost savings
 */
export async function GET(request: NextRequest) {
  try {
    const stats = getCacheStats()

    // Calculate estimated API savings
    const embeddingCalls = stats.embedding.hits + stats.embedding.misses
    const callsSaved = stats.embedding.hits
    const estimatedTokensSaved = callsSaved * AVG_TOKENS_PER_QUERY
    const estimatedCostSaved = (estimatedTokensSaved / 1000) * EMBEDDING_COST_PER_1K_TOKENS

    // Calculate AI call savings from answer cache
    const answerCallsSaved = stats.answer?.hits || 0
    const totalAnswerCalls = (stats.answer?.hits || 0) + (stats.answer?.misses || 0)

    return NextResponse.json({
      embedding: {
        hits: stats.embedding.hits,
        misses: stats.embedding.misses,
        size: stats.embedding.size,
        hitRate: Math.round(stats.embedding.hitRate * 100),
        hitRateFormatted: `${Math.round(stats.embedding.hitRate * 100)}%`,
        evictions: stats.embedding.evictions,
      },
      results: {
        hits: stats.results.hits,
        misses: stats.results.misses,
        size: stats.results.size,
        hitRate: Math.round(stats.results.hitRate * 100),
        hitRateFormatted: `${Math.round(stats.results.hitRate * 100)}%`,
        evictions: stats.results.evictions,
      },
      answer: {
        hits: stats.answer?.hits || 0,
        misses: stats.answer?.misses || 0,
        size: stats.answer?.size || 0,
        hitRate: Math.round((stats.answer?.hitRate || 0) * 100),
        hitRateFormatted: `${Math.round((stats.answer?.hitRate || 0) * 100)}%`,
        evictions: stats.answer?.evictions || 0,
      },
      version: stats.version,
      savings: {
        embeddingCallsSaved: callsSaved,
        totalEmbeddingCalls: embeddingCalls,
        estimatedTokensSaved,
        estimatedCostSaved: `$${estimatedCostSaved.toFixed(4)}`,
        costSavingsRate: embeddingCalls > 0
          ? `${Math.round((callsSaved / embeddingCalls) * 100)}%`
          : '0%',
        answerCallsSaved,
        totalAnswerCalls,
        answerCacheRate: totalAnswerCalls > 0
          ? `${Math.round((answerCallsSaved / totalAnswerCalls) * 100)}%`
          : '0%'
      }
    })
  } catch (error: any) {
    console.error('Error getting cache stats:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get cache stats' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/knowledge-base/cache-stats
 *
 * Cache management actions:
 * - action: 'cleanup' - Clean expired entries
 * - action: 'clear' - Clear all caches
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'cleanup') {
      const cleaned = cleanupCaches()
      return NextResponse.json({
        success: true,
        action: 'cleanup',
        cleaned: {
          embedding: cleaned.embedding,
          results: cleaned.results,
          total: cleaned.embedding + cleaned.results
        }
      })
    }

    if (action === 'clear') {
      clearAllCaches()
      return NextResponse.json({
        success: true,
        action: 'clear',
        message: 'All caches cleared'
      })
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "cleanup" or "clear"' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Error managing cache:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to manage cache' },
      { status: 500 }
    )
  }
}
