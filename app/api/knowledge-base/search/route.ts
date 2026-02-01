/**
 * Knowledge Base Search API
 *
 * GET: Semantic search using vector embeddings
 *
 * Query Parameters:
 * - q: Search query (required)
 * - limit: Number of results (default: 10)
 * - scope: 'all' | 'products' | 'documents' (default: 'all')
 * - category: Filter documents by category (optional)
 */

import { NextResponse } from 'next/server'
import { searchKBByText, checkKBVectorSearchHealth } from '@/lib/knowledge-base/kb-vector-search'
import { getKBItem } from '@/lib/knowledge-base/kb-database'
import { unifiedSearch, getUnifiedSearchStats, type SearchScope } from '@/lib/knowledge-base/unified-search'
import { logSearch } from '@/lib/knowledge-base/search-analytics'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '10')
    const scope = (searchParams.get('scope') || 'all') as SearchScope
    const category = searchParams.get('category') || undefined

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      )
    }

    const startTime = Date.now()

    // Check search availability
    const stats = await getUnifiedSearchStats()

    // If scope is 'all' or 'documents', use unified search
    if (scope === 'all' || scope === 'documents') {
      // Use unified search for combined results
      const unifiedResults = await unifiedSearch(query, {
        scope,
        limit,
        documentCategory: category,
        minSimilarity: 0.1,
      })

      const responseTimeMs = Date.now() - startTime

      // Log search for analytics (non-blocking)
      try {
        logSearch({
          query,
          resultsCount: unifiedResults.length,
          responseTimeMs,
          cached: false,
          searchType: 'hybrid',
          filtersUsed: category ? { category } : undefined
        })
      } catch (e) {
        // Don't fail the search if logging fails
        console.error('[Search] Failed to log analytics:', e)
      }

      return NextResponse.json({
        query,
        scope,
        results: unifiedResults,
        total: unifiedResults.length,
        search_type: 'unified_semantic',
        responseTimeMs,
        stats: {
          productsAvailable: stats.productsAvailable,
          documentsAvailable: stats.documentsAvailable,
        }
      })
    }

    // For products-only scope, use original KB search with full item details
    const health = await checkKBVectorSearchHealth()
    if (!health.available) {
      return NextResponse.json(
        {
          error: 'Semantic search is not available',
          fallback_hint: 'Use /api/knowledge-base/items?query= for basic text search'
        },
        { status: 503 }
      )
    }

    // Perform semantic search
    const vectorResults = await searchKBByText(query, limit)

    // Fetch full item details for each result
    const results = []
    for (const result of vectorResults) {
      const item = getKBItem(result.id)
      if (item) {
        results.push({
          ...item,
          similarity: result.similarity,
          similarity_percent: Math.round(result.similarity * 100)
        })
      }
    }

    const responseTimeMs = Date.now() - startTime

    // Log search for analytics (non-blocking)
    try {
      logSearch({
        query,
        resultsCount: results.length,
        responseTimeMs,
        cached: false,
        searchType: 'semantic'
      })
    } catch (e) {
      // Don't fail the search if logging fails
      console.error('[Search] Failed to log analytics:', e)
    }

    return NextResponse.json({
      query,
      scope,
      results,
      total: results.length,
      search_type: 'semantic',
      responseTimeMs,
      stats: {
        productsAvailable: stats.productsAvailable,
        documentsAvailable: stats.documentsAvailable,
      }
    })
  } catch (error: any) {
    console.error('Error in KB search:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}
