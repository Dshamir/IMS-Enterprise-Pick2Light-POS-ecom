import { NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

/**
 * POST /api/wled/import-csv
 *
 * Bulk import LED segment assignments from CSV
 *
 * CSV Format:
 * product_sku,warehouse_code,zone_name,device_ip,start_led,led_count,location_color,use_device_defaults
 *
 * Process:
 * 1. Parse CSV file
 * 2. Validate each row (product exists, device exists, LED range available)
 * 3. Resolve warehouse/zone/device IDs
 * 4. Insert into led_import_staging table
 * 5. Process valid rows: create LED segments
 * 6. Return detailed import report
 */
export async function POST(request: Request) {
  const startTime = Date.now()

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const autoCreateLocations = formData.get('autoCreateLocations') === 'true' // Create warehouses/zones if missing

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Invalid file type. Must be CSV file.' },
        { status: 400 }
      )
    }

    // Parse CSV
    const csvText = await file.text()
    const lines = csvText.split(/\r?\n/).filter(line => line.trim())

    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV file is empty or missing data rows' },
        { status: 400 }
      )
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim().toLowerCase())

    // Validate required columns
    const requiredColumns = ['product_sku', 'device_ip', 'start_led']
    const missingColumns = requiredColumns.filter(col => !header.includes(col))

    if (missingColumns.length > 0) {
      return NextResponse.json(
        {
          error: 'Missing required columns',
          missing: missingColumns,
          found: header,
          required: requiredColumns
        },
        { status: 400 }
      )
    }

    // Generate batch ID
    const batchId = `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Parse data rows
    const parsedRows = []
    const parseErrors = []

    for (let i = 1; i < lines.length; i++) {
      const rowNum = i + 1
      const values = lines[i].split(',').map(v => v.trim())

      if (values.length !== header.length) {
        parseErrors.push({
          row: rowNum,
          error: `Column count mismatch. Expected ${header.length}, got ${values.length}`
        })
        continue
      }

      // Build row object
      const row: any = { row_number: rowNum }
      header.forEach((col, idx) => {
        row[col] = values[idx] || null
      })

      // Parse numeric fields
      row.start_led = parseInt(row.start_led) || 0
      row.led_count = parseInt(row.led_count) || 12
      row.use_device_defaults = row.use_device_defaults !== '0' && row.use_device_defaults !== 'false'

      parsedRows.push(row)
    }

    console.log(`📥 Parsed ${parsedRows.length} rows from CSV (${parseErrors.length} parse errors)`)

    // Insert into staging table
    const stagingResult = sqliteHelpers.createImportBatch(batchId, parsedRows)

    if (!stagingResult.success) {
      return NextResponse.json(
        { error: 'Failed to create import batch', details: stagingResult.error },
        { status: 500 }
      )
    }

    // Validate each row
    const validationResults = []
    const stagingRows = sqliteHelpers.getImportBatchRows(batchId)

    for (const stagingRow of stagingRows) {
      const errors = []
      const warnings = []
      const resolvedIds: any = {}

      // Validate product exists
      const product = sqliteHelpers.getProductBySku(stagingRow.product_sku)
      if (!product) {
        errors.push(`Product SKU "${stagingRow.product_sku}" not found`)
      } else {
        resolvedIds.product_id = product.id
      }

      // Validate device exists (by IP address)
      const device = sqliteHelpers.getWLEDDeviceByIP(stagingRow.device_ip)
      if (!device) {
        errors.push(`WLED device with IP "${stagingRow.device_ip}" not found`)
      } else {
        resolvedIds.device_id = device.id

        // Validate LED range
        if (stagingRow.start_led + stagingRow.led_count > device.total_leds) {
          errors.push(`LED range (${stagingRow.start_led}-${stagingRow.start_led + stagingRow.led_count - 1}) exceeds device capacity (${device.total_leds} LEDs)`)
        }

        // Check for overlaps
        const validation = sqliteHelpers.validateLEDSegmentRange(
          device.id,
          stagingRow.start_led,
          stagingRow.led_count,
          resolvedIds.product_id
        )

        if (!validation.valid) {
          errors.push(validation.message)
        }

        // Check if product already has segment on this device
        const existingSegments = sqliteHelpers.getLEDSegmentsByProductId(resolvedIds.product_id)
        const duplicateOnDevice = existingSegments.find((seg: any) => seg.wled_device_id === device.id)
        if (duplicateOnDevice) {
          warnings.push(`Product already has LED segment on device "${device.device_name}"`)
        }
      }

      // Resolve warehouse
      if (stagingRow.warehouse_code) {
        const warehouse = sqliteHelpers.getWarehouseByCode(stagingRow.warehouse_code)
        if (!warehouse) {
          if (autoCreateLocations) {
            warnings.push(`Warehouse "${stagingRow.warehouse_code}" will be auto-created`)
          } else {
            errors.push(`Warehouse "${stagingRow.warehouse_code}" not found`)
          }
        } else {
          resolvedIds.warehouse_id = warehouse.id
        }
      }

      // Resolve zone
      if (stagingRow.zone_name && resolvedIds.warehouse_id) {
        const zones = sqliteHelpers.getZonesByWarehouse(resolvedIds.warehouse_id)
        const zone = zones.find((z: any) => z.zone_name === stagingRow.zone_name)
        if (!zone) {
          if (autoCreateLocations) {
            warnings.push(`Zone "${stagingRow.zone_name}" will be auto-created`)
          } else {
            warnings.push(`Zone "${stagingRow.zone_name}" not found in warehouse`)
          }
        } else {
          resolvedIds.zone_id = zone.id
        }
      }

      // Update staging row with validation results
      const status = errors.length > 0 ? 'invalid' : (warnings.length > 0 ? 'warning' : 'valid')
      sqliteHelpers.updateImportRowValidation(
        stagingRow.id,
        status,
        errors.length > 0 ? errors : null,
        warnings.length > 0 ? warnings : null,
        resolvedIds
      )

      validationResults.push({
        row: stagingRow.row_number,
        product_sku: stagingRow.product_sku,
        status,
        errors,
        warnings
      })
    }

    // Get validation statistics
    const stats = sqliteHelpers.getImportBatchStats(batchId)

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      message: 'CSV validation complete',
      batch_id: batchId,
      statistics: {
        total_rows: stats.total,
        valid: stats.valid,
        invalid: stats.invalid,
        warnings: stats.warning,
        processed: 0
      },
      validation_results: validationResults,
      duration_ms: duration,
      parse_errors: parseErrors,
      next_step: 'Call POST /api/wled/import-csv/process with batch_id to create segments'
    })

  } catch (error: any) {
    console.error('❌ Error in CSV import:', error)
    return NextResponse.json(
      {
        error: 'CSV import failed',
        message: error.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/wled/import-csv?batch_id=xxx
 *
 * Get status of an import batch
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get('batch_id')

    if (!batchId) {
      return NextResponse.json(
        { error: 'batch_id parameter required' },
        { status: 400 }
      )
    }

    const stats = sqliteHelpers.getImportBatchStats(batchId)
    const rows = sqliteHelpers.getImportBatchRows(batchId)

    return NextResponse.json({
      batch_id: batchId,
      statistics: stats,
      rows: rows.map(r => ({
        row_number: r.row_number,
        product_sku: r.product_sku,
        device_ip: r.device_ip,
        validation_status: r.validation_status,
        validation_errors: r.validation_errors ? JSON.parse(r.validation_errors) : [],
        validation_warnings: r.validation_warnings ? JSON.parse(r.validation_warnings) : [],
        processed: r.processed === 1
      }))
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get batch status', message: error.message },
      { status: 500 }
    )
  }
}
