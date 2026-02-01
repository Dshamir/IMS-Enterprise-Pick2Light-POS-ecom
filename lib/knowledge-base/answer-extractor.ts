/**
 * Answer Extractor
 *
 * Extracts relevant answers from document chunks instead of just returning
 * document references. This is the key to showing RELEVANCE not just documents.
 *
 * Process:
 * 1. Retrieve relevant chunks via semantic search
 * 2. Extract the most relevant passages
 * 3. Use AI to synthesize a direct answer from the passages
 * 4. Return both the answer and the supporting evidence
 *
 * This transforms "found in document X" → "The answer is Y (from document X)"
 */

import OpenAI from 'openai'
import { searchDocumentChunks, type ChunkSearchResult } from './document-vector-search'
import { searchKBByText } from './kb-vector-search'
import { expandQuery } from './query-expansion'
import { rerankResults, type RerankableResult } from './smart-reranker'
import { getEmbeddingWithCache } from './search-cache'
import { checkAnswerAgainstNegativeExamples } from './negative-examples'

// ============================================================================
// Types
// ============================================================================

export interface ExtractedAnswer {
  // The direct answer to the question
  answer: string
  // Confidence in the answer (0-1)
  confidence: number
  // Type of answer
  answerType: 'direct' | 'synthesized' | 'partial' | 'not_found'
  // Supporting evidence (the relevant passages)
  evidence: Array<{
    text: string
    source: string
    sourceType: 'document' | 'kb_item'
    similarity: number
    highlight?: string  // The most relevant sentence
  }>
  // Metadata
  queryExpanded: boolean
  chunksAnalyzed: number
  extractionTimeMs: number
}

export interface AnswerExtractionOptions {
  // Search options
  maxChunks?: number
  minSimilarity?: number
  searchDocuments?: boolean
  searchKBItems?: boolean
  // Extraction options
  useAI?: boolean  // Use AI to synthesize answer (requires OpenAI)
  maxEvidenceItems?: number
  highlightRelevantSentences?: boolean
  // Query options
  expandQuery?: boolean
}

// ============================================================================
// OpenAI Client
// ============================================================================

let openai: OpenAI | null = null

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

// ============================================================================
// Main Answer Extraction
// ============================================================================

/**
 * Extract a direct answer from the knowledge base
 *
 * Instead of "Found in Document X", returns "The answer is Y"
 */
