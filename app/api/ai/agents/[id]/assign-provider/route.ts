import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/database/sqlite"

// POST /api/ai/agents/[id]/assign-provider - Assign specific agent to provider
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params
    const { provider_id } = await request.json()
    
    if (!provider_id) {
      return NextResponse.json({
        success: false,
        error: "Provider ID is required"
      }, { status: 400 })
    }
    
    const db = getDatabase()
    
    // Verify provider exists and is active
    const provider = db.prepare(`
      SELECT id, name, display_name, is_active 
      FROM ai_providers 
      WHERE id = ?
    `).get(provider_id) as any
    
    if (!provider) {
      return NextResponse.json({
        success: false,
        error: "Provider not found"
      }, { status: 404 })
    }
    
    if (!provider.is_active) {
      return NextResponse.json({
        success: false,
        error: "Provider is not active"
      }, { status: 400 })
    }
    
    // Verify agent exists
    const agent = db.prepare(`
      SELECT id, name FROM ai_agents WHERE id = ?
    `).get(agentId) as any
    
    if (!agent) {
      return NextResponse.json({
        success: false,
        error: "Agent not found"
      }, { status: 404 })
    }
    
    // Update agent's provider assignment
    const updateResult = db.prepare(`
      UPDATE ai_agents 
      SET provider_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(provider_id, agentId)
    
    if (updateResult.changes === 0) {
      return NextResponse.json({
        success: false,
        error: "Failed to update agent"
      }, { status: 500 })
    }
    
    // Get updated agent data
    const updatedAgent = db.prepare(`
      SELECT 
        a.*,
        p.display_name as provider_name,
        p.is_active as provider_active
      FROM ai_agents a
      LEFT JOIN ai_providers p ON a.provider_id = p.id
      WHERE a.id = ?
    `).get(agentId) as any
    
    return NextResponse.json({
      success: true,
      message: `Agent "${agent.name}" assigned to provider "${provider.display_name}"`,
      agent: {
        ...updatedAgent,
        capabilities: updatedAgent.capabilities ? JSON.parse(updatedAgent.capabilities) : [],
        provider_available: updatedAgent.provider_active === 1
      }
    })
  } catch (error) {
    console.error("Error assigning agent to provider:", error)
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to assign agent to provider" 
      },
      { status: 500 }
    )
  }
}