import { NextResponse } from "next/server"
import { extractSpecifications } from "@/lib/services/forsale-ai"

/**
 * POST /api/for-sale/extract-specs
 *
 * Technical AI Agent for specification extraction.
 * Uses vision (GPT-4o) to identify products and research accurate technical specs.
 *
 * Request body:
 * - productName: string (required) - Product name (may be verified/corrected by AI)
 * - productDescription: string (optional) - Listing description (NOT used as source of truth)
 * - category: string (optional) - Product category for spec requirements
 * - imageUrls: string[] (optional) - Product images for vision-based identification
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { productName, productDescription, category, imageUrls } = body

    if (!productName) {
      return NextResponse.json(
        { error: "productName is required" },
        { status: 400 }
      )
    }

    console.log(`[extract-specs] Technical Agent request:`, {
      productName,
      category,
      hasDescription: !!productDescription,
      imageCount: imageUrls?.length || 0
    })

    const result = await extractSpecifications(
      productName,
      productDescription || null,
      category || null,
      imageUrls || []
    )

    console.log(`[extract-specs] Result: ${result.specifications.length} specs, success: ${result.success}`)

    return NextResponse.json(result)
  } catch (error) {
    console.error("[extract-specs] Error:", error)
    return NextResponse.json(
      {
        specifications: [],
        success: false,
        error: error instanceof Error ? error.message : "Failed to extract specifications",
      },
      { status: 500 }
    )
  }
}
