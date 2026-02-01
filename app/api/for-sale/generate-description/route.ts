import { NextResponse } from "next/server"
import { generateDescription } from "@/lib/services/forsale-ai"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { productName, productDescription, specifications, platform, condition, imageUrls } = body

    if (!productName) {
      return NextResponse.json(
        { error: "productName is required" },
        { status: 400 }
      )
    }

    if (!platform || !["ebay", "facebook", "craigslist"].includes(platform)) {
      return NextResponse.json(
        { error: "platform must be 'ebay', 'facebook', or 'craigslist'" },
        { status: 400 }
      )
    }

    const result = await generateDescription(
      productName,
      productDescription || null,
      specifications || [],
      platform,
      condition || null,
      imageUrls || []
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error generating description:", error)
    return NextResponse.json(
      {
        description: "",
        platform: "ebay",
        charCount: 0,
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate description",
      },
      { status: 500 }
    )
  }
}
