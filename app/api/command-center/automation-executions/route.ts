import { NextRequest, NextResponse } from 'next/server'
import { generateId, getDatabase } from '@/lib/database/sqlite'

/**
 * GET /api/command-center/automation-executions
 * Retrieve automation execution history
 * Query params: rule_id (optional), limit (optional, default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ruleId = searchParams.get('rule_id')
    const limit = parseInt(searchParams.get('limit') || '50')

    const db = getDatabase()

    let query = `
      SELECT ae.*, ar.rule_name
      FROM automation_executions ae
      LEFT JOIN automation_rules ar ON ae.rule_id = ar.id
    `

    if (ruleId) {
      query += ` WHERE ae.rule_id = ?`
    }

    query += ` ORDER BY ae.executed_at DESC LIMIT ?`

    const stmt = db.prepare(query)
    const executions = ruleId ? stmt.all(ruleId, limit) : stmt.all(limit)

    return NextResponse.json(executions)
  } catch (error) {
    console.error('Error fetching automation executions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch automation executions' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/command-center/automation-executions
 * Execute an automation rule manually
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { rule_id } = body

    if (!rule_id) {
      return NextResponse.json(
        { error: 'Missing rule_id' },
        { status: 400 }
      )
    }

    const db = getDatabase()

    // Get the rule
    const rule = db.prepare('SELECT * FROM automation_rules WHERE id = ? AND is_active = 1').get(rule_id)

    if (!rule) {
      return NextResponse.json(
        { error: 'Rule not found or inactive' },
        { status: 404 }
      )
    }

    // Create execution record
    const executionId = generateId()
    const startTime = Date.now()

    const stmt = db.prepare(`
      INSERT INTO automation_executions (
        id, rule_id, execution_status, trigger_data, executed_by
      ) VALUES (?, ?, ?, ?, ?)
    `)

    stmt.run(
      executionId,
      rule_id,
      'running',
      JSON.stringify({ manual: true }),
      'manual'
    )

    // Simulate execution (in real implementation, this would perform actual automation)
    const duration = Math.floor(Math.random() * 2000) + 500
    const success = Math.random() > 0.1 // 90% success rate

    // Update execution with results
    const updateStmt = db.prepare(`
      UPDATE automation_executions
      SET execution_status = ?, action_taken = ?, result_data = ?, duration_ms = ?
      WHERE id = ?
    `)

    updateStmt.run(
      success ? 'completed' : 'failed',
      JSON.stringify({ action_type: (rule as any).action_type }),
      JSON.stringify({ success, message: success ? 'Automation completed successfully' : 'Automation failed' }),
      duration,
      executionId
    )

    // Update rule execution count
    db.prepare(`
      UPDATE automation_rules
      SET execution_count = execution_count + 1, last_executed_at = datetime('now')
      WHERE id = ?
    `).run(rule_id)

    return NextResponse.json({
      success: true,
      execution_id: executionId,
      status: success ? 'completed' : 'failed'
    })
  } catch (error) {
    console.error('Error executing automation:', error)
    return NextResponse.json(
      { error: 'Failed to execute automation' },
      { status: 500 }
    )
  }
}
