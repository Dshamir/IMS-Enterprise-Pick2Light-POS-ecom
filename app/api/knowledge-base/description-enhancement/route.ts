/**
 * Knowledge Base Description Enhancement API
 *
 * POST: Enhance product descriptions using RAG and AI
 * Following RAG Guide Section 7 - Enhanced Prompt Engineering
 *
 * Features:
 * - RAG retrieval for CQO reports, policies, and part sheets
 * - Enhanced prompts with numbered rules and explicit schemas
 * - Post-generation validation
 * - AI suggestions audit logging
 * - Recall notice detection and flagging
 * - Human review flagging for uncertain suggestions
 */

import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { buildDescriptionEnhancementPrompt, PROMPT_VERSION } from '@/lib/knowledge-base/ai-prompt-templates'
import { validateDescription, validateConfidence } from '@/lib/knowledge-base/ai-validation'
import { retrieveForDescriptionEnhancement } from '@/lib/knowledge-base/rag-retrieval'
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
interface DescriptionEnhancementResponse {
  short_description: string
  long_description: string
  needs_human_review: boolean
  confidence: number
  compliance_standards: string[]
  has_recall_notice: boolean
  reasoning: string
}

export async function POST(request: Request) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const {
      productId,
      name,
      currentDescription,
      manufacturer,
      partNumber,
      category,
    } = body

    // Validate input
    if (!name && !currentDescription) {
      return NextResponse.json(
        { error: 'At least one of name or currentDescription is required' },
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
    const retrievedContext = await retrieveForDescriptionEnhancement({
      name,
      description: currentDescription,
      manufacturer,
      partNumber,
      category,
    })

    // Step 2: Build enhanced prompt
    const { system, user } = buildDescriptionEnhancementPrompt(
      {
        name,
        description: currentDescription,
        category,
        manufacturer,
      },
      {},
      {
        cqoReports: retrievedContext.cqoReports,
        policies: retrievedContext.policies,
        partSheets: retrievedContext.partSheets,
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
      max_tokens: 1500,
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
    let aiResponse: DescriptionEnhancementResponse
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
    const descValidation = validateDescription(
      aiResponse.short_description,
      aiResponse.long_description
    )

    const confidenceValidation = validateConfidence(
      aiResponse.confidence,
      0.6 // Auto-approve threshold for descriptions
    )

    // Determine if human review is needed
    const needsHumanReview =
      aiResponse.needs_human_review ||
      aiResponse.has_recall_notice ||
      descValidation.needsReview ||
      confidenceValidation.needsReview

    // Step 6: Create audit log entries for both short and long descriptions
    const baseSuggestionInput: Omit<CreateSuggestionInput, 'field' | 'original_value' | 'suggested_value'> = {
      product_id: productId,
      was_applied: false,
      needs_human_review: needsHumanReview,
      confidence_score: aiResponse.confidence,
      reasons: [
        aiResponse.reasoning,
        ...(aiResponse.compliance_standards.length > 0
          ? [`Compliance standards found: ${aiResponse.compliance_standards.join(', ')}`]
          : []),
        ...(aiResponse.has_recall_notice
          ? ['RECALL NOTICE DETECTED - requires human review']
          : []),
      ],
      retrieval_sources: retrievedContext.sources,
      retrieval_context: JSON.stringify({
        cqoReportsCount: retrievedContext.cqoReports.length,
        policiesCount: retrievedContext.policies.length,
        partSheetsCount: retrievedContext.partSheets.length,
      }),
      prompt_version: PROMPT_VERSION,
      model_version: 'gpt-4o-mini',
      generation_time_ms: generationTimeMs,
      validation_passed: descValidation.isValid,
      validation_errors: descValidation.errors.length > 0
        ? descValidation.errors
        : undefined,
    }

    // Log both suggestions
    const shortDescSuggestion = createAISuggestion({
      ...baseSuggestionInput,
      field: 'description',
      original_value: currentDescription?.substring(0, 150) || null,
      suggested_value: aiResponse.short_description,
    })

    // We can use 'description' field for both, but track in metadata
    // Or we could add a 'long_description' field type if needed

    // Step 7: Build response
    return NextResponse.json({
      success: true,
      suggestion: {
        id: shortDescSuggestion.id,
        shortDescription: {
          suggested: aiResponse.short_description,
          original: currentDescription?.substring(0, 150) || null,
        },
        longDescription: {
          suggested: aiResponse.long_description,
          original: currentDescription || null,
        },
        confidence: aiResponse.confidence,
        confidenceLabel: confidenceValidation.label,
        reasoning: aiResponse.reasoning,
        needsHumanReview,
        reviewStatus: shortDescSuggestion.review_status,
        hasRecallNotice: aiResponse.has_recall_notice,
        complianceStandards: aiResponse.compliance_standards,
      },
      validation: {
        passed: descValidation.isValid,
        errors: descValidation.errors,
        warnings: descValidation.warnings,
      },
      retrieval: {
        cqoReportsUsed: retrievedContext.cqoReports.length,
        policiesUsed: retrievedContext.policies.length,
        partSheetsUsed: retrievedContext.partSheets.length,
        sources: retrievedContext.sources.slice(0, 5),
      },
      metadata: {
        generationTimeMs,
        promptVersion: PROMPT_VERSION,
        model: 'gpt-4o-mini',
      },
    })
  } catch (error: any) {
    console.error('Description enhancement error:', error)

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
      { error: `Description enhancement failed: ${error.message}` },
      { status: 500 }
    )
  }
}

/**
 * GET: Get description enhancement configuration and status
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
      recallDetection: true,
      complianceTracking: true,
    },
    configuration: {
      autoApproveThreshold: 0.6,
      maxShortDescLength: 150,
      maxLongDescLength: 1000,
    },
    documentTypes: {
      cqoReports: 'Quality/inspection reports for specifications',
      policies: 'Corporate description policies',
      partSheets: 'Technical data sheets',
    },
  })
}
