import { NextResponse } from "next/server"
import { sqliteHelpers } from "@/lib/database/sqlite"
import { aiProviderFactory } from "@/lib/ai/ai-provider-factory"
import { getDatabase } from "@/lib/database/sqlite"
import { usageLogger } from "@/lib/ai/usage-logger"

// GET /api/ai/inventory/low-stock - Get AI analysis of low stock items
export async function GET() {
  try {
    // Get all products
    const allProducts = sqliteHelpers.getAllProducts()
    
    if (!allProducts || allProducts.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No inventory data available"
      })
    }

    // Filter for low stock items
    const lowStockProducts = allProducts.filter(product => 
      product.stock_quantity <= product.min_stock_level
    )

    // Get out of stock items
    const outOfStockProducts = allProducts.filter(product => 
      product.stock_quantity === 0
    )

    // Get Stock Monitor agent
    const db = getDatabase()
    const stockAgent = db.prepare(`
      SELECT * FROM ai_agents 
      WHERE name = 'Stock Monitor' AND is_active = 1
      LIMIT 1
    `).get() as any

    let aiAnalysis = null

    if (stockAgent && lowStockProducts.length > 0) {
      try {
        const startTime = Date.now()

        const analysisResult = await aiProviderFactory.analyzeInventoryWithAgent(
          stockAgent.id,
          lowStockProducts,
          'low_stock'
        )

        const duration = Date.now() - startTime

        if (analysisResult.success) {
          aiAnalysis = analysisResult.analysis

          // Log successful AI usage
          try {
            await usageLogger.logFromResponse(
              stockAgent.provider_id,
              stockAgent.id,
              analysisResult.model || stockAgent.model,
              analysisResult.usage, // Now includes token usage data
              duration,
              'low_stock_analysis',
              `Analyzing ${lowStockProducts.length} low stock items`,
              true
            )
          } catch (logError) {
            console.warn('Failed to log low-stock analysis usage:', logError)
          }
        } else {
          // Log failed AI usage
          try {
            await usageLogger.logFromResponse(
              stockAgent.provider_id,
              stockAgent.id,
              analysisResult.model || stockAgent.model,
              analysisResult.usage,
              duration,
              'low_stock_analysis',
              `Analyzing ${lowStockProducts.length} low stock items`,
              false,
              'analysis_failed'
            )
          } catch (logError) {
            console.warn('Failed to log failed low-stock analysis:', logError)
          }
        }
      } catch (error) {
        console.warn('AI analysis failed, continuing with basic analysis:', error)
      }
    }

    // Generate category breakdown
    const categoryBreakdown = generateCategoryBreakdown(lowStockProducts)
    
    // Generate priority alerts
    const priorityAlerts = generatePriorityAlerts(lowStockProducts, outOfStockProducts)
    
    // Calculate financial impact
    const financialImpact = calculateFinancialImpact(lowStockProducts)

    return NextResponse.json({
      success: true,
      analysis: {
        summary: {
          total_products: allProducts.length,
          low_stock_count: lowStockProducts.length,
          out_of_stock_count: outOfStockProducts.length,
          percentage_low_stock: ((lowStockProducts.length / allProducts.length) * 100).toFixed(1)
        },
        category_breakdown: categoryBreakdown,
        priority_alerts: priorityAlerts,
        financial_impact: financialImpact,
        ai_insights: aiAnalysis,
        recommendations: generateRecommendations(lowStockProducts, categoryBreakdown)
      },
      low_stock_items: lowStockProducts.map(product => ({
        id: product.id,
        name: product.name,
        category: product.category,
        current_stock: product.stock_quantity,
        min_stock_level: product.min_stock_level,
        reorder_quantity: product.reorder_quantity,
        location: product.Location,
        urgency: getUrgencyLevel(product),
        days_remaining: estimateDaysRemaining(product)
      })),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("Error analyzing low stock items:", error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Failed to analyze low stock" 
      },
      { status: 500 }
    )
  }
}

