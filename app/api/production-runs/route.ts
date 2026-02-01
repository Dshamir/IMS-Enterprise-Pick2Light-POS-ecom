import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/supabase-helpers'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bomId = searchParams.get('bom_id')
    const status = searchParams.get('status')
    
    let query = `
      SELECT 
        pr.*,
        mb.name as bom_name,
        mb.description as bom_description,
        pl.name as production_line_name,
        p.name as project_name
      FROM production_runs pr
      JOIN manufacturing_boms mb ON pr.bom_id = mb.id
      LEFT JOIN production_lines pl ON mb.production_line_id = pl.id
      LEFT JOIN projects p ON mb.project_id = p.id
      WHERE 1=1
    `
    
    const params: any[] = []
    
    if (bomId) {
      query += ` AND pr.bom_id = ?`
      params.push(bomId)
    }
    
    if (status) {
      query += ` AND pr.status = ?`
      params.push(status)
    }
    
    query += ` ORDER BY pr.created_at DESC`
    
    const runs = await sqliteHelpers.db.all(query, params)
    
    return NextResponse.json(runs)
  } catch (error) {
    console.error('Error fetching production runs:', error)
    return NextResponse.json({ error: 'Failed to fetch production runs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bom_id, planned_quantity, status = 'planned', notes = '', serial_config = null, image_url = null } = body
    
    if (!bom_id || !planned_quantity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    const id = uuidv4()
    const now = new Date().toISOString()
    
    await sqliteHelpers.db.run(
      `INSERT INTO production_runs 
       (id, bom_id, planned_quantity, actual_quantity, status, notes, serial_config, image_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, bom_id, planned_quantity, 0, status, notes, serial_config ? JSON.stringify(serial_config) : null, image_url, now, now]
    )
    
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
    
    return NextResponse.json(productionRun)
  } catch (error) {
    console.error('Error creating production run:', error)
    return NextResponse.json({ error: 'Failed to create production run' }, { status: 500 })
  }
}