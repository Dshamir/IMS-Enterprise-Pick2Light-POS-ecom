// Query Performance Logger - Monitors database query performance and AI agent efficiency

export interface QueryPerformanceMetrics {
  queryId: string
  functionName: string
  parameters: any[]
  executionTime: number
  cacheHit: boolean
  resultSize: number
  timestamp: number
  agent?: string
  success: boolean
  error?: string
}

export interface AgentPerformanceMetrics {
  agentId: string
  agentName: string
  totalQueries: number
  successfulQueries: number
  averageResponseTime: number
  cacheHitRate: number
  failureRate: number
  topFunctions: Array<{ function: string; count: number; avgTime: number }>
}

export class QueryPerformanceLogger {
  private metrics: Map<string, QueryPerformanceMetrics> = new Map()
  private agentMetrics: Map<string, AgentPerformanceMetrics> = new Map()
  private maxMetricsHistory = 1000 // Keep last 1000 metrics

  // Log query execution metrics
  public logQuery(metrics: Omit<QueryPerformanceMetrics, 'queryId' | 'timestamp'>): string {
    const queryId = this.generateQueryId()
    const timestamp = Date.now()

    const queryMetrics: QueryPerformanceMetrics = {
      queryId,
      timestamp,
      ...metrics
    }

    this.metrics.set(queryId, queryMetrics)

    // Update agent metrics if agent is specified
    if (metrics.agent) {
      this.updateAgentMetrics(metrics.agent, queryMetrics)
    }

    // Log to console for development
    console.log(`Query Performance: ${metrics.functionName} (${metrics.executionTime}ms) ${metrics.cacheHit ? '[CACHE]' : '[DB]'} ${metrics.success ? '✅' : '❌'}`)

    // Cleanup old metrics
    this.cleanupOldMetrics()

    return queryId
  }

  // Update aggregated agent performance metrics
  private updateAgentMetrics(agentName: string, queryMetrics: QueryPerformanceMetrics): void {
    let agentMetric = this.agentMetrics.get(agentName)

    if (!agentMetric) {
      agentMetric = {
        agentId: agentName,
        agentName,
        totalQueries: 0,
        successfulQueries: 0,
        averageResponseTime: 0,
        cacheHitRate: 0,
        failureRate: 0,
        topFunctions: []
      }
      this.agentMetrics.set(agentName, agentMetric)
    }

    // Update counters
    agentMetric.totalQueries++
    if (queryMetrics.success) {
      agentMetric.successfulQueries++
    }

    // Update average response time (rolling average)
    agentMetric.averageResponseTime = (
      (agentMetric.averageResponseTime * (agentMetric.totalQueries - 1) + queryMetrics.executionTime) /
      agentMetric.totalQueries
    )

    // Calculate rates
    agentMetric.failureRate = (agentMetric.totalQueries - agentMetric.successfulQueries) / agentMetric.totalQueries

    // Update cache hit rate
    const recentQueries = Array.from(this.metrics.values())
      .filter(m => m.agent === agentName)
      .slice(-50) // Last 50 queries

    agentMetric.cacheHitRate = recentQueries.filter(q => q.cacheHit).length / Math.max(recentQueries.length, 1)

    // Update top functions
    this.updateTopFunctions(agentMetric, queryMetrics)
  }

