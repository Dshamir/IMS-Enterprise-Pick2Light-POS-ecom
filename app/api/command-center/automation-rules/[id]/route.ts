import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/sqlite'

/**
 * GET /api/command-center/automation-rules/[id]
 * Get a specific automation rule
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDatabase()
    const rule = db.prepare('SELECT * FROM automation_rules WHERE id = ?').get(params.id)

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    return NextResponse.json(rule)
  } catch (error) {
    console.error('Error fetching automation rule:', error)
    return NextResponse.json(
      { error: 'Failed to fetch automation rule' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/command-center/automation-rules/[id]
 * Update an automation rule
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const db = getDatabase()

    const stmt = db.prepare(`
      UPDATE automation_rules
      SET rule_name = ?, description = ?, trigger_type = ?, trigger_condition = ?,
          action_type = ?, action_params = ?, requires_approval = ?, priority = ?,
          is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `)

    const result = stmt.run(
      body.rule_name,
      body.description || null,
      body.trigger_type,
      body.trigger_condition || '{}',
      body.action_type,
      body.action_params || '{}',
      body.requires_approval ? 1 : 0,
      body.priority || 5,
      body.is_active ? 1 : 0,
      params.id
    )

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating automation rule:', error)
    return NextResponse.json(
      { error: 'Failed to update automation rule' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/command-center/automation-rules/[id]
 * Delete an automation rule
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDatabase()
    const stmt = db.prepare('DELETE FROM automation_rules WHERE id = ?')
    const result = stmt.run(params.id)

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting automation rule:', error)
    return NextResponse.json(
      { error: 'Failed to delete automation rule' },
      { status: 500 }
    )
  }
}
