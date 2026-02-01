import { NextResponse } from "next/server"
import { recommendPrice } from "@/lib/services/forsale-ai"

export async function POST(request: Request) {
  let originalPrice: number | null = null

  try {
    const body = await request.json()
    const { productName, productDescription, condition, marketData } = body
    originalPrice = body.originalPrice || null

    if (!productName) {
      return NextResponse.json(
        { error: "productName is required" },
        { status: 400 }
      )
    }

    const result = await recommendPrice(
      productName,
      productDescription || null,
      condition || null,
      originalPrice,
      marketData || null
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error recommending price:", error)

    // Return fallback pricing
    const basePrice = originalPrice || 100
    return NextResponse.json(
      {
        quickSalePrice: Math.round(basePrice * 0.7),
        optimalPrice: Math.round(basePrice * 0.85),
        premiumPrice: basePrice,
        confidence: 0.3,
        reasoning: "Fallback pricing due to error",
        success: false,
        error: error instanceof Error ? error.message : "Failed to recommend price",
      },
      { status: 500 }
    )
  }
}
