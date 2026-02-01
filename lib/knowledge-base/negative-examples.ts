/**
 * Negative Example Learning
 *
 * Learns from rejected suggestions to avoid repeating mistakes.
 * Creates a database of "what NOT to do" patterns that are checked
 * before generating new suggestions.
 *
 * Key Features:
 * - Track rejection patterns by field type
 * - Block known-bad suggestions
 * - Adjust confidence for similar patterns
 * - Generate "avoid" instructions for AI prompts
 */

import { getDatabase } from '../database/sqlite'

// Alias for compatibility
const getDB = getDatabase

// ============================================================================
// Types
// ============================================================================

export interface NegativeExample {
  id: string
  field: string
  pattern: string           // The pattern that was wrong
  patternType: 'exact' | 'contains' | 'regex' | 'semantic'
  wrongValue: string        // What was incorrectly suggested
  correctValue?: string     // What was the correct value (if known)
  reason: string           // Why it was wrong
  frequency: number        // How many times this mistake occurred
  createdAt: string
  updatedAt: string
}

export interface NegativeExampleCheck {
  isBlocked: boolean
  matchedPattern?: NegativeExample
  confidenceAdjustment: number  // Negative value to subtract from confidence
  warningMessage?: string
}

// ============================================================================
// Database Setup
// ============================================================================

/**
 * Initialize negative examples table
 */
