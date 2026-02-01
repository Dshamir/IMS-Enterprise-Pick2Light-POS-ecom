import { NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'
import { getDatabase } from '@/lib/database/sqlite'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim() === '') {
      return NextResponse.json({ results: [], count: 0 })
    }

    const db = getDatabase()
    const searchTerm = `%${query}%`

    // Search products with LED segment data
    const results = db.prepare(`
      SELECT
        p.*,
        u.display_name as unit_display_name,
        u.symbol as unit_symbol,
        p.category as category_name,
        -- LED segment count
        (SELECT COUNT(*)
         FROM led_segments ls
         WHERE ls.product_id = p.id AND ls.is_active = 1
        ) as led_segment_count
      FROM products p
      LEFT JOIN units u ON p.unit_id = u.id
      WHERE
        p.name LIKE ? OR
        p.description LIKE ? OR
        p.barcode LIKE ? OR
        p.mfgname LIKE ? OR
        p.mfgnum LIKE ? OR
        p.Location LIKE ?
      ORDER BY p.name ASC
      LIMIT 100
    `).all(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm)

    // For each product, get LED segment details
    const enrichedResults = results.map((product: any) => {
      const segments = db.prepare(`
        SELECT
          ls.*,
          wd.device_name,
          wd.ip_address,
          wd.total_leds,
          wd.status,
          wd.signal_strength,
          wd.last_seen
        FROM led_segments ls
        LEFT JOIN wled_devices wd ON ls.wled_device_id = wd.id
        WHERE ls.product_id = ? AND ls.is_active = 1
        ORDER BY ls.created_at ASC
      `).all(product.id)

      return {
        ...product,
        led_segments: segments
      }
    })

    return NextResponse.json({
      results: enrichedResults,
      count: enrichedResults.length
    })
  } catch (error: any) {
    console.error('Error searching products for Pick2Light:', error)
    return NextResponse.json(
      { error: 'Failed to search products' },
      { status: 500 }
    )
  }
}
