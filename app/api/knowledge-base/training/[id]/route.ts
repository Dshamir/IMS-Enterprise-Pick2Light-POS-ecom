/**
 * Single Training Data Item API
 * PUT: Update training data
 * DELETE: Delete training data
 */

import { NextRequest, NextResponse } from 'next/server'
import { updateTrainingData, deleteTrainingData } from '@/lib/knowledge-base/kb-evaluator'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const success = updateTrainingData(id, {
      query: body.query,
      expected_answer: body.expectedAnswer,
      context_items: body.contextItems,
      category: body.category,
      difficulty: body.difficulty,
      is_validated: body.isValidated
    })

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Training data updated'
      })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update training data' },
      { status: 500 }
    )

  } catch (error) {
    console.error('Error updating training data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update training data' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const success = deleteTrainingData(id)

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Training data deleted'
      })
    }

    return NextResponse.json(
      { success: false, error: 'Training data not found' },
      { status: 404 }
    )

  } catch (error) {
    console.error('Error deleting training data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete training data' },
      { status: 500 }
    )
  }
}