export function initNegativeExamplesTable(): void {
  const db = getDB()

  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_negative_examples (
      id TEXT PRIMARY KEY,
      field TEXT NOT NULL,
      pattern TEXT NOT NULL,
      pattern_type TEXT DEFAULT 'exact',
      wrong_value TEXT NOT NULL,
      correct_value TEXT,
      reason TEXT NOT NULL,
      frequency INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `)

  // Index for fast lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_negative_examples_field
    ON ai_negative_examples(field, is_active)
  `)
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Add a negative example from a rejection
 */
export function addNegativeExample(input: {
  field: string
  wrongValue: string
  correctValue?: string
  reason: string
  patternType?: 'exact' | 'contains' | 'regex' | 'semantic'
}): NegativeExample {
  initNegativeExamplesTable()
  const db = getDB()

  // Check if similar pattern already exists
  const existing = db.prepare(`
    SELECT * FROM ai_negative_examples
    WHERE field = ? AND wrong_value = ? AND is_active = 1
  `).get(input.field, input.wrongValue) as NegativeExample | undefined

  if (existing) {
    // Increment frequency
    db.prepare(`
      UPDATE ai_negative_examples
      SET frequency = frequency + 1,
          updated_at = datetime('now'),
          correct_value = COALESCE(?, correct_value),
          reason = COALESCE(?, reason)
      WHERE id = ?
    `).run(input.correctValue || null, input.reason, existing.id)

    return {
      ...existing,
      frequency: existing.frequency + 1,
      correctValue: input.correctValue || existing.correctValue,
      reason: input.reason || existing.reason
    }
  }

  // Create new negative example
  const id = `neg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const pattern = generatePattern(input.wrongValue, input.patternType || 'exact')

  db.prepare(`
    INSERT INTO ai_negative_examples
    (id, field, pattern, pattern_type, wrong_value, correct_value, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.field,
    pattern,
    input.patternType || 'exact',
    input.wrongValue,
    input.correctValue || null,
    input.reason
  )

  return {
    id,
    field: input.field,
    pattern,
    patternType: input.patternType || 'exact',
    wrongValue: input.wrongValue,
    correctValue: input.correctValue,
    reason: input.reason,
    frequency: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

/**
 * Generate a pattern from a wrong value
 */
function generatePattern(value: string, type: 'exact' | 'contains' | 'regex' | 'semantic'): string {
  switch (type) {
    case 'exact':
      return value.toLowerCase().trim()
    case 'contains':
      // Extract significant words
      const words = value.toLowerCase().split(/\s+/).filter(w => w.length > 3)
      return words.join('|')
    case 'regex':
      // Escape special chars for regex
      return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    case 'semantic':
      // For semantic, we'll store keywords
      return value.toLowerCase()
    default:
      return value.toLowerCase()
  }
}

/**
 * Get all negative examples for a field
 */
export function getNegativeExamples(field: string): NegativeExample[] {
  initNegativeExamplesTable()
  const db = getDB()

  const results = db.prepare(`
    SELECT
      id, field, pattern, pattern_type as patternType,
      wrong_value as wrongValue, correct_value as correctValue,
      reason, frequency, created_at as createdAt, updated_at as updatedAt
    FROM ai_negative_examples
    WHERE field = ? AND is_active = 1
    ORDER BY frequency DESC
  `).all(field) as NegativeExample[]

  return results
}

/**
 * Get all negative examples
 */
export function getAllNegativeExamples(): NegativeExample[] {
  initNegativeExamplesTable()
  const db = getDB()

  return db.prepare(`
    SELECT
      id, field, pattern, pattern_type as patternType,
      wrong_value as wrongValue, correct_value as correctValue,
      reason, frequency, created_at as createdAt, updated_at as updatedAt
    FROM ai_negative_examples
    WHERE is_active = 1
    ORDER BY frequency DESC, updated_at DESC
  `).all() as NegativeExample[]
}

/**
 * Deactivate a negative example
 */
export function deactivateNegativeExample(id: string): boolean {
  initNegativeExamplesTable()
  const db = getDB()

  const result = db.prepare(`
    UPDATE ai_negative_examples
    SET is_active = 0, updated_at = datetime('now')
    WHERE id = ?
  `).run(id)

  return result.changes > 0
}

// ============================================================================
// Checking Against Negative Examples
// ============================================================================

/**
 * Check a proposed suggestion against negative examples
 */
export function checkAgainstNegativeExamples(
  field: string,
  proposedValue: string
): NegativeExampleCheck {
  const negativeExamples = getNegativeExamples(field)

  if (negativeExamples.length === 0) {
    return {
      isBlocked: false,
      confidenceAdjustment: 0
    }
  }

  const proposedLower = proposedValue.toLowerCase().trim()

  for (const example of negativeExamples) {
    let matches = false

    switch (example.patternType) {
      case 'exact':
        matches = proposedLower === example.pattern
        break
      case 'contains':
        const keywords = example.pattern.split('|')
        matches = keywords.some(kw => proposedLower.includes(kw))
        break
      case 'regex':
        try {
          const regex = new RegExp(example.pattern, 'i')
          matches = regex.test(proposedValue)
        } catch {
          matches = false
        }
        break
      case 'semantic':
        // Simple word overlap check
        const exampleWords = new Set(example.pattern.split(/\s+/))
        const proposedWords = proposedLower.split(/\s+/)
        const overlap = proposedWords.filter(w => exampleWords.has(w)).length
        matches = overlap >= exampleWords.size * 0.7
        break
    }

    if (matches) {
      // High-frequency mistakes should be blocked
      if (example.frequency >= 3) {
        return {
          isBlocked: true,
          matchedPattern: example,
          confidenceAdjustment: -0.5,
          warningMessage: `This suggestion matches a known incorrect pattern: "${example.wrongValue}" (rejected ${example.frequency} times). Reason: ${example.reason}`
        }
      }

      // Lower-frequency mistakes reduce confidence
      return {
        isBlocked: false,
        matchedPattern: example,
        confidenceAdjustment: -0.2 * example.frequency,
        warningMessage: `Similar suggestion was previously rejected: "${example.wrongValue}". Consider reviewing.`
      }
    }
  }

  return {
    isBlocked: false,
    confidenceAdjustment: 0
  }
}

// ============================================================================
// Auto-Learning from Rejections
// ============================================================================

/**
 * Learn from a rejected AI suggestion
 */
export function learnFromRejection(rejection: {
  field: string
  suggestedValue: string
  correctValue?: string
  reviewNotes?: string
}): NegativeExample | null {
  // Only learn if we have meaningful information
  if (!rejection.suggestedValue || rejection.suggestedValue.length < 2) {
    return null
  }

  // Determine pattern type based on field
  let patternType: 'exact' | 'contains' | 'regex' | 'semantic' = 'exact'
  if (rejection.field === 'description') {
    patternType = 'contains' // Descriptions are too long for exact match
  } else if (rejection.field === 'name') {
    patternType = 'contains' // Names might have variations
  }

  // Create reason
  let reason = rejection.reviewNotes || 'Rejected by reviewer'
  if (rejection.correctValue) {
    reason = `Should be "${rejection.correctValue}". ${reason}`
  }

  return addNegativeExample({
    field: rejection.field,
    wrongValue: rejection.suggestedValue,
    correctValue: rejection.correctValue,
    reason,
    patternType
  })
}

/**
 * Scan ai_suggestions table for rejections and learn from them
 */
export function learnFromHistoricalRejections(): {
  learned: number
  skipped: number
} {
  const db = getDB()
  let learned = 0
  let skipped = 0

  try {
    const rejections = db.prepare(`
      SELECT field, suggested_value, original_value, review_notes
      FROM ai_suggestions
      WHERE review_status = 'rejected'
        AND suggested_value IS NOT NULL
        AND suggested_value != ''
      ORDER BY reviewed_at DESC
      LIMIT 500
    `).all() as Array<{
      field: string
      suggested_value: string
      original_value: string
      review_notes: string
    }>

    for (const rejection of rejections) {
      const result = learnFromRejection({
        field: rejection.field,
        suggestedValue: rejection.suggested_value,
        correctValue: rejection.original_value, // Original might be what they wanted
        reviewNotes: rejection.review_notes
      })

      if (result) {
        learned++
      } else {
        skipped++
      }
    }
  } catch (error) {
    console.warn('[Negative Examples] Failed to learn from history:', error)
  }

  return { learned, skipped }
}

// ============================================================================
// Prompt Generation
// ============================================================================

/**
 * Generate "avoid" instructions for AI prompts
 */
export function generateAvoidInstructions(field: string, limit: number = 5): string {
  const examples = getNegativeExamples(field)
    .slice(0, limit)

  if (examples.length === 0) {
    return ''
  }

  const instructions = examples.map(ex => {
    let instruction = `- Do NOT suggest "${ex.wrongValue}"`
    if (ex.correctValue) {
      instruction += ` (correct: "${ex.correctValue}")`
    }
    instruction += ` - Reason: ${ex.reason}`
    return instruction
  })

  return `
AVOID THESE PATTERNS (known incorrect suggestions):
${instructions.join('\n')}
`
}

/**
 * Get negative examples formatted for prompt injection
 */
export function getNegativeExamplesForPrompt(field: string): string[] {
  const examples = getNegativeExamples(field).slice(0, 10)

  return examples.map(ex => {
    if (ex.correctValue) {
      return `"${ex.wrongValue}" is WRONG, should be "${ex.correctValue}"`
    }
    return `"${ex.wrongValue}" is WRONG: ${ex.reason}`
  })
}

// ============================================================================
// Learning from Answer Feedback
// ============================================================================

/**
 * Learn from negative answer feedback (thumbs down)
 *
 * When a user thumbs-down an answer, we create a negative example
 * so the system learns to avoid similar bad answers in the future.
 */
export function learnFromAnswerFeedback(input: {
  query: string
  badAnswer: string
  comment?: string
  sourceType?: string
  confidence?: number
}): NegativeExample | null {
  // Only learn if we have meaningful information
  if (!input.query || !input.badAnswer || input.badAnswer.length < 10) {
    console.log('[Negative Examples] Skipped - insufficient data')
    return null
  }

  // Don't learn from low-confidence answers (they were already uncertain)
  if (input.confidence !== undefined && input.confidence < 0.3) {
    console.log('[Negative Examples] Skipped - low confidence answer already flagged')
    return null
  }

  // Extract key terms from the query to form a pattern
  const queryLower = input.query.toLowerCase().trim()
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 3)

  // Create a semantic pattern from the query
  const patternType: 'exact' | 'contains' | 'regex' | 'semantic' = 'semantic'

  // Build reason from comment or default
  let reason = input.comment || 'User rated answer as unhelpful'
  if (input.sourceType) {
    reason += ` (source: ${input.sourceType})`
  }

  console.log(`[Negative Examples] Learning from bad answer for query: "${input.query.substring(0, 50)}..."`)

  return addNegativeExample({
    field: 'answer',  // Special field for KB answers
    wrongValue: `Q: ${queryLower}\nA: ${input.badAnswer.substring(0, 500)}`,
    reason,
    patternType
  })
}

/**
 * Check if an answer might be bad based on learned patterns
 */
export function checkAnswerAgainstNegativeExamples(
  query: string,
  proposedAnswer: string
): NegativeExampleCheck {
  const negativeExamples = getNegativeExamples('answer')

  if (negativeExamples.length === 0) {
    return {
      isBlocked: false,
      confidenceAdjustment: 0
    }
  }

  const queryLower = query.toLowerCase().trim()
  const answerLower = proposedAnswer.toLowerCase().trim()

  for (const example of negativeExamples) {
    // Parse the stored pattern (Q: ... A: ...)
    const parts = example.wrongValue.split('\nA: ')
    if (parts.length !== 2) continue

    const storedQuery = parts[0].replace('Q: ', '').trim()
    const storedAnswer = parts[1].trim()

    // Check query similarity
    const queryWords = queryLower.split(/\s+/)
    const storedQueryWords = storedQuery.split(/\s+/)
    const queryOverlap = queryWords.filter(w => storedQueryWords.includes(w)).length
    const querySimilarity = queryOverlap / Math.max(queryWords.length, storedQueryWords.length)

    // Check answer similarity
    const answerWords = answerLower.split(/\s+/)
    const storedAnswerWords = storedAnswer.split(/\s+/)
    const answerOverlap = answerWords.filter(w => storedAnswerWords.includes(w)).length
    const answerSimilarity = answerOverlap / Math.max(answerWords.length, storedAnswerWords.length)

    // If both query and answer are similar to a negative example, flag it
    if (querySimilarity > 0.6 && answerSimilarity > 0.7) {
      // High-frequency mistakes should reduce confidence more
      const adjustment = -0.15 * Math.min(example.frequency, 5)

      if (example.frequency >= 5) {
        return {
          isBlocked: true,
          matchedPattern: example,
          confidenceAdjustment: adjustment,
          warningMessage: `This answer is similar to a known bad answer that was rejected ${example.frequency} times.`
        }
      }

      return {
        isBlocked: false,
        matchedPattern: example,
        confidenceAdjustment: adjustment,
        warningMessage: `Similar answer was previously marked unhelpful.`
      }
    }
  }

  return {
    isBlocked: false,
    confidenceAdjustment: 0
  }
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get negative example statistics
 */
export function getNegativeExampleStats(): {
  byField: Record<string, { count: number; totalRejections: number }>
  mostFrequent: Array<{ field: string; wrongValue: string; frequency: number }>
  totalPatterns: number
} {
  initNegativeExamplesTable()
  const db = getDB()

  const byField: Record<string, { count: number; totalRejections: number }> = {}

  const fieldStats = db.prepare(`
    SELECT field, COUNT(*) as count, SUM(frequency) as total_rejections
    FROM ai_negative_examples
    WHERE is_active = 1
    GROUP BY field
  `).all() as Array<{ field: string; count: number; total_rejections: number }>

  for (const stat of fieldStats) {
    byField[stat.field] = {
      count: stat.count,
      totalRejections: stat.total_rejections
    }
  }

  const mostFrequent = db.prepare(`
    SELECT field, wrong_value as wrongValue, frequency
    FROM ai_negative_examples
    WHERE is_active = 1
    ORDER BY frequency DESC
    LIMIT 10
  `).all() as Array<{ field: string; wrongValue: string; frequency: number }>

  const totalResult = db.prepare(`
    SELECT COUNT(*) as total FROM ai_negative_examples WHERE is_active = 1
  `).get() as { total: number }

  return {
    byField,
    mostFrequent,
    totalPatterns: totalResult.total
  }
}
