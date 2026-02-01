import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/database/sqlite"

// GET /api/ai/agents - List all configured agents
export async function GET() {
  try {
    const db = getDatabase()
    
    const agents = db.prepare(`
      SELECT 
        a.*,
        p.display_name as provider_name,
        p.is_active as provider_active,
        o.name as orchestrator_name
      FROM ai_agents a
      LEFT JOIN ai_providers p ON a.provider_id = p.id
      LEFT JOIN ai_agents o ON a.orchestrator_id = o.id
      ORDER BY a.name
    `).all()

    // Parse JSON fields
    const processedAgents = agents.map(agent => ({
      ...agent,
      capabilities: agent.capabilities ? JSON.parse(agent.capabilities) : [],
      provider_available: agent.provider_active === 1
    }))

    return NextResponse.json({ agents: processedAgents })
  } catch (error) {
    console.error("Error fetching AI agents:", error)
    return NextResponse.json(
      { error: "Failed to fetch AI agents" },
      { status: 500 }
    )
  }
}

// POST /api/ai/agents - Create new agent
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      name,
      role,
      description,
      type = 'individual',
      orchestrator_id,
      provider_id,
      model,
      temperature = 0.7,
      max_tokens = 1000,
      system_prompt,
      capabilities = [],
      is_active = false
    } = body

    // Basic validation
    if (!name || !role || !description) {
      return NextResponse.json(
        { error: "Missing required fields: name, role, description" },
        { status: 400 }
      )
    }

    // Validate type
    if (!['individual', 'orchestrator', 'worker'].includes(type)) {
      return NextResponse.json(
        { error: "Invalid agent type. Must be 'individual', 'orchestrator', or 'worker'" },
        { status: 400 }
      )
    }

    // Validate worker agent has orchestrator
    if (type === 'worker' && !orchestrator_id) {
      return NextResponse.json(
        { error: "Worker agents must have an orchestrator assigned" },
        { status: 400 }
      )
    }

    const db = getDatabase()
    
    // Verify orchestrator exists if specified
    if (orchestrator_id) {
      const orchestrator = db.prepare('SELECT id, type FROM ai_agents WHERE id = ?').get(orchestrator_id) as any
      if (!orchestrator) {
        return NextResponse.json(
          { error: "Specified orchestrator not found" },
          { status: 400 }
        )
      }
      if (orchestrator.type !== 'orchestrator') {
        return NextResponse.json(
          { error: "Assigned agent is not an orchestrator" },
          { status: 400 }
        )
      }
    }
    
    const result = db.prepare(`
      INSERT INTO ai_agents (
        name, role, description, type, orchestrator_id, provider_id, model, 
        temperature, max_tokens, system_prompt, capabilities, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name,
      role,
      description,
      type,
      orchestrator_id || null,
      provider_id || null,
      model || null,
      temperature,
      max_tokens,
      system_prompt || null,
      JSON.stringify(capabilities),
      is_active ? 1 : 0
    )

    return NextResponse.json({ 
      success: true, 
      id: result.lastInsertRowid,
      message: "AI agent created successfully"
    })
  } catch (error) {
    console.error("Error creating AI agent:", error)
    return NextResponse.json(
      { error: "Failed to create AI agent" },
      { status: 500 }
    )
  }
}