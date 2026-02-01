import Papa from "papaparse"

// Define the CSV headers for serial number dynamic updates
export const serialNumberHeaders = [
  "serial_number", // Required identifier field (equivalent to barcode for products)
  "counter",
  "model",
  "kind", 
  "use_case",
  "version",
  "production_year",
  "num_wells",
  "application",
  "machine_name",
  "note",
  "input_specs",
  "color_code",
  "color",
  "self_test_by",
  "calibrated_by", 
  "used_by",
  "calibration_date",
  "recalibration_date",
  "status"
]

// Define valid fields that can be updated (excluding id, timestamps, and assignment fields)
export const validSerialUpdateFields = [
  "counter",
  "model",
  "kind", 
  "use_case",
  "version",
  "production_year",
  "num_wells",
  "application",
  "machine_name",
  "note",
  "input_specs",
  "color_code",
  "color",
  "self_test_by",
  "calibrated_by", 
  "used_by",
  "calibration_date",
  "recalibration_date",
  "status"
]

// Validate CSV structure for dynamic serial number updates
export function validateSerialNumberDynamicUpdateCSV(csvText: string): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    // Parse CSV to check structure
    const result = Papa.parse<any>(csvText, {
      header: true,
      skipEmptyLines: true,
      preview: 5, // Only check first few rows for validation
    })

    if (result.errors.length > 0) {
      errors.push(...result.errors.map(e => `Parse error: ${e.message}`))
    }

    if (result.data.length === 0) {
      errors.push("CSV file is empty or contains no valid data rows")
      return { isValid: false, errors, warnings }
    }

    // Check for required serial_number field
    const headers = Object.keys(result.data[0] || {})
    if (!headers.includes('serial_number')) {
      errors.push("CSV must contain a 'serial_number' column as the identifier field")
    }

    // Check for at least one valid update field
    const validUpdateFields = headers.filter(h => validSerialUpdateFields.includes(h))
    if (validUpdateFields.length === 0) {
      errors.push(`CSV must contain at least one valid update field. Valid fields: ${validSerialUpdateFields.join(', ')}`)
    }

    // Check for invalid fields (warn but don't error)
    const invalidFields = headers.filter(h => 
      h !== 'serial_number' && !validSerialUpdateFields.includes(h)
    )
    if (invalidFields.length > 0) {
      warnings.push(`These fields will be ignored: ${invalidFields.join(', ')}`)
    }

    // Validate serial_number field has values
    const emptySerialNumbers = result.data.filter(row => !row.serial_number || row.serial_number.trim() === '')
    if (emptySerialNumbers.length > 0) {
      errors.push(`${emptySerialNumbers.length} rows have empty serial_number values`)
    }

  } catch (error) {
    errors.push(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Parse CSV for dynamic serial number updates
export function parseSerialNumberDynamicUpdateCSV(csvText: string): {
  data: Array<{serial_number: string; [key: string]: any}>
  errors: Array<{row: number; message: string}>
  validUpdateFields: string[]
  invalidFields: string[]
} {
  const errors: Array<{row: number; message: string}> = []
  
  try {
    // Parse CSV
    const result = Papa.parse<any>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    })

    if (result.errors.length > 0) {
      result.errors.forEach((error, index) => {
        errors.push({
          row: error.row || index + 1,
          message: error.message
        })
      })
    }

    // Get headers and classify them
    const headers = Object.keys(result.data[0] || {})
    const validUpdateFields = headers.filter(h => validSerialUpdateFields.includes(h))
    const invalidFields = headers.filter(h => 
      h !== 'serial_number' && !validSerialUpdateFields.includes(h)
    )

    // Process and validate each row
    const processedData: Array<{serial_number: string; [key: string]: any}> = []
    
    result.data.forEach((row, index) => {
      const rowNumber = index + 2 // +2 because CSV rows start at 2 (header is row 1)
      
      // Check for required serial_number
      if (!row.serial_number || row.serial_number.trim() === '') {
        errors.push({
          row: rowNumber,
          message: "Missing or empty serial_number"
        })
        return
      }

      // Clean and validate the row data
      const cleanRow: {serial_number: string; [key: string]: any} = {
        serial_number: row.serial_number.trim()
      }

      // Process valid update fields
      validUpdateFields.forEach(field => {
        const value = row[field]
        if (value !== undefined && value !== null && value !== '') {
          // Type conversion based on field
          if (field === 'counter' || field === 'production_year' || field === 'num_wells') {
            const numValue = parseInt(String(value))
            if (isNaN(numValue)) {
              errors.push({
                row: rowNumber,
                message: `Invalid numeric value for ${field}: ${value}`
              })
            } else {
              cleanRow[field] = numValue
            }
          } else if (field === 'status') {
            // Validate status values
            const validStatuses = ['active', 'deprecated', 'assigned']
            if (!validStatuses.includes(String(value).toLowerCase())) {
              errors.push({
                row: rowNumber,
                message: `Invalid status value: ${value}. Must be one of: ${validStatuses.join(', ')}`
              })
            } else {
              cleanRow[field] = String(value).toLowerCase()
            }
          } else {
            // String fields
            cleanRow[field] = String(value).trim()
          }
        }
      })

      // Only add row if it has the identifier and at least one update field
      const updateFieldCount = Object.keys(cleanRow).length - 1 // Exclude serial_number
      if (updateFieldCount > 0) {
        processedData.push(cleanRow)
      } else {
        errors.push({
          row: rowNumber,
          message: "No valid update fields found in this row"
        })
      }
    })

    return {
      data: processedData,
      errors,
      validUpdateFields,
      invalidFields
    }

  } catch (error) {
    errors.push({
      row: 1,
      message: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
    
    return {
      data: [],
      errors,
      validUpdateFields: [],
      invalidFields: []
    }
  }
}

// Format serial numbers for CSV export
export function formatSerialNumbersCSV(serialNumbers: any[]): string {
  // Transform serial numbers to match CSV format
  const csvData = serialNumbers.map((serial) => ({
    serial_number: serial.serial_number || '',
    counter: serial.counter || 0,
    model: serial.model || '',
    kind: serial.kind || '',
    use_case: serial.use_case || '',
    version: serial.version || '',
    production_year: serial.production_year || '',
    num_wells: serial.num_wells || '',
    application: serial.application || '',
    machine_name: serial.machine_name || '',
    note: serial.note || '',
    input_specs: serial.input_specs || '',
    color_code: serial.color_code || '',
    color: serial.color || '',
    self_test_by: serial.self_test_by || '',
    calibrated_by: serial.calibrated_by || '',
    used_by: serial.used_by || '',
    calibration_date: serial.calibration_date || '',
    recalibration_date: serial.recalibration_date || '',
    status: serial.status || 'active'
  }))

  // Convert to CSV string
  return Papa.unparse(csvData, {
    header: true,
    columns: serialNumberHeaders
  })
}

// Generate example CSV template for serial number updates
export function generateSerialNumberUpdateTemplate(): string {
  const exampleData = [
    {
      serial_number: 'RTPCR25PIV-RTPCR-2507V5W-LAB-00001',
      model: 'RTPCR25',
      kind: 'RTPCR',
      status: 'active',
      application: 'Testing',
      machine_name: 'PCR-001'
    },
    {
      serial_number: 'RTPCR25PIV-RTPCR-2507V5W-LAB-00002', 
      model: 'RTPCR25',
      kind: 'RTPCR',
      status: 'deprecated',
      application: 'Laboratory',
      machine_name: 'PCR-002'
    }
  ]

  return Papa.unparse(exampleData, {
    header: true
  })
}