import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/sqlite'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')
    const model = searchParams.get('model')
    const search = searchParams.get('search')
    const sortField = searchParams.get('sort') || 'counter'
    const sortOrder = searchParams.get('order') || 'asc'

    const db = getDatabase()
    
    // Build WHERE clause based on filters
    let whereClause = 'WHERE 1=1'
    const params: any[] = []

    if (status && status !== 'all') {
      whereClause += ' AND status = ?'
      params.push(status)
    }

    if (model && model !== 'all') {
      whereClause += ' AND model = ?'
      params.push(model)
    }

    if (search) {
      whereClause += ' AND (serial_number LIKE ? OR model LIKE ? OR kind LIKE ? OR CAST(counter AS TEXT) LIKE ?)'
      const searchPattern = `%${search}%`
      params.push(searchPattern, searchPattern, searchPattern, searchPattern)
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM serial_number_registry ${whereClause}`
    const countResult = db.prepare(countQuery).get(...params) as { total: number }

    // Validate sort parameters
    const validSortFields = ['counter', 'serial_number', 'model', 'kind', 'status', 'created_at', 'updated_at']
    const validSortOrders = ['asc', 'desc']
    
    const safeSortField = validSortFields.includes(sortField) ? sortField : 'counter'
    const safeSortOrder = validSortOrders.includes(sortOrder.toLowerCase()) ? sortOrder.toLowerCase() : 'asc'
    
    // Get serial numbers with pagination
    const serialsQuery = `
      SELECT 
        id,
        serial_number,
        counter,
        model,
        kind,
        use_case,
        version,
        production_year,
        num_wells,
        application,
        machine_name,
        note,
        input_specs,
        color_code,
        color,
        self_test_by,
        calibrated_by,
        used_by,
        calibration_date,
        recalibration_date,
        status,
        created_at,
        updated_at,
        assigned_to_production_run_id,
        assigned_to_product_instance_id,
        imported_from_excel
      FROM serial_number_registry 
      ${whereClause}
      ORDER BY ${safeSortField} ${safeSortOrder.toUpperCase()}
      LIMIT ? OFFSET ?
    `
    
    const serials = db.prepare(serialsQuery).all(...params, limit, offset)

    // Get statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'deprecated' THEN 1 END) as deprecated,
        COUNT(CASE WHEN status = 'assigned' OR assigned_to_production_run_id IS NOT NULL THEN 1 END) as assigned,
        COUNT(CASE WHEN imported_from_excel = 1 THEN 1 END) as imported,
        MAX(counter) as highest_counter
      FROM serial_number_registry
    `
    
    const stats = db.prepare(statsQuery).get()

    return NextResponse.json({
      serials,
      stats,
      pagination: {
        total: countResult.total,
        limit,
        offset,
        hasMore: offset + limit < countResult.total
      },
      sorting: {
        field: safeSortField,
        order: safeSortOrder
      }
    })

  } catch (error) {
    console.error('Error fetching serial numbers:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch serial numbers',
      details: error.message 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Serial number ID is required' }, { status: 400 })
    }

    const db = getDatabase()
    
    // Get current serial number data
    const currentSerial = db.prepare('SELECT * FROM serial_number_registry WHERE id = ?').get(id)
    if (!currentSerial) {
      return NextResponse.json({ error: 'Serial number not found' }, { status: 404 })
    }

    // Check if core parameters that affect serial number string are being updated
    const coreParams = ['model', 'kind', 'use_case', 'version', 'num_wells', 'color_code', 'counter']
    const coreParamsChanged = coreParams.some(param => 
      updates.hasOwnProperty(param) && updates[param] !== currentSerial[param]
    )

    // If core parameters changed, regenerate the serial number string
    if (coreParamsChanged) {
      // Merge current data with updates
      const mergedData = { ...currentSerial, ...updates }
      
      // Regenerate serial number string with updated parameters
      // Format: MODEL+NUMWELLS-KIND-USECASE-VERSION+COLORCODE-COUNTER
      const model = mergedData.model || ''
      const num_wells = mergedData.num_wells || ''
      const kind = mergedData.kind || ''
      const use_case = mergedData.use_case || ''
      const version = mergedData.version || ''
      const color_code = mergedData.color_code || ''
      const counter = mergedData.counter || 0
      
      const newSerialNumber = `${model}${num_wells}-${kind}-${use_case}-${version}${color_code}-${counter.toString().padStart(5, '0')}`
      
      // Add the regenerated serial_number to updates
      updates.serial_number = newSerialNumber
    }
    
    // Build UPDATE query dynamically
    const updateFields = Object.keys(updates).filter(key => updates[key] !== undefined)
    const setClause = updateFields.map(field => `${field} = ?`).join(', ')
    const values = updateFields.map(field => updates[field])

    const updateQuery = `
      UPDATE serial_number_registry 
      SET ${setClause}, updated_at = datetime('now'), updated_by = 'edit'
      WHERE id = ?
    `

    const result = db.prepare(updateQuery).run(...values, id)

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Serial number not found' }, { status: 404 })
    }

    // Get updated serial number
    const updatedSerial = db.prepare('SELECT * FROM serial_number_registry WHERE id = ?').get(id)

    return NextResponse.json({
      success: true,
      serial: updatedSerial,
      serialNumberRegenerated: coreParamsChanged
    })

  } catch (error) {
    console.error('Error updating serial number:', error)
    return NextResponse.json({ 
      error: 'Failed to update serial number',
      details: error.message 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Serial number ID is required' }, { status: 400 })
    }

    const db = getDatabase()
    
    // Check if serial number exists and is not assigned
    const existing = db.prepare(`
      SELECT id, status, assigned_to_production_run_id, assigned_to_product_instance_id 
      FROM serial_number_registry 
      WHERE id = ?
    `).get(id)

    if (!existing) {
      return NextResponse.json({ error: 'Serial number not found' }, { status: 404 })
    }

    if (existing.assigned_to_production_run_id || existing.assigned_to_product_instance_id) {
      return NextResponse.json({ 
        error: 'Cannot delete assigned serial number. Deprecate it instead.' 
      }, { status: 400 })
    }

    // Delete the serial number
    const result = db.prepare('DELETE FROM serial_number_registry WHERE id = ?').run(id)

    return NextResponse.json({
      success: true,
      message: 'Serial number deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting serial number:', error)
    return NextResponse.json({ 
      error: 'Failed to delete serial number',
      details: error.message 
    }, { status: 500 })
  }
}