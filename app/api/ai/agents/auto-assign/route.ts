import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/database/sqlite"

// POST /api/ai/agents/auto-assign - Auto-assign agents to active providers
export async function POST() {
  try {
    const db = getDatabase()
    
    // Get the first active provider
    const activeProvider = db.prepare(`
      SELECT id, name FROM ai_providers 
      WHERE is_active = 1 AND api_key_encrypted IS NOT NULL
      ORDER BY created_at ASC
      LIMIT 1
    `).get() as any
    
    if (!activeProvider) {
      return NextResponse.json({
        success: false,
        error: "No active AI providers found. Please configure an AI provider first."
      }, { status: 400 })
    }
    
    // Update all agents without providers to use the active provider
    const updateResult = db.prepare(`
      UPDATE ai_agents 
      SET provider_id = ?, updated_at = datetime('now')
      WHERE provider_id IS NULL
    `).run(activeProvider.id)
    
    // Get updated agent list
    const updatedAgents = db.prepare(`
      SELECT 
        a.*,
        p.display_name as provider_name
      FROM ai_agents a
      LEFT JOIN ai_providers p ON a.provider_id = p.id
      WHERE a.provider_id = ?
    `).all(activeProvider.id)
    
    return NextResponse.json({
      success: true,
      message: `Assigned ${updateResult.changes} agents to provider: ${activeProvider.name}`,
      provider: {
        id: activeProvider.id,
        name: activeProvider.name
      },
      agents_updated: updateResult.changes,
      agents: updatedAgents
    })
  } catch (error) {
    console.error("Error auto-assigning agents to providers:", error)
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to assign agents to providers" 
      },
      { status: 500 }
    )
  }
}