  // Update top functions for agent
  private updateTopFunctions(agentMetric: AgentPerformanceMetrics, queryMetrics: QueryPerformanceMetrics): void {
    const existingFunction = agentMetric.topFunctions.find(f => f.function === queryMetrics.functionName)

    if (existingFunction) {
      existingFunction.count++
      existingFunction.avgTime = (existingFunction.avgTime * (existingFunction.count - 1) + queryMetrics.executionTime) / existingFunction.count
    } else {
      agentMetric.topFunctions.push({
        function: queryMetrics.functionName,
        count: 1,
        avgTime: queryMetrics.executionTime
      })
    }

    // Keep only top 10 functions
    agentMetric.topFunctions = agentMetric.topFunctions
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  // Get performance metrics for specific query
  public getQueryMetrics(queryId: string): QueryPerformanceMetrics | null {
    return this.metrics.get(queryId) || null
  }

  // Get performance summary for all queries
  public getPerformanceSummary(): {
    totalQueries: number
    successRate: number
    averageExecutionTime: number
    cacheHitRate: number
    slowestQueries: QueryPerformanceMetrics[]
    mostUsedFunctions: Array<{ function: string; count: number; avgTime: number }>
  } {
    const allMetrics = Array.from(this.metrics.values())
    
    if (allMetrics.length === 0) {
      return {
        totalQueries: 0,
        successRate: 0,
        averageExecutionTime: 0,
        cacheHitRate: 0,
        slowestQueries: [],
        mostUsedFunctions: []
      }
    }

    const successfulQueries = allMetrics.filter(m => m.success)
    const totalExecutionTime = allMetrics.reduce((sum, m) => sum + m.executionTime, 0)
    const cacheHits = allMetrics.filter(m => m.cacheHit)

    // Get slowest queries
    const slowestQueries = allMetrics
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10)

    // Aggregate function usage
    const functionUsage = new Map<string, { count: number; totalTime: number }>()
    allMetrics.forEach(m => {
      const existing = functionUsage.get(m.functionName) || { count: 0, totalTime: 0 }
      existing.count++
      existing.totalTime += m.executionTime
      functionUsage.set(m.functionName, existing)
    })

    const mostUsedFunctions = Array.from(functionUsage.entries())
      .map(([func, stats]) => ({
        function: func,
        count: stats.count,
        avgTime: stats.totalTime / stats.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalQueries: allMetrics.length,
      successRate: successfulQueries.length / allMetrics.length,
      averageExecutionTime: totalExecutionTime / allMetrics.length,
      cacheHitRate: cacheHits.length / allMetrics.length,
      slowestQueries,
      mostUsedFunctions
    }
  }

  // Get performance metrics for specific agent
  public getAgentPerformance(agentName: string): AgentPerformanceMetrics | null {
    return this.agentMetrics.get(agentName) || null
  }

  // Get all agent performance metrics
  public getAllAgentPerformance(): AgentPerformanceMetrics[] {
    return Array.from(this.agentMetrics.values())
  }

  // Get performance alerts (slow queries, high failure rates, etc.)
  public getPerformanceAlerts(): Array<{
    type: 'slow_query' | 'high_failure_rate' | 'low_cache_hit_rate'
    message: string
    severity: 'low' | 'medium' | 'high'
    details: any
  }> {
    const alerts: Array<{
      type: 'slow_query' | 'high_failure_rate' | 'low_cache_hit_rate'
      message: string
      severity: 'low' | 'medium' | 'high'
      details: any
    }> = []

    // Check for slow queries (> 2 seconds)
    const slowQueries = Array.from(this.metrics.values())
      .filter(m => m.executionTime > 2000)
      .slice(-5) // Last 5 slow queries

    if (slowQueries.length > 0) {
      alerts.push({
        type: 'slow_query',
        message: `${slowQueries.length} slow queries detected (>2s execution time)`,
        severity: slowQueries.length > 3 ? 'high' : 'medium',
        details: slowQueries.map(q => ({
          function: q.functionName,
          time: q.executionTime,
          timestamp: new Date(q.timestamp).toISOString()
        }))
      })
    }

    // Check agent failure rates
    this.agentMetrics.forEach(agent => {
      if (agent.failureRate > 0.2 && agent.totalQueries > 5) {
        alerts.push({
          type: 'high_failure_rate',
          message: `Agent "${agent.agentName}" has high failure rate: ${(agent.failureRate * 100).toFixed(1)}%`,
          severity: agent.failureRate > 0.5 ? 'high' : 'medium',
          details: {
            agent: agent.agentName,
            failureRate: agent.failureRate,
            totalQueries: agent.totalQueries
          }
        })
      }

      if (agent.cacheHitRate < 0.3 && agent.totalQueries > 10) {
        alerts.push({
          type: 'low_cache_hit_rate',
          message: `Agent "${agent.agentName}" has low cache hit rate: ${(agent.cacheHitRate * 100).toFixed(1)}%`,
          severity: 'low',
          details: {
            agent: agent.agentName,
            cacheHitRate: agent.cacheHitRate,
            totalQueries: agent.totalQueries
          }
        })
      }
    })

    return alerts
  }

  // Generate unique query ID
  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  // Cleanup old metrics to prevent memory leaks
  private cleanupOldMetrics(): void {
    if (this.metrics.size > this.maxMetricsHistory) {
      const metricsArray = Array.from(this.metrics.entries())
        .sort((a, b) => b[1].timestamp - a[1].timestamp) // Sort by timestamp desc
        .slice(0, this.maxMetricsHistory) // Keep most recent

      this.metrics.clear()
      metricsArray.forEach(([id, metric]) => {
        this.metrics.set(id, metric)
      })

      console.log(`Performance metrics cleanup: kept ${this.maxMetricsHistory} most recent entries`)
    }
  }

  // Clear all metrics (for testing or reset)
  public clearMetrics(): void {
    this.metrics.clear()
    this.agentMetrics.clear()
    console.log('All performance metrics cleared')
  }

  // Export metrics for analysis
  public exportMetrics(): {
    queries: QueryPerformanceMetrics[]
    agents: AgentPerformanceMetrics[]
    summary: ReturnType<typeof this.getPerformanceSummary>
    alerts: ReturnType<typeof this.getPerformanceAlerts>
  } {
    return {
      queries: Array.from(this.metrics.values()),
      agents: Array.from(this.agentMetrics.values()),
      summary: this.getPerformanceSummary(),
      alerts: this.getPerformanceAlerts()
    }
  }
}

// Export singleton instance
export const queryPerformanceLogger = new QueryPerformanceLogger()