import { NextResponse } from "next/server"
import { aiProviderFactory } from "@/lib/ai/ai-provider-factory"
import { getDatabase } from "@/lib/database/sqlite"

// POST /api/ai/providers/:id/test - Test provider connection
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: providerId } = await params
    
    // Log usage attempt
    const db = getDatabase()
    const startTime = Date.now()
    
    const result = await aiProviderFactory.testProvider(providerId)
    
    const duration = Date.now() - startTime
    
    // Log the test attempt
    try {
      db.prepare(`
        INSERT INTO ai_usage_logs (provider_id, tokens_used, request_duration, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `).run(providerId, 0, duration)
    } catch (logError) {
      console.warn('Failed to log usage:', logError)
    }
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Connection test successful",
        details: result.details,
        response_time_ms: duration
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        details: result.details,
        response_time_ms: duration
      }, { status: 400 })
    }
  } catch (error) {
    console.error("Error testing AI provider:", error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Test failed" 
      },
      { status: 500 }
    )
  }
}