import { NextResponse } from "next/server"
import { enhanceImages } from "@/lib/services/forsale-ai"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { productId, imageUrls } = body

    if (!productId) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 }
      )
    }

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json(
        { error: "imageUrls array is required and must not be empty" },
        { status: 400 }
      )
    }

    const result = await enhanceImages(productId, imageUrls)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error enhancing images:", error)
    return NextResponse.json(
      {
        suggestions: [],
        imageAnalysis: [],
        overallScore: 0,
        message: "Failed to analyze images",
        success: false,
        updated: false,
        error: error instanceof Error ? error.message : "Failed to enhance images",
      },
      { status: 500 }
    )
  }
}
