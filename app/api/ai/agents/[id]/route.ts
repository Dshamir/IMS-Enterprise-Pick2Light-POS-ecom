import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/database/sqlite"

// GET /api/ai/agents/[id] - Get specific agent
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = getDatabase()
    
    const agent = db.prepare(`
      SELECT 
        a.*,
        p.display_name as provider_name,
        p.is_active as provider_active
      FROM ai_agents a
      LEFT JOIN ai_providers p ON a.provider_id = p.id
      WHERE a.id = ?
    `).get(id) as any

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      )
    }

    // Parse JSON fields
    const processedAgent = {
      ...agent,
      capabilities: agent.capabilities ? JSON.parse(agent.capabilities) : [],
      provider_available: agent.provider_active === 1
    }

    return NextResponse.json({ agent: processedAgent })
  } catch (error) {
    console.error("Error fetching agent:", error)
    return NextResponse.json(
      { error: "Failed to fetch agent" },
      { status: 500 }
    )
  }
}

// PUT /api/ai/agents/[id] - Update agent
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const db = getDatabase()
    
    // Check if agent exists
    const existingAgent = db.prepare('SELECT id FROM ai_agents WHERE id = ?').get(id)
    if (!existingAgent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      )
    }

    // Build update query dynamically based on provided fields
    const updateFields = []
    const updateValues = []
    
    if (body.name !== undefined) {
      updateFields.push('name = ?')
      updateValues.push(body.name)
    }
    
    if (body.role !== undefined) {
      updateFields.push('role = ?')
      updateValues.push(body.role)
    }
    
    if (body.description !== undefined) {
      updateFields.push('description = ?')
      updateValues.push(body.description)
    }
    
    if (body.provider_id !== undefined) {
      updateFields.push('provider_id = ?')
      updateValues.push(body.provider_id)
    }
    
    if (body.model !== undefined) {
      updateFields.push('model = ?')
      updateValues.push(body.model)
    }
    
    if (body.temperature !== undefined) {
      updateFields.push('temperature = ?')
      updateValues.push(body.temperature)
    }
    
    if (body.max_tokens !== undefined) {
      updateFields.push('max_tokens = ?')
      updateValues.push(body.max_tokens)
    }
    
    if (body.system_prompt !== undefined) {
      updateFields.push('system_prompt = ?')
      updateValues.push(body.system_prompt)
    }
    
    if (body.capabilities !== undefined) {
      updateFields.push('capabilities = ?')
      updateValues.push(JSON.stringify(body.capabilities))
    }
    
    if (body.is_active !== undefined) {
      updateFields.push('is_active = ?')
      updateValues.push(body.is_active ? 1 : 0)
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      )
    }

    // Always update the updated_at timestamp
    updateFields.push('updated_at = datetime(\'now\')')
    updateValues.push(id) // For the WHERE clause

    const updateQuery = `
      UPDATE ai_agents 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `

    const result = db.prepare(updateQuery).run(...updateValues)

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "No changes made" },
        { status: 400 }
      )
    }

    // Return the updated agent
    const updatedAgent = db.prepare(`
      SELECT 
        a.*,
        p.display_name as provider_name,
        p.is_active as provider_active
      FROM ai_agents a
      LEFT JOIN ai_providers p ON a.provider_id = p.id
      WHERE a.id = ?
    `).get(id) as any

    return NextResponse.json({
      success: true,
      message: "Agent updated successfully",
      agent: {
        ...updatedAgent,
        capabilities: updatedAgent.capabilities ? JSON.parse(updatedAgent.capabilities) : [],
        provider_available: updatedAgent.provider_active === 1
      }
    })
  } catch (error) {
    console.error("Error updating agent:", error)
    return NextResponse.json(
      { error: "Failed to update agent" },
      { status: 500 }
    )
  }
}

// DELETE /api/ai/agents/[id] - Delete agent
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = getDatabase()
    
    const result = db.prepare('DELETE FROM ai_agents WHERE id = ?').run(id)
    
    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Agent deleted successfully"
    })
  } catch (error) {
    console.error("Error deleting agent:", error)
    return NextResponse.json(
      { error: "Failed to delete agent" },
      { status: 500 }
    )
  }
}