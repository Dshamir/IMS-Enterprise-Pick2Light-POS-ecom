/**
 * AI Price Lookup Service
 *
 * Provides intelligent price estimation for products by:
 * 1. Searching the Knowledge Base for similar items (primary source)
 * 2. Using OpenAI to estimate prices when no KB match is found (fallback)
 *
 * Returns confidence levels based on match quality.
 */

import OpenAI from 'openai'
import { searchKBByProduct } from './kb-vector-search'
import { getKBItem, type KBItem } from './kb-database'
import { getPriceSettings } from './kb-settings'

// Types for price lookup
export interface ProductData {
  name: string
  description?: string
  manufacturer?: string
  partNumber?: string
  category?: string
  imageUrl?: string
}

export interface KBMatch {
  id: string
  item_name: string
  manufacturer: string | null
  manufacturer_part_number: string | null
  category: string | null
  price_low: number | null
  price_high: number | null
  similarity: number
}

export interface PriceLookupResult {
  suggestedPrice: number | null
  priceRange: { low: number; high: number } | null
  confidence: 'high' | 'medium' | 'low' | 'none'
  source: 'kb_match' | 'ai_estimate' | 'combined' | 'none'
  kbMatches: KBMatch[]
  explanation: string
}

// OpenAI client for AI estimation
let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI | null {
  if (!openai && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'fake-key') {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }
  return openai
}

/**
 * Get price estimate from OpenAI when no KB match is found
 */
