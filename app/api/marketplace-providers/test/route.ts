import { NextResponse } from 'next/server'
import { getProviderByKey } from '@/lib/services/marketplace-providers/provider-registry'
import {
  createCustomProvider,
  CustomProviderConfig,
  ResponseMapping
} from '@/lib/services/marketplace-providers/custom-provider'

export const dynamic = 'force-dynamic'

/**
 * POST /api/marketplace-providers/test
 * Test a provider connection
 *
 * Two modes:
 * 1. Test existing provider by key: { provider_key: "my_provider" }
 * 2. Test new provider config before saving: { config: { ... } }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Mode 1: Test existing provider by key
    if (body.provider_key) {
      const provider = getProviderByKey(body.provider_key)

      if (!provider) {
        return NextResponse.json(
          { success: false, message: `Provider "${body.provider_key}" not found` },
          { status: 404 }
        )
      }

      const result = await provider.testConnection()

      return NextResponse.json({
        success: result.success,
        message: result.message,
        provider: body.provider_key
      })
    }

    // Mode 2: Test new provider config (for preview before saving)
    if (body.config) {
      const config = body.config as Partial<CustomProviderConfig>

      // Validate required fields
      if (!config.name || !config.base_url || !config.response_mapping) {
        return NextResponse.json(
          { success: false, message: 'Missing required fields: name, base_url, response_mapping' },
          { status: 400 }
        )
      }

      // Create a temporary provider for testing
      const testConfig: CustomProviderConfig = {
        id: 'test-temp',
        name: config.name,
        provider_key: config.provider_key || 'test_provider',
        provider_type: config.provider_type || 'api',
        description: config.description || null,
        base_url: config.base_url,
        http_method: config.http_method || 'GET',
        auth_method: config.auth_method || 'none',
        auth_header_name: config.auth_header_name || null,
        auth_query_param: config.auth_query_param || null,
        request_headers: config.request_headers || null,
        response_mapping: config.response_mapping as ResponseMapping,
        url_template_vars: config.url_template_vars || null,
        is_enabled: 1,
        priority: 50,
        rate_limit_ms: config.rate_limit_ms || 1000,
        timeout_ms: config.timeout_ms || 10000,
        docs_url: config.docs_url || null
      }

      // If auth is required and api_key is provided in the request, use it directly
      // (since it won't be in the database yet)
      const tempProvider = createCustomProvider(testConfig)

      // For testing, we need to handle the API key specially
      // Override the isConfigured check for testing
      const testQuery = body.test_query || 'test item'

      try {
        // Make a test search
        const searchResult = await tempProvider.search(testQuery, { maxResults: 5 })

        if (searchResult.success) {
          return NextResponse.json({
            success: true,
            message: `Connection successful! Found ${searchResult.data?.listingCount || 0} results for "${testQuery}"`,
            sample_data: {
              listingCount: searchResult.data?.listingCount,
              avgPrice: searchResult.data?.avgPrice,
              firstListing: searchResult.data?.listings?.[0] || null
            }
          })
        }

        return NextResponse.json({
          success: false,
          message: searchResult.error || 'Connection failed - no results returned'
        })

      } catch (error) {
        return NextResponse.json({
          success: false,
          message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }

    return NextResponse.json(
      { success: false, message: 'Must provide either provider_key or config' },
      { status: 400 }
    )

  } catch (error) {
    console.error('[MarketplaceProviders] Test error:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Test failed' },
      { status: 500 }
    )
  }
}
