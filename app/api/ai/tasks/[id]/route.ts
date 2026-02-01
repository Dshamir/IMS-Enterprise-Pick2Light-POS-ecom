import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/database/sqlite"

// GET /api/ai/tasks/:id - Get specific task details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params
    const db = getDatabase()
    
    const task = db.prepare(`
      SELECT 
        t.*,
        a.name as agent_name,
        a.role as agent_role,
        p.display_name as provider_name
      FROM ai_tasks t
      LEFT JOIN ai_agents a ON t.agent_id = a.id
      LEFT JOIN ai_providers p ON a.provider_id = p.id
      WHERE t.id = ?
    `).get(taskId) as any

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      )
    }

    // Parse JSON fields
    const processedTask = {
      ...task,
      input_data: task.input_data ? JSON.parse(task.input_data) : null,
      output_data: task.output_data ? JSON.parse(task.output_data) : null,
      duration_ms: task.completed_at ? 
        new Date(task.completed_at).getTime() - new Date(task.created_at).getTime() : null
    }

    return NextResponse.json({
      success: true,
      task: processedTask
    })
  } catch (error) {
    console.error("Error fetching task:", error)
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    )
  }
}

// DELETE /api/ai/tasks/:id - Cancel task
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params
    const db = getDatabase()
    
    // Check if task exists and can be cancelled
    const task = db.prepare(`
      SELECT * FROM ai_tasks WHERE id = ?
    `).get(taskId) as any

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      )
    }

    if (task.status === 'completed' || task.status === 'failed') {
      return NextResponse.json(
        { error: "Cannot cancel completed or failed task" },
        { status: 400 }
      )
    }

    // Update task status to cancelled
    const result = db.prepare(`
      UPDATE ai_tasks SET 
        status = 'cancelled',
        completed_at = datetime('now'),
        output_data = ?
      WHERE id = ?
    `).run(
      JSON.stringify({ cancelled_by: 'user', reason: 'Manual cancellation' }),
      taskId
    )

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Failed to cancel task" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Task cancelled successfully"
    })
  } catch (error) {
    console.error("Error cancelling task:", error)
    return NextResponse.json(
      { error: "Failed to cancel task" },
      { status: 500 }
    )
  }
}

// PUT /api/ai/tasks/:id - Update task (retry failed tasks)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params
    const body = await request.json()
    const { action } = body

    const db = getDatabase()
    
    const task = db.prepare(`
      SELECT * FROM ai_tasks WHERE id = ?
    `).get(taskId) as any

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      )
    }

    if (action === 'retry') {
      if (task.status !== 'failed') {
        return NextResponse.json(
          { error: "Can only retry failed tasks" },
          { status: 400 }
        )
      }

      // Reset task to pending
      db.prepare(`
        UPDATE ai_tasks SET 
          status = 'pending',
          completed_at = NULL,
          output_data = NULL
        WHERE id = ?
      `).run(taskId)

      return NextResponse.json({
        success: true,
        message: "Task queued for retry"
      })
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Error updating task:", error)
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    )
  }
}