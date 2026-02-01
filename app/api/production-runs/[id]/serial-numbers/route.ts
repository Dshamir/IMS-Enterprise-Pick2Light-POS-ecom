import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/supabase-helpers'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // allocated, assigned, consumed
    
    let query = `
      SELECT 
        sp.*,
        st.name as template_name,
        st.format_template,
        st.description as template_description,
        pr.planned_quantity,
        pr.actual_quantity,
        pr.status as production_run_status
      FROM serial_number_pool sp
      LEFT JOIN serial_number_templates st ON sp.template_id = st.id
      LEFT JOIN production_runs pr ON sp.production_run_id = pr.id
      WHERE sp.production_run_id = ?
    `
    
    const params_array = [id]
    
    if (status) {
      query += ` AND sp.status = ?`
      params_array.push(status)
    }
    
    query += ` ORDER BY sp.sequence_number ASC`
    
    const serialNumbers = await sqliteHelpers.db.all(query, params_array)
    
    // Get production run details
    const productionRun = await sqliteHelpers.db.get(
      `SELECT pr.*, mb.name as bom_name FROM production_runs pr 
       LEFT JOIN manufacturing_boms mb ON pr.bom_id = mb.id 
       WHERE pr.id = ?`,
      [id]
    )
    
    if (!productionRun) {
      return NextResponse.json({ error: 'Production run not found' }, { status: 404 })
    }
    
    // Get summary counts
    const summary = await sqliteHelpers.db.get(`
      SELECT 
        COUNT(*) as total_allocated,
        SUM(CASE WHEN status = 'allocated' THEN 1 ELSE 0 END) as allocated_count,
        SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned_count,
        SUM(CASE WHEN status = 'consumed' THEN 1 ELSE 0 END) as consumed_count
      FROM serial_number_pool 
      WHERE production_run_id = ?
    `, [id])
    
    return NextResponse.json({
      production_run: productionRun,
      serial_numbers: serialNumbers,
      summary: summary || {
        total_allocated: 0,
        allocated_count: 0,
        assigned_count: 0,
        consumed_count: 0
      }
    })
  } catch (error) {
    console.error('Error fetching production run serial numbers:', error)
    return NextResponse.json({ error: 'Failed to fetch serial numbers' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { serial_id, status, assigned_to_instance_id } = body
    
    if (!serial_id || !status) {
      return NextResponse.json({ error: 'Missing serial_id or status' }, { status: 400 })
    }
    
    const validStatuses = ['allocated', 'assigned', 'consumed']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    
    // Update the serial number status
    const updateFields = ['status = ?', 'updated_at = ?']
    const updateValues = [status, new Date().toISOString()]
    
    if (status === 'assigned' && assigned_to_instance_id) {
      updateFields.push('assigned_to_instance_id = ?')
      updateValues.push(assigned_to_instance_id)
    }
    
    updateValues.push(serial_id)
    
    await sqliteHelpers.db.run(
      `UPDATE serial_number_pool SET ${updateFields.join(', ')} WHERE id = ? AND production_run_id = ?`,
      [...updateValues, id]
    )
    
    // Return updated serial number
    const updatedSerial = await sqliteHelpers.db.get(
      `SELECT * FROM serial_number_pool WHERE id = ? AND production_run_id = ?`,
      [serial_id, id]
    )
    
    return NextResponse.json(updatedSerial)
  } catch (error) {
    console.error('Error updating serial number status:', error)
    return NextResponse.json({ error: 'Failed to update serial number' }, { status: 500 })
  }
}