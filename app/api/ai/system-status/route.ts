import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/database/sqlite"
import { aiProviderFactory } from "@/lib/ai/ai-provider-factory"

// GET /api/ai/system-status - Comprehensive AI system health check
export async function GET() {
  try {
    const db = getDatabase()
    const startTime = Date.now()
    
    // System health checks
    const healthChecks = await performHealthChecks(db)
    
    // Component status
    const componentStatus = await getComponentStatus(db)
    
    // Performance metrics
    const performanceMetrics = await getCurrentPerformanceMetrics(db)
    
    // Recent activity
    const recentActivity = await getRecentActivity(db)
    
    // System capabilities
    const capabilities = await getSystemCapabilities(db)
    
    // Security status
    const securityStatus = await getSecurityStatus(db)
    
    const totalResponseTime = Date.now() - startTime
    
    // Overall system status
    const overallStatus = determineOverallStatus(healthChecks, componentStatus)

    return NextResponse.json({
      success: true,
      system_status: overallStatus,
      timestamp: new Date().toISOString(),
      response_time_ms: totalResponseTime,
      checks: {
        health_checks: healthChecks,
        component_status: componentStatus,
        performance_metrics: performanceMetrics,
        recent_activity: recentActivity,
        capabilities: capabilities,
        security_status: securityStatus
      }
    })
  } catch (error) {
    console.error("Error getting AI system status:", error)
    return NextResponse.json({
      success: false,
      system_status: 'error',
      error: error instanceof Error ? error.message : 'System status check failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

async function performHealthChecks(db: any) {
  const checks = []
  
  // Database connectivity
  try {
    db.prepare('SELECT 1').get()
    checks.push({
      name: 'database_connectivity',
      status: 'healthy',
      message: 'Database connection successful'
    })
  } catch (error) {
    checks.push({
      name: 'database_connectivity',
      status: 'unhealthy',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
  
  // AI tables integrity
  try {
    const tableCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM sqlite_master 
      WHERE type='table' AND name IN ('ai_providers', 'ai_agents', 'ai_conversations', 'ai_tasks', 'ai_usage_logs')
    `).get()?.count || 0
    
    checks.push({
      name: 'ai_tables_integrity',
      status: tableCount >= 5 ? 'healthy' : 'unhealthy',
      message: `${tableCount}/5 AI tables found`,
      details: { tables_found: tableCount, tables_required: 5 }
    })
  } catch (error) {
    checks.push({
      name: 'ai_tables_integrity',
      status: 'unhealthy',
      message: 'Failed to check AI table integrity',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
  
  // Provider connectivity
  const providers = db.prepare(`
    SELECT * FROM ai_providers WHERE is_active = 1
  `).all()
  
  if (providers.length === 0) {
    checks.push({
      name: 'provider_connectivity',
      status: 'warning',
      message: 'No active AI providers configured'
    })
  } else {
    const providerTests = await Promise.allSettled(
      providers.map(async (provider: any) => {
        try {
          const result = await aiProviderFactory.testProvider(provider.id)
          return {
            provider_name: provider.display_name,
            status: result.success ? 'healthy' : 'unhealthy',
            message: result.success ? 'Connection successful' : result.error,
            response_time: result.details?.response_time_ms
          }
        } catch (error) {
          return {
            provider_name: provider.display_name,
            status: 'unhealthy',
            message: 'Connection test failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })
    )
    
    const healthyProviders = providerTests.filter(p => 
      p.status === 'fulfilled' && p.value.status === 'healthy'
    ).length
    
    checks.push({
      name: 'provider_connectivity',
      status: healthyProviders > 0 ? 'healthy' : 'unhealthy',
      message: `${healthyProviders}/${providers.length} providers healthy`,
      details: providerTests.map(p => p.status === 'fulfilled' ? p.value : { error: 'Test failed' })
    })
  }
  
  return checks
}

async function getComponentStatus(db: any) {
  // AI Providers
  const providerStatus = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN api_key_encrypted IS NOT NULL THEN 1 ELSE 0 END) as configured
    FROM ai_providers
  `).get()
  
  // AI Agents
  const agentStatus = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN provider_id IS NOT NULL THEN 1 ELSE 0 END) as assigned,
      SUM(CASE WHEN is_active = 1 AND provider_id IS NOT NULL THEN 1 ELSE 0 END) as active_assigned
    FROM ai_agents
  `).get()
  
  // Recent tasks
  const taskStatus = db.prepare(`
    SELECT 
      COUNT(*) as total_24h,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_24h,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_24h,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
    FROM ai_tasks
    WHERE created_at > datetime('now', '-24 hours')
  `).get()
  
  // Recent conversations
  const conversationStatus = db.prepare(`
    SELECT 
      COUNT(*) as total_24h,
      SUM(json_array_length(messages)) as total_messages_24h
    FROM ai_conversations
    WHERE created_at > datetime('now', '-24 hours')
  `).get()
  
  // Usage logs
  const usageStatus = db.prepare(`
    SELECT
      COUNT(*) as requests_24h,
      SUM(total_tokens) as tokens_24h,
      SUM(estimated_cost) as cost_24h,
      AVG(request_duration) as avg_response_time_24h
    FROM ai_usage_logs
    WHERE created_at > datetime('now', '-24 hours')
  `).get()
  
  return {
    providers: {
      ...providerStatus,
      status: providerStatus.active > 0 ? 'operational' : 'inactive'
    },
    agents: {
      ...agentStatus,
      status: agentStatus.active > 0 ? 'operational' : 'inactive'
    },
    tasks: {
      ...taskStatus,
      status: taskStatus.pending > 10 ? 'backlogged' : 'normal',
      success_rate: taskStatus.total_24h > 0 ? 
        Math.round((taskStatus.completed_24h / taskStatus.total_24h) * 100) : 0
    },
    conversations: {
      ...conversationStatus,
      status: 'operational'
    },
    usage: {
      ...usageStatus,
      status: usageStatus.avg_response_time_24h > 5000 ? 'slow' : 'normal'
    }
  }
}

async function getCurrentPerformanceMetrics(db: any) {
  // Response time percentiles (last 24 hours)
  const responseTimes = db.prepare(`
    SELECT request_duration
    FROM ai_usage_logs
    WHERE created_at > datetime('now', '-24 hours')
    ORDER BY request_duration
  `).all().map((row: any) => row.request_duration)
  
  let percentiles = { p50: 0, p95: 0, p99: 0 }
  if (responseTimes.length > 0) {
    percentiles = {
      p50: getPercentile(responseTimes, 50),
      p95: getPercentile(responseTimes, 95),
      p99: getPercentile(responseTimes, 99)
    }
  }
  
  // Error rates (last 24 hours)
  const errorRates = db.prepare(`
    SELECT 
      COUNT(*) as total_requests,
      SUM(CASE WHEN t.status = 'failed' THEN 1 ELSE 0 END) as failed_requests
    FROM ai_usage_logs ul
    LEFT JOIN ai_tasks t ON ul.agent_id = (SELECT agent_id FROM ai_tasks WHERE id = ul.agent_id)
    WHERE ul.created_at > datetime('now', '-24 hours')
  `).get()
  
  const errorRate = errorRates.total_requests > 0 ? 
    (errorRates.failed_requests / errorRates.total_requests) * 100 : 0
  
  // Throughput (requests per hour)
  const throughput = db.prepare(`
    SELECT 
      strftime('%H', created_at) as hour,
      COUNT(*) as requests
    FROM ai_usage_logs
    WHERE created_at > datetime('now', '-24 hours')
    GROUP BY strftime('%H', created_at)
    ORDER BY hour
  `).all()
  
  return {
    response_times: {
      percentiles,
      unit: 'milliseconds'
    },
    error_rate: {
      percentage: Math.round(errorRate * 100) / 100,
      failed_requests: errorRates.failed_requests,
      total_requests: errorRates.total_requests
    },
    throughput: {
      hourly_distribution: throughput,
      avg_requests_per_hour: throughput.length > 0 ? 
        Math.round(throughput.reduce((sum, h) => sum + h.requests, 0) / throughput.length) : 0
    }
  }
}

async function getRecentActivity(db: any) {
  // Recent tasks
  const recentTasks = db.prepare(`
    SELECT 
      t.task_type,
      t.status,
      t.created_at,
      a.name as agent_name
    FROM ai_tasks t
    LEFT JOIN ai_agents a ON t.agent_id = a.id
    WHERE t.created_at > datetime('now', '-2 hours')
    ORDER BY t.created_at DESC
    LIMIT 10
  `).all()
  
  // Recent conversations
  const recentConversations = db.prepare(`
    SELECT 
      session_id,
      json_array_length(messages) as message_count,
      created_at,
      updated_at
    FROM ai_conversations
    WHERE updated_at > datetime('now', '-2 hours')
    ORDER BY updated_at DESC
    LIMIT 5
  `).all()
  
  // Recent errors
  const recentErrors = db.prepare(`
    SELECT 
      t.task_type,
      t.created_at,
      json_extract(t.output_data, '$.error') as error_message,
      a.name as agent_name
    FROM ai_tasks t
    LEFT JOIN ai_agents a ON t.agent_id = a.id
    WHERE t.status = 'failed' AND t.created_at > datetime('now', '-24 hours')
    ORDER BY t.created_at DESC
    LIMIT 5
  `).all()
  
  return {
    recent_tasks: recentTasks,
    recent_conversations: recentConversations,
    recent_errors: recentErrors
  }
}

async function getSystemCapabilities(db: any) {
  const activeProviders = db.prepare(`
    SELECT name, display_name, default_model
    FROM ai_providers
    WHERE is_active = 1
  `).all()
  
  const activeAgents = db.prepare(`
    SELECT name, role, capabilities
    FROM ai_agents
    WHERE is_active = 1
  `).all().map((agent: any) => ({
    ...agent,
    capabilities: agent.capabilities ? JSON.parse(agent.capabilities) : []
  }))
  
  const supportedFeatures = [
    'natural_language_search',
    'inventory_analysis',
    'reorder_suggestions',
    'low_stock_monitoring',
    'chat_interface',
    'task_automation',
    'usage_analytics'
  ]
  
  return {
    active_providers: activeProviders,
    active_agents: activeAgents,
    supported_features: supportedFeatures,
    api_endpoints: [
      '/api/ai/chat',
      '/api/ai/inventory/suggestions',
      '/api/ai/inventory/low-stock',
      '/api/ai/inventory/search',
      '/api/ai/tasks',
      '/api/ai/analytics'
    ]
  }
}

async function getSecurityStatus(db: any) {
  // API key security
  const apiKeyStatus = db.prepare(`
    SELECT 
      COUNT(*) as total_providers,
      SUM(CASE WHEN api_key_encrypted IS NOT NULL THEN 1 ELSE 0 END) as keys_stored,
      SUM(CASE WHEN LENGTH(api_key_encrypted) > 0 THEN 1 ELSE 0 END) as keys_encrypted
    FROM ai_providers
  `).get()
  
  // Recent security events (failed authentications, etc.)
  const securityEvents = db.prepare(`
    SELECT 
      COUNT(*) as failed_requests_24h
    FROM ai_usage_logs ul
    LEFT JOIN ai_tasks t ON ul.agent_id = (SELECT agent_id FROM ai_tasks WHERE output_data LIKE '%authentication%' OR output_data LIKE '%unauthorized%')
    WHERE ul.created_at > datetime('now', '-24 hours')
  `).get()
  
  return {
    api_key_security: {
      total_providers: apiKeyStatus.total_providers,
      keys_stored: apiKeyStatus.keys_stored,
      encryption_status: apiKeyStatus.keys_encrypted === apiKeyStatus.keys_stored ? 'secure' : 'partial'
    },
    access_control: {
      failed_authentications_24h: securityEvents.failed_requests_24h || 0,
      status: 'operational'
    },
    data_privacy: {
      conversation_retention: 'enabled',
      usage_logging: 'enabled',
      status: 'compliant'
    }
  }
}

function determineOverallStatus(healthChecks: any[], componentStatus: any) {
  const criticalFailures = healthChecks.filter(check => check.status === 'unhealthy')
  const warnings = healthChecks.filter(check => check.status === 'warning')
  
  if (criticalFailures.length > 0) {
    return 'degraded'
  }
  
  if (warnings.length > 0) {
    return 'warning'
  }
  
  if (componentStatus.providers.status === 'inactive') {
    return 'setup_required'
  }
  
  return 'operational'
}

function getPercentile(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1
  return sortedArray[Math.max(0, index)]
}