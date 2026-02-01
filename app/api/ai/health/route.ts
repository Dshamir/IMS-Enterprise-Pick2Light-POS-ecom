import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/database/sqlite"
import { aiProviderFactory } from "@/lib/ai/ai-provider-factory"

// GET /api/ai/health - Check AI system health and status with enhanced diagnostics
export async function GET() {
  try {
    console.log('🔍 Enhanced AI system health check starting...')
    const startTime = Date.now()
    const db = getDatabase()
    
    // Check if AI tables exist
    const tablesExist = db.prepare(`
      SELECT COUNT(*) as count 
      FROM sqlite_master 
      WHERE type='table' AND name IN ('ai_providers', 'ai_agents', 'ai_conversations', 'ai_tasks', 'ai_usage_logs')
    `).get() as { count: number }

    if (tablesExist.count < 5) {
      return NextResponse.json({
        status: "not_ready",
        message: "AI tables not fully initialized",
        tables_found: tablesExist.count,
        tables_required: 5,
        recommendations: ["Run AI schema initialization script"]
      })
    }

    // Get comprehensive health status using enhanced factory method
    const healthStatus = await aiProviderFactory.getSystemHealth()
    
    // Get recent activity for compatibility
    const recentTasks = db.prepare(`
      SELECT COUNT(*) as recent_tasks
      FROM ai_tasks 
      WHERE created_at > datetime('now', '-24 hours')
    `).get() as { recent_tasks: number }

    const recentConversations = db.prepare(`
      SELECT COUNT(*) as recent_conversations
      FROM ai_conversations 
      WHERE created_at > datetime('now', '-7 days')
    `).get() as { recent_conversations: number }

    const checkDuration = Date.now() - startTime
    
    // Map our health status to legacy format for backward compatibility
    let legacyStatus: string
    switch (healthStatus.status) {
      case 'healthy': legacyStatus = 'ready'; break
      case 'degraded': legacyStatus = 'partial'; break
      case 'unhealthy': legacyStatus = 'setup_required'; break
      default: legacyStatus = 'unknown'
    }
    
    console.log('📊 Enhanced health check completed:', {
      status: healthStatus.status,
      providers_working: healthStatus.providers.working,
      agents_configured: healthStatus.agents.properly_configured,
      issues_count: healthStatus.issues.length,
      duration_ms: checkDuration
    })

    // Enhanced response with both new and legacy format
    const response = {
      // Legacy format for backward compatibility
      status: legacyStatus,
      providers: {
        total: healthStatus.providers.total,
        active: healthStatus.providers.active,
        configured: healthStatus.providers.configured,
        working: healthStatus.providers.working  // New field
      },
      agents: {
        total: healthStatus.agents.total,
        active: healthStatus.agents.active,
        properly_configured: healthStatus.agents.properly_configured  // New field
      },
      activity: {
        tasks_24h: recentTasks.recent_tasks,
        conversations_7d: recentConversations.recent_conversations
      },
      recommendations: healthStatus.recommendations,
      
      // Enhanced fields
      health_status: healthStatus.status,  // 'healthy' | 'degraded' | 'unhealthy'
      issues: healthStatus.issues,
      diagnostics: {
        tables_initialized: true,
        check_duration_ms: checkDuration,
        timestamp: new Date().toISOString(),
        version: '2.0.0'
      }
    }
    
    // Set appropriate HTTP status
    let httpStatus = 200
    if (healthStatus.status === 'degraded') httpStatus = 206 // Partial Content
    if (healthStatus.status === 'unhealthy') httpStatus = 503 // Service Unavailable

    return NextResponse.json(response, { status: httpStatus })
    
  } catch (error) {
    console.error("Error during enhanced AI health check:", error)
    
    return NextResponse.json({
      status: "error",
      health_status: "unhealthy",
      message: "Failed to check AI system health",
      error: error instanceof Error ? error.message : "Unknown error",
      providers: { total: 0, active: 0, configured: 0, working: 0 },
      agents: { total: 0, active: 0, properly_configured: 0 },
      activity: { tasks_24h: 0, conversations_7d: 0 },
      issues: ['Health check system failure'],
      recommendations: ['Check system logs and restart AI services'],
      diagnostics: {
        tables_initialized: false,
        check_duration_ms: 0,
        timestamp: new Date().toISOString(),
        error: true
      }
    }, { status: 500 })
  }
}

// POST /api/ai/health/repair - Attempt automatic repair of common issues  
export async function POST() {
  try {
    console.log('🔧 Starting AI system auto-repair...')
    const startTime = Date.now()
    const repairResults: string[] = []
    
    // Get current health status
    const preRepairHealth = await aiProviderFactory.getSystemHealth()
    console.log('Pre-repair status:', preRepairHealth.status)
    
    // Clear provider cache to force fresh connections
    aiProviderFactory.clearCache()
    repairResults.push('Cleared provider cache for fresh connections')
    
    // Check health after repair attempt
    const postRepairHealth = await aiProviderFactory.getSystemHealth()
    const repairDuration = Date.now() - startTime
    
    const improvement = {
      providers_working: postRepairHealth.providers.working - preRepairHealth.providers.working,
      agents_configured: postRepairHealth.agents.properly_configured - preRepairHealth.agents.properly_configured,
      issues_resolved: preRepairHealth.issues.length - postRepairHealth.issues.length,
      status_improved: preRepairHealth.status !== postRepairHealth.status
    }
    
    console.log('🔧 Auto-repair completed:', {
      duration: repairDuration,
      improvements: improvement,
      final_status: postRepairHealth.status
    })
    
    return NextResponse.json({
      success: true,
      repair_actions: repairResults,
      improvements: improvement,
      pre_repair_status: preRepairHealth.status,
      post_repair_status: postRepairHealth.status,
      current_health: postRepairHealth,
      metadata: {
        repair_duration_ms: repairDuration,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error("Error during AI auto-repair:", error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Auto-repair failed',
        repair_actions: [],
        metadata: {
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}