function generateCategoryBreakdown(lowStockProducts: any[]) {
  const breakdown: Record<string, any> = {}
  
  lowStockProducts.forEach(product => {
    if (!breakdown[product.category]) {
      breakdown[product.category] = {
        count: 0,
        total_value: 0,
        critical_items: 0
      }
    }
    
    breakdown[product.category].count++
    breakdown[product.category].total_value += product.price * product.stock_quantity
    
    if (product.stock_quantity === 0) {
      breakdown[product.category].critical_items++
    }
  })
  
  return breakdown
}

function generatePriorityAlerts(lowStockProducts: any[], outOfStockProducts: any[]) {
  const alerts = []
  
  if (outOfStockProducts.length > 0) {
    alerts.push({
      level: 'critical',
      message: `${outOfStockProducts.length} items are completely out of stock`,
      items: outOfStockProducts.slice(0, 5).map(p => p.name),
      action_required: 'Immediate reorder required'
    })
  }
  
  const criticalLowStock = lowStockProducts.filter(p => 
    p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_level * 0.5
  )
  
  if (criticalLowStock.length > 0) {
    alerts.push({
      level: 'high',
      message: `${criticalLowStock.length} items are critically low (below 50% of minimum)`,
      items: criticalLowStock.slice(0, 5).map(p => p.name),
      action_required: 'Reorder within 24-48 hours'
    })
  }
  
  const consumablesLow = lowStockProducts.filter(p => p.category === 'consumables')
  if (consumablesLow.length > 0) {
    alerts.push({
      level: 'medium',
      message: `${consumablesLow.length} consumable items need restocking`,
      items: consumablesLow.slice(0, 3).map(p => p.name),
      action_required: 'Plan bulk reorder for consumables'
    })
  }
  
  return alerts
}

function calculateFinancialImpact(lowStockProducts: any[]) {
  const totalValueAtRisk = lowStockProducts.reduce((sum, product) => {
    return sum + (product.price * product.reorder_quantity)
  }, 0)
  
  const immediateReorderCost = lowStockProducts
    .filter(p => p.stock_quantity === 0)
    .reduce((sum, product) => {
      return sum + (product.price * product.reorder_quantity)
    }, 0)
  
  return {
    total_reorder_value: totalValueAtRisk.toFixed(2),
    immediate_reorder_cost: immediateReorderCost.toFixed(2),
    potential_savings: (totalValueAtRisk * 0.05).toFixed(2), // Assume 5% bulk discount potential
    currency: 'USD'
  }
}

function generateRecommendations(lowStockProducts: any[], categoryBreakdown: any) {
  const recommendations = []
  
  // Category-specific recommendations
  Object.entries(categoryBreakdown).forEach(([category, data]: [string, any]) => {
    if (data.count >= 3) {
      recommendations.push({
        type: 'bulk_order',
        message: `Consider bulk ordering for ${category} (${data.count} items low)`,
        potential_savings: (data.total_value * 0.1).toFixed(2)
      })
    }
  })
  
  // Urgency-based recommendations
  const criticalItems = lowStockProducts.filter(p => p.stock_quantity === 0)
  if (criticalItems.length > 0) {
    recommendations.push({
      type: 'urgent_action',
      message: 'Immediate attention required for out-of-stock items',
      affected_items: criticalItems.length
    })
  }
  
  // Efficiency recommendations
  if (lowStockProducts.length > 10) {
    recommendations.push({
      type: 'process_improvement',
      message: 'Consider implementing automated reorder points',
      benefit: 'Reduce manual monitoring and prevent stockouts'
    })
  }
  
  return recommendations
}

function getUrgencyLevel(product: any): string {
  if (product.stock_quantity === 0) return 'critical'
  if (product.stock_quantity <= product.min_stock_level * 0.3) return 'high'
  if (product.stock_quantity <= product.min_stock_level * 0.7) return 'medium'
  return 'low'
}

function estimateDaysRemaining(product: any): number {
  // Simple estimation based on reorder frequency
  const avgDailyUsage = (product.reorder_quantity || 10) / 30
  return Math.max(0, Math.floor(product.stock_quantity / avgDailyUsage))
}