import { NextRequest, NextResponse } from "next/server"
import { searchSimilarImagesByText, getImageMetadataStats } from "@/lib/image-vector-fallback"

// GET /api/image-cataloging/search - Search for similar images
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const imageId = searchParams.get('imageId')
    const limit = parseInt(searchParams.get('limit') || '10')
    const action = searchParams.get('action') || 'search'

    if (action === 'stats') {
      const stats = await getImageMetadataStats()
      return NextResponse.json(stats)
    }

    if (query) {
      // Search by text query using SQLite fallback
      const results = await searchSimilarImagesByText(query, limit)
      return NextResponse.json(results)
    }

    return NextResponse.json({
      success: false,
      error: "Query parameter or imageId is required"
    }, { status: 400 })

  } catch (error) {
    console.error("Error in image search:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to search images"
    }, { status: 500 })
  }
}

// POST /api/image-cataloging/search - Advanced search with filters
export async function POST(request: NextRequest) {
  try {
    const { query, filters, limit = 10 } = await request.json()

    if (!query) {
      return NextResponse.json({
        success: false,
        error: "Query is required"
      }, { status: 400 })
    }

    // Perform similarity search using SQLite fallback
    const results = await searchSimilarImagesByText(query, limit)

    // Apply additional filters if provided
    if (filters && results.success) {
      let filteredImages = results.images

      // Filter by confidence threshold
      if (filters.minConfidence) {
        filteredImages = filteredImages.filter(img => 
          parseFloat(img.metadata.confidence || '0') >= filters.minConfidence
        )
      }

      // Filter by object types
      if (filters.objects && filters.objects.length > 0) {
        filteredImages = filteredImages.filter(img => {
          const objects = JSON.parse(img.metadata.objects || '[]')
          return filters.objects.some((filterObj: string) => 
            objects.includes(filterObj)
          )
        })
      }

      // Filter by date range
      if (filters.dateFrom || filters.dateTo) {
        filteredImages = filteredImages.filter(img => {
          const addedAt = new Date(img.metadata.addedAt)
          if (filters.dateFrom && addedAt < new Date(filters.dateFrom)) return false
          if (filters.dateTo && addedAt > new Date(filters.dateTo)) return false
          return true
        })
      }

      results.images = filteredImages
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error("Error in advanced image search:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to perform advanced search"
    }, { status: 500 })
  }
}