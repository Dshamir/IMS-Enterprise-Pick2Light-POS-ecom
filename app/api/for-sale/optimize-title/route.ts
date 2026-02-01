import { NextResponse } from "next/server"
import { optimizeTitle } from "@/lib/services/forsale-ai"

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

    const result = await optimizeTitle(
      productName,
      productDescription || null,
      category || null,
      imageUrls || []
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error optimizing title:", error)
    return NextResponse.json(
      {
        title: "",
        charCount: 0,
        success: false,
        error: error instanceof Error ? error.message : "Failed to optimize title",
      },
      { status: 500 }
    )
  }
}
