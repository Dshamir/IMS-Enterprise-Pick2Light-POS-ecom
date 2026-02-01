import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/database/sqlite"

// GET /api/ai/analytics - Get comprehensive AI usage analytics
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '7days' // 1day, 7days, 30days, 90days
    const provider = searchParams.get('provider')

    const db = getDatabase()
    
    // Calculate date range
    const dateRange = getDateRange(period)
    
    // Get usage statistics with fallback
    const usageStats = await getUsageStatistics(db, dateRange, provider)
    
    // Get task statistics with fallback
    const taskStats = await getTaskStatistics(db, dateRange)
    
    // Get conversation statistics with fallback
    const conversationStats = await getConversationStatistics(db, dateRange)
    
    // Get cost analysis with fallback
    const costAnalysis = await getCostAnalysis(db, dateRange, provider)
    
    // Get performance metrics with fallback
    const performanceMetrics = await getPerformanceMetrics(db, dateRange)
    
    // Get top features with fallback
    const topFeatures = await getTopFeatures(db, dateRange)

    // Get model usage breakdown
    const modelBreakdown = await getModelBreakdown(db, dateRange, provider)

    // Get operation type breakdown
    const operationBreakdown = await getOperationBreakdown(db, dateRange, provider)

    // Process and format the analytics data with fallbacks
    const processedAnalytics = {
      usage_statistics: {
        total_requests: usageStats?.total?.total_requests || 0,
        total_tokens: usageStats?.total?.total_tokens || 0,
        average_response_time: usageStats?.total?.avg_response_time || 0,
        success_rate: 1.0 // Default to 100% when no data
      },
      cost_analysis: {
        total_cost: costAnalysis?.breakdown?.total_cost || 0,
        cost_breakdown: costAnalysis?.cost_breakdown || []
      },
      performance_metrics: {
        requests_by_hour: performanceMetrics?.requests_by_hour || [],
        provider_performance: performanceMetrics?.provider_performance || []
      },
      agent_metrics: usageStats?.by_agent || [],
      model_breakdown: modelBreakdown || [],
      operation_breakdown: operationBreakdown || []
    }

    return NextResponse.json({
      success: true,
      period: period,
      date_range: dateRange,
      analytics: processedAnalytics,
      generated_at: new Date().toISOString()
    })
  } catch (error) {
    console.error("Error generating AI analytics:", error)
    return NextResponse.json(
      { error: "Failed to generate analytics" },
      { status: 500 }
    )
  }
}

function getDateRange(period: string) {
  const now = new Date()
  let daysBack = 7
  let startDate: Date

  switch (period) {
    case '1day':
      daysBack = 1
      startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000))
      break
    case '7days':
      daysBack = 7
      startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000))
      break
    case '30days':
      daysBack = 30
      startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000))
      break
    case '90days':
      daysBack = 90
      startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000))
      break
    case 'ytd':
      // Year to date - from January 1st of current year
      startDate = new Date(now.getFullYear(), 0, 1)
      daysBack = Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
      break
    case 'all':
      // All time - from January 1st, 2024
      startDate = new Date(2024, 0, 1)
      daysBack = Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
      break
    default:
      daysBack = 7
      startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000))
  }

  return {
    start_date: startDate.toISOString(),
    end_date: now.toISOString(),
    days: daysBack
  }
}

async function getUsageStatistics(db: any, dateRange: any, provider?: string | null) {
  let whereClause = `WHERE ul.created_at >= ? AND ul.created_at <= ?`
  const params = [dateRange.start_date, dateRange.end_date]
  
  if (provider) {
    whereClause += ` AND p.name = ?`
    params.push(provider)
  }

  // Total usage
  const totalUsage = db.prepare(`
    SELECT
      COUNT(*) as total_requests,
      SUM(ul.total_tokens) as total_tokens,
      SUM(ul.estimated_cost) as total_cost,
      AVG(ul.request_duration) as avg_response_time,
      MIN(ul.created_at) as first_request,
      MAX(ul.created_at) as last_request
    FROM ai_usage_logs ul
    LEFT JOIN ai_providers p ON ul.provider_id = p.id
    ${whereClause}
  `).get(...params)

  // Usage by provider
  const providerUsage = db.prepare(`
    SELECT
      p.name as provider_name,
      p.display_name,
      COUNT(*) as requests,
      SUM(ul.total_tokens) as tokens,
      SUM(ul.estimated_cost) as cost,
      AVG(ul.request_duration) as avg_response_time
    FROM ai_usage_logs ul
    JOIN ai_providers p ON ul.provider_id = p.id
    WHERE ul.created_at >= ? AND ul.created_at <= ?
    GROUP BY p.id, p.name, p.display_name
    ORDER BY requests DESC
  `).all(dateRange.start_date, dateRange.end_date)

  // Usage by agent
  const agentUsage = db.prepare(`
    SELECT
      a.name as agent_name,
      a.role,
      COUNT(*) as requests,
      SUM(ul.total_tokens) as tokens,
      SUM(ul.estimated_cost) as cost,
      AVG(ul.request_duration) as avg_response_time
    FROM ai_usage_logs ul
    LEFT JOIN ai_agents a ON ul.agent_id = a.id
    WHERE ul.created_at >= ? AND ul.created_at <= ?
      AND a.id IS NOT NULL
    GROUP BY a.id, a.name, a.role
    ORDER BY requests DESC
  `).all(dateRange.start_date, dateRange.end_date)

  // Daily usage trend
  const dailyUsage = db.prepare(`
    SELECT
      DATE(ul.created_at) as date,
      COUNT(*) as requests,
      SUM(ul.total_tokens) as tokens,
      SUM(ul.estimated_cost) as cost
    FROM ai_usage_logs ul
    LEFT JOIN ai_providers p ON ul.provider_id = p.id
    ${whereClause}
    GROUP BY DATE(ul.created_at)
    ORDER BY date
  `).all(...params)

  return {
    total: totalUsage,
    by_provider: providerUsage,
    by_agent: agentUsage,
    daily_trend: dailyUsage
  }
}