async function getAIPriceEstimate(product: ProductData): Promise<{
  suggestedPrice: number | null
  priceRange: { low: number; high: number } | null
  explanation: string
} | null> {
  const client = getOpenAIClient()
  if (!client) return null

  // Load settings from database
  const settings = getPriceSettings()

  const productDescription = [
    `Product: ${product.name}`,
    product.description ? `Description: ${product.description}` : '',
    product.manufacturer ? `Manufacturer: ${product.manufacturer}` : '',
    product.partNumber ? `Part Number: ${product.partNumber}` : '',
    product.category ? `Category: ${product.category}` : ''
  ].filter(Boolean).join('\n')

  try {
    const response = await client.chat.completions.create({
      model: settings.model,
      messages: [
        {
          role: 'system',
          content: settings.systemPrompt
        },
        {
          role: 'user',
          content: `Please estimate a price range for this product:\n\n${productDescription}`
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: settings.maxTokens,
      temperature: settings.temperature
    })

    const content = response.choices[0]?.message?.content
    if (!content) return null

    const result = JSON.parse(content)

    if (!result.can_estimate) {
      return {
        suggestedPrice: null,
        priceRange: null,
        explanation: result.reasoning || 'Unable to estimate price for this product type'
      }
    }

    return {
      suggestedPrice: result.suggested_price,
      priceRange: (result.price_low && result.price_high)
        ? { low: result.price_low, high: result.price_high }
        : null,
      explanation: result.reasoning || 'AI-generated price estimate based on similar products'
    }
  } catch (error: any) {
    console.error('AI price estimation failed:', error.message)
    return null
  }
}

/**
 * Calculate weighted average price from KB matches
 */
function calculateWeightedPrice(matches: KBMatch[]): {
  price: number | null
  range: { low: number; high: number } | null
} {
  const matchesWithPrice = matches.filter(m => m.price_low !== null || m.price_high !== null)

  if (matchesWithPrice.length === 0) {
    return { price: null, range: null }
  }

  // Calculate weighted average based on similarity scores
  let totalWeight = 0
  let weightedSum = 0
  let minPrice = Infinity
  let maxPrice = -Infinity

  for (const match of matchesWithPrice) {
    const price = match.price_low ?? match.price_high!
    const weight = match.similarity

    weightedSum += price * weight
    totalWeight += weight

    if (match.price_low !== null) minPrice = Math.min(minPrice, match.price_low)
    if (match.price_high !== null) maxPrice = Math.max(maxPrice, match.price_high)
    // If only one price is set, use it for both min/max
    if (match.price_low === null && match.price_high !== null) {
      minPrice = Math.min(minPrice, match.price_high)
    }
    if (match.price_high === null && match.price_low !== null) {
      maxPrice = Math.max(maxPrice, match.price_low)
    }
  }

  const avgPrice = totalWeight > 0 ? weightedSum / totalWeight : null

  // Build range
  let range: { low: number; high: number } | null = null
  if (minPrice !== Infinity && maxPrice !== -Infinity) {
    range = { low: minPrice, high: maxPrice }
  } else if (avgPrice !== null) {
    // Create a +/- 15% range around the average
    range = {
      low: Math.round(avgPrice * 0.85 * 100) / 100,
      high: Math.round(avgPrice * 1.15 * 100) / 100
    }
  }

  return {
    price: avgPrice !== null ? Math.round(avgPrice * 100) / 100 : null,
    range
  }
}

/**
 * Main price lookup function
 *
 * @param product - Product data to lookup price for
 * @returns Price lookup result with suggested price, confidence, and source info
 */
export async function lookupPrice(product: ProductData): Promise<PriceLookupResult> {
  // Load settings from database
  const settings = getPriceSettings()

  // Step 1: Search Knowledge Base for similar items
  const vectorResults = await searchKBByProduct({
    name: product.name,
    description: product.description,
    manufacturer: product.manufacturer,
    partNumber: product.partNumber,
    category: product.category
  }, settings.kbSearchLimit)

  // Step 2: Fetch full KB item details for matches
  const kbMatches: KBMatch[] = []
  for (const result of vectorResults) {
    const item = getKBItem(result.id)
    if (item) {
      kbMatches.push({
        id: item.id,
        item_name: item.item_name,
        manufacturer: item.manufacturer,
        manufacturer_part_number: item.manufacturer_part_number,
        category: item.category,
        price_low: item.price_low,
        price_high: item.price_high,
        similarity: result.similarity
      })
    }
  }

  // Step 3: Determine confidence based on best match
  const bestMatch = kbMatches[0]
  const bestSimilarity = bestMatch?.similarity ?? 0

  // Step 4: Calculate price from KB matches
  const { price: kbPrice, range: kbRange } = calculateWeightedPrice(kbMatches)

  // Step 5: Decision logic
  if (bestSimilarity >= settings.highConfidence && kbPrice !== null) {
    // High confidence - use KB price directly
    return {
      suggestedPrice: kbPrice,
      priceRange: kbRange,
      confidence: 'high',
      source: 'kb_match',
      kbMatches,
      explanation: `Based on ${kbMatches.length} similar item(s) in the Knowledge Base. Best match: "${bestMatch.item_name}" (${Math.round(bestSimilarity * 100)}% similar).`
    }
  }

  if (bestSimilarity >= settings.mediumConfidence && kbPrice !== null) {
    // Medium confidence - use KB price but note uncertainty
    return {
      suggestedPrice: kbPrice,
      priceRange: kbRange,
      confidence: 'medium',
      source: 'kb_match',
      kbMatches,
      explanation: `Based on partial matches in the Knowledge Base. Best match: "${bestMatch.item_name}" (${Math.round(bestSimilarity * 100)}% similar). Price may need verification.`
    }
  }

  // Low or no KB match - try AI estimation
  const aiEstimate = await getAIPriceEstimate(product)

  if (kbPrice !== null && aiEstimate && aiEstimate.suggestedPrice !== null) {
    // Combine KB and AI estimates
    const combinedPrice = Math.round((kbPrice + aiEstimate.suggestedPrice) / 2 * 100) / 100
    const combinedRange = kbRange && aiEstimate.priceRange ? {
      low: Math.min(kbRange.low, aiEstimate.priceRange.low),
      high: Math.max(kbRange.high, aiEstimate.priceRange.high)
    } : kbRange || aiEstimate.priceRange

    return {
      suggestedPrice: combinedPrice,
      priceRange: combinedRange,
      confidence: 'medium',
      source: 'combined',
      kbMatches,
      explanation: `Combined estimate from partial KB matches and AI analysis. KB suggests $${kbPrice.toFixed(2)}, AI suggests $${aiEstimate.suggestedPrice.toFixed(2)}.`
    }
  }

  if (aiEstimate && aiEstimate.suggestedPrice !== null) {
    // AI only estimate
    return {
      suggestedPrice: aiEstimate.suggestedPrice,
      priceRange: aiEstimate.priceRange,
      confidence: 'low',
      source: 'ai_estimate',
      kbMatches,
      explanation: `AI-generated estimate (no strong KB matches). ${aiEstimate.explanation}`
    }
  }

  // No estimate available
  return {
    suggestedPrice: null,
    priceRange: null,
    confidence: 'none',
    source: 'none',
    kbMatches,
    explanation: kbMatches.length > 0
      ? `Found ${kbMatches.length} similar item(s) but none have pricing data.`
      : 'No similar items found in Knowledge Base and AI could not estimate price.'
  }
}

/**
 * Quick lookup for basic price check (no AI fallback, faster)
 */
export async function quickPriceLookup(product: ProductData): Promise<{
  price: number | null
  confidence: 'high' | 'medium' | 'low' | 'none'
  matchCount: number
}> {
  // Load settings from database
  const settings = getPriceSettings()

  const vectorResults = await searchKBByProduct({
    name: product.name,
    description: product.description,
    manufacturer: product.manufacturer,
    partNumber: product.partNumber,
    category: product.category
  }, Math.min(3, settings.kbSearchLimit))

  const kbMatches: KBMatch[] = []
  for (const result of vectorResults) {
    const item = getKBItem(result.id)
    if (item) {
      kbMatches.push({
        id: item.id,
        item_name: item.item_name,
        manufacturer: item.manufacturer,
        manufacturer_part_number: item.manufacturer_part_number,
        category: item.category,
        price_low: item.price_low,
        price_high: item.price_high,
        similarity: result.similarity
      })
    }
  }

  const bestSimilarity = kbMatches[0]?.similarity ?? 0
  const { price } = calculateWeightedPrice(kbMatches)

  let confidence: 'high' | 'medium' | 'low' | 'none' = 'none'
  if (bestSimilarity >= settings.highConfidence && price !== null) {
    confidence = 'high'
  } else if (bestSimilarity >= settings.mediumConfidence && price !== null) {
    confidence = 'medium'
  } else if (price !== null) {
    confidence = 'low'
  }

  return {
    price,
    confidence,
    matchCount: kbMatches.length
  }
}
