import { NextResponse } from "next/server"
import { queryPerformanceLogger } from "@/lib/ai/query-performance-logger"
import { queryCache } from "@/lib/ai/query-cache"

// GET /api/ai/performance - Get AI system performance metrics
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const type = url.searchParams.get('type')
    const agent = url.searchParams.get('agent')

    switch (type) {
      case 'summary':
        return NextResponse.json({
          success: true,
          data: queryPerformanceLogger.getPerformanceSummary()
        })

      case 'agents':
        if (agent) {
          const agentPerformance = queryPerformanceLogger.getAgentPerformance(agent)
          if (!agentPerformance) {
            return NextResponse.json(
              { success: false, error: `Agent "${agent}" not found` },
              { status: 404 }
            )
          }
          return NextResponse.json({
            success: true,
            data: agentPerformance
          })
        } else {
          return NextResponse.json({
            success: true,
            data: queryPerformanceLogger.getAllAgentPerformance()
          })
        }

      case 'alerts':
        return NextResponse.json({
          success: true,
          data: queryPerformanceLogger.getPerformanceAlerts()
        })

      case 'cache':
        return NextResponse.json({
          success: true,
          data: queryCache.getStats()
        })

      case 'export':
        return NextResponse.json({
          success: true,
          data: queryPerformanceLogger.exportMetrics()
        })

      default:
        // Return comprehensive dashboard data
        return NextResponse.json({
          success: true,
          data: {
            summary: queryPerformanceLogger.getPerformanceSummary(),
            agents: queryPerformanceLogger.getAllAgentPerformance(),
            alerts: queryPerformanceLogger.getPerformanceAlerts(),
            cache: queryCache.getStats()
          }
        })
    }
  } catch (error) {
    console.error("Error fetching performance metrics:", error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch performance metrics" 
      },
      { status: 500 }
    )
  }
}

// POST /api/ai/performance - Performance management actions
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, target } = body

    switch (action) {
      case 'clear_metrics':
        queryPerformanceLogger.clearMetrics()
        return NextResponse.json({
          success: true,
          message: 'Performance metrics cleared'
        })

      case 'clear_cache':
        queryCache.clear()
        return NextResponse.json({
          success: true,
          message: 'Query cache cleared'
        })

      case 'cleanup_cache':
        queryCache.cleanup()
        return NextResponse.json({
          success: true,
          message: 'Cache cleanup completed'
        })

      case 'invalidate_cache':
        if (!target) {
          return NextResponse.json(
            { success: false, error: 'Target function name required for cache invalidation' },
            { status: 400 }
          )
        }
        queryCache.invalidate(target)
        return NextResponse.json({
          success: true,
          message: `Cache invalidated for function: ${target}`
        })

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Error in performance management:", error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Performance management action failed" 
      },
      { status: 500 }
    )
  }
}