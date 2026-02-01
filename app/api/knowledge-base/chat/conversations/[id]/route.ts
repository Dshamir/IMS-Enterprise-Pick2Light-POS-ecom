/**
 * Single Conversation API
 * GET: Get conversation details with messages
 * PUT: Update conversation (title, etc.)
 * DELETE: Delete conversation
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/sqlite'

export const dynamic = 'force-dynamic'

interface Conversation {
  id: string
  title: string
  messages: string
  model_used: string | null
  kb_context_used: number
  tools_used: string | null
  created_at: string
  updated_at: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const db = getDatabase()
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 500 }
      )
    }

    const conversation = db.prepare(`
      SELECT id, title, messages, model_used, kb_context_used, tools_used, created_at, updated_at
      FROM ai_conversations
      WHERE id = ?
    `).get(id) as Conversation | undefined

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        messages: JSON.parse(conversation.messages),
        modelUsed: conversation.model_used,
        kbContextUsed: conversation.kb_context_used === 1,
        toolsUsed: conversation.tools_used ? JSON.parse(conversation.tools_used) : [],
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at
      }
    })

  } catch (error) {
    console.error('Error fetching conversation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch conversation' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title } = body

    const db = getDatabase()
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 500 }
      )
    }

    // Check if exists
    const existing = db.prepare(
      'SELECT id FROM ai_conversations WHERE id = ?'
    ).get(id)

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Update title
    if (title) {
      db.prepare(`
        UPDATE ai_conversations
        SET title = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(title, id)
    }

    return NextResponse.json({
      success: true,
      message: 'Conversation updated'
    })

  } catch (error) {
    console.error('Error updating conversation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update conversation' },
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

    const db = getDatabase()
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 500 }
      )
    }

    const result = db.prepare(
      'DELETE FROM ai_conversations WHERE id = ?'
    ).run(id)

    if (result.changes === 0) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted'
    })

  } catch (error) {
    console.error('Error deleting conversation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete conversation' },
      { status: 500 }
    )
  }
}
