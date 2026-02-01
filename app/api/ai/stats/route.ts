import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/database/sqlite"

// GET /api/ai/stats - Get AI system statistics
export async function GET() {
  try {
    const db = getDatabase()
    
    // Get provider stats
    const providerStats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN api_key_encrypted IS NOT NULL THEN 1 ELSE 0 END) as configured
      FROM ai_providers
    `).get() as any
    
    // Get agent stats
    const agentStats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN provider_id IS NOT NULL THEN 1 ELSE 0 END) as assigned
      FROM ai_agents
    `).get() as any
    
    // Get task stats (last 24 hours)
    const taskStats = db.prepare(`
      SELECT 
        COUNT(*) as total_24h,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_24h
      FROM ai_tasks
      WHERE created_at > datetime('now', '-24 hours')
    `).get() as any
    
    // Get conversation stats (last 7 days)
    const conversationStats = db.prepare(`
      SELECT 
        COUNT(*) as total_7d
      FROM ai_conversations
      WHERE created_at > datetime('now', '-7 days')
    `).get() as any
    
    return NextResponse.json({
      success: true,
      stats: {
        providers: {
          total: providerStats.total || 0,
          active: providerStats.active || 0,
          configured: providerStats.configured || 0
        },
        agents: {
          total: agentStats.total || 0,
          active: agentStats.active || 0,
          assigned: agentStats.assigned || 0
        },
        tasks: {
          total_24h: taskStats.total_24h || 0,
          completed_24h: taskStats.completed_24h || 0
        },
        conversations: {
          total_7d: conversationStats.total_7d || 0
        }
      }
    })
  } catch (error) {
    console.error("Error fetching AI stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch AI statistics" },
      { status: 500 }
    )
  }
}