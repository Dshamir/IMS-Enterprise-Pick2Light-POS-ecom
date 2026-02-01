/**
 * Knowledge Base Name Generation API
 *
 * POST: Generate optimized product name using RAG and AI
 * Following RAG Guide Section 7 - Enhanced Prompt Engineering
 *
 * Features:
 * - RAG retrieval for naming policies and similar products
 * - Enhanced prompts with numbered rules and explicit schemas
 * - Post-generation validation
 * - AI suggestions audit logging
 * - Human review flagging for uncertain suggestions
 */

import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { buildNameGenerationPrompt, PROMPT_VERSION, getDefaultBannedWords } from '@/lib/knowledge-base/ai-prompt-templates'
import { validateProductName, validateConfidence } from '@/lib/knowledge-base/ai-validation'
import { retrieveForNameGeneration } from '@/lib/knowledge-base/rag-retrieval'
import { createAISuggestion, type CreateSuggestionInput } from '@/lib/knowledge-base/ai-suggestions-db'

// Initialize OpenAI client
function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY
  const isValidKey = apiKey &&
    apiKey !== 'fake-key' &&
    !apiKey.startsWith('your-') &&
    (apiKey.startsWith('sk-') || apiKey.startsWith('sk-proj-'))

  if (!isValidKey) return null

  return new OpenAI({ apiKey })
}

// AI Response interface
interface NameGenerationResponse {
  name: string
  changes_made: string[]
  needs_human_review: boolean
  confidence: number
  reasoning: string
}

export async function POST(request: Request) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const {
      productId,
      currentName,
      description,
      manufacturer,
      category,
      bannedWords,
    } = body

    // Validate input
    if (!currentName && !description && !manufacturer) {
      return NextResponse.json(
        { error: 'At least one of currentName, description, or manufacturer is required' },
        { status: 400 }
      )
    }

    const openai = getOpenAIClient()
    if (!openai) {
      return NextResponse.json(
        { error: 'OpenAI API not configured. Please set OPENAI_API_KEY environment variable.' },
        { status: 503 }
      )
    }

    // Step 1: Retrieve relevant context using RAG
    const retrievedContext = await retrieveForNameGeneration({
      name: currentName,
      description,
      manufacturer,
      category,
    })

    // Step 2: Build enhanced prompt
    const { system, user } = buildNameGenerationPrompt(
      {
        description,
        manufacturer,
        category,
        currentName,
      },
      {
        bannedWords: bannedWords || getDefaultBannedWords(),
      },
      {
        policies: retrievedContext.policies,
        similarProducts: retrievedContext.similarProducts,
      }
    )

    // Step 3: Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    })

    const generationTimeMs = Date.now() - startTime
    const responseContent = completion.choices[0]?.message?.content

    if (!responseContent) {
      return NextResponse.json(
        { error: 'No response from AI model' },
        { status: 500 }
      )
    }

    // Step 4: Parse AI response
    let aiResponse: NameGenerationResponse
    try {
      aiResponse = JSON.parse(responseContent)
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseContent)
      return NextResponse.json(
        { error: 'Failed to parse AI response as JSON' },
        { status: 500 }
      )
    }

    // Step 5: Post-generation validation
    const nameValidation = validateProductName(
      aiResponse.name,
      bannedWords || getDefaultBannedWords()
    )

    const confidenceValidation = validateConfidence(
      aiResponse.confidence,
      0.7 // Auto-approve threshold
    )

    // Determine if human review is needed
    const needsHumanReview =
      aiResponse.needs_human_review ||
      nameValidation.needsReview ||
      confidenceValidation.needsReview

    // Step 6: Create audit log entry
    const suggestionInput: CreateSuggestionInput = {
      product_id: productId,
      field: 'name',
      original_value: currentName || null,
      suggested_value: aiResponse.name,
      was_applied: false,
      needs_human_review: needsHumanReview,
      confidence_score: aiResponse.confidence,
      reasons: [
        ...aiResponse.changes_made,
        ...(aiResponse.reasoning ? [aiResponse.reasoning] : []),
      ],
      retrieval_sources: retrievedContext.sources,
      retrieval_context: JSON.stringify({
        policiesCount: retrievedContext.policies.length,
        similarProductsCount: retrievedContext.similarProducts.length,
      }),
      prompt_version: PROMPT_VERSION,
      model_version: 'gpt-4o-mini',
      generation_time_ms: generationTimeMs,
      validation_passed: nameValidation.isValid,
      validation_errors: nameValidation.errors.length > 0
        ? nameValidation.errors
        : undefined,
    }

    const suggestion = createAISuggestion(suggestionInput)

    // Step 7: Build response
    return NextResponse.json({
      success: true,
      suggestion: {
        id: suggestion.id,
        suggestedName: aiResponse.name,
        originalName: currentName || null,
        changesMade: aiResponse.changes_made,
        confidence: aiResponse.confidence,
        confidenceLabel: confidenceValidation.label,
        reasoning: aiResponse.reasoning,
        needsHumanReview,
        reviewStatus: suggestion.review_status,
      },
      validation: {
        passed: nameValidation.isValid,
        errors: nameValidation.errors,
        warnings: nameValidation.warnings,
      },
      retrieval: {
        policiesUsed: retrievedContext.policies.length,
        similarProductsUsed: retrievedContext.similarProducts.length,
        sources: retrievedContext.sources.slice(0, 5), // Limit for response size
      },
      metadata: {
        generationTimeMs,
        promptVersion: PROMPT_VERSION,
        model: 'gpt-4o-mini',
      },
    })
  } catch (error: any) {
    console.error('Name generation error:', error)

    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota') {
      return NextResponse.json(
        { error: 'OpenAI API quota exceeded. Please check your billing.' },
        { status: 503 }
      )
    }

    if (error.code === 'invalid_api_key') {
      return NextResponse.json(
        { error: 'Invalid OpenAI API key.' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: `Name generation failed: ${error.message}` },
      { status: 500 }
    )
  }
}

/**
 * GET: Get name generation configuration and status
 */
export async function GET() {
  const openai = getOpenAIClient()

  return NextResponse.json({
    available: !!openai,
    promptVersion: PROMPT_VERSION,
    model: 'gpt-4o-mini',
    features: {
      ragRetrieval: true,
      validation: true,
      auditLogging: true,
      humanReviewQueue: true,
    },
    defaultBannedWords: getDefaultBannedWords(),
    configuration: {
      autoApproveThreshold: 0.7,
      maxNameLength: 80,
      minNameLength: 3,
    },
  })
}
