import { NextResponse } from "next/server"
import { openaiUsageService } from "@/lib/ai/openai-usage-service"

// GET /api/ai/usage - Get OpenAI usage analytics and quota information
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    const type = searchParams.get('type') || 'analytics'

    console.log('📊 [API] Usage request:', { days, type })

    switch (type) {
      case 'quota': {
        const quotaResult = await openaiUsageService.getQuotaInfo()
        
        if (!quotaResult.success) {
          return NextResponse.json({
            success: false,
            error: quotaResult.error
          }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          quota: quotaResult.quota,
          timestamp: new Date().toISOString()
        })
      }

      case 'analytics': {
        const analyticsResult = await openaiUsageService.getAnalytics(days)
        
        if (!analyticsResult.success) {
          return NextResponse.json({
            success: false,
            error: analyticsResult.error
          }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          analytics: analyticsResult.analytics,
          period_days: days,
          timestamp: new Date().toISOString()
        })
      }

      case 'usage': {
        const endTime = Math.floor(Date.now() / 1000)
        const startTime = endTime - (days * 24 * 60 * 60)

        const usageResult = await openaiUsageService.getUsageData({
          start_time: startTime,
          end_time: endTime,
          bucket_width: '1d',
          group_by: ['model']
        })

        if (!usageResult.success) {
          return NextResponse.json({
            success: false,
            error: usageResult.error
          }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          usage: usageResult.data,
          period_days: days,
          timestamp: new Date().toISOString()
        })
      }

      case 'costs': {
        const endTime = Math.floor(Date.now() / 1000)
        const startTime = endTime - (days * 24 * 60 * 60)

        const costResult = await openaiUsageService.getCostData({
          start_time: startTime,
          end_time: endTime,
          bucket_width: '1d'
        })

        if (!costResult.success) {
          return NextResponse.json({
            success: false,
            error: costResult.error
          }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          costs: costResult.data,
          period_days: days,
          timestamp: new Date().toISOString()
        })
      }

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown type: ${type}. Supported types: analytics, quota, usage, costs`
        }, { status: 400 })
    }
  } catch (error) {
    console.error("Error in AI usage API:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Usage API request failed"
    }, { status: 500 })
  }
}

// POST /api/ai/usage - Clear usage cache or refresh data
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'clear_cache':
        openaiUsageService.clearCache()
        return NextResponse.json({
          success: true,
          message: "Usage cache cleared successfully"
        })

      case 'refresh':
        // Clear cache and fetch fresh analytics
        openaiUsageService.clearCache()
        const analyticsResult = await openaiUsageService.getAnalytics(7)
        
        return NextResponse.json({
          success: analyticsResult.success,
          analytics: analyticsResult.analytics,
          error: analyticsResult.error,
          message: "Data refreshed from OpenAI API"
        })

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}. Supported actions: clear_cache, refresh`
        }, { status: 400 })
    }
  } catch (error) {
    console.error("Error in AI usage POST:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Usage action failed"
    }, { status: 500 })
  }
}