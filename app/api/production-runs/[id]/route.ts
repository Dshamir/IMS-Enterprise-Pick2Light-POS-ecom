import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/supabase-helpers'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    const productionRun = await sqliteHelpers.db.get(
      `SELECT 
        pr.*,
        mb.name as bom_name,
        mb.description as bom_description,
        pl.name as production_line_name,
        p.name as project_name
      FROM production_runs pr
      JOIN manufacturing_boms mb ON pr.bom_id = mb.id
      LEFT JOIN production_lines pl ON mb.production_line_id = pl.id
      LEFT JOIN projects p ON mb.project_id = p.id
      WHERE pr.id = ?`,
      [id]
    )
    
    if (!productionRun) {
      return NextResponse.json({ error: 'Production run not found' }, { status: 404 })
    }
    
    return NextResponse.json(productionRun)
  } catch (error) {
    console.error('Error fetching production run:', error)
    return NextResponse.json({ error: 'Failed to fetch production run' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const { 
      planned_quantity, 
      actual_quantity, 
      start_date, 
      end_date, 
      status, 
      notes 
    } = body
    
    const updates: string[] = []
    const values: any[] = []
    
    if (planned_quantity !== undefined) {
      updates.push('planned_quantity = ?')
      values.push(planned_quantity)
    }
    
    if (actual_quantity !== undefined) {
      updates.push('actual_quantity = ?')
      values.push(actual_quantity)
    }
    
    if (start_date !== undefined) {
      updates.push('start_date = ?')
      values.push(start_date)
    }
    
    if (end_date !== undefined) {
      updates.push('end_date = ?')
      values.push(end_date)
    }
    
    if (status !== undefined) {
      updates.push('status = ?')
      values.push(status)
    }
    
    if (notes !== undefined) {
      updates.push('notes = ?')
      values.push(notes)
    }
    
    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }
    
    updates.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)
    
    await sqliteHelpers.db.run(
      `UPDATE production_runs SET ${updates.join(', ')} WHERE id = ?`,
      values
    )
    
    const updatedRun = await sqliteHelpers.db.get(
      `SELECT 
        pr.*,
        mb.name as bom_name,
        mb.description as bom_description,
        pl.name as production_line_name,
        p.name as project_name
      FROM production_runs pr
      JOIN manufacturing_boms mb ON pr.bom_id = mb.id
      LEFT JOIN production_lines pl ON mb.production_line_id = pl.id
      LEFT JOIN projects p ON mb.project_id = p.id
      WHERE pr.id = ?`,
      [id]
    )
    
    return NextResponse.json(updatedRun)
  } catch (error) {
    console.error('Error updating production run:', error)
    return NextResponse.json({ error: 'Failed to update production run' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    await sqliteHelpers.db.run('DELETE FROM production_runs WHERE id = ?', [id])
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting production run:', error)
    return NextResponse.json({ error: 'Failed to delete production run' }, { status: 500 })
  }
}