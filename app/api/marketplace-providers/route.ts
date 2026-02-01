import { NextResponse } from 'next/server'
import {
  getBuiltinProviders,
  getCustomProviderConfigs,
  createCustomProviderConfig,
  providerKeyExists,
  invalidateProviderCache
} from '@/lib/services/marketplace-providers/provider-registry'
import { ResponseMapping } from '@/lib/services/marketplace-providers/custom-provider'

export const dynamic = 'force-dynamic'

/**
 * GET /api/marketplace-providers
 * List all providers (built-in + custom)
 */
export async function GET() {
  try {
    // Get built-in providers
    const builtinProviders = getBuiltinProviders().map(p => ({
      key: p.key,
      name: p.name,
      type: p.type,
      isBuiltin: true,
      isConfigured: p.isConfigured()
    }))

    // Get custom providers
    const customProviders = getCustomProviderConfigs().map(p => ({
      id: p.id,
      key: p.provider_key,
      name: p.name,
      type: p.provider_type,
      description: p.description,
      base_url: p.base_url,
      http_method: p.http_method,
      auth_method: p.auth_method,
      auth_header_name: p.auth_header_name,
      auth_query_param: p.auth_query_param,
      response_mapping: p.response_mapping,
      is_enabled: p.is_enabled === 1,
      priority: p.priority,
      docs_url: p.docs_url,
      isBuiltin: false
    }))

    return NextResponse.json({
      builtin: builtinProviders,
      custom: customProviders,
      total: builtinProviders.length + customProviders.length
    })
  } catch (error) {
    console.error('[MarketplaceProviders] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/marketplace-providers
 * Create a new custom provider
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.provider_key || !body.base_url || !body.response_mapping) {
      return NextResponse.json(
        { error: 'Missing required fields: name, provider_key, base_url, response_mapping' },
        { status: 400 }
      )
    }

    // Validate provider key format (alphanumeric + underscore)
    if (!/^[a-z][a-z0-9_]*$/.test(body.provider_key)) {
      return NextResponse.json(
        { error: 'Provider key must start with a letter and contain only lowercase letters, numbers, and underscores' },
        { status: 400 }
      )
    }

    // Check if key already exists
    if (providerKeyExists(body.provider_key)) {
      return NextResponse.json(
        { error: `Provider key "${body.provider_key}" already exists` },
        { status: 409 }
      )
    }

    // Validate response mapping
    const responseMapping: ResponseMapping = body.response_mapping
    if (!responseMapping.listings || !responseMapping.title || !responseMapping.price) {
      return NextResponse.json(
        { error: 'Response mapping must include: listings, title, price' },
        { status: 400 }
      )
    }

    // Create the provider
    const provider = createCustomProviderConfig({
      name: body.name,
      provider_key: body.provider_key,
      provider_type: body.provider_type || 'api',
      description: body.description || null,
      base_url: body.base_url,
      http_method: body.http_method || 'GET',
      auth_method: body.auth_method || 'none',
      auth_header_name: body.auth_header_name || null,
      auth_query_param: body.auth_query_param || null,
      request_headers: body.request_headers || null,
      response_mapping: responseMapping,
      url_template_vars: body.url_template_vars || null,
      is_enabled: body.is_enabled !== false ? 1 : 0,
      priority: body.priority || 50,
      rate_limit_ms: body.rate_limit_ms || 1000,
      timeout_ms: body.timeout_ms || 10000,
      docs_url: body.docs_url || null
    })

    return NextResponse.json({
      provider,
      message: 'Provider created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('[MarketplaceProviders] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create provider' },
      { status: 500 }
    )
  }
}
