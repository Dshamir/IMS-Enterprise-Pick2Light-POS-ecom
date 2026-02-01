import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/sqlite'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productType = searchParams.get('product_type')
    const active = searchParams.get('active')
    
    let query = `
      SELECT * FROM serial_number_templates 
      WHERE 1=1
    `
    
    const params: any[] = []
    
    if (productType) {
      query += ` AND product_type = ?`
      params.push(productType)
    }
    
    if (active !== null) {
      query += ` AND is_active = ?`
      params.push(active === 'true' ? 1 : 0)
    }
    
    query += ` ORDER BY is_default DESC, name ASC`
    
    const db = getDatabase()
    const templates = db.prepare(query).all(...params)
    
    console.log('Serial number templates fetched:', templates.length)
    
    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching serial number templates:', error)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      description,
      format_template,
      model_pattern,
      version_pattern,
      num_wells_pattern = 'PIV',
      kind_pattern = 'RTPCR',
      color_code_pattern = 'W',
      year_format = 'YY',
      month_format = 'MM',
      prefix_default = 'LAB',
      counter_padding = 5,
      suffix_pattern = 'xxx',
      counter_start = 1,
      counter_increment = 1,
      validation_regex,
      product_type,
      facility_code,
      is_active = 1,
      is_default = 0
    } = body
    
    if (!name || !format_template) {
      return NextResponse.json({ error: 'Name and format template are required' }, { status: 400 })
    }
    
    const id = uuidv4()
    const now = new Date().toISOString()
    
    const db = getDatabase()
    
    // If this is set as default, unset other defaults
    if (is_default) {
      db.prepare(
        `UPDATE serial_number_templates SET is_default = 0 WHERE product_type = ? OR product_type IS NULL`
      ).run(product_type)
    }
    
    db.prepare(
      `INSERT INTO serial_number_templates (
        id, name, description, format_template, model_pattern, version_pattern,
        num_wells_pattern, kind_pattern, color_code_pattern,
        year_format, month_format, prefix_default, counter_padding, suffix_pattern,
        counter_start, counter_increment, validation_regex, product_type, facility_code,
        is_active, is_default, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, name, description, format_template, model_pattern, version_pattern,
      num_wells_pattern, kind_pattern, color_code_pattern,
      year_format, month_format, prefix_default, counter_padding, suffix_pattern,
      counter_start, counter_increment, validation_regex, product_type, facility_code,
      is_active ? 1 : 0, is_default ? 1 : 0, now, now
    )
    
    const template = db.prepare(
      `SELECT * FROM serial_number_templates WHERE id = ?`
    ).get(id)
    
    return NextResponse.json(template)
  } catch (error) {
    console.error('Error creating serial number template:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}