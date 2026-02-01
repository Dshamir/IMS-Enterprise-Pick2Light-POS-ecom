/**
 * Knowledge Base Chat Conversations API
 * GET: List all conversations
 * POST: Create a new conversation
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const db = getDatabase()
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 500 }
      )
    }

    // Get total count
    const countResult = db.prepare(
      'SELECT COUNT(*) as count FROM ai_conversations'
    ).get() as { count: number }

    // Get conversations ordered by updated_at
    const conversations = db.prepare(`
      SELECT id, title, model_used, kb_context_used, tools_used, created_at, updated_at,
             (SELECT COUNT(*) FROM json_each(messages)) as message_count
      FROM ai_conversations
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset) as Array<Conversation & { message_count: number }>

    return NextResponse.json({
      success: true,
      conversations: conversations.map(c => ({
        id: c.id,
        title: c.title,
        modelUsed: c.model_used,
        kbContextUsed: c.kb_context_used === 1,
        toolsUsed: c.tools_used ? JSON.parse(c.tools_used) : [],
        messageCount: c.message_count,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      })),
      pagination: {
        page,
        limit,
        total: countResult.count,
        totalPages: Math.ceil(countResult.count / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title = 'New Conversation' } = body

    const db = getDatabase()
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 500 }
      )
    }

    const id = crypto.randomUUID()

    db.prepare(`
      INSERT INTO ai_conversations (id, title, messages, created_at, updated_at)
      VALUES (?, ?, '[]', datetime('now'), datetime('now'))
    `).run(id, title)

    return NextResponse.json({
      success: true,
      conversation: {
        id,
        title,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error creating conversation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}
