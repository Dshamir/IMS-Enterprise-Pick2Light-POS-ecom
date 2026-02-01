/**
 * Knowledge Base Evaluator
 * Evaluates KB answer accuracy using training data
 */

import { getDatabase } from '@/lib/database/sqlite'
import { getQuickAnswer } from './answer-extractor'

// Types
export interface TrainingDataItem {
  id: string
  query: string
  expected_answer: string
  context_items: string[]
  category: string | null
  difficulty: string
  is_validated: boolean
  created_at: string
}

export interface EvaluationResult {
  query: string
  expectedAnswer: string
  actualAnswer: string
  isCorrect: boolean
  confidence: number
  similarity: number
  responseTimeMs: number
}

export interface EvaluationRun {
  id: string
  runName: string
  totalQueries: number
  correctAnswers: number
  accuracyScore: number
  avgConfidence: number
  modelUsed: string
  results: EvaluationResult[]
  createdAt: string
}

// Calculate text similarity (simple word overlap)
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2))
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2))

  if (words1.size === 0 && words2.size === 0) return 1
  if (words1.size === 0 || words2.size === 0) return 0

  let intersection = 0
  for (const word of words1) {
    if (words2.has(word)) intersection++
  }

  return intersection / Math.max(words1.size, words2.size)
}

// Determine if answer is correct based on similarity threshold
function isAnswerCorrect(expected: string, actual: string, threshold = 0.3): boolean {
  // Check for key phrase match
  const expectedLower = expected.toLowerCase()
  const actualLower = actual.toLowerCase()

  // Direct substring match
  if (actualLower.includes(expectedLower) || expectedLower.includes(actualLower)) {
    return true
  }

  // Word overlap similarity
  const similarity = calculateSimilarity(expected, actual)
  return similarity >= threshold
}

// Get all training data
export function getTrainingData(options?: {
  category?: string
  difficulty?: string
  validatedOnly?: boolean
  limit?: number
}): TrainingDataItem[] {
  try {
    const db = getDatabase()
    if (!db) return []

    let query = 'SELECT * FROM kb_training_data WHERE 1=1'
    const params: any[] = []

    if (options?.category) {
      query += ' AND category = ?'
      params.push(options.category)
    }
    if (options?.difficulty) {
      query += ' AND difficulty = ?'
      params.push(options.difficulty)
    }
    if (options?.validatedOnly) {
      query += ' AND is_validated = 1'
    }

    query += ' ORDER BY created_at DESC'

    if (options?.limit) {
      query += ' LIMIT ?'
      params.push(options.limit)
    }

    const items = db.prepare(query).all(...params) as any[]

    return items.map(item => ({
      id: item.id,
      query: item.query,
      expected_answer: item.expected_answer,
      context_items: item.context_items ? JSON.parse(item.context_items) : [],
      category: item.category,
      difficulty: item.difficulty,
      is_validated: item.is_validated === 1,
      created_at: item.created_at
    }))
  } catch (error) {
    console.error('Error getting training data:', error)
    return []
  }
}

// Add training data item
export function addTrainingData(data: {
  query: string
  expectedAnswer: string
  contextItems?: string[]
  category?: string
  difficulty?: string
}): string | null {
  try {
    const db = getDatabase()
    if (!db) return null

    const id = crypto.randomUUID()

    db.prepare(`
      INSERT INTO kb_training_data (id, query, expected_answer, context_items, category, difficulty, is_validated, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))
    `).run(
      id,
      data.query,
      data.expectedAnswer,
      data.contextItems ? JSON.stringify(data.contextItems) : null,
      data.category || null,
      data.difficulty || 'medium'
    )

    return id
  } catch (error) {
    console.error('Error adding training data:', error)
    return null
  }
}

// Update training data item
export function updateTrainingData(id: string, data: Partial<TrainingDataItem>): boolean {
  try {
    const db = getDatabase()
    if (!db) return false

    const updates: string[] = []
    const values: any[] = []

    if (data.query !== undefined) {
      updates.push('query = ?')
      values.push(data.query)
    }
    if (data.expected_answer !== undefined) {
      updates.push('expected_answer = ?')
      values.push(data.expected_answer)
    }
    if (data.context_items !== undefined) {
      updates.push('context_items = ?')
      values.push(JSON.stringify(data.context_items))
    }
    if (data.category !== undefined) {
      updates.push('category = ?')
      values.push(data.category)
    }
    if (data.difficulty !== undefined) {
      updates.push('difficulty = ?')
      values.push(data.difficulty)
    }
    if (data.is_validated !== undefined) {
      updates.push('is_validated = ?')
      values.push(data.is_validated ? 1 : 0)
    }

    if (updates.length === 0) return false

    values.push(id)
    db.prepare(`UPDATE kb_training_data SET ${updates.join(', ')} WHERE id = ?`).run(...values)

    return true
  } catch (error) {
    console.error('Error updating training data:', error)
    return false
  }
}

// Delete training data item
export function deleteTrainingData(id: string): boolean {
  try {
    const db = getDatabase()
    if (!db) return false

    const result = db.prepare('DELETE FROM kb_training_data WHERE id = ?').run(id)
    return result.changes > 0
  } catch (error) {
    console.error('Error deleting training data:', error)
    return false
  }
}