export async function extractAnswer(
  query: string,
  options: AnswerExtractionOptions = {}
): Promise<ExtractedAnswer> {
  const startTime = Date.now()

  const maxChunks = options.maxChunks ?? 10
  const minSimilarity = options.minSimilarity ?? 0.4
  const searchDocuments = options.searchDocuments ?? true
  const searchKBItems = options.searchKBItems ?? true
  const useAI = options.useAI ?? true
  const maxEvidence = options.maxEvidenceItems ?? 5
  const doExpandQuery = options.expandQuery ?? true
  const highlightSentences = options.highlightRelevantSentences ?? true

  // 1. Expand query for better recall
  let searchQuery = query
  let queryExpanded = false

  if (doExpandQuery) {
    const expanded = expandQuery(query)
    if (expanded.variations.length > 1) {
      searchQuery = expanded.expanded
      queryExpanded = true
    }
  }

  // 2. Search for relevant content
  const allResults: Array<{
    text: string
    source: string
    sourceType: 'document' | 'kb_item'
    similarity: number
    metadata?: Record<string, any>
  }> = []

  // Search documents
  if (searchDocuments) {
    try {
      const docResults = await searchDocumentChunks(searchQuery, maxChunks)

      for (const chunk of docResults) {
        if (chunk.similarity >= minSimilarity) {
          allResults.push({
            text: chunk.content,
            source: chunk.metadata.sectionTitle || `Document chunk ${chunk.metadata.chunkIndex}`,
            sourceType: 'document',
            similarity: chunk.similarity,
            metadata: {
              documentId: chunk.documentId,
              chunkIndex: chunk.metadata.chunkIndex,
              pageNumber: chunk.metadata.pageNumber
            }
          })
        }
      }
    } catch (error) {
      console.warn('[Answer Extractor] Document search failed:', error)
    }
  }

  // Search KB items
  if (searchKBItems) {
    try {
      const kbResults = await searchKBByText(searchQuery, maxChunks)

      for (const item of kbResults) {
        if (item.similarity >= minSimilarity) {
          const text = [
            item.item_name,
            item.description,
            item.manufacturer ? `Manufacturer: ${item.manufacturer}` : '',
            item.manufacturer_part_number ? `Part Number: ${item.manufacturer_part_number}` : '',
            item.price_low !== null ? `Price: $${item.price_low}${item.price_high !== null && item.price_high !== item.price_low ? ` - $${item.price_high}` : ''}` : ''
          ].filter(Boolean).join('. ')

          allResults.push({
            text,
            source: item.item_name,
            sourceType: 'kb_item',
            similarity: item.similarity,
            metadata: {
              itemId: item.id,
              manufacturer: item.manufacturer,
              category: item.category
            }
          })
        }
      }
    } catch (error) {
      console.warn('[Answer Extractor] KB search failed:', error)
    }
  }

  // 3. No results found
  if (allResults.length === 0) {
    return {
      answer: "I couldn't find relevant information in the knowledge base for this query.",
      confidence: 0,
      answerType: 'not_found',
      evidence: [],
      queryExpanded,
      chunksAnalyzed: 0,
      extractionTimeMs: Date.now() - startTime
    }
  }

  // 4. Sort by similarity and take top results
  allResults.sort((a, b) => b.similarity - a.similarity)
  const topResults = allResults.slice(0, maxEvidence)

  // 5. Highlight relevant sentences in evidence
  const evidence = topResults.map(result => ({
    text: result.text,
    source: result.source,
    sourceType: result.sourceType,
    similarity: result.similarity,
    highlight: highlightSentences
      ? findMostRelevantSentence(result.text, query)
      : undefined
  }))

  // 6. Extract/synthesize answer
  let answer: string
  let confidence: number
  let answerType: ExtractedAnswer['answerType']

  if (useAI && getOpenAIClient()) {
    // Use AI to synthesize a coherent answer
    const synthesis = await synthesizeAnswerWithAI(query, topResults)
    answer = synthesis.answer
    confidence = synthesis.confidence
    answerType = synthesis.answerType
  } else {
    // Extract best passage without AI
    const extraction = extractBestPassage(query, topResults)
    answer = extraction.answer
    confidence = extraction.confidence
    answerType = extraction.answerType
  }

  // 7. Check answer against negative examples (learned from user feedback)
  let finalConfidence = confidence
  let warningMessage: string | undefined

  try {
    const negativeCheck = checkAnswerAgainstNegativeExamples(query, answer)

    if (negativeCheck.isBlocked) {
      // This answer is similar to one that was repeatedly marked as bad
      console.log(`[Answer Extractor] Answer blocked by negative example: ${negativeCheck.warningMessage}`)
      return {
        answer: "I found some information, but previous feedback suggests it may not be accurate. Please try rephrasing your question or check the evidence below.",
        confidence: Math.max(0.2, confidence + negativeCheck.confidenceAdjustment),
        answerType: 'partial',
        evidence,
        queryExpanded,
        chunksAnalyzed: allResults.length,
        extractionTimeMs: Date.now() - startTime
      }
    }

    if (negativeCheck.confidenceAdjustment !== 0) {
      // Adjust confidence based on similarity to previously bad answers
      finalConfidence = Math.max(0.1, confidence + negativeCheck.confidenceAdjustment)
      warningMessage = negativeCheck.warningMessage
      console.log(`[Answer Extractor] Confidence adjusted: ${confidence} → ${finalConfidence}`)
    }
  } catch (negativeError) {
    // Don't fail extraction if negative check fails
    console.warn('[Answer Extractor] Negative examples check failed:', negativeError)
  }

  return {
    answer,
    confidence: finalConfidence,
    answerType,
    evidence,
    queryExpanded,
    chunksAnalyzed: allResults.length,
    extractionTimeMs: Date.now() - startTime
  }
}

// ============================================================================
// Answer Synthesis (AI-powered)
// ============================================================================

/**
 * Use AI to synthesize a coherent answer from retrieved passages
 */