async function getTaskStatistics(db: any, dateRange: any) {
  // Task status distribution
  const statusDistribution = db.prepare(`
    SELECT 
      status,
      COUNT(*) as count,
      AVG(
        CASE 
          WHEN completed_at IS NOT NULL 
          THEN (julianday(completed_at) - julianday(created_at)) * 24 * 60 * 60 * 1000 
          ELSE NULL 
        END
      ) as avg_duration_ms
    FROM ai_tasks
    WHERE created_at >= ? AND created_at <= ?
    GROUP BY status
  `).all(dateRange.start_date, dateRange.end_date)

  // Task types
  const taskTypes = db.prepare(`
    SELECT 
      task_type,
      COUNT(*) as count,
      AVG(
        CASE 
          WHEN completed_at IS NOT NULL 
          THEN (julianday(completed_at) - julianday(created_at)) * 24 * 60 * 60 * 1000 
          ELSE NULL 
        END
      ) as avg_duration_ms,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM ai_tasks
    WHERE created_at >= ? AND created_at <= ?
    GROUP BY task_type
    ORDER BY count DESC
  `).all(dateRange.start_date, dateRange.end_date)

  // Success rate
  const successRate = db.prepare(`
    SELECT 
      COUNT(*) as total_tasks,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_tasks,
      ROUND(
        (SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) * 100.0) / COUNT(*), 2
      ) as success_rate_percent
    FROM ai_tasks
    WHERE created_at >= ? AND created_at <= ?
  `).get(dateRange.start_date, dateRange.end_date)

  return {
    status_distribution: statusDistribution,
    task_types: taskTypes,
    success_rate: successRate
  }
}

