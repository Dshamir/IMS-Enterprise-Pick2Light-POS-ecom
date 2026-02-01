/**
 * Single KB Agent API
 * GET: Get agent details
 * PUT: Update agent
 * DELETE: Delete agent
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/sqlite'

export const dynamic = 'force-dynamic'

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

    const agent = db.prepare(`
      SELECT * FROM kb_custom_agents WHERE id = ?
    `).get(id) as any | undefined

    if (!agent) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        avatarUrl: agent.avatar_url,
        instructions: agent.instructions,
        conversationStarters: agent.conversation_starters ? JSON.parse(agent.conversation_starters) : [],
        knowledgeItems: agent.knowledge_items ? JSON.parse(agent.knowledge_items) : [],
        knowledgeFiles: agent.knowledge_files ? JSON.parse(agent.knowledge_files) : [],
        capabilities: agent.capabilities ? JSON.parse(agent.capabilities) : {},
        actions: agent.actions ? JSON.parse(agent.actions) : [],
        modelId: agent.model_id,
        temperature: agent.temperature,
        maxTokens: agent.max_tokens,
        isPublished: agent.is_published === 1,
        createdBy: agent.created_by,
        createdAt: agent.created_at,
        updatedAt: agent.updated_at
      }
    })

  } catch (error) {
    console.error('Error fetching agent:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch agent' },
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

    const db = getDatabase()
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 500 }
      )
    }

    // Check exists
    const existing = db.prepare(
      'SELECT id FROM kb_custom_agents WHERE id = ?'
    ).get(id)

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Build update query dynamically
    const updates: string[] = []
    const values: any[] = []

    if (body.name !== undefined) {
      updates.push('name = ?')
      values.push(body.name)
    }
    if (body.description !== undefined) {
      updates.push('description = ?')
      values.push(body.description)
    }
    if (body.avatarUrl !== undefined) {
      updates.push('avatar_url = ?')
      values.push(body.avatarUrl)
    }
    if (body.instructions !== undefined) {
      updates.push('instructions = ?')
      values.push(body.instructions)
    }
    if (body.conversationStarters !== undefined) {
      updates.push('conversation_starters = ?')
      values.push(JSON.stringify(body.conversationStarters))
    }
    if (body.knowledgeItems !== undefined) {
      updates.push('knowledge_items = ?')
      values.push(JSON.stringify(body.knowledgeItems))
    }
    if (body.knowledgeFiles !== undefined) {
      updates.push('knowledge_files = ?')
      values.push(JSON.stringify(body.knowledgeFiles))
    }
    if (body.capabilities !== undefined) {
      updates.push('capabilities = ?')
      values.push(JSON.stringify(body.capabilities))
    }
    if (body.actions !== undefined) {
      updates.push('actions = ?')
      values.push(JSON.stringify(body.actions))
    }
    if (body.modelId !== undefined) {
      updates.push('model_id = ?')
      values.push(body.modelId)
    }
    if (body.temperature !== undefined) {
      updates.push('temperature = ?')
      values.push(body.temperature)
    }
    if (body.maxTokens !== undefined) {
      updates.push('max_tokens = ?')
      values.push(body.maxTokens)
    }
    if (body.isPublished !== undefined) {
      updates.push('is_published = ?')
      values.push(body.isPublished ? 1 : 0)
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')")
      values.push(id)

      db.prepare(`
        UPDATE kb_custom_agents
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...values)
    }

    return NextResponse.json({
      success: true,
      message: 'Agent updated successfully'
    })

  } catch (error) {
    console.error('Error updating agent:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update agent' },
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

    // Delete conversations first
    db.prepare('DELETE FROM kb_agent_conversations WHERE agent_id = ?').run(id)

    // Delete agent
    const result = db.prepare('DELETE FROM kb_custom_agents WHERE id = ?').run(id)

    if (result.changes === 0) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Agent deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting agent:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete agent' },
      { status: 500 }
    )
  }
}
