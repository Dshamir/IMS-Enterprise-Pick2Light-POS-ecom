import { NextResponse } from 'next/server'
import { exportProduct, generateFacebookTextForProduct, generateCraigslistTextForProduct, generateEbayCSVForProduct } from '@/lib/services/forsale-export'
import { getForSaleByProductId, recordExport } from '@/lib/services/forsale-service'
import { ForSalePlatform } from '@/lib/services/forsale-config'

/**
 * POST /api/for-sale/export
 *
 * Export a single product to a marketplace format.
 *
 * Request body:
 * - productId: string - The product ID
 * - platform: 'ebay' | 'facebook' | 'craigslist' - Target platform
 * - action: 'download' | 'clipboard' - Whether to download or copy to clipboard
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { productId, platform, action = 'download' } = body

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'productId is required' },
        { status: 400 }
      )
    }

    if (!platform || !['ebay', 'facebook', 'craigslist'].includes(platform)) {
      return NextResponse.json(
        { success: false, error: 'platform must be ebay, facebook, or craigslist' },
        { status: 400 }
      )
    }

    // Check if product exists and is ready for export
    const forSaleItem = getForSaleByProductId(productId)
    if (!forSaleItem) {
      return NextResponse.json(
        { success: false, error: 'Product not found in for-sale listings' },
        { status: 404 }
      )
    }

    if (forSaleItem.status === 'pending') {
      return NextResponse.json(
        { success: false, error: 'Product must be optimized before export' },
        { status: 400 }
      )
    }

    // Generate export content
    const result = exportProduct(productId, platform as ForSalePlatform)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    // For clipboard actions, return the content directly
    if (action === 'clipboard') {
      return NextResponse.json({
        success: true,
        platform,
        content: result.content,
        filename: result.filename,
      })
    }

    // For download actions, return as file
    if (platform === 'ebay') {
      return new NextResponse(result.content as string, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${result.filename}"`,
        },
      })
    }

    // Facebook and Craigslist return text
    return new NextResponse(result.content as string, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting product:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export product',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/for-sale/export
 *
 * Get export preview or content without recording history.
 *
 * Query params:
 * - productId: string - The product ID
 * - platform: 'ebay' | 'facebook' | 'craigslist' - Target platform
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const platform = searchParams.get('platform') as ForSalePlatform

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'productId is required' },
        { status: 400 }
      )
    }

    if (!platform || !['ebay', 'facebook', 'craigslist'].includes(platform)) {
      return NextResponse.json(
        { success: false, error: 'platform must be ebay, facebook, or craigslist' },
        { status: 400 }
      )
    }

    // Generate preview without recording
    let result
    switch (platform) {
      case 'ebay':
        result = generateEbayCSVForProduct(productId)
        break
      case 'facebook':
        result = generateFacebookTextForProduct(productId)
        break
      case 'craigslist':
        result = generateCraigslistTextForProduct(productId)
        break
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      platform,
      content: result.content,
      filename: result.filename,
      preview: true,
    })
  } catch (error) {
    console.error('Error generating export preview:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate preview',
      },
      { status: 500 }
    )
  }
}
