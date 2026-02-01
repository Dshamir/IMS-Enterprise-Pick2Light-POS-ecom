import { NextResponse } from "next/server"
import { sqliteHelpers } from "@/lib/database/sqlite"
import { aiProviderFactory } from "@/lib/ai/ai-provider-factory"
import { getDatabase } from "@/lib/database/sqlite"
import { usageLogger } from "@/lib/ai/usage-logger"

// GET /api/ai/inventory/suggestions - Get AI-powered reorder suggestions
export async function GET() {
  try {
    // Get inventory data
    const products = sqliteHelpers.getAllProducts()
    
    if (!products || products.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No inventory data available"
      })
    }

    // Get low stock products for prioritization
    const lowStockProducts = products.filter(product => 
      product.stock_quantity <= product.min_stock_level
    )

    // Get reorder assistant agent
    const db = getDatabase()
    const reorderAgent = db.prepare(`
      SELECT * FROM ai_agents 
      WHERE name = 'Reorder Assistant' AND is_active = 1
      LIMIT 1
    `).get() as any

    if (!reorderAgent) {
      return NextResponse.json({
        success: false,
        error: "Reorder Assistant not configured. Please activate the AI agent first."
      })
    }

    // Use AI to analyze inventory and provide suggestions
    const startTime = Date.now()

    const analysisResult = await aiProviderFactory.analyzeInventoryWithAgent(
      reorderAgent.id,
      products,
      'reorder_suggestions'
    )

    const duration = Date.now() - startTime

    // Log AI usage
    try {
      await usageLogger.logFromResponse(
        reorderAgent.provider_id,
        reorderAgent.id,
        analysisResult.model || reorderAgent.model,
        analysisResult.usage, // Now includes token usage data
        duration,
        'reorder_suggestions',
        `Analyzing ${products.length} products for reorder suggestions`,
        analysisResult.success,
        analysisResult.success ? undefined : 'analysis_failed'
      )
    } catch (logError) {
      console.warn('Failed to log reorder suggestions usage:', logError)
    }

    if (!analysisResult.success) {
      return NextResponse.json({
        success: false,
        error: analysisResult.error || "Failed to generate AI suggestions"
      })
    }

    // Parse AI response and structure suggestions
    const suggestions = generateStructuredSuggestions(lowStockProducts, analysisResult.analysis)

    return NextResponse.json({
      success: true,
      suggestions,
      ai_analysis: analysisResult.analysis,
      metadata: {
        total_products: products.length,
        low_stock_count: lowStockProducts.length,
        categories_analyzed: [...new Set(products.map(p => p.category))],
        analysis_timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error("Error generating AI inventory suggestions:", error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate suggestions" 
      },
      { status: 500 }
    )
  }
}

function generateStructuredSuggestions(lowStockProducts: any[], aiAnalysis: string | undefined) {
  // Generate structured suggestions based on low stock items
  const suggestions = lowStockProducts.slice(0, 10).map(product => {
    const daysOfStock = calculateDaysOfStock(product)
    const urgency = getUrgencyLevel(product, daysOfStock)
    const suggestedQuantity = calculateSuggestedQuantity(product)
    
    return {
      product_id: product.id,
      product_name: product.name,
      category: product.category,
      current_stock: product.stock_quantity,
      min_stock_level: product.min_stock_level,
      suggested_quantity: suggestedQuantity,
      estimated_cost: (suggestedQuantity * product.price).toFixed(2),
      urgency_level: urgency,
      days_of_stock_remaining: daysOfStock,
      reasons: generateReasons(product, daysOfStock),
      location: product.Location || 'Unknown'
    }
  })

  // Sort by urgency (critical first)
  return suggestions.sort((a, b) => {
    const urgencyOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 }
    return urgencyOrder[a.urgency_level as keyof typeof urgencyOrder] - urgencyOrder[b.urgency_level as keyof typeof urgencyOrder]
  })
}

function calculateDaysOfStock(product: any): number {
  // Simple calculation - in reality you'd use historical consumption data
  const avgDailyUsage = (product.reorder_quantity || 10) / 30 // Assume 30 days supply
  return product.stock_quantity / Math.max(avgDailyUsage, 0.1)
}

function getUrgencyLevel(product: any, daysOfStock: number): string {
  if (product.stock_quantity === 0) return 'critical'
  if (daysOfStock <= 3) return 'critical'
  if (daysOfStock <= 7) return 'high'
  if (daysOfStock <= 14) return 'medium'
  return 'low'
}

function calculateSuggestedQuantity(product: any): number {
  // Smart reorder calculation
  const baseReorder = product.reorder_quantity || 10
  const stockDeficit = Math.max(0, product.min_stock_level - product.stock_quantity)
  const safetyBuffer = Math.ceil(product.min_stock_level * 0.2)
  
  return Math.max(baseReorder, stockDeficit + safetyBuffer)
}

function generateReasons(product: any, daysOfStock: number): string[] {
  const reasons = []
  
  if (product.stock_quantity === 0) {
    reasons.push("Out of stock - immediate reorder required")
  } else if (product.stock_quantity <= product.min_stock_level) {
    reasons.push("Below minimum stock level")
  }
  
  if (daysOfStock <= 7) {
    reasons.push(`Only ${Math.ceil(daysOfStock)} days of stock remaining`)
  }
  
  if (product.category === 'consumables') {
    reasons.push("Consumable item with regular usage pattern")
  }
  
  if (!reasons.length) {
    reasons.push("Preventive reorder based on consumption trends")
  }
  
  return reasons
}