/**
 * KB Evaluation API
 * POST: Run evaluation against training data
 * GET: Get evaluation history
 */

import { NextRequest, NextResponse } from 'next/server'
import { runEvaluation, getEvaluationRuns } from '@/lib/knowledge-base/kb-evaluator'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { category, difficulty, limit, modelId } = body

    console.log('Starting KB evaluation...')

    const result = await runEvaluation({
      category,
      difficulty,
      limit,
      modelId
    })

    console.log(`Evaluation complete: ${result.correctAnswers}/${result.totalQueries} correct (${(result.accuracyScore * 100).toFixed(1)}%)`)

    return NextResponse.json({
      success: true,
      evaluation: result
    })

  } catch (error) {
    console.error('Evaluation error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Evaluation failed' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    const runs = getEvaluationRuns(limit)

    return NextResponse.json({
      success: true,
      runs
    })

  } catch (error) {
    console.error('Error fetching evaluation runs:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch evaluation history' },
      { status: 500 }
    )
  }
}
