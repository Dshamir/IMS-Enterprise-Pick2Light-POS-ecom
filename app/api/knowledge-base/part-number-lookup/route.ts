/**
 * Knowledge Base Part Number Lookup API
 *
 * POST: Search KB for matching part numbers based on product data
 *
 * Enhanced with:
 * - MDSAP-compliant audit logging via ai_suggestions table
 * - Auto-approve threshold configuration
 * - Human review flagging for low confidence
 */

import { NextResponse } from 'next/server'
import { searchKBByText } from '@/lib/knowledge-base/kb-vector-search'
import { getKBItem } from '@/lib/knowledge-base/kb-database'
import { getPartNumberSettings } from '@/lib/knowledge-base/kb-settings'
import { createAISuggestion, isAISuggestionsTableReady } from '@/lib/knowledge-base/ai-suggestions-db'

// Auto-approve threshold for part number suggestions
const AUTO_APPROVE_THRESHOLD = 0.75

interface PartNumberMatch {
  partNumber: string
  manufacturer: string
  itemName: string
  similarity: number
}

export async function POST(request: Request) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { name, description, category, manufacturer } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Product name is required for part number lookup' },
        { status: 400 }
      )
    }

    // Load settings from database
    const settings = getPartNumberSettings()

    // Build search text from product data
    const searchText = [name, description, manufacturer, category].filter(Boolean).join(' ')

    // Search KB for similar products using configured limit
    const kbResults = await searchKBByText(searchText, settings.kbSearchLimit)

    if (!kbResults || kbResults.length === 0) {
      return NextResponse.json({
        suggestedPartNumber: null,
        confidence: 'none',
        source: 'none',
        matches: [],
        explanation: 'No similar products found in Knowledge Base.',
      })
    }

    // Get full KB items and filter to those with part numbers
    const matches: PartNumberMatch[] = []

    for (const result of kbResults) {
      const item = getKBItem(result.id)
      if (item?.manufacturer_part_number) {
        matches.push({
          partNumber: item.manufacturer_part_number,
          manufacturer: item.manufacturer || '',
          itemName: item.item_name || '',
          similarity: result.similarity,
        })
      }
    }

    if (matches.length === 0) {
      return NextResponse.json({
        suggestedPartNumber: null,
        confidence: 'none',
        source: 'none',
        matches: [],
        explanation: 'Similar products found but none have part numbers in Knowledge Base.',
      })
    }

    // Sort by similarity and get the best match
    matches.sort((a, b) => b.similarity - a.similarity)
    const bestMatch = matches[0]

    // Determine confidence based on configured thresholds
    let confidence: 'high' | 'medium' | 'low' = 'low'
    if (bestMatch.similarity >= settings.highConfidence) {
      confidence = 'high'
    } else if (bestMatch.similarity >= settings.mediumConfidence) {
      confidence = 'medium'
    }

    // Build explanation
    let explanation = ''
    if (confidence === 'high') {
      explanation = `Found ${matches.length} matching part number(s). Top match "${bestMatch.itemName}" from ${bestMatch.manufacturer || 'unknown manufacturer'} has ${Math.round(bestMatch.similarity * 100)}% similarity.`
    } else if (confidence === 'medium') {
      explanation = `Found ${matches.length} possible match(es). Best match has ${Math.round(bestMatch.similarity * 100)}% similarity. Review matches below.`
    } else {
      explanation = `Found ${matches.length} partial match(es). Low confidence - please verify the suggested part number.`
    }

    const generationTime = Date.now() - startTime

    // Determine confidence score for audit (use similarity as base)
    const confidenceScore = bestMatch.similarity

    // Flag for human review if confidence is below threshold
    const needsHumanReview = confidenceScore < AUTO_APPROVE_THRESHOLD

    // Log to ai_suggestions audit table (MDSAP compliance)
    let suggestionId: string | null = null
    if (isAISuggestionsTableReady()) {
      try {
        const suggestion = createAISuggestion({
          product_id: body.product_id || undefined,
          kb_item_id: body.kb_item_id || undefined,
          field: 'part_number',
          original_value: body.currentPartNumber || undefined,
          suggested_value: bestMatch.partNumber,
          needs_human_review: needsHumanReview,
          confidence_score: confidenceScore,
          reasons: [explanation],
          retrieval_sources: matches.map(m => m.itemName),
          retrieval_context: JSON.stringify({
            source: 'kb_match',
            matchCount: matches.length,
            topMatchSimilarity: bestMatch.similarity,
            topMatchManufacturer: bestMatch.manufacturer
          }),
          prompt_version: 'part-number-lookup-v1',
          model_version: 'kb-vector-search',
          generation_time_ms: generationTime,
          validation_passed: true,
          validation_errors: []
        })
        suggestionId = suggestion.id
      } catch (auditError) {
        console.warn('[Part Number Lookup] Failed to create audit log:', auditError)
        // Continue without audit - don't block the response
      }
    }

    return NextResponse.json({
      suggestedPartNumber: bestMatch.partNumber,
      confidence,
      source: 'kb_match',
      matches: matches.slice(0, settings.returnCount), // Return configured number of matches
      explanation,
      // Audit info
      audit: {
        suggestionId,
        confidenceScore,
        needsHumanReview,
        generationTimeMs: generationTime
      }
    })
  } catch (error: any) {
    console.error('Part number lookup error:', error)
    return NextResponse.json(
      { error: `Failed to lookup part number: ${error.message}` },
      { status: 500 }
    )
  }
}