// Run evaluation against training data
export async function runEvaluation(options?: {
  category?: string
  difficulty?: string
  limit?: number
  modelId?: string
}): Promise<EvaluationRun> {
  const trainingData = getTrainingData({
    category: options?.category,
    difficulty: options?.difficulty,
    validatedOnly: true,
    limit: options?.limit || 50
  })

  const results: EvaluationResult[] = []
  let correctCount = 0
  let totalConfidence = 0

  for (const item of trainingData) {
    const startTime = Date.now()

    try {
      const answer = await getQuickAnswer(item.query)
      const responseTimeMs = Date.now() - startTime

      const similarity = calculateSimilarity(item.expected_answer, answer.answer || '')
      const isCorrect = isAnswerCorrect(item.expected_answer, answer.answer || '')

      if (isCorrect) correctCount++
      totalConfidence += answer.confidence

      results.push({
        query: item.query,
        expectedAnswer: item.expected_answer,
        actualAnswer: answer.answer || 'No answer generated',
        isCorrect,
        confidence: answer.confidence,
        similarity,
        responseTimeMs
      })
    } catch (error) {
      results.push({
        query: item.query,
        expectedAnswer: item.expected_answer,
        actualAnswer: 'Error: ' + (error instanceof Error ? error.message : 'Unknown'),
        isCorrect: false,
        confidence: 0,
        similarity: 0,
        responseTimeMs: Date.now() - startTime
      })
    }
  }

  const run: EvaluationRun = {
    id: crypto.randomUUID(),
    runName: `Evaluation ${new Date().toISOString()}`,
    totalQueries: trainingData.length,
    correctAnswers: correctCount,
    accuracyScore: trainingData.length > 0 ? correctCount / trainingData.length : 0,
    avgConfidence: trainingData.length > 0 ? totalConfidence / trainingData.length : 0,
    modelUsed: options?.modelId || 'default',
    results,
    createdAt: new Date().toISOString()
  }

  // Save evaluation run
  saveEvaluationRun(run)

  return run
}

// Save evaluation run to database
function saveEvaluationRun(run: EvaluationRun): void {
  try {
    const db = getDatabase()
    if (!db) return

    db.prepare(`
      INSERT INTO kb_evaluation_runs (id, run_name, total_queries, correct_answers, accuracy_score, avg_confidence, model_used, results, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      run.id,
      run.runName,
      run.totalQueries,
      run.correctAnswers,
      run.accuracyScore,
      run.avgConfidence,
      run.modelUsed,
      JSON.stringify(run.results),
      run.createdAt
    )
  } catch (error) {
    console.error('Error saving evaluation run:', error)
  }
}

// Get evaluation runs
export function getEvaluationRuns(limit = 20): EvaluationRun[] {
  try {
    const db = getDatabase()
    if (!db) return []

    const runs = db.prepare(`
      SELECT * FROM kb_evaluation_runs ORDER BY created_at DESC LIMIT ?
    `).all(limit) as any[]

    return runs.map(run => ({
      id: run.id,
      runName: run.run_name,
      totalQueries: run.total_queries,
      correctAnswers: run.correct_answers,
      accuracyScore: run.accuracy_score,
      avgConfidence: run.avg_confidence,
      modelUsed: run.model_used,
      results: JSON.parse(run.results || '[]'),
      createdAt: run.created_at
    }))
  } catch (error) {
    console.error('Error getting evaluation runs:', error)
    return []
  }
}

// Get training stats
export function getTrainingStats(): {
  totalItems: number
  validatedItems: number
  byCategory: Record<string, number>
  byDifficulty: Record<string, number>
} {
  try {
    const db = getDatabase()
    if (!db) return { totalItems: 0, validatedItems: 0, byCategory: {}, byDifficulty: {} }

    const total = db.prepare('SELECT COUNT(*) as count FROM kb_training_data').get() as { count: number }
    const validated = db.prepare('SELECT COUNT(*) as count FROM kb_training_data WHERE is_validated = 1').get() as { count: number }

    const categories = db.prepare(`
      SELECT category, COUNT(*) as count FROM kb_training_data WHERE category IS NOT NULL GROUP BY category
    `).all() as Array<{ category: string; count: number }>

    const difficulties = db.prepare(`
      SELECT difficulty, COUNT(*) as count FROM kb_training_data GROUP BY difficulty
    `).all() as Array<{ difficulty: string; count: number }>

    return {
      totalItems: total.count,
      validatedItems: validated.count,
      byCategory: Object.fromEntries(categories.map(c => [c.category, c.count])),
      byDifficulty: Object.fromEntries(difficulties.map(d => [d.difficulty, d.count]))
    }
  } catch (error) {
    console.error('Error getting training stats:', error)
    return { totalItems: 0, validatedItems: 0, byCategory: {}, byDifficulty: {} }
  }
}

// Add feedback
export function addFeedback(data: {
  query: string
  answerGiven: string
  feedbackType: 'correct' | 'incorrect' | 'partial'
  correction?: string
  userId?: string
}): string | null {
  try {
    const db = getDatabase()
    if (!db) return null

    const id = crypto.randomUUID()

    db.prepare(`
      INSERT INTO kb_feedback (id, query, answer_given, feedback_type, correction, user_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(id, data.query, data.answerGiven, data.feedbackType, data.correction || null, data.userId || null)

    return id
  } catch (error) {
    console.error('Error adding feedback:', error)
    return null
  }
}

// Get recent feedback
export function getRecentFeedback(limit = 50): Array<{
  id: string
  query: string
  answerGiven: string
  feedbackType: string
  correction: string | null
  createdAt: string
}> {
  try {
    const db = getDatabase()
    if (!db) return []

    const feedback = db.prepare(`
      SELECT * FROM kb_feedback ORDER BY created_at DESC LIMIT ?
    `).all(limit) as any[]

    return feedback.map(f => ({
      id: f.id,
      query: f.query,
      answerGiven: f.answer_given,
      feedbackType: f.feedback_type,
      correction: f.correction,
      createdAt: f.created_at
    }))
  } catch (error) {
    console.error('Error getting feedback:', error)
    return []
  }
}
