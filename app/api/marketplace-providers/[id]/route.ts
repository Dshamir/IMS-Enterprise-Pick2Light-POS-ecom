import { NextResponse } from 'next/server'
import {
  getCustomProviderConfigById,
  updateCustomProviderConfig,
  deleteCustomProviderConfig,
  toggleCustomProviderEnabled,
  providerKeyExists
} from '@/lib/services/marketplace-providers/provider-registry'

export const dynamic = 'force-dynamic'

/**
 * GET /api/marketplace-providers/[id]
 * Get a single custom provider
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const provider = getCustomProviderConfigById(id)

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ provider })
  } catch (error) {
    console.error('[MarketplaceProviders] GET by ID error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch provider' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/marketplace-providers/[id]
 * Update a custom provider
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Check if provider exists
    const existing = getCustomProviderConfigById(id)
    if (!existing) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      )
    }

    // If changing provider_key, check for conflicts
    if (body.provider_key && body.provider_key !== existing.provider_key) {
      if (providerKeyExists(body.provider_key)) {
        return NextResponse.json(
          { error: `Provider key "${body.provider_key}" already exists` },
          { status: 409 }
        )
      }
    }

    // Build updates object
    const updates: any = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.provider_key !== undefined) updates.provider_key = body.provider_key
    if (body.provider_type !== undefined) updates.provider_type = body.provider_type
    if (body.description !== undefined) updates.description = body.description
    if (body.base_url !== undefined) updates.base_url = body.base_url
    if (body.http_method !== undefined) updates.http_method = body.http_method
    if (body.auth_method !== undefined) updates.auth_method = body.auth_method
    if (body.auth_header_name !== undefined) updates.auth_header_name = body.auth_header_name
    if (body.auth_query_param !== undefined) updates.auth_query_param = body.auth_query_param
    if (body.request_headers !== undefined) updates.request_headers = body.request_headers
    if (body.response_mapping !== undefined) updates.response_mapping = body.response_mapping
    if (body.url_template_vars !== undefined) updates.url_template_vars = body.url_template_vars
    if (body.is_enabled !== undefined) updates.is_enabled = body.is_enabled ? 1 : 0
    if (body.priority !== undefined) updates.priority = body.priority
    if (body.rate_limit_ms !== undefined) updates.rate_limit_ms = body.rate_limit_ms
    if (body.timeout_ms !== undefined) updates.timeout_ms = body.timeout_ms
    if (body.docs_url !== undefined) updates.docs_url = body.docs_url

    const success = updateCustomProviderConfig(id, updates)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update provider' },
        { status: 500 }
      )
    }

    // Return updated provider
    const updated = getCustomProviderConfigById(id)

    return NextResponse.json({
      provider: updated,
      message: 'Provider updated successfully'
    })
  } catch (error) {
    console.error('[MarketplaceProviders] PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update provider' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/marketplace-providers/[id]
 * Delete a custom provider
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if provider exists
    const existing = getCustomProviderConfigById(id)
    if (!existing) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      )
    }

    const success = deleteCustomProviderConfig(id)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete provider' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Provider deleted successfully'
    })
  } catch (error) {
    console.error('[MarketplaceProviders] DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete provider' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/marketplace-providers/[id]
 * Toggle provider enabled state
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Check if provider exists
    const existing = getCustomProviderConfigById(id)
    if (!existing) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      )
    }

    if (body.action === 'toggle_enabled') {
      const success = toggleCustomProviderEnabled(id)

      if (!success) {
        return NextResponse.json(
          { error: 'Failed to toggle provider' },
          { status: 500 }
        )
      }

      const updated = getCustomProviderConfigById(id)

      return NextResponse.json({
        provider: updated,
        message: `Provider ${updated?.is_enabled ? 'enabled' : 'disabled'} successfully`
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[MarketplaceProviders] PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update provider' },
      { status: 500 }
    )
  }
}
