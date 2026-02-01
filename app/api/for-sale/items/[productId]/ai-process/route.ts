import { NextResponse } from "next/server"
import { runBackgroundAIProcessing, regenerateDescriptionsFromCorpus } from "@/lib/services/forsale-background-ai"
import { updateAIProcessingStatus, shouldTriggerAIProcessing } from "@/lib/services/forsale-service"

interface Props {
  params: Promise<{ productId: string }>
}

/**
 * POST /api/for-sale/items/[productId]/ai-process
 *
 * Triggers background AI processing for a product listing.
 * This endpoint:
 * 1. Sets ai_processing_status = 'processing'
 * 2. Runs the 2-phase AI processing (vision + text)
 * 3. On success: sets status = 'completed', updates product status to 'optimized'
 * 4. On failure: sets status = 'failed', stores error message
 *
 * Query params:
 * - regenerate=true: Only regenerate descriptions from existing corpus (faster)
 */
export async function POST(request: Request, { params }: Props) {
  try {
    const { productId } = await params
    const url = new URL(request.url)
    const regenerateOnly = url.searchParams.get('regenerate') === 'true'

    console.log(`[AI Process API] ${regenerateOnly ? 'Regenerating' : 'Processing'} product: ${productId}`)

    // Validate that AI processing should be triggered
    if (!regenerateOnly && !shouldTriggerAIProcessing(productId)) {
      return NextResponse.json(
        { error: "Product does not meet AI processing requirements (enabled + category + subcategory + condition)" },
        { status: 400 }
      )
    }

    // Set status to processing
    updateAIProcessingStatus(productId, 'processing')

    // Run AI processing
    let result
    if (regenerateOnly) {
      result = await regenerateDescriptionsFromCorpus(productId)
    } else {
      result = await runBackgroundAIProcessing(productId)
    }

    // Update status based on result
    if (result.success) {
      updateAIProcessingStatus(productId, 'completed')
      console.log(`[AI Process API] Completed successfully for ${productId}`)

      return NextResponse.json({
        success: true,
        productId,
        title: result.title,
        specsCount: result.specsCount,
        corpusWordCount: result.corpusWordCount,
        processingTimeMs: result.processingTimeMs,
        hasEbayDescription: !!result.descriptionEbay,
        hasFacebookDescription: !!result.descriptionFacebook,
        hasCraigslistDescription: !!result.descriptionCraigslist,
        errors: result.errors.length > 0 ? result.errors : undefined
      })
    } else {
      const errorMessage = result.errors.join('; ') || 'AI processing failed'
      updateAIProcessingStatus(productId, 'failed', errorMessage)
      console.error(`[AI Process API] Failed for ${productId}: ${errorMessage}`)

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          errors: result.errors,
          processingTimeMs: result.processingTimeMs
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("[AI Process API] Error:", error)

    // Try to update status to failed
    try {
      const { productId } = await params
      updateAIProcessingStatus(productId, 'failed', error instanceof Error ? error.message : 'Unknown error')
    } catch {
      // Ignore if we can't update status
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI processing failed" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/for-sale/items/[productId]/ai-process
 *
 * Check the current AI processing status for a product.
 */
export async function GET(request: Request, { params }: Props) {
  try {
    const { productId } = await params
    const { getForSaleByProductIdWithAIStatus } = await import("@/lib/services/forsale-service")

    const item = getForSaleByProductIdWithAIStatus(productId)
    if (!item) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      productId,
      ai_processing_status: item.ai_processing_status,
      ai_processing_error: item.ai_processing_error,
      ai_processed_at: item.ai_processed_at,
      hasVisionDescription: !!item.vision_description,
      hasEbayDescription: !!item.description_ebay,
      hasFacebookDescription: !!item.description_facebook,
      hasCraigslistDescription: !!item.description_craigslist
    })
  } catch (error) {
    console.error("[AI Process API] GET Error:", error)
    return NextResponse.json(
      { error: "Failed to get processing status" },
      { status: 500 }
    )
  }
}
