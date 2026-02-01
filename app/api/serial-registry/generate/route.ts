import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/sqlite'
import { v4 as uuidv4 } from 'uuid'
import { formatSerialNumberWithTemplate } from '@/lib/serial-template-formatter'
import { type SerialNumberTemplate } from '@/lib/batch-serial-generator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
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
      production_run_id,
      product_instance_id,
      created_by = 'manual',
      generation_mode = 'manual',
      template_id,
      custom_format
    } = body

    if (!counter) {
      return NextResponse.json({ error: 'Counter is required' }, { status: 400 })
    }

    const db = getDatabase()

    // Check if counter already exists
    const existing = db.prepare(`
      SELECT id, serial_number, status FROM serial_number_registry 
      WHERE counter = ? AND status = 'active'
    `).get(counter)

    if (existing) {
      return NextResponse.json({ 
        error: 'Counter already exists', 
        existingSerial: existing.serial_number 
      }, { status: 409 })
    }

    // Generate serial number using template or manual mode
    const serialNumber = await generateSerialNumber({
      counter,
      model,
      kind,
      use_case,
      version,
      production_year,
      num_wells,
      application,
      machine_name,
      color_code,
      color,
      generation_mode,
      template_id,
      custom_format
    }, db)

    // Insert into registry
    const id = uuidv4()
    const result = db.prepare(`
      INSERT INTO serial_number_registry (
        id, serial_number, counter, model, kind, use_case, version, production_year,
        num_wells, application, machine_name, note, input_specs, color_code, color,
        self_test_by, calibrated_by, used_by, calibration_date, recalibration_date,
        assigned_to_production_run_id, assigned_to_product_instance_id,
        status, imported_from_excel, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      id, serialNumber, counter, model, kind, use_case, version, production_year,
      num_wells, application, machine_name, note, input_specs, color_code, color,
      self_test_by, calibrated_by, used_by, calibration_date, recalibration_date,
      production_run_id || null, product_instance_id || null, 'active', created_by, created_by
    )

    // Get the created serial number
    const createdSerial = db.prepare(`
      SELECT * FROM serial_number_registry WHERE id = ?
    `).get(id)

    return NextResponse.json({
      success: true,
      serial: createdSerial,
      nextCounter: counter + 1
    })

  } catch (error) {
    console.error('Error generating serial number:', error)
    return NextResponse.json({ 
      error: 'Failed to generate serial number', 
      details: error.message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const counter = searchParams.get('counter')
    
    const db = getDatabase()
    
    if (counter) {
      // Get specific counter info
      const serialInfo = db.prepare(`
        SELECT * FROM serial_number_registry WHERE counter = ?
      `).get(counter)

      return NextResponse.json({
        exists: !!serialInfo,
        serial: serialInfo,
        available: !serialInfo || serialInfo.status !== 'active'
      })
    }

    // Get next available counter and recent serials
    const nextCounter = db.prepare(`
      SELECT next_counter FROM v_next_available_counter
    `).get()

    const recentSerials = db.prepare(`
      SELECT * FROM serial_number_registry 
      WHERE status = 'active' 
      ORDER BY counter DESC 
      LIMIT 10
    `).all()

    // Get template data for form pre-population (from most recent serial)
    const templateData = recentSerials.length > 0 ? {
      model: recentSerials[0].model,
      kind: recentSerials[0].kind,
      use_case: recentSerials[0].use_case,
      version: recentSerials[0].version,
      production_year: recentSerials[0].production_year,
      num_wells: recentSerials[0].num_wells,
      application: recentSerials[0].application,
      color_code: recentSerials[0].color_code,
      color: recentSerials[0].color
    } : {}

    return NextResponse.json({
      nextCounter: nextCounter?.next_counter || 1,
      recentSerials,
      templateData
    })

  } catch (error) {
    console.error('Error getting serial number data:', error)
    return NextResponse.json({ error: 'Failed to get serial number data' }, { status: 500 })
  }
}

// Helper function to generate serial number from components
async function generateSerialNumber(components: any, db: any): Promise<string> {
  const {
    counter,
    model,
    kind,
    use_case,
    version,
    production_year,
    num_wells,
    color_code,
    generation_mode,
    template_id,
    custom_format
  } = components

  if (generation_mode === 'template' && template_id) {
    try {
      // Get the template from database
      const template = db.prepare(`
        SELECT * FROM serial_number_templates WHERE id = ? AND is_active = 1
      `).get(template_id)

      if (template) {
        // Use custom format if provided, otherwise use template format
        const formatToUse = custom_format || template.format_template
        
        // Create a mock template with the custom format
        const mockTemplate: SerialNumberTemplate = {
          ...template,
          format_template: formatToUse
        }

        // Format using template
        return formatSerialNumberWithTemplate({
          model,
          kind,
          use_case,
          version,
          production_year,
          num_wells: parseInt(num_wells?.toString() || '0') || 0,
          color_code,
          counter
        }, mockTemplate)
      }
    } catch (error) {
      console.error('Error using template for serial generation:', error)
      // Fall back to manual generation
    }
  }

  // Manual generation or fallback - Updated to include use_case
  // Format: MODEL+NUMWELLS-KIND-USECASE-VERSION+COLORCODE-COUNTER
  // Example: "RTPCR25PIV-LDI-V5W-00072"
  const modelStr = model || ''
  const numWellsStr = num_wells || ''
  const kindStr = kind || ''
  const useCaseStr = use_case || ''
  const versionStr = version || ''
  const colorCodeStr = color_code || ''
  const counterStr = counter.toString().padStart(5, '0')
  
  // Build serial number with use_case included
  return `${modelStr}${numWellsStr}-${kindStr}-${useCaseStr}-${versionStr}${colorCodeStr}-${counterStr}`
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, action, reason, updated_by = 'manual' } = body

    if (!id || !action) {
      return NextResponse.json({ error: 'ID and action are required' }, { status: 400 })
    }

    const db = getDatabase()

    if (action === 'deprecate') {
      // Deprecate serial number
      const result = db.prepare(`
        UPDATE serial_number_registry 
        SET status = 'deprecated', 
            deprecated_at = datetime('now'),
            deprecated_by = ?,
            deprecated_reason = ?,
            updated_by = ?
        WHERE id = ?
      `).run(updated_by, reason, updated_by, id)

      if (result.changes === 0) {
        return NextResponse.json({ error: 'Serial number not found' }, { status: 404 })
      }

      return NextResponse.json({ success: true, action: 'deprecated' })
    }

    if (action === 'reactivate') {
      // Reactivate serial number
      const result = db.prepare(`
        UPDATE serial_number_registry 
        SET status = 'active',
            deprecated_at = NULL,
            deprecated_by = NULL,
            deprecated_reason = NULL,
            updated_by = ?
        WHERE id = ?
      `).run(updated_by, id)

      if (result.changes === 0) {
        return NextResponse.json({ error: 'Serial number not found' }, { status: 404 })
      }

      return NextResponse.json({ success: true, action: 'reactivated' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Error updating serial number:', error)
    return NextResponse.json({ 
      error: 'Failed to update serial number', 
      details: error.message 
    }, { status: 500 })
  }
}