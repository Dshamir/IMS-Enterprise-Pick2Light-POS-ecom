import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/supabase-helpers'
import { v4 as uuidv4 } from 'uuid'
import { generateBatchSerialNumbers } from '@/lib/batch-serial-generator'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productionRunId = searchParams.get('production_run_id')
    const templateId = searchParams.get('template_id')
    const status = searchParams.get('status')
    
    let query = `
      SELECT 
        sp.*,
        st.name as template_name,
        st.format_template,
        pr.planned_quantity,
        pr.actual_quantity
      FROM serial_number_pool sp
      LEFT JOIN serial_number_templates st ON sp.template_id = st.id
      LEFT JOIN production_runs pr ON sp.production_run_id = pr.id
      WHERE 1=1
    `
    
    const params: any[] = []
    
    if (productionRunId) {
      query += ` AND sp.production_run_id = ?`
      params.push(productionRunId)
    }
    
    if (templateId) {
      query += ` AND sp.template_id = ?`
      params.push(templateId)
    }
    
    if (status) {
      query += ` AND sp.status = ?`
      params.push(status)
    }
    
    query += ` ORDER BY sp.sequence_number ASC`
    
    const serialNumbers = await sqliteHelpers.db.all(query, params)
    
    return NextResponse.json(serialNumbers)
  } catch (error) {
    console.error('Error fetching serial number pool:', error)
    return NextResponse.json({ error: 'Failed to fetch serial numbers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      template_id,
      production_run_id,
      quantity,
      overrides = {}
    } = body
    
    if (!template_id || !production_run_id || !quantity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    // Get template
    const template = await sqliteHelpers.db.get(
      `SELECT * FROM serial_number_templates WHERE id = ?`,
      [template_id]
    )
    
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }
    
    // Check if serials already exist for this production run
    const existingSerials = await sqliteHelpers.db.all(
      `SELECT * FROM serial_number_pool WHERE production_run_id = ?`,
      [production_run_id]
    )
    
    if (existingSerials.length > 0) {
      return NextResponse.json({ 
        error: 'Serial numbers already allocated for this production run',
        existing: existingSerials
      }, { status: 400 })
    }
    
    // Generate batch serial numbers
    const result = generateBatchSerialNumbers({
      template,
      productionRunId: production_run_id,
      quantity,
      overrides
    })
    
    if (!result.success) {
      return NextResponse.json({ 
        error: 'Failed to generate serial numbers',
        errors: result.errors
      }, { status: 400 })
    }
    
    // Insert into database
    const now = new Date().toISOString()
    const insertPromises = result.serials.map(serial => {
      const poolId = uuidv4()
      return sqliteHelpers.db.run(
        `INSERT INTO serial_number_pool (
          id, template_id, production_run_id, serial_number, model, part_number, counter,
          version, year, month, prefix, suffix, facility_code, sequence_number, status, allocated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          poolId, template_id, production_run_id, serial.serial_number, serial.model,
          serial.part_number, serial.counter, serial.version, serial.year, serial.month,
          serial.prefix, serial.suffix, serial.facility_code, serial.sequence_number,
          'allocated', now
        ]
      )
    })
    
    await Promise.all(insertPromises)
    
    // Return allocated serial numbers
    const allocatedSerials = await sqliteHelpers.db.all(
      `SELECT * FROM serial_number_pool WHERE production_run_id = ? ORDER BY sequence_number ASC`,
      [production_run_id]
    )
    
    return NextResponse.json({
      success: true,
      message: `Successfully allocated ${allocatedSerials.length} serial numbers`,
      serials: allocatedSerials,
      template_used: template
    })
  } catch (error) {
    console.error('Error allocating serial numbers:', error)
    return NextResponse.json({ error: 'Failed to allocate serial numbers' }, { status: 500 })
  }
}