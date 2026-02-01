/**
 * KB Custom Agents API
 * GET: List all agents
 * POST: Create new agent
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/sqlite'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const publishedOnly = searchParams.get('published') === 'true'

    const db = getDatabase()
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 500 }
      )
    }

    let query = 'SELECT * FROM kb_custom_agents'
    if (publishedOnly) {
      query += ' WHERE is_published = 1'
    }
    query += ' ORDER BY updated_at DESC'

    const agents = db.prepare(query).all() as any[]

    return NextResponse.json({
      success: true,
      agents: agents.map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
        avatarUrl: a.avatar_url,
        instructions: a.instructions,
        conversationStarters: a.conversation_starters ? JSON.parse(a.conversation_starters) : [],
        knowledgeItems: a.knowledge_items ? JSON.parse(a.knowledge_items) : [],
        knowledgeFiles: a.knowledge_files ? JSON.parse(a.knowledge_files) : [],
        capabilities: a.capabilities ? JSON.parse(a.capabilities) : {},
        actions: a.actions ? JSON.parse(a.actions) : [],
        modelId: a.model_id,
        temperature: a.temperature,
        maxTokens: a.max_tokens,
        isPublished: a.is_published === 1,
        createdBy: a.created_by,
        createdAt: a.created_at,
        updatedAt: a.updated_at
      }))
    })

  } catch (error) {
    console.error('Error fetching agents:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch agents' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      description,
      avatarUrl,
      instructions,
      conversationStarters = [],
      knowledgeItems = [],
      knowledgeFiles = [],
      capabilities = {},
      actions = [],
      modelId = 'gpt-4o',
      temperature = 0.7,
      maxTokens = 2000,
      isPublished = false
    } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      )
    }

    const db = getDatabase()
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 500 }
      )
    }

    const id = crypto.randomUUID()

    db.prepare(`
      INSERT INTO kb_custom_agents (
        id, name, description, avatar_url, instructions,
        conversation_starters, knowledge_items, knowledge_files,
        capabilities, actions, model_id, temperature, max_tokens,
        is_published, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      id,
      name,
      description || null,
      avatarUrl || null,
      instructions || null,
      JSON.stringify(conversationStarters),
      JSON.stringify(knowledgeItems),
      JSON.stringify(knowledgeFiles),
      JSON.stringify(capabilities),
      JSON.stringify(actions),
      modelId,
      temperature,
      maxTokens,
      isPublished ? 1 : 0
    )

    return NextResponse.json({
      success: true,
      id,
      message: 'Agent created successfully'
    })

  } catch (error) {
    console.error('Error creating agent:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create agent' },
      { status: 500 }
    )
  }
}
