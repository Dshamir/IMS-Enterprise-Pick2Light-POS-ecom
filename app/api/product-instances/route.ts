import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/supabase-helpers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productionRunId = searchParams.get('production_run_id')
    const productId = searchParams.get('product_id')
    const status = searchParams.get('status')
    const model = searchParams.get('model')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    let query = `
      SELECT 
        pi.*,
        p.name as product_name,
        pr.bom_id,
        mb.name as bom_name
      FROM product_instances pi
      LEFT JOIN products p ON pi.product_id = p.id
      LEFT JOIN production_runs pr ON pi.production_run_id = pr.id
      LEFT JOIN manufacturing_boms mb ON pr.bom_id = mb.id
      WHERE 1=1
    `
    
    const params: any[] = []
    
    if (productionRunId) {
      query += ` AND pi.production_run_id = ?`
      params.push(productionRunId)
    }
    
    if (productId) {
      query += ` AND pi.product_id = ?`
      params.push(productId)
    }
    
    if (status) {
      query += ` AND pi.instance_status = ?`
      params.push(status)
    }
    
    if (model) {
      query += ` AND pi.model = ?`
      params.push(model)
    }
    
    query += ` ORDER BY pi.created_at DESC LIMIT ? OFFSET ?`
    params.push(limit, offset)
    
    const instances = await sqliteHelpers.db.all(query, params)
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM product_instances pi
      WHERE 1=1
    `
    
    const countParams: any[] = []
    
    if (productionRunId) {
      countQuery += ` AND pi.production_run_id = ?`
      countParams.push(productionRunId)
    }
    
    if (productId) {
      countQuery += ` AND pi.product_id = ?`
      countParams.push(productId)
    }
    
    if (status) {
      countQuery += ` AND pi.instance_status = ?`
      countParams.push(status)
    }
    
    if (model) {
      countQuery += ` AND pi.model = ?`
      countParams.push(model)
    }
    
    const countResult = await sqliteHelpers.db.get(countQuery, countParams)
    
    return NextResponse.json({
      instances,
      pagination: {
        total: countResult?.total || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (countResult?.total || 0)
      }
    })
  } catch (error) {
    console.error('Error fetching product instances:', error)
    return NextResponse.json({ error: 'Failed to fetch product instances' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      product_id,
      production_run_id,
      serial_number,
      serial_number_custom,
      model,
      part_number,
      counter,
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
      batch_number,
      instance_status = 'produced',
      manufacture_date,
      location,
      quality_notes
    } = body
    
    if (!product_id || !production_run_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    const id = require('uuid').v4()
    const now = new Date().toISOString()
    
    await sqliteHelpers.db.run(
      `INSERT INTO product_instances (
        id, product_id, production_run_id, serial_number, serial_number_custom,
        model, part_number, counter, kind, use_case, version, production_year,
        num_wells, application, machine_name, note, input_specs, color_code, color,
        self_test_by, calibrated_by, used_by, calibration_date, recalibration_date,
        batch_number, instance_status, manufacture_date, location, quality_notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, product_id, production_run_id, serial_number, serial_number_custom,
        model, part_number, counter, kind, use_case, version, production_year,
        num_wells, application, machine_name, note, input_specs, color_code, color,
        self_test_by, calibrated_by, used_by, calibration_date, recalibration_date,
        batch_number, instance_status, manufacture_date, location, quality_notes,
        now, now
      ]
    )
    
    const instance = await sqliteHelpers.db.get(
      `SELECT * FROM product_instances WHERE id = ?`,
      [id]
    )
    
    return NextResponse.json(instance)
  } catch (error) {
    console.error('Error creating product instance:', error)
    return NextResponse.json({ error: 'Failed to create product instance' }, { status: 500 })
  }
}