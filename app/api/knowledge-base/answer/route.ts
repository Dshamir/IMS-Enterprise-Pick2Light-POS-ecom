/**
 * Answer Extraction API
 *
 * Returns direct answers from the knowledge base instead of just document references.
 *
 * POST /api/knowledge-base/answer
 *   - Extract answer for a question
 *   - Returns the actual answer, not just "found in document X"
 *
 * Request body:
 * {
 *   "query": "What is the price of product X?",
 *   "options": {
 *     "searchDocuments": true,
 *     "searchKBItems": true,
 *     "useAI": true,
 *     "maxChunks": 10
 *   }
 * }
 *
 * Response:
 * {
 *   "answer": "The price of product X is $150.00",
 *   "confidence": 0.85,
 *   "answerType": "direct",
 *   "evidence": [...],
 *   "extractionTimeMs": 245
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  extractAnswer,
  extractPriceAnswer,
  extractSpecificationAnswer,
  extractComplianceAnswer,
  extractProcedureAnswer,
  getQuickAnswer,
  type AnswerExtractionOptions
} from '@/lib/knowledge-base/answer-extractor'
import {
  getCachedAnswer,
  cacheAnswer,
  hasAnswerCached
} from '@/lib/knowledge-base/search-cache'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, options = {}, type } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    const startTime = Date.now()

    // Check cache first for general queries (not specialized types)
    if (!type || type === 'general') {
      const cached = getCachedAnswer(query)
      if (cached) {
        console.log(`[Answer API] Cache HIT for: "${query.substring(0, 50)}..."`)
        return NextResponse.json({
          ...cached,
          cached: true,
          extractionTimeMs: Date.now() - startTime
        })
      }
    }

    // Use specialized extractors based on type
    let result

    switch (type) {
      case 'price':
        result = await extractPriceAnswer(
          query,
          options.manufacturer
        )
        break

      case 'specification':
        result = await extractSpecificationAnswer(
          query,
          options.specType
        )
        break

      case 'compliance':
        result = await extractComplianceAnswer(
          query,
          options.standard
        )
        break

      case 'procedure':
        result = await extractProcedureAnswer(query)
        break

      case 'quick':
        // Optimized for chat
        const quickResult = await getQuickAnswer(query)
        return NextResponse.json(quickResult)

      default:
        // General answer extraction
        result = await extractAnswer(query, {
          maxChunks: options.maxChunks ?? 10,
          minSimilarity: options.minSimilarity ?? 0.4,
          searchDocuments: options.searchDocuments ?? true,
          searchKBItems: options.searchKBItems ?? true,
          useAI: options.useAI ?? true,
          maxEvidenceItems: options.maxEvidenceItems ?? 5,
          expandQuery: options.expandQuery ?? true,
          highlightRelevantSentences: options.highlightRelevantSentences ?? true
        } as AnswerExtractionOptions)
    }

    // Cache successful answers for general queries
    if ((!type || type === 'general') && result && result.answer && result.confidence >= 0.4) {
      cacheAnswer(query, {
        answer: result.answer,
        confidence: result.confidence,
        answerType: result.answerType,
        evidence: result.evidence || []
      })
      console.log(`[Answer API] Cached answer for: "${query.substring(0, 50)}..."`)
    }

    return NextResponse.json({
      ...result,
      cached: false,
      extractionTimeMs: Date.now() - startTime
    })

  } catch (error: any) {
    console.error('[Answer API] Error:', error)
    return NextResponse.json(
      { error: 'Answer extraction failed', details: error.message },
      { status: 500 }
    )
  }
}

// GET for simple queries via URL
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || searchParams.get('query')

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter (q or query) is required' },
      { status: 400 }
    )
  }

  try {
    const result = await getQuickAnswer(query)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[Answer API] GET Error:', error)
    return NextResponse.json(
      { error: 'Answer extraction failed', details: error.message },
      { status: 500 }
    )
  }
}
