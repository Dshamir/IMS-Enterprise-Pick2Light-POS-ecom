import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/sqlite'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Read Excel file
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
    
    if (jsonData.length === 0) {
      return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 })
    }

    // Get headers from first row
    const headers = jsonData[0] as string[]
    const dataRows = jsonData.slice(1) as any[][]

    console.log('Excel headers:', headers)
    console.log('Data rows count:', dataRows.length)

    const db = getDatabase()
    let importedCount = 0
    let skippedCount = 0
    const errors: string[] = []

    // Process each row
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      const rowNumber = i + 2 // +2 because we skipped header and Excel rows start at 1

      try {
        // Map Excel columns to database fields based on actual Excel structure
        // A=Model, B=SN, C=P/N, D=COUNTER, E=KIND, F=USE, G=NUM_WELLS, H=BATCH/CHEM, I=COLOR_CODE, J=COLOR, K=PRODUCTION_YEAR, L=APPLICATION, M=MACHINE_NAME, N=NOTE, O=VERSION
        const model = row[0] || ''; // Column A
        const existingSerial = row[1] || ''; // Column B (existing serial number)
        const partNumber = row[2] || ''; // Column C
        const counter = parseInt(row[3]) || (i + 1); // Column D
        const kind = row[4] || ''; // Column E
        const use_case = row[5] || ''; // Column F
        const num_wells = row[6] || ''; // Column G
        const batch_chem = row[7] || ''; // Column H
        const color_code = row[8] || ''; // Column I
        const color = row[9] || ''; // Column J
        const production_year = parseInt(row[10]) || null; // Column K
        const application = row[11] || ''; // Column L
        const machine_name = row[12] || ''; // Column M
        const note = row[13] || ''; // Column N
        const version = row[14] || ''; // Column O
        
        // Generate serial number in format: MODEL+NUMWELLS-KIND-VERSION+COLORCODE-COUNTER
        // Example: "RTPCR25PIV-RTPCR-V5W-00072"
        const serialNumber = `${model}${num_wells}-${kind}-${version}${color_code}-${counter.toString().padStart(5, '0')}`;
        
        const serialData = {
          serial_number: serialNumber,
          counter: counter,
          model: model,
          kind: kind,
          use_case: use_case,
          version: version,
          production_year: production_year,
          num_wells: num_wells,
          application: application,
          machine_name: machine_name,
          note: note,
          input_specs: batch_chem, // Using batch/chem as input specs
          color_code: color_code,
          color: color,
          self_test_by: '',
          calibrated_by: '',
          used_by: '',
          calibration_date: '',
          recalibration_date: '',
          status: 'active',
          imported_from_excel: 1,
          excel_row_number: rowNumber,
          created_by: 'excel_import',
          updated_by: 'excel_import'
        }

        // Skip empty rows (check if model and counter are empty)
        if (!model.trim() || !counter) {
          skippedCount++
          continue
        }

        // Check if serial number already exists
        const existing = db.prepare(`
          SELECT id FROM serial_number_registry WHERE serial_number = ?
        `).get(serialData.serial_number)

        if (existing) {
          console.log(`Skipping duplicate serial number: ${serialData.serial_number}`)
          skippedCount++
          continue
        }

        // Insert into database
        db.prepare(`
          INSERT INTO serial_number_registry (
            serial_number, counter, model, kind, use_case, version, production_year,
            num_wells, application, machine_name, note, input_specs, color_code, color,
            self_test_by, calibrated_by, used_by, calibration_date, recalibration_date,
            status, imported_from_excel, excel_row_number, created_by, updated_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          serialData.serial_number,
          serialData.counter,
          serialData.model,
          serialData.kind,
          serialData.use_case,
          serialData.version,
          serialData.production_year,
          serialData.num_wells,
          serialData.application,
          serialData.machine_name,
          serialData.note,
          serialData.input_specs,
          serialData.color_code,
          serialData.color,
          serialData.self_test_by,
          serialData.calibrated_by,
          serialData.used_by,
          serialData.calibration_date,
          serialData.recalibration_date,
          serialData.status,
          serialData.imported_from_excel,
          serialData.excel_row_number,
          serialData.created_by,
          serialData.updated_by
        )

        importedCount++
      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error)
        errors.push(`Row ${rowNumber}: ${error.message}`)
      }
    }

    // Get next available counter
    const nextCounter = db.prepare(`
      SELECT next_counter FROM v_next_available_counter
    `).get()

    const result = {
      success: true,
      imported: importedCount,
      skipped: skippedCount,
      errors: errors,
      nextCounter: nextCounter?.next_counter || 1,
      totalRows: dataRows.length
    }

    console.log('Import result:', result)
    return NextResponse.json(result)

  } catch (error) {
    console.error('Error importing Excel file:', error)
    return NextResponse.json({ 
      error: 'Failed to import Excel file', 
      details: error.message 
    }, { status: 500 })
  }
}

// Helper function to extract counter from serial number
function extractCounterFromSerial(serialNumber: string): number {
  // Try to extract the last numeric part from the serial number
  const match = serialNumber.match(/(\d+)(?!.*\d)/);
  return match ? parseInt(match[1]) : 0;
}

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase()
    
    // Get current registry statistics
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_serials,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_serials,
        COUNT(CASE WHEN status = 'deprecated' THEN 1 END) as deprecated_serials,
        COUNT(CASE WHEN imported_from_excel = 1 THEN 1 END) as imported_serials,
        MAX(counter) as highest_counter
      FROM serial_number_registry
    `).get()

    const nextCounter = db.prepare(`
      SELECT next_counter FROM v_next_available_counter
    `).get()

    return NextResponse.json({
      stats,
      nextCounter: nextCounter?.next_counter || 1
    })

  } catch (error) {
    console.error('Error getting registry stats:', error)
    return NextResponse.json({ error: 'Failed to get registry stats' }, { status: 500 })
  }
}