import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/database/sqlite"

// POST /api/ai/cleanup - Clean up duplicate AI providers and agents
export async function POST() {
  try {
    const db = getDatabase()
    
    // Get counts before cleanup
    const beforeProviders = db.prepare(`SELECT COUNT(*) as count FROM ai_providers`).get() as { count: number }
    const beforeAgents = db.prepare(`SELECT COUNT(*) as count FROM ai_agents`).get() as { count: number }
    
    // Clean up duplicate providers - keep only the first one of each name
    db.exec(`
      DELETE FROM ai_providers 
      WHERE rowid NOT IN (
        SELECT MIN(rowid) 
        FROM ai_providers 
        GROUP BY name
      )
    `)
    
    // Clean up duplicate agents - keep only the first one of each name
    db.exec(`
      DELETE FROM ai_agents 
      WHERE rowid NOT IN (
        SELECT MIN(rowid) 
        FROM ai_agents 
        GROUP BY name
      )
    `)
    
    // Get counts after cleanup
    const afterProviders = db.prepare(`SELECT COUNT(*) as count FROM ai_providers`).get() as { count: number }
    const afterAgents = db.prepare(`SELECT COUNT(*) as count FROM ai_agents`).get() as { count: number }
    
    // Ensure we have exactly the 3 default providers
    const expectedProviders = [
      { name: 'openai', display_name: 'OpenAI GPT', default_model: 'gpt-3.5-turbo' },
      { name: 'anthropic', display_name: 'Anthropic Claude', default_model: 'claude-3-haiku-20240307' },
      { name: 'gemini', display_name: 'Google Gemini', default_model: 'gemini-pro' }
    ]
    
    for (const provider of expectedProviders) {
      const exists = db.prepare(`SELECT COUNT(*) as count FROM ai_providers WHERE name = ?`).get(provider.name) as { count: number }
      
      if (exists.count === 0) {
        db.prepare(`
          INSERT INTO ai_providers (name, display_name, default_model, default_temperature, default_max_tokens, is_active)
          VALUES (?, ?, ?, 0.7, 1000, 0)
        `).run(provider.name, provider.display_name, provider.default_model)
      }
    }
    
    // Ensure we have exactly the 3 default agents
    const expectedAgents = [
      { name: 'Stock Monitor', role: 'Inventory Monitoring' },
      { name: 'Reorder Assistant', role: 'Purchase Planning' },
      { name: 'Search Assistant', role: 'Natural Language Search' }
    ]
    
    for (const agent of expectedAgents) {
      const exists = db.prepare(`SELECT COUNT(*) as count FROM ai_agents WHERE name = ?`).get(agent.name) as { count: number }
      
      if (exists.count === 0) {
        db.prepare(`
          INSERT INTO ai_agents (name, role, description, system_prompt, capabilities, is_active)
          VALUES (?, ?, ?, ?, ?, 1)
        `).run(
          agent.name,
          agent.role,
          `AI assistant for ${agent.role.toLowerCase()}`,
          `You are a ${agent.name} AI assistant for inventory management.`,
          JSON.stringify([])
        )
      }
    }
    
    const finalProviders = db.prepare(`SELECT COUNT(*) as count FROM ai_providers`).get() as { count: number }
    const finalAgents = db.prepare(`SELECT COUNT(*) as count FROM ai_agents`).get() as { count: number }
    
    return NextResponse.json({
      success: true,
      cleanup_results: {
        providers: {
          before: beforeProviders.count,
          after: afterProviders.count,
          final: finalProviders.count,
          removed: beforeProviders.count - afterProviders.count
        },
        agents: {
          before: beforeAgents.count,
          after: afterAgents.count,
          final: finalAgents.count,
          removed: beforeAgents.count - afterAgents.count
        }
      },
      message: "AI database cleaned up successfully"
    })
  } catch (error) {
    console.error("Error cleaning up AI database:", error)
    return NextResponse.json(
      { error: "Failed to cleanup AI database" },
      { status: 500 }
    )
  }
}