import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/sqlite'
import { vectorSearchManager } from '@/lib/vector-search-manager'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File
    const useVector = formData.get('vector') !== 'false' // Default to true

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 })
    }

    const db = getDatabase()
    let productIds: string[] = []
    let searchMethod = 'traditional'
    let similarityScores: Record<string, number> = {}

    // Try vector search first if enabled
    if (useVector) {
      try {
        console.log('🔍 Attempting vector image search...')
        const imageBuffer = Buffer.from(await file.arrayBuffer())
        const searchResult = await vectorSearchManager.searchByImage(imageBuffer, null, 20)

        if (searchResult.products && searchResult.products.length > 0) {
          productIds = searchResult.products.map(p => p.id).filter(Boolean)
          searchMethod = searchResult.method

          // Store similarity scores for later use
          searchResult.products.forEach(p => {
            if (p.id && p.similarity) {
              similarityScores[p.id] = p.similarity
            }
          })

          console.log(`✅ Vector search found ${productIds.length} products`)
        }
      } catch (vectorError) {
        console.warn('Vector search failed, will try traditional:', vectorError)
      }
    }

    // Fallback to all products if vector search failed or disabled
    if (productIds.length === 0) {
      console.log('📋 Using traditional search (all products with images)')
      const allProducts = db.prepare(`
        SELECT id FROM products WHERE image_url IS NOT NULL ORDER BY created_at DESC LIMIT 50
      `).all() as Array<{ id: string }>

      productIds = allProducts.map(p => p.id)
      searchMethod = 'traditional'

      // Assign random similarity scores for traditional search
      productIds.forEach((id, index) => {
        similarityScores[id] = 0.5 + (Math.random() * 0.3) - (index * 0.01)
      })
    }

    // If no products found at all
    if (productIds.length === 0) {
      return NextResponse.json({
        results: [],
        count: 0,
        searchMethod,
        message: 'No products found with images'
      })
    }

    // Build query with placeholders for product IDs
    const placeholders = productIds.map(() => '?').join(',')

    // Fetch products with LED segment data
    const products = db.prepare(`
      SELECT
        p.*,
        c.name as category_name,
        COUNT(DISTINCT ls.id) as led_segment_count,
        json_group_array(
          json_object(
            'id', ls.id,
            'wled_device_id', ls.wled_device_id,
            'start_led', ls.start_led,
            'led_count', ls.led_count,
            'location_color', ls.location_color,
            'location_behavior', ls.location_behavior,
            'animation_duration', ls.animation_duration,
            'device_name', wd.device_name,
            'ip_address', wd.ip_address,
            'total_leds', wd.total_leds,
            'status', wd.status,
            'signal_strength', wd.signal_strength,
            'last_seen', wd.last_seen
          )
        ) as led_segments_json
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN led_segments ls ON ls.product_id = p.id
      LEFT JOIN wled_devices wd ON wd.id = ls.wled_device_id
      WHERE p.id IN (${placeholders})
      GROUP BY p.id
    `).all(...productIds)

    // Parse LED segments JSON and add similarity scores
    const results = products.map((product: any) => {
      let led_segments = []
      try {
        const parsed = JSON.parse(product.led_segments_json)
        // Filter out null entries (products without LED segments)
        led_segments = parsed.filter((seg: any) => seg.id !== null)
      } catch (error) {
        console.warn('Failed to parse LED segments JSON:', error)
      }

      return {
        ...product,
        led_segments,
        led_segments_json: undefined, // Remove raw JSON from response
        similarity: similarityScores[product.id] || 0.5
      }
    })

    // Sort by similarity score (highest first)
    results.sort((a: any, b: any) => (b.similarity || 0) - (a.similarity || 0))

    return NextResponse.json({
      results,
      count: results.length,
      searchMethod,
      message: `Image search results (${searchMethod})`
    })

  } catch (error: any) {
    console.error('Pick2Light image search error:', error)
    return NextResponse.json(
      { error: 'Failed to search by image', details: error.message },
      { status: 500 }
    )
  }
}
