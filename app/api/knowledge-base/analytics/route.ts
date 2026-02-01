/**
 * Knowledge Base Analytics API
 *
 * GET - Retrieve analytics summary and metrics
 * POST - Log a search (internal use)
 * DELETE - Cleanup old analytics data
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getAnalyticsSummary,
  logSearch,
  getTopQueries,
  getZeroResultQueries,
  cleanupOldAnalytics,
  exportAnalytics
} from '@/lib/knowledge-base/search-analytics'

/**
 * GET /api/knowledge-base/analytics
 *
 * Query params:
 * - type: 'summary' | 'top-queries' | 'zero-results' | 'export'
 * - limit: number (for top-queries, zero-results, export)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'summary'
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    switch (type) {
      case 'summary':
        return NextResponse.json(getAnalyticsSummary())

      case 'top-queries':
        return NextResponse.json({
          queries: getTopQueries(limit)
        })

      case 'zero-results':
        return NextResponse.json({
          queries: getZeroResultQueries(limit)
        })

      case 'export':
        return NextResponse.json({
          data: exportAnalytics(limit)
        })

      default:
        return NextResponse.json(
          { error: 'Invalid type. Use: summary, top-queries, zero-results, export' },
          { status: 400 }
        )
    }
  } catch (error: any) {
    console.error('[Analytics API] GET Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get analytics' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/knowledge-base/analytics
 *
 * Log a search event
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      query,
      resultsCount,
      responseTimeMs,
      cached = false,
      searchType = 'semantic',
      filtersUsed,
      userSession
    } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    const entry = logSearch({
      query,
      resultsCount: resultsCount || 0,
      responseTimeMs: responseTimeMs || 0,
      cached,
      searchType,
      filtersUsed,
      userSession
    })

    return NextResponse.json({
      success: true,
      entry: {
        id: entry.id,
        query: entry.query,
        resultsCount: entry.results_count,
        responseTimeMs: entry.response_time_ms,
        cached: entry.cached
      }
    })
  } catch (error: any) {
    console.error('[Analytics API] POST Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to log search' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/knowledge-base/analytics
 *
 * Cleanup old analytics data
 * Query params:
 * - keepDays: number (default 90)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const keepDays = parseInt(searchParams.get('keepDays') || '90', 10)

    const deleted = cleanupOldAnalytics(keepDays)

    return NextResponse.json({
      success: true,
      deleted,
      message: `Deleted ${deleted} analytics entries older than ${keepDays} days`
    })
  } catch (error: any) {
    console.error('[Analytics API] DELETE Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cleanup analytics' },
      { status: 500 }
    )
  }
}
