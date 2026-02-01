/**
 * KB Training Data API
 * GET: List training data with stats
 * POST: Add training data item
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getTrainingData,
  addTrainingData,
  getTrainingStats
} from '@/lib/knowledge-base/kb-evaluator'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || undefined
    const difficulty = searchParams.get('difficulty') || undefined
    const validatedOnly = searchParams.get('validated') === 'true'
    const includeStats = searchParams.get('stats') === 'true'

    const items = getTrainingData({
      category,
      difficulty,
      validatedOnly
    })

    let stats = undefined
    if (includeStats) {
      stats = getTrainingStats()
    }

    return NextResponse.json({
      success: true,
      items,
      stats,
      total: items.length
    })

  } catch (error) {
    console.error('Error fetching training data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch training data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, expectedAnswer, contextItems, category, difficulty } = body

    if (!query || !expectedAnswer) {
      return NextResponse.json(
        { success: false, error: 'Query and expected answer are required' },
        { status: 400 }
      )
    }

    const id = addTrainingData({
      query,
      expectedAnswer,
      contextItems,
      category,
      difficulty
    })

    if (id) {
      return NextResponse.json({
        success: true,
        id,
        message: 'Training data added successfully'
      })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to add training data' },
      { status: 500 }
    )

  } catch (error) {
    console.error('Error adding training data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add training data' },
      { status: 500 }
    )
  }
}
