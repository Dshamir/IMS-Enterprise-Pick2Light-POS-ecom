import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/supabase-helpers'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    const template = await sqliteHelpers.db.get(
      `SELECT * FROM serial_number_templates WHERE id = ?`,
      [id]
    )
    
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }
    
    return NextResponse.json(template)
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Check if template exists
    const existingTemplate = await sqliteHelpers.db.get(
      `SELECT * FROM serial_number_templates WHERE id = ?`,
      [id]
    )
    
    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }
    
    // Build update query dynamically
    const updateFields = []
    const updateValues = []
    
    const allowedFields = [
      'name', 'description', 'format_template', 'model_pattern', 'version_pattern',
      'num_wells_pattern', 'kind_pattern', 'color_code_pattern',
      'year_format', 'month_format', 'prefix_default', 'counter_padding', 'suffix_pattern',
      'counter_start', 'counter_increment', 'validation_regex', 'product_type', 'facility_code',
      'is_active', 'is_default'
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
    
    // If this is set as default, unset other defaults
    if (body.is_default) {
      await sqliteHelpers.db.run(
        `UPDATE serial_number_templates SET is_default = 0 WHERE product_type = ? AND id != ?`,
        [body.product_type || existingTemplate.product_type, id]
      )
    }
    
    // Convert boolean values to integers for SQLite
    const processedValues = updateValues.map(value => {
      if (typeof value === 'boolean') {
        return value ? 1 : 0
      }
      return value
    })
    
    // Add updated_at timestamp
    updateFields.push('updated_at = ?')
    processedValues.push(new Date().toISOString())
    
    // Add id for WHERE clause
    processedValues.push(id)
    
    const updateQuery = `UPDATE serial_number_templates SET ${updateFields.join(', ')} WHERE id = ?`
    
    await sqliteHelpers.db.run(updateQuery, processedValues)
    
    // Return updated template
    const updatedTemplate = await sqliteHelpers.db.get(
      `SELECT * FROM serial_number_templates WHERE id = ?`,
      [id]
    )
    
    return NextResponse.json(updatedTemplate)
  } catch (error) {
    console.error('Error updating template:', error)
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    // Check if template exists
    const existingTemplate = await sqliteHelpers.db.get(
      `SELECT * FROM serial_number_templates WHERE id = ?`,
      [id]
    )
    
    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }
    
    // Check if template is in use
    const templatesInUse = await sqliteHelpers.db.get(
      `SELECT COUNT(*) as count FROM serial_number_pool WHERE template_id = ?`,
      [id]
    )
    
    if (templatesInUse.count > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete template that is in use by production runs' 
      }, { status: 400 })
    }
    
    await sqliteHelpers.db.run(
      `DELETE FROM serial_number_templates WHERE id = ?`,
      [id]
    )
    
    return NextResponse.json({ message: 'Template deleted successfully' })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }
}