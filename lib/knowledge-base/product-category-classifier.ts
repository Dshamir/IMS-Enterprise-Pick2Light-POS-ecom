/**
 * AI-Powered Product Category Classifier
 *
 * Uses OpenAI to analyze product name and description to determine
 * the most appropriate category prefix from the Barcode Generation Configuration.
 *
 * Decisions are made within MDSAP quality management system boundaries,
 * using only the configured category prefixes.
 */

import OpenAI from 'openai'
import { getBarcodeSettings } from './kb-settings'
import { logAIUsage } from '@/lib/ai/usage-logger'

// OpenAI client singleton
let openai: OpenAI | null = null

/**
 * Initialize OpenAI client
 */
function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY
  const isValidKey = apiKey &&
    apiKey !== 'fake-key' &&
    !apiKey.startsWith('your-') &&
    (apiKey.startsWith('sk-') || apiKey.startsWith('sk-proj-'))

  if (!openai && isValidKey) {
    openai = new OpenAI({ apiKey })
  }
  return openai
}

/**
 * Classification result from AI analysis
 */
export interface CategoryClassificationResult {
  category: string           // Category name (e.g., "production material, tools & machinary")
  prefix: string             // Prefix code (e.g., "90")
  confidence: 'high' | 'medium' | 'low'
  reasoning: string          // Explanation of why this category was chosen
  alternatives: Array<{
    category: string
    prefix: string
    confidence: number
  }>
}

/**
 * Build the system prompt with all available category prefixes
 */
function buildClassificationPrompt(categoryPrefixes: Record<string, string>): string {
  // Format categories for the prompt
  const categoryList = Object.entries(categoryPrefixes)
    .filter(([cat]) => cat !== 'default')
    .map(([category, prefix]) => `- ${category} (${prefix})`)
    .join('\n')

  return `You are a product categorization expert for an industrial/commercial inventory system following MDSAP quality management principles.

Your task is to classify products into EXACTLY ONE of the available categories based on the product name and description.

## Available Categories and Their Prefixes:
${categoryList}
- default (00): Use ONLY when no other category fits

## Classification Rules:
1. Choose the MOST SPECIFIC category that matches the product
2. Consider the product's PRIMARY function and use case
3. For materials/consumables used in production, use "production material, tools & machinary" (90)
4. For electronic components, use the specific component category (resistors, capacitors, ICs, etc.)
5. Only use "default" (00) if the product truly doesn't fit any other category

## Response Format (JSON only):
{
  "category": "exact category name from the list",
  "prefix": "the prefix code",
  "confidence": 0.0 to 1.0,
  "reasoning": "brief explanation of why this category was chosen",
  "alternatives": [
    {"category": "second best option", "prefix": "XX", "confidence": 0.0 to 1.0}
  ]
}

Respond with valid JSON only, no additional text.`
}

/**
 * Classify a product into a category using AI analysis
 *
 * @param productName - The product name
 * @param description - Product description (optional)
 * @param manufacturer - Manufacturer name (optional)
 * @param categoryPrefixes - Available categories and their prefixes
 * @returns Classification result or null if classification fails
 */
export async function classifyProductCategory(
  productName: string,
  description?: string,
  manufacturer?: string,
  categoryPrefixes?: Record<string, string>
): Promise<CategoryClassificationResult | null> {
  const client = getOpenAIClient()
  if (!client) {
    console.warn('OpenAI client not available for category classification')
    return null
  }

  // Get category prefixes from settings if not provided
  const prefixes = categoryPrefixes || getBarcodeSettings().categoryPrefixes

  try {
    // Build the user message with product details
    const productDetails = [
      `Product Name: ${productName}`,
      description ? `Description: ${description}` : null,
      manufacturer ? `Manufacturer: ${manufacturer}` : null
    ].filter(Boolean).join('\n')

    const systemPrompt = buildClassificationPrompt(prefixes)
    const userInput = `Classify this product:\n\n${productDetails}`
    const startTime = Date.now()

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userInput
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 300,
      temperature: 0.3
    })

    const latencyMs = Date.now() - startTime
    const content = response.choices[0]?.message?.content

    // Log the AI usage
    logAIUsage({
      taskType: 'categorization',
      modelId: 'gpt-4o-mini',
      provider: 'openai',
      systemPrompt,
      userInput,
      assistantOutput: content || undefined,
      temperature: 0.3,
      maxTokens: 300,
      responseFormat: 'json_object',
      inputTokens: response.usage?.prompt_tokens,
      outputTokens: response.usage?.completion_tokens,
      totalTokens: response.usage?.total_tokens,
      latencyMs,
      success: !!content
    })

    if (!content) {
      console.warn('No response from OpenAI for category classification')
      return null
    }

    // Parse the JSON response
    const result = JSON.parse(content)

    // Validate the response
    if (!result.category || !result.prefix) {
      console.warn('Invalid classification response:', result)
      return null
    }

    // Verify the category exists in our prefixes
    const normalizedCategory = result.category.toLowerCase()
    let validPrefix = result.prefix

    // Find matching category (case-insensitive)
    const matchingEntry = Object.entries(prefixes).find(
      ([cat]) => cat.toLowerCase() === normalizedCategory
    )

    if (matchingEntry) {
      validPrefix = matchingEntry[1]
    } else {
      // If category not found, check if prefix is valid
      const prefixExists = Object.values(prefixes).includes(result.prefix)
      if (!prefixExists) {
        console.warn(`AI returned unknown category: ${result.category}, using default`)
        validPrefix = prefixes['default'] || '00'
      }
    }

    // Convert numeric confidence to label
    const confidenceValue = typeof result.confidence === 'number' ? result.confidence : 0.5
    let confidenceLabel: 'high' | 'medium' | 'low'
    if (confidenceValue >= 0.8) {
      confidenceLabel = 'high'
    } else if (confidenceValue >= 0.5) {
      confidenceLabel = 'medium'
    } else {
      confidenceLabel = 'low'
    }

    // Process alternatives
    const alternatives = (result.alternatives || []).map((alt: any) => ({
      category: alt.category || 'unknown',
      prefix: prefixes[alt.category?.toLowerCase()] || alt.prefix || '00',
      confidence: typeof alt.confidence === 'number' ? alt.confidence : 0
    }))

    return {
      category: matchingEntry ? matchingEntry[0] : result.category,
      prefix: validPrefix,
      confidence: confidenceLabel,
      reasoning: result.reasoning || 'No reasoning provided',
      alternatives
    }

  } catch (error: any) {
    console.error('Category classification failed:', error.message)

    // Log failed attempt
    logAIUsage({
      taskType: 'categorization',
      modelId: 'gpt-4o-mini',
      provider: 'openai',
      userInput: `${productName} - ${description || ''}`,
      success: false,
      errorMessage: error.message
    })

    return null
  }
}

/**
 * Check if AI classification is available (OpenAI configured)
 */
export function isClassificationAvailable(): boolean {
  return getOpenAIClient() !== null
}

/**
 * Get a confidence explanation for display
 */
export function getConfidenceExplanation(confidence: 'high' | 'medium' | 'low'): string {
  switch (confidence) {
    case 'high':
      return 'Strong match - product characteristics clearly indicate this category'
    case 'medium':
      return 'Probable match - product likely belongs to this category'
    case 'low':
      return 'Weak match - consider reviewing the classification manually'
    default:
      return 'Unknown confidence level'
  }
}