async function getConversationStatistics(db: any, dateRange: any) {
  // Conversation metrics
  const conversationMetrics = db.prepare(`
    SELECT 
      COUNT(*) as total_conversations,
      AVG(json_array_length(messages)) as avg_messages_per_conversation,
      SUM(json_array_length(messages)) as total_messages
    FROM ai_conversations
    WHERE created_at >= ? AND created_at <= ?
  `).get(dateRange.start_date, dateRange.end_date)

  // Active conversations per day
  const dailyConversations = db.prepare(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as new_conversations,
      SUM(json_array_length(messages)) as total_messages
    FROM ai_conversations
    WHERE created_at >= ? AND created_at <= ?
    GROUP BY DATE(created_at)
    ORDER BY date
  `).all(dateRange.start_date, dateRange.end_date)

  return {
    metrics: conversationMetrics,
    daily_conversations: dailyConversations
  }
}

async function getCostAnalysis(db: any, dateRange: any, provider?: string | null) {
  let whereClause = `WHERE ul.created_at >= ? AND ul.created_at <= ?`
  const params = [dateRange.start_date, dateRange.end_date]
  
  if (provider) {
    whereClause += ` AND p.name = ?`
    params.push(provider)
  }

  // Cost breakdown
  const costBreakdown = db.prepare(`
    SELECT
      SUM(ul.estimated_cost) as total_cost,
      AVG(ul.estimated_cost) as avg_cost_per_request,
      MIN(ul.estimated_cost) as min_cost,
      MAX(ul.estimated_cost) as max_cost,
      SUM(ul.total_tokens) as total_tokens,
      AVG(ul.total_tokens) as avg_tokens_per_request
    FROM ai_usage_logs ul
    LEFT JOIN ai_providers p ON ul.provider_id = p.id
    ${whereClause}
  `).get(...params)

  // Daily cost trend
  const dailyCosts = db.prepare(`
    SELECT
      DATE(ul.created_at) as date,
      SUM(ul.estimated_cost) as cost,
      SUM(ul.total_tokens) as tokens,
      COUNT(*) as requests
    FROM ai_usage_logs ul
    LEFT JOIN ai_providers p ON ul.provider_id = p.id
    ${whereClause}
    GROUP BY DATE(ul.created_at)
    ORDER BY date
  `).all(...params)

  // Cost projection for current month
  const daysInPeriod = dateRange.days
  const daysInMonth = 30
  const projectedMonthlyCost = costBreakdown?.total_cost ? 
    (costBreakdown.total_cost / daysInPeriod) * daysInMonth : 0

  return {
    breakdown: costBreakdown,
    daily_costs: dailyCosts,
    projected_monthly_cost: projectedMonthlyCost
  }
}

async function getPerformanceMetrics(db: any, dateRange: any) {
  // Response time statistics
  const responseTimeStats = db.prepare(`
    SELECT 
      AVG(request_duration) as avg_response_time,
      MIN(request_duration) as min_response_time,
      MAX(request_duration) as max_response_time,
      COUNT(CASE WHEN request_duration < 1000 THEN 1 END) as under_1s,
      COUNT(CASE WHEN request_duration BETWEEN 1000 AND 5000 THEN 1 END) as between_1_5s,
      COUNT(CASE WHEN request_duration > 5000 THEN 1 END) as over_5s,
      COUNT(*) as total_requests
    FROM ai_usage_logs
    WHERE created_at >= ? AND created_at <= ?
  `).get(dateRange.start_date, dateRange.end_date)

  // Error rates
  const errorRates = db.prepare(`
    SELECT 
      COUNT(*) as total_tasks,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_tasks,
      ROUND(
        (SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) * 100.0) / COUNT(*), 2
      ) as error_rate_percent
    FROM ai_tasks
    WHERE created_at >= ? AND created_at <= ?
  `).get(dateRange.start_date, dateRange.end_date)

  return {
    response_times: responseTimeStats,
    error_rates: errorRates
  }
}

async function getTopFeatures(db: any, dateRange: any) {
  // Most used task types
  const topTaskTypes = db.prepare(`
    SELECT
      task_type,
      COUNT(*) as usage_count,
      ROUND(
        (COUNT(*) * 100.0) / (SELECT COUNT(*) FROM ai_tasks WHERE created_at >= ? AND created_at <= ?), 2
      ) as usage_percentage
    FROM ai_tasks
    WHERE created_at >= ? AND created_at <= ?
    GROUP BY task_type
    ORDER BY usage_count DESC
    LIMIT 10
  `).all(dateRange.start_date, dateRange.end_date, dateRange.start_date, dateRange.end_date)

  // Most active agents
  const topAgents = db.prepare(`
    SELECT
      a.name as agent_name,
      a.role,
      COUNT(ul.id) as usage_count
    FROM ai_agents a
    LEFT JOIN ai_usage_logs ul ON a.id = ul.agent_id
      AND ul.created_at >= ? AND ul.created_at <= ?
    WHERE a.is_active = 1
    GROUP BY a.id, a.name, a.role
    ORDER BY usage_count DESC
    LIMIT 5
  `).all(dateRange.start_date, dateRange.end_date)

  return {
    task_types: topTaskTypes,
    agents: topAgents
  }
}

async function getModelBreakdown(db: any, dateRange: any, provider?: string | null) {
  let whereClause = `WHERE ul.created_at >= ? AND ul.created_at <= ?`
  const params = [dateRange.start_date, dateRange.end_date]

  if (provider) {
    whereClause += ` AND p.name = ?`
    params.push(provider)
  }

  const modelStats = db.prepare(`
    SELECT
      ul.model_used,
      COUNT(*) as requests,
      SUM(ul.total_tokens) as total_tokens,
      SUM(ul.prompt_tokens) as prompt_tokens,
      SUM(ul.completion_tokens) as completion_tokens,
      SUM(ul.estimated_cost) as total_cost,
      AVG(ul.request_duration) as avg_response_time,
      SUM(CASE WHEN ul.success = 1 THEN 1 ELSE 0 END) as successful_requests,
      ROUND((SUM(CASE WHEN ul.success = 1 THEN 1 ELSE 0 END) * 100.0) / COUNT(*), 2) as success_rate
    FROM ai_usage_logs ul
    LEFT JOIN ai_providers p ON ul.provider_id = p.id
    ${whereClause}
      AND ul.model_used IS NOT NULL
    GROUP BY ul.model_used
    ORDER BY requests DESC
  `).all(...params)

  return modelStats
}

async function getOperationBreakdown(db: any, dateRange: any, provider?: string | null) {
  let whereClause = `WHERE ul.created_at >= ? AND ul.created_at <= ?`
  const params = [dateRange.start_date, dateRange.end_date]

  if (provider) {
    whereClause += ` AND p.name = ?`
    params.push(provider)
  }

  const operationStats = db.prepare(`
    SELECT
      ul.operation_type,
      COUNT(*) as requests,
      SUM(ul.total_tokens) as total_tokens,
      SUM(ul.estimated_cost) as total_cost,
      AVG(ul.request_duration) as avg_response_time,
      SUM(CASE WHEN ul.success = 1 THEN 1 ELSE 0 END) as successful_requests,
      ROUND((SUM(CASE WHEN ul.success = 1 THEN 1 ELSE 0 END) * 100.0) / COUNT(*), 2) as success_rate
    FROM ai_usage_logs ul
    LEFT JOIN ai_providers p ON ul.provider_id = p.id
    ${whereClause}
    GROUP BY ul.operation_type
    ORDER BY requests DESC
  `).all(...params)

  return operationStats
}