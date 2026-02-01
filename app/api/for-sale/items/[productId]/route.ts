import { NextResponse } from "next/server"
import {
  getForSaleByProductId,
  createOrUpdateForSale,
  deleteForSale,
  shouldTriggerAIProcessing,
} from "@/lib/services/forsale-service"

interface Props {
  params: Promise<{ productId: string }>
}

// Get the base URL for internal API calls
function getBaseUrl(): string {
  // In production, use the actual host
  // In development, use localhost:3000
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

export async function GET(request: Request, { params }: Props) {
  try {
    const { productId } = await params
    const item = getForSaleByProductId(productId)

    // Return null item if not found (not an error - product just isn't marked for sale)
    return NextResponse.json({ item })
  } catch (error) {
    console.error("Error fetching For Sale item:", error)
    return NextResponse.json(
      { error: "Failed to fetch item" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request, { params }: Props) {
  try {
    const { productId } = await params
    const body = await request.json()

    const {
      enabled,
      sale_category_id,
      sub_category_id,
      condition,
      marketplace_title,
      marketplace_description,
      suggested_price,
      final_price,
      status,
    } = body

    const item = createOrUpdateForSale(productId, {
      enabled,
      sale_category_id,
      sub_category_id,
      condition,
      marketplace_title,
      marketplace_description,
      suggested_price,
      final_price,
      status,
    })

    // Check if AI processing should be triggered
    // Triggers when: enabled + category + subcategory + condition are all set
    const shouldProcess = shouldTriggerAIProcessing(productId)

    if (shouldProcess) {
      // Fire-and-forget: trigger background AI processing without waiting
      console.log(`[ForSale PATCH] Triggering background AI processing for ${productId}`)
      const baseUrl = getBaseUrl()

      fetch(`${baseUrl}/api/for-sale/items/${productId}/ai-process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch(err => {
        console.error(`[ForSale PATCH] AI trigger failed for ${productId}:`, err)
      })
    }

    return NextResponse.json({ item, success: true, aiProcessingTriggered: shouldProcess })
  } catch (error) {
    console.error("Error updating For Sale item:", error)
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: Props) {
  try {
    const { productId } = await params
    const deleted = deleteForSale(productId)

    if (!deleted) {
      return NextResponse.json(
        { error: "Item not found or already deleted" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting For Sale item:", error)
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    )
  }
}
