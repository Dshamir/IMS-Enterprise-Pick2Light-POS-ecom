/**
 * Knowledge Base Barcode Lookup API
 *
 * POST: Generate sequential barcode based on product category
 * Format: {PREFIX}-{COUNTER}-{VERSION} (e.g., 90-000276-A)
 *
 * Features:
 * - AI-powered category classification when category is unknown
 * - KB pattern matching for similar products
 * - Sequential counter per prefix
 * - MDSAP-compliant audit logging via ai_suggestions table
 */

import { NextResponse } from 'next/server'
import { searchKBByText } from '@/lib/knowledge-base/kb-vector-search'
import { getKBItem } from '@/lib/knowledge-base/kb-database'
import { getBarcodeSettings } from '@/lib/knowledge-base/kb-settings'
import {
  generateSequentialBarcode,
  generateUniqueBarcode,
  getCounterForPrefix,
  parseBarcode,
  getBarcodeStats
} from '@/lib/knowledge-base/barcode-counter'
import {
  classifyProductCategory,
  isClassificationAvailable,
  type CategoryClassificationResult
} from '@/lib/knowledge-base/product-category-classifier'
import { createAISuggestion, isAISuggestionsTableReady } from '@/lib/knowledge-base/ai-suggestions-db'

// Auto-approve threshold for barcode suggestions
const AUTO_APPROVE_THRESHOLD = 0.80

// Classification source types
type ClassificationSource = 'direct' | 'ai' | 'kb_match' | 'default'

// Classification info for response
interface ClassificationInfo {
  source: ClassificationSource
  category: string
  prefix: string
  confidence: 'high' | 'medium' | 'low' | 'none'
  reasoning: string
  alternatives?: Array<{ category: string; prefix: string; confidence: number }>
}

