import { NextResponse } from 'next/server'
import { exportProducts, generateBulkExport } from '@/lib/services/forsale-export'
import { getForSaleByProductId } from '@/lib/services/forsale-service'
import { ForSalePlatform } from '@/lib/services/forsale-config'

/**
 * POST /api/for-sale/export/bulk
 *
 * Export multiple products to all marketplace formats as a ZIP.
 *
 * Request body:
 * - productIds: string[] - Array of product IDs to export
 * - platforms: ('ebay' | 'facebook' | 'craigslist')[] - Target platforms (default: all)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      productIds,
      platforms = ['ebay', 'facebook', 'craigslist'] as ForSalePlatform[],
    } = body

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'productIds must be a non-empty array' },
        { status: 400 }
      )
    }

    // Validate all products exist and are ready
    const errors: string[] = []
    const validProductIds: string[] = []

    for (const productId of productIds) {
      const forSaleItem = getForSaleByProductId(productId)
      if (!forSaleItem) {
        errors.push(`Product ${productId} not found in for-sale listings`)
        continue
      }
      if (forSaleItem.status === 'pending') {
        errors.push(`Product ${productId} is not optimized yet`)
        continue
      }
      validProductIds.push(productId)
    }

    if (validProductIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No valid products to export',
          details: errors,
        },
        { status: 400 }
      )
    }

    // Generate bulk export
    const result = exportProducts(validProductIds, platforms)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    // Return the ZIP content
    // The content is a Buffer containing JSON with the files
    return new NextResponse(result.content as Buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/json', // Our "zip" is actually JSON for client-side processing
        'Content-Disposition': `attachment; filename="${result.filename.replace('.zip', '.json')}"`,
        'X-Export-Count': String(validProductIds.length),
        'X-Export-Errors': String(errors.length),
      },
    })
  } catch (error) {
    console.error('Error exporting products:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export products',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/for-sale/export/bulk
 *
 * Preview bulk export (get summary without generating files)
 *
 * Query params:
 * - productIds: comma-separated product IDs
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const productIdsParam = searchParams.get('productIds')

    if (!productIdsParam) {
      return NextResponse.json(
        { success: false, error: 'productIds query param is required' },
        { status: 400 }
      )
    }

    const productIds = productIdsParam.split(',').map(id => id.trim()).filter(Boolean)

    if (productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No product IDs provided' },
        { status: 400 }
      )
    }

    // Get summary info for each product
    const items: Array<{
      productId: string
      title: string
      status: string
      ready: boolean
    }> = []

    for (const productId of productIds) {
      const forSaleItem = getForSaleByProductId(productId)
      if (forSaleItem) {
        items.push({
          productId,
          title: forSaleItem.marketplace_title || forSaleItem.product_name || 'Untitled',
          status: forSaleItem.status,
          ready: forSaleItem.status !== 'pending',
        })
      } else {
        items.push({
          productId,
          title: 'Not found',
          status: 'not_found',
          ready: false,
        })
      }
    }

    const readyCount = items.filter(i => i.ready).length
    const notReadyCount = items.filter(i => !i.ready).length

    return NextResponse.json({
      success: true,
      summary: {
        total: items.length,
        ready: readyCount,
        notReady: notReadyCount,
      },
      items,
      formats: ['ebay-csv', 'facebook-text', 'craigslist-text'],
    })
  } catch (error) {
    console.error('Error generating bulk export preview:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate preview',
      },
      { status: 500 }
    )
  }
}
