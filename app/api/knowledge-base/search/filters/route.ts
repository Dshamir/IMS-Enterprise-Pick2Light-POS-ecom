/**
 * Knowledge Base Search Filters API
 *
 * GET - Get available filter values for faceted search
 */

import { NextRequest, NextResponse } from 'next/server'
import { getKBCategories, searchKBItems } from '@/lib/knowledge-base/kb-database'
import { getDatabase } from '@/lib/database/sqlite'

/**
 * GET /api/knowledge-base/search/filters
 *
 * Returns available filter values with counts for faceted search:
 * - Top categories with item counts
 * - Top manufacturers with item counts
 * - Price range statistics
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDatabase()

    // Get top categories with counts
    const categories = db.prepare(`
      SELECT
        category as name,
        COUNT(*) as count
      FROM kb_items
      WHERE category IS NOT NULL AND category != ''
      GROUP BY category
      ORDER BY count DESC
      LIMIT 20
    `).all() as Array<{ name: string; count: number }>

    // Get top manufacturers with counts
    const manufacturers = db.prepare(`
      SELECT
        manufacturer as name,
        COUNT(*) as count
      FROM kb_items
      WHERE manufacturer IS NOT NULL AND manufacturer != ''
      GROUP BY manufacturer
      ORDER BY count DESC
      LIMIT 20
    `).all() as Array<{ name: string; count: number }>

    // Get price range statistics
    const priceStats = db.prepare(`
      SELECT
        MIN(COALESCE(price_low, price_high)) as min_price,
        MAX(COALESCE(price_high, price_low)) as max_price,
        AVG(COALESCE(price_low, price_high)) as avg_price,
        COUNT(*) as items_with_price
      FROM kb_items
      WHERE price_low IS NOT NULL OR price_high IS NOT NULL
    `).get() as {
      min_price: number | null
      max_price: number | null
      avg_price: number | null
      items_with_price: number
    }

    // Create price range buckets
    const priceBuckets = [
      { label: 'Under $10', min: 0, max: 10 },
      { label: '$10 - $50', min: 10, max: 50 },
      { label: '$50 - $100', min: 50, max: 100 },
      { label: '$100 - $500', min: 100, max: 500 },
      { label: '$500 - $1000', min: 500, max: 1000 },
      { label: 'Over $1000', min: 1000, max: Infinity },
    ]

    // Count items in each price bucket
    const priceBucketsWithCounts = priceBuckets.map(bucket => {
      const maxCondition = bucket.max === Infinity ? '' : `AND COALESCE(price_low, price_high) < ${bucket.max}`
      const count = db.prepare(`
        SELECT COUNT(*) as count
        FROM kb_items
        WHERE (price_low IS NOT NULL OR price_high IS NOT NULL)
        AND COALESCE(price_low, price_high) >= ?
        ${maxCondition}
      `).get(bucket.min) as { count: number }

      return {
        ...bucket,
        count: count?.count || 0,
        max: bucket.max === Infinity ? null : bucket.max
      }
    })

    return NextResponse.json({
      categories: categories.slice(0, 10), // Top 10 for UI
      manufacturers: manufacturers.slice(0, 10), // Top 10 for UI
      priceRange: {
        min: Math.floor(priceStats.min_price || 0),
        max: Math.ceil(priceStats.max_price || 0),
        avg: Math.round(priceStats.avg_price || 0),
        itemsWithPrice: priceStats.items_with_price || 0
      },
      priceBuckets: priceBucketsWithCounts.filter(b => b.count > 0),
      totalFilters: {
        categories: categories.length,
        manufacturers: manufacturers.length
      }
    })
  } catch (error: any) {
    console.error('Error getting search filters:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get filters' },
      { status: 500 }
    )
  }
}
