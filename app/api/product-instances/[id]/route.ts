import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/supabase-helpers'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    const instance = await sqliteHelpers.db.get(
      `SELECT 
        pi.*,
        p.name as product_name,
        pr.bom_id,
        mb.name as bom_name,
        mb.description as bom_description
      FROM product_instances pi
      LEFT JOIN products p ON pi.product_id = p.id
      LEFT JOIN production_runs pr ON pi.production_run_id = pr.id
      LEFT JOIN manufacturing_boms mb ON pr.bom_id = mb.id
      WHERE pi.id = ?`,
      [id]
    )
    
    if (!instance) {
      return NextResponse.json({ error: 'Product instance not found' }, { status: 404 })
    }
    
    return NextResponse.json(instance)
  } catch (error) {
    console.error('Error fetching product instance:', error)
    return NextResponse.json({ error: 'Failed to fetch product instance' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Check if instance exists
    const existingInstance = await sqliteHelpers.db.get(
      `SELECT * FROM product_instances WHERE id = ?`,
      [id]
    )
    
    if (!existingInstance) {
      return NextResponse.json({ error: 'Product instance not found' }, { status: 404 })
    }
    
    // Build update query dynamically based on provided fields
    const updateFields = []
    const updateValues = []
    
    const allowedFields = [
      'serial_number', 'serial_number_custom', 'model', 'part_number', 'counter',
      'kind', 'use_case', 'version', 'production_year', 'num_wells', 'application',
      'machine_name', 'note', 'input_specs', 'color_code', 'color', 'self_test_by',
      'calibrated_by', 'used_by', 'calibration_date', 'recalibration_date',
      'batch_number', 'instance_status', 'manufacture_date', 'location', 'quality_notes',
      'qa_date', 'release_date', 'shipped_date', 'tracking_number', 'customer_id',
      'defect_reason', 'repair_notes', 'warranty_start_date', 'warranty_end_date',
      'maintenance_schedule', 'last_maintenance_date', 'next_maintenance_date'
    ]
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateFields.push(`${field} = ?`)
        updateValues.push(body[field])
      }
    }
    
    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }
    
    // Add updated_at timestamp
    updateFields.push('updated_at = ?')
    updateValues.push(new Date().toISOString())
    
    // Add id for WHERE clause
    updateValues.push(id)
    
    const updateQuery = `UPDATE product_instances SET ${updateFields.join(', ')} WHERE id = ?`
    
    await sqliteHelpers.db.run(updateQuery, updateValues)
    
    // Return updated instance
    const updatedInstance = await sqliteHelpers.db.get(
      `SELECT 
        pi.*,
        p.name as product_name,
        pr.bom_id,
        mb.name as bom_name,
        mb.description as bom_description
      FROM product_instances pi
      LEFT JOIN products p ON pi.product_id = p.id
      LEFT JOIN production_runs pr ON pi.production_run_id = pr.id
      LEFT JOIN manufacturing_boms mb ON pr.bom_id = mb.id
      WHERE pi.id = ?`,
      [id]
    )
    
    return NextResponse.json(updatedInstance)
  } catch (error) {
    console.error('Error updating product instance:', error)
    return NextResponse.json({ error: 'Failed to update product instance' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    // Check if instance exists
    const existingInstance = await sqliteHelpers.db.get(
      `SELECT * FROM product_instances WHERE id = ?`,
      [id]
    )
    
    if (!existingInstance) {
      return NextResponse.json({ error: 'Product instance not found' }, { status: 404 })
    }
    
    await sqliteHelpers.db.run(
      `DELETE FROM product_instances WHERE id = ?`,
      [id]
    )
    
    return NextResponse.json({ message: 'Product instance deleted successfully' })
  } catch (error) {
    console.error('Error deleting product instance:', error)
    return NextResponse.json({ error: 'Failed to delete product instance' }, { status: 500 })
  }
}