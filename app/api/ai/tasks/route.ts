import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/database/sqlite"
import { aiProviderFactory } from "@/lib/ai/ai-provider-factory"
import { v4 as uuidv4 } from "uuid"

// GET /api/ai/tasks - Get task status and queue
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agent_id')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')

    const db = getDatabase()
    
    let query = `
      SELECT 
        t.*,
        a.name as agent_name,
        a.role as agent_role
      FROM ai_tasks t
      LEFT JOIN ai_agents a ON t.agent_id = a.id
      WHERE 1=1
    `
    const params: any[] = []

    if (agentId) {
      query += ` AND t.agent_id = ?`
      params.push(agentId)
    }

    if (status) {
      query += ` AND t.status = ?`
      params.push(status)
    }

    query += ` ORDER BY t.priority DESC, t.created_at DESC LIMIT ?`
    params.push(limit)

    const tasks = db.prepare(query).all(...params)

    // Get task statistics
    const stats = db.prepare(`
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
      WHERE created_at > datetime('now', '-7 days')
      GROUP BY status
    `).all()

    // Parse JSON fields
    const processedTasks = tasks.map(task => ({
      ...task,
      input_data: task.input_data ? JSON.parse(task.input_data) : null,
      output_data: task.output_data ? JSON.parse(task.output_data) : null
    }))

    return NextResponse.json({
      success: true,
      tasks: processedTasks,
      statistics: stats,
      total_count: tasks.length
    })
  } catch (error) {
    console.error("Error fetching AI tasks:", error)
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    )
  }
}

// POST /api/ai/tasks - Create new AI task
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      agent_id,
      task_type,
      input_data,
      priority = 0,
      auto_execute = false
    } = body

    if (!agent_id || !task_type) {
      return NextResponse.json(
        { error: "Missing required fields: agent_id, task_type" },
        { status: 400 }
      )
    }

    const db = getDatabase()
    
    // Verify agent exists and is active
    const agent = db.prepare(`
      SELECT * FROM ai_agents WHERE id = ? AND is_active = 1
    `).get(agent_id) as any

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found or not active" },
        { status: 400 }
      )
    }

    const taskId = uuidv4()
    
    // Create task
    const result = db.prepare(`
      INSERT INTO ai_tasks (
        id, agent_id, task_type, input_data, status, priority, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      taskId,
      agent_id,
      task_type,
      JSON.stringify(input_data || {}),
      'pending',
      priority
    )

    // Auto-execute if requested
    if (auto_execute) {
      executeTaskAsync(taskId).catch(error => {
        console.error('Task auto-execution failed:', error)
      })
    }

    return NextResponse.json({
      success: true,
      task_id: taskId,
      message: "Task created successfully",
      auto_executing: auto_execute
    })
  } catch (error) {
    console.error("Error creating AI task:", error)
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    )
  }
}

// Background task execution
async function executeTaskAsync(taskId: string) {
  const db = getDatabase()
  
  try {
    // Update status to running
    db.prepare(`
      UPDATE ai_tasks SET status = 'running' WHERE id = ?
    `).run(taskId)

    // Get task details
    const task = db.prepare(`
      SELECT t.*, a.name as agent_name 
      FROM ai_tasks t
      JOIN ai_agents a ON t.agent_id = a.id
      WHERE t.id = ?
    `).get(taskId) as any

    if (!task) {
      throw new Error('Task not found')
    }

    const inputData = JSON.parse(task.input_data || '{}')
    let result: any = null

    // Execute based on task type
    switch (task.task_type) {
      case 'inventory_analysis':
        result = await executeInventoryAnalysis(task.agent_id, inputData)
        break
      
      case 'reorder_suggestions':
        result = await executeReorderSuggestions(task.agent_id, inputData)
        break
      
      case 'low_stock_check':
        result = await executeLowStockCheck(task.agent_id, inputData)
        break
      
      case 'natural_language_search':
        result = await executeNLSearch(task.agent_id, inputData)
        break
      
      default:
        throw new Error(`Unknown task type: ${task.task_type}`)
    }

    // Mark as completed
    db.prepare(`
      UPDATE ai_tasks SET 
        status = 'completed',
        output_data = ?,
        completed_at = datetime('now')
      WHERE id = ?
    `).run(JSON.stringify(result), taskId)

  } catch (error) {
    console.error(`Task ${taskId} failed:`, error)
    
    // Mark as failed
    db.prepare(`
      UPDATE ai_tasks SET 
        status = 'failed',
        output_data = ?,
        completed_at = datetime('now')
      WHERE id = ?
    `).run(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Task execution failed' 
    }), taskId)
  }
}

// Task execution functions
async function executeInventoryAnalysis(agentId: string, inputData: any) {
  const { sqliteHelpers } = await import("@/lib/database/sqlite")
  const products = sqliteHelpers.getAllProducts()
  
  return await aiProviderFactory.analyzeInventoryWithAgent(
    agentId,
    products,
    inputData.analysis_type || 'general_analysis'
  )
}

async function executeReorderSuggestions(agentId: string, inputData: any) {
  const { sqliteHelpers } = await import("@/lib/database/sqlite")
  const products = sqliteHelpers.getAllProducts()
  const lowStockProducts = products.filter(p => p.stock_quantity <= p.min_stock_level)
  
  return await aiProviderFactory.analyzeInventoryWithAgent(
    agentId,
    lowStockProducts,
    'reorder_suggestions'
  )
}

async function executeLowStockCheck(agentId: string, inputData: any) {
  const { sqliteHelpers } = await import("@/lib/database/sqlite")
  const products = sqliteHelpers.getAllProducts()
  const lowStockProducts = products.filter(p => p.stock_quantity <= p.min_stock_level)
  
  return await aiProviderFactory.analyzeInventoryWithAgent(
    agentId,
    lowStockProducts,
    'low_stock'
  )
}

async function executeNLSearch(agentId: string, inputData: any) {
  const { query } = inputData
  if (!query) {
    throw new Error('Search query is required')
  }

  return await aiProviderFactory.sendMessageToAgent(
    agentId,
    `Search inventory for: ${query}`,
    []
  )
}