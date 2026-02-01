import { NextRequest, NextResponse } from 'next/server'
import {
  getAllAutomationRules,
  getActiveAutomationRules,
  generateId,
  getDatabase,
} from '@/lib/database/sqlite'

/**
 * GET /api/command-center/automation-rules
 * Retrieve all automation rules or only active ones
 * Query params: active=true (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'

    const rules = activeOnly ? getActiveAutomationRules() : getAllAutomationRules()
    return NextResponse.json(rules)
  } catch (error) {
    console.error('Error fetching automation rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch automation rules' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/command-center/automation-rules
 * Create a new automation rule
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.rule_name || !body.trigger_type || !body.action_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const db = getDatabase()
    const id = generateId()

    const stmt = db.prepare(`
      INSERT INTO automation_rules (
        id, rule_name, description, trigger_type, trigger_condition,
        action_type, action_params, requires_approval, priority, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      body.rule_name,
      body.description || null,
      body.trigger_type,
      body.trigger_condition || '{}',
      body.action_type,
      body.action_params || '{}',
      body.requires_approval ? 1 : 0,
      body.priority || 5,
      body.is_active ? 1 : 0
    )

    return NextResponse.json({ success: true, id }, { status: 201 })
  } catch (error) {
    console.error('Error creating automation rule:', error)
    return NextResponse.json(
      { error: 'Failed to create automation rule' },
      { status: 500 }
    )
  }
}
