import { NextResponse } from "next/server"
import {
  getMarketPrice,
  searchAllProviders,
  getEnabledProviders,
  testAllProviders
} from "@/lib/services/marketplace-providers"
import { getForSaleByProductId } from "@/lib/services/forsale-service"

/**
 * POST /api/for-sale/market-data
 *
 * Fetch market data for a product or search query using the provider fallback chain.
 *
 * Request body:
 * - productId: string (optional) - For-sale product ID
 * - query: string (optional) - Search query (used if no productId)
 * - forceProvider: string (optional) - Force a specific provider
 * - skipCache: boolean (optional) - Bypass cache
 * - searchAll: boolean (optional) - Search all providers in parallel
 * - action: 'fetch' | 'providers' | 'test' (optional, default: 'fetch')
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      productId,
      query,
      forceProvider,
      skipCache = false,
      searchAll = false,
      action = "fetch",
      condition,
      maxResults
    } = body

    // Handle provider management actions
    if (action === "providers") {
      const providers = getEnabledProviders()
      return NextResponse.json({
        success: true,
        action: "providers",
        providers: providers.map(p => ({
          name: p.name,
          key: p.key,
          type: p.type,
          configured: p.isConfigured()
        }))
      })
    }

    if (action === "test") {
      const results = await testAllProviders()
      return NextResponse.json({
        success: true,
        action: "test",
        results
      })
    }

    // Fetch market data
    let searchQuery: string
    let productForSaleId: string | null = null

    if (productId) {
      // Get product name from for-sale record
      const forSaleItem = getForSaleByProductId(productId)
      if (!forSaleItem) {
        return NextResponse.json(
          { error: "Product not found in for-sale listings" },
          { status: 404 }
        )
      }

      searchQuery = forSaleItem.marketplace_title || forSaleItem.product_name || productId
      productForSaleId = forSaleItem.id
    } else if (query) {
      searchQuery = query
    } else {
      return NextResponse.json(
        { error: "Either productId or query is required" },
        { status: 400 }
      )
    }

    // Build search options
    const options = {
      condition: condition as 'new' | 'used' | 'any' | undefined,
      maxResults: maxResults || 50,
      skipCache,
      forceProvider
    }

    // Search all providers in parallel if requested
    if (searchAll) {
      const { results, combined } = await searchAllProviders(searchQuery, options)

      console.log("[market-data] searchAll results:", results.map(r => ({
        provider: r.provider,
        success: r.success,
        error: r.error,
        avgPrice: r.data?.avgPrice,
        listingCount: r.data?.listingCount
      })))

      return NextResponse.json({
        success: true,
        productId,
        productForSaleId,
        query: searchQuery,
        searchAll: true,
        results: results.map(r => ({
          provider: r.provider,
          success: r.success,
          error: r.error,
          source: r.source,
          confidence: r.confidence,
          responseTime: r.responseTime,
          listingCount: r.data?.listingCount || 0,
          avgPrice: r.data?.avgPrice || 0,
          minPrice: r.data?.minPrice || 0,
          maxPrice: r.data?.maxPrice || 0
        })),
        combined
      })
    }

    // Use fallback chain (default behavior)
    const result = await getMarketPrice(searchQuery, options)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        productId,
        productForSaleId,
        query: searchQuery,
        error: result.error,
        provider: result.provider
      })
    }

    return NextResponse.json({
      success: true,
      productId,
      productForSaleId,
      query: searchQuery,
      provider: result.provider,
      source: result.source,
      confidence: result.confidence,
      responseTime: result.responseTime,
      data: result.data
    })
  } catch (error) {
    console.error("Error fetching market data:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch market data",
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/for-sale/market-data
 *
 * Get provider status and configuration
 */
export async function GET() {
  try {
    const providers = getEnabledProviders()

    return NextResponse.json({
      success: true,
      providers: providers.map(p => ({
        name: p.name,
        key: p.key,
        type: p.type,
        configured: p.isConfigured()
      })),
      fallbackChain: 'eBay → Facebook → Craigslist → Amazon → SerpAPI → OpenAI'
    })
  } catch (error) {
    console.error("Error getting market data status:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get status",
      },
      { status: 500 }
    )
  }
}