// Extract barcode pattern from KB matches
function extractPattern(barcodes: string[]): string | null {
  if (barcodes.length === 0) return null

  // Try to find a common prefix pattern
  const prefixes = barcodes.map(b => {
    const match = b.match(/^([A-Za-z0-9-]+)-\d+-/)
    return match ? match[1] : null
  }).filter(Boolean)

  if (prefixes.length > 0) {
    // Return the most common prefix
    const counts = prefixes.reduce((acc, p) => {
      acc[p!] = (acc[p!] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const mostCommon = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    return mostCommon ? `${mostCommon[0]}-XXXXXX-X` : null
  }

  return null
}

export async function POST(request: Request) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { name, description, category, manufacturer, version } = body

    if (!name && !category) {
      return NextResponse.json(
        { error: 'Product name or category is required for barcode generation' },
        { status: 400 }
      )
    }

    // Load settings from database
    const settings = getBarcodeSettings()

    // Initialize classification info
    let classification: ClassificationInfo = {
      source: 'default',
      category: 'default',
      prefix: settings.categoryPrefixes['default'] || '00',
      confidence: 'none',
      reasoning: 'No category specified, using default prefix'
    }

    // Step 1: Check if category is provided and valid
    const categoryKey = category?.toLowerCase()
    const directPrefix = categoryKey ? settings.categoryPrefixes[categoryKey] : null

    if (directPrefix) {
      // Direct mapping - category was provided and exists
      classification = {
        source: 'direct',
        category: categoryKey,
        prefix: directPrefix,
        confidence: 'high',
        reasoning: `Category '${category}' directly mapped to prefix ${directPrefix}`
      }
    } else if (name) {
      // Step 2: AI Classification (when category is missing or unknown)
      // This is the AI Barcode Generation feature
      if (isClassificationAvailable()) {
        try {
          const aiResult = await classifyProductCategory(
            name,
            description,
            manufacturer,
            settings.categoryPrefixes
          )

          if (aiResult && aiResult.confidence !== 'low') {
            classification = {
              source: 'ai',
              category: aiResult.category,
              prefix: aiResult.prefix,
              confidence: aiResult.confidence,
              reasoning: aiResult.reasoning,
              alternatives: aiResult.alternatives
            }
          } else if (aiResult) {
            // Low confidence - still use but mark as such
            classification = {
              source: 'ai',
              category: aiResult.category,
              prefix: aiResult.prefix,
              confidence: 'low',
              reasoning: `${aiResult.reasoning} (low confidence - consider manual review)`,
              alternatives: aiResult.alternatives
            }
          }
        } catch (error: any) {
          console.warn('AI classification failed, falling back to KB search:', error.message)
        }
      }

      // Step 3: KB Pattern Matching (if AI didn't provide result or as additional info)
      if (classification.source === 'default') {
        const searchText = [name, description, category, manufacturer].filter(Boolean).join(' ')
        try {
          const kbResults = await searchKBByText(searchText, settings.kbSearchLimit)

          if (kbResults && kbResults.length > 0) {
            for (const result of kbResults) {
              const item = getKBItem(result.id)
              if (item?.barcode) {
                const parsed = parseBarcode(item.barcode)
                if (parsed) {
                  // Find the category name for this prefix
                  const categoryEntry = Object.entries(settings.categoryPrefixes)
                    .find(([_, p]) => p === parsed.prefix)

                  classification = {
                    source: 'kb_match',
                    category: categoryEntry ? categoryEntry[0] : 'unknown',
                    prefix: parsed.prefix,
                    confidence: result.similarity > 0.85 ? 'high' :
                               result.similarity > 0.6 ? 'medium' : 'low',
                    reasoning: `Matched similar product '${item.item_name?.substring(0, 50)}...' with ${Math.round(result.similarity * 100)}% similarity`
                  }
                  break
                }
              }
            }
          }
        } catch (error) {
          console.warn('KB search for barcode patterns failed:', error)
        }
      }
    }

    // Use the determined prefix
    const finalPrefix = classification.prefix
    const barcodeVersion = (version || 'A').toUpperCase()
    const counterPadding = settings.counterPadding || 6

    // Get current counter for info
    const currentCounter = getCounterForPrefix(finalPrefix)

    // Generate the sequential barcode
    const suggestedBarcode = generateUniqueBarcode(finalPrefix, barcodeVersion, counterPadding)
    const pattern = `${finalPrefix}-${'X'.repeat(counterPadding)}-X`

    // Generate alternatives with different versions
    const alternatives: string[] = []
    const versionLetters = ['A', 'B', 'C', 'D', 'E']

    // Add alternative versions of the next barcode
    for (const v of versionLetters) {
      if (v !== barcodeVersion && alternatives.length < (settings.alternativesCount || 3)) {
        const parsed = parseBarcode(suggestedBarcode)
        if (parsed) {
          const altBarcode = `${parsed.prefix}-${parsed.counter.toString().padStart(counterPadding, '0')}-${v}`
          if (!alternatives.includes(altBarcode)) {
            alternatives.push(altBarcode)
          }
        }
      }
    }

    // Get stats for response
    const stats = getBarcodeStats()
    const prefixStats = stats.prefixes.find(p => p.prefix === finalPrefix)
    const parsedBarcode = parseBarcode(suggestedBarcode)

    // Build explanation based on classification source
    let explanation: string
    switch (classification.source) {
      case 'direct':
        explanation = `Category '${classification.category}' (prefix ${finalPrefix}). Counter: ${parsedBarcode?.counter}`
        break
      case 'ai':
        explanation = `AI classified as '${classification.category}' (prefix ${finalPrefix}). Counter: ${parsedBarcode?.counter}`
        break
      case 'kb_match':
        explanation = `Matched KB pattern (prefix ${finalPrefix}). Counter: ${parsedBarcode?.counter}`
        break
      default:
        explanation = `Default prefix ${finalPrefix}. Counter: ${parsedBarcode?.counter}`
    }

    const generationTime = Date.now() - startTime

    // Determine confidence score for audit
    let confidenceScore: number
    switch (classification.confidence) {
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
          field: 'barcode',
          original_value: body.currentBarcode || null,
          suggested_value: suggestedBarcode,
          needs_human_review: needsHumanReview,
          confidence_score: confidenceScore,
          reasons: [
            explanation,
            classification.reasoning || ''
          ].filter(Boolean),
          retrieval_sources: classification.source === 'kb_match' ? ['kb_pattern_match'] : [],
          retrieval_context: JSON.stringify({
            source: classification.source,
            category: classification.category,
            prefix: finalPrefix,
            counter: parsedBarcode?.counter,
            aiClassified: classification.source === 'ai'
          }),
          prompt_version: 'barcode-lookup-v2',
          model_version: classification.source === 'ai' ? 'gpt-4o-mini' : 'rule-based',
          generation_time_ms: generationTime,
          validation_passed: true,
          validation_errors: []
        })
        suggestionId = suggestion.id
      } catch (auditError) {
        console.warn('[Barcode Lookup] Failed to create audit log:', auditError)
        // Continue without audit - don't block the response
      }
    }

    return NextResponse.json({
      suggestedBarcode,
      pattern,
      prefix: finalPrefix,
      counter: parsedBarcode?.counter || currentCounter + 1,
      version: barcodeVersion,
      classification: {
        source: classification.source,
        category: classification.category,
        confidence: classification.confidence,
        reasoning: classification.reasoning,
        alternatives: classification.alternatives
      },
      explanation,
      alternatives: [...new Set(alternatives)].slice(0, settings.alternativesCount || 3),
      stats: {
        prefix: finalPrefix,
        previousCounter: currentCounter,
        newCounter: parsedBarcode?.counter || currentCounter + 1,
        lastBarcode: prefixStats?.last_barcode || null
      },
      // Audit info
      audit: {
        suggestionId,
        confidenceScore,
        needsHumanReview,
        generationTimeMs: generationTime
      }
    })
  } catch (error: any) {
    console.error('Barcode lookup error:', error)
    return NextResponse.json(
      { error: `Failed to generate barcode: ${error.message}` },
      { status: 500 }
    )
  }
}

/**
 * GET: Get barcode statistics and counter information
 */
export async function GET() {
  try {
    const settings = getBarcodeSettings()
    const stats = getBarcodeStats()

    return NextResponse.json({
      format: '{PREFIX}-{COUNTER}-{VERSION}',
      counterPadding: settings.counterPadding || 6,
      defaultVersion: 'A',
      categoryPrefixes: settings.categoryPrefixes,
      aiClassificationAvailable: isClassificationAvailable(),
      stats
    })
  } catch (error: any) {
    console.error('Barcode stats error:', error)
    return NextResponse.json(
      { error: `Failed to get barcode stats: ${error.message}` },
      { status: 500 }
    )
  }
}