async function synthesizeAnswerWithAI(
  query: string,
  passages: Array<{ text: string; source: string; similarity: number }>
): Promise<{ answer: string; confidence: number; answerType: ExtractedAnswer['answerType'] }> {
  const client = getOpenAIClient()
  if (!client) {
    return extractBestPassage(query, passages)
  }

  const context = passages
    .map((p, i) => `[Source ${i + 1}: ${p.source}]\n${p.text}`)
    .join('\n\n---\n\n')

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a knowledge base assistant that provides direct, accurate answers based on retrieved information.

RULES:
1. Answer the question directly and concisely
2. Only use information from the provided sources
3. If the sources don't contain enough information, say so clearly
4. Include specific details (numbers, names, specifications) when available
5. Keep answers under 200 words unless more detail is necessary
6. Do NOT make up information not present in the sources
7. Cite which source the information came from when helpful

FORMAT:
- Start with the direct answer
- Add supporting details if helpful
- Mention if information is incomplete`
        },
        {
          role: 'user',
          content: `Question: ${query}

Retrieved Information:
${context}

Provide a direct answer based on this information:`
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    })

    const answer = response.choices[0]?.message?.content || ''

    // Estimate confidence based on response
    let confidence = 0.7
    let answerType: ExtractedAnswer['answerType'] = 'synthesized'

    if (answer.toLowerCase().includes("couldn't find") ||
        answer.toLowerCase().includes("no information") ||
        answer.toLowerCase().includes("not enough")) {
      confidence = 0.3
      answerType = 'partial'
    } else if (passages[0].similarity > 0.7) {
      confidence = 0.9
      answerType = 'direct'
    }

    return { answer, confidence, answerType }
  } catch (error: any) {
    console.error('[Answer Extractor] AI synthesis failed:', error.message)
    return extractBestPassage(query, passages)
  }
}

// ============================================================================
// Non-AI Extraction
// ============================================================================

/**
 * Extract the best passage without using AI
 */
function extractBestPassage(
  query: string,
  passages: Array<{ text: string; source: string; similarity: number }>
): { answer: string; confidence: number; answerType: ExtractedAnswer['answerType'] } {
  if (passages.length === 0) {
    return {
      answer: "No relevant information found.",
      confidence: 0,
      answerType: 'not_found'
    }
  }

  const bestPassage = passages[0]
  const relevantSentence = findMostRelevantSentence(bestPassage.text, query)

  // Build answer from best content
  let answer: string
  if (relevantSentence && relevantSentence.length > 20) {
    answer = relevantSentence
    // Add source attribution
    answer += `\n\n(Source: ${bestPassage.source})`
  } else {
    // Use truncated passage
    answer = bestPassage.text.substring(0, 300)
    if (bestPassage.text.length > 300) answer += '...'
    answer += `\n\n(Source: ${bestPassage.source})`
  }

  return {
    answer,
    confidence: Math.min(bestPassage.similarity, 0.8),
    answerType: bestPassage.similarity > 0.6 ? 'direct' : 'partial'
  }
}

/**
 * Find the most relevant sentence in a passage
 */
function findMostRelevantSentence(text: string, query: string): string | undefined {
  // Split into sentences
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10)

  if (sentences.length === 0) return undefined

  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2)

  // Score each sentence by query term overlap
  let bestSentence = sentences[0]
  let bestScore = 0

  for (const sentence of sentences) {
    const sentenceLower = sentence.toLowerCase()
    let score = 0

    for (const term of queryTerms) {
      if (sentenceLower.includes(term)) {
        score += 1
      }
    }

    // Bonus for shorter, focused sentences
    if (sentence.length < 200) score += 0.5

    if (score > bestScore) {
      bestScore = score
      bestSentence = sentence
    }
  }

  return bestSentence.trim()
}

// ============================================================================
// Specialized Extractors
// ============================================================================

/**
 * Extract price information from KB
 */
export async function extractPriceAnswer(
  productName: string,
  manufacturer?: string
): Promise<ExtractedAnswer> {
  const query = manufacturer
    ? `price cost ${productName} ${manufacturer}`
    : `price cost ${productName}`

  const result = await extractAnswer(query, {
    searchDocuments: true,
    searchKBItems: true,
    minSimilarity: 0.3,
    maxChunks: 15,
    useAI: true
  })

  // If AI answer doesn't contain price info, try to extract from evidence
  if (!result.answer.match(/\$[\d,]+/) && result.evidence.length > 0) {
    for (const ev of result.evidence) {
      const priceMatch = ev.text.match(/\$[\d,]+(?:\.\d{2})?/)
      if (priceMatch) {
        result.answer = `Price found: ${priceMatch[0]}\n\n${result.answer}`
        break
      }
    }
  }

  return result
}

/**
 * Extract specification information
 */
export async function extractSpecificationAnswer(
  productName: string,
  specType?: string
): Promise<ExtractedAnswer> {
  const query = specType
    ? `${specType} specification ${productName}`
    : `specifications technical details ${productName}`

  return extractAnswer(query, {
    searchDocuments: true,
    searchKBItems: true,
    minSimilarity: 0.35,
    maxChunks: 10,
    useAI: true
  })
}

/**
 * Extract compliance/regulatory information
 */
export async function extractComplianceAnswer(
  productName: string,
  standard?: string
): Promise<ExtractedAnswer> {
  const query = standard
    ? `${standard} compliance certification ${productName}`
    : `FDA CE ISO compliance regulatory ${productName}`

  return extractAnswer(query, {
    searchDocuments: true,
    searchKBItems: false, // Compliance info usually in documents
    minSimilarity: 0.4,
    maxChunks: 8,
    useAI: true
  })
}

/**
 * Extract procedure/how-to information
 */
export async function extractProcedureAnswer(
  query: string
): Promise<ExtractedAnswer> {
  return extractAnswer(query, {
    searchDocuments: true,
    searchKBItems: false,
    minSimilarity: 0.35,
    maxChunks: 12,
    useAI: true,
    highlightRelevantSentences: true
  })
}

// ============================================================================
// Quick Answer (Optimized for chat)
// ============================================================================

/**
 * Get a quick answer optimized for chat interface
 */
export async function getQuickAnswer(query: string): Promise<{
  answer: string
  sources: string[]
  confidence: number
}> {
  const result = await extractAnswer(query, {
    maxChunks: 5,
    minSimilarity: 0.45,
    useAI: true,
    maxEvidenceItems: 3
  })

  return {
    answer: result.answer,
    sources: result.evidence.map(e => e.source),
    confidence: result.confidence
  }
}
