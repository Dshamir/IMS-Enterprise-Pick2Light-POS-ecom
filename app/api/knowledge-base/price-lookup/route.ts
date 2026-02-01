/**
 * Knowledge Base Price Lookup API
 *
 * POST: Look up price for a product using KB and AI
 *
 * Enhanced with:
 * - MDSAP-compliant audit logging via ai_suggestions table
 * - Auto-approve threshold configuration
 * - Human review flagging for low confidence
 */

import { NextResponse } from 'next/server'
import { lookupPrice, quickPriceLookup, type ProductData } from '@/lib/knowledge-base/price-lookup'
import { checkKBVectorSearchHealth } from '@/lib/knowledge-base/kb-vector-search'
import { createAISuggestion, isAISuggestionsTableReady } from '@/lib/knowledge-base/ai-suggestions-db'
import { getKBSettings } from '@/lib/knowledge-base/kb-settings'

// Auto-approve threshold for price suggestions
const AUTO_APPROVE_THRESHOLD = 0.85

export async function POST(request: Request) {
  const startTime = Date.now()

  try {
    const body = await request.json()

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Product name is required' },
        { status: 400 }
      )
    }

    // Check vector search health for diagnostics
    const health = await checkKBVectorSearchHealth()

    // Get KB settings for model info
    const settings = getKBSettings()

    const productData: ProductData = {
      name: body.name,
      description: body.description,
      manufacturer: body.manufacturer,
      partNumber: body.partNumber || body.manufacturer_part_number,
      category: body.category,
      imageUrl: body.imageUrl || body.image_url
    }

    // Quick lookup (no AI) for faster response if specified
    if (body.quick === true) {
      const quickResult = await quickPriceLookup(productData)
      return NextResponse.json({
        quick: true,
        price: quickResult.price,
        confidence: quickResult.confidence,
        matchCount: quickResult.matchCount,
        vectorSearchHealth: health
      })
    }

    // Full lookup with AI fallback
    const result = await lookupPrice(productData)

    const generationTime = Date.now() - startTime

    // Determine confidence score (normalize from 'high', 'medium', 'low' to number)
    let confidenceScore: number
    switch (result.confidence) {
      case 'high': confidenceScore = 0.9; break
      case 'medium': confidenceScore = 0.7; break
      case 'low': confidenceScore = 0.4; break
      default: confidenceScore = 0.5
    }

    // Flag for human review if confidence is below threshold
    const needsHumanReview = confidenceScore < AUTO_APPROVE_THRESHOLD

    // Log to ai_suggestions audit table (MDSAP compliance)
    let suggestionId: string | null = null
    if (isAISuggestionsTableReady()) {
      try {
        const suggestion = createAISuggestion({
          product_id: body.product_id || undefined,
          kb_item_id: body.kb_item_id || undefined,
          field: 'price',
          original_value: body.currentPrice?.toString() || undefined,
          suggested_value: result.suggestedPrice?.toString() || undefined,
          needs_human_review: needsHumanReview,
          confidence_score: confidenceScore,
          reasons: [result.explanation || 'Price lookup completed'],
          retrieval_sources: result.kbMatches.map(m => m.id),
          retrieval_context: JSON.stringify({
            source: result.source,
            priceRange: result.priceRange,
            matchCount: result.kbMatches.length
          }),
          prompt_version: 'price-lookup-v1',
          model_version: settings.default_model || 'gpt-4o-mini',
          generation_time_ms: generationTime,
          validation_passed: true,
          validation_errors: []
        })
        suggestionId = suggestion.id
      } catch (auditError) {
        console.warn('[Price Lookup] Failed to create audit log:', auditError)
        // Continue without audit - don't block the response
      }
    }

    // Build response with debug info
    const response: any = {
      suggestedPrice: result.suggestedPrice,
      priceRange: result.priceRange,
      confidence: result.confidence,
      source: result.source,
      explanation: result.explanation,
      kbMatches: result.kbMatches.map(match => ({
        id: match.id,
        item_name: match.item_name,
        manufacturer: match.manufacturer,
        manufacturer_part_number: match.manufacturer_part_number,
        category: match.category,
        price_low: match.price_low,
        price_high: match.price_high,
        similarity_percent: Math.round(match.similarity * 100)
      })),
      // Include diagnostic info
      vectorSearchHealth: health,
      // Audit info
      audit: {
        suggestionId,
        confidenceScore,
        needsHumanReview,
        generationTimeMs: generationTime
      }
    }

    // Add warning if vector search unavailable
    if (!health.available) {
      response.warning = `Vector search unavailable: ChromaDB ${health.chromaStatus}, OpenAI ${health.openaiStatus}. KB matches may be missing.`
    } else if (health.itemCount === 0) {
      response.warning = 'Vector search available but no KB items are indexed. Run "Generate Embeddings" in KB settings.'
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error in price lookup:', error)
    return NextResponse.json(
      { error: `Price lookup failed: ${error.message}` },
      { status: 500 }
    )
  }
}
