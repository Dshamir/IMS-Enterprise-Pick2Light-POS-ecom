"use server"

import { parseSerialNumberDynamicUpdateCSV, validateSerialNumberDynamicUpdateCSV, validSerialUpdateFields } from "@/lib/serial-csv-utils"
import { getDatabase } from "@/lib/database/sqlite"
import { revalidatePath } from "next/cache"
import { logDynamicUpdate, generateAuditMessage } from "@/lib/audit-log"

export async function dynamicUpdateSerialNumbersFromCSV(formData: FormData) {
  const csvFile = formData.get("csvFile") as File
  const filename = csvFile?.name || 'unknown.csv'
  
  try {
    if (!csvFile) {
      await logDynamicUpdate({
        filename: 'N/A',
        status: 'error',
        message: 'No CSV file provided',
        details: 'File upload failed'
      })
      return { error: "No CSV file provided" }
    }

    // Read file content
    const csvText = await csvFile.text()

    // Validate CSV structure
    const validation = validateSerialNumberDynamicUpdateCSV(csvText)
    if (!validation.isValid) {
      await logDynamicUpdate({
        filename,
        status: 'error',
        message: 'CSV validation failed',
        details: validation.errors.join('; ')
      })
      return {
        error: "CSV validation failed",
        details: validation.errors,
      }
    }

    // Parse CSV for dynamic updates
    const { data: csvData, errors: parseErrors, validUpdateFields: updateFields, invalidFields } = parseSerialNumberDynamicUpdateCSV(csvText)

    if (parseErrors.length > 0) {
      return {
        error: "CSV parsing errors",
        details: parseErrors.map((e) => `Row ${e.row}: ${e.message}`),
      }
    }

    // Prepare update data
    const updateData = csvData.map((row) => {
      const serialNumber = row.serial_number
      const updates: Record<string, any> = {}

      // Only include valid update fields that exist in the CSV
      for (const field of updateFields) {
        if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
          updates[field] = row[field]
        }
      }

      return { serialNumber, updates }
    }).filter(item => item.serialNumber && Object.keys(item.updates).length > 0)

    if (updateData.length === 0) {
      return {
        error: "No valid data to update",
        details: ["CSV contains no rows with valid serial_number and update fields"]
      }
    }

    // Perform dynamic updates using SQLite
    const results = dynamicUpdateSerialNumbers(updateData)

    // Collect warnings about invalid fields
    const warnings: string[] = []
    if (invalidFields.length > 0) {
      warnings.push(`Ignored invalid fields: ${invalidFields.join(', ')}`)
    }

    // Generate audit message and log the operation
    const auditMessage = generateAuditMessage('dynamic_update_serial_numbers', {
      filename,
      totalRows: updateData.length,
      updated: results.updated,
      failed: results.failed,
      updateFields: updateFields
    })

    await logDynamicUpdate({
      filename,
      status: results.failed === 0 ? 'success' : 'partial_success',
      message: auditMessage,
      details: results.errors.length > 0 ? results.errors.join('; ') : undefined
    })

    // Revalidate the serial numbers page
    revalidatePath('/serial-numbers')

    return {
      success: true,
      updated: results.updated,
      failed: results.failed,
      errors: results.errors,
      warnings,
      filename
    }

  } catch (error) {
    console.error('Dynamic update error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    await logDynamicUpdate({
      filename,
      status: 'error',
      message: 'Dynamic update failed',
      details: errorMessage
    })
    
    return {
      error: "Failed to process dynamic update",
      details: [errorMessage]
    }
  }
}

// Database function to perform dynamic updates on serial numbers
function dynamicUpdateSerialNumbers(updateData: Array<{serialNumber: string; updates: Record<string, any>}>): {
  updated: number
  failed: number
  errors: string[]
} {
  const db = getDatabase()
  let updated = 0
  let failed = 0
  const errors: string[] = []

  // Begin transaction for atomic updates
  const transaction = db.transaction(() => {
    for (const { serialNumber, updates } of updateData) {
      try {
        // First check if serial number exists
        const existingSerial = db.prepare(
          'SELECT id, serial_number FROM serial_number_registry WHERE serial_number = ?'
        ).get(serialNumber)

        if (!existingSerial) {
          errors.push(`Serial number not found: ${serialNumber}`)
          failed++
          continue
        }

        // Build dynamic UPDATE query
        const updateFields = Object.keys(updates)
        const setClause = updateFields.map(field => `${field} = ?`).join(', ')
        const updateValues = updateFields.map(field => updates[field])

        // Update the serial number record
        const updateQuery = `
          UPDATE serial_number_registry 
          SET ${setClause}, updated_at = datetime('now'), updated_by = 'csv_import'
          WHERE serial_number = ?
        `
        
        const result = db.prepare(updateQuery).run(...updateValues, serialNumber)
        
        if (result.changes > 0) {
          updated++
        } else {
          errors.push(`Failed to update serial number: ${serialNumber}`)
          failed++
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Error updating ${serialNumber}: ${errorMsg}`)
        failed++
      }
    }
  })

  try {
    transaction()
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Transaction failed'
    errors.push(`Transaction error: ${errorMsg}`)
    return { updated: 0, failed: updateData.length, errors }
  }

  return { updated, failed, errors }
}

// Helper function to update a single serial number by serial_number
function updateSerialNumberBySerial(serialNumber: string, updates: Record<string, any>): boolean {
  const db = getDatabase()
  
  try {
    // Validate that only allowed fields are being updated
    const allowedFields = validSerialUpdateFields
    const updateFields = Object.keys(updates).filter(field => allowedFields.includes(field))
    
    if (updateFields.length === 0) {
      return false
    }

    // Build dynamic UPDATE query
    const setClause = updateFields.map(field => `${field} = ?`).join(', ')
    const updateValues = updateFields.map(field => updates[field])

    const updateQuery = `
      UPDATE serial_number_registry 
      SET ${setClause}, updated_at = datetime('now'), updated_by = 'system'
      WHERE serial_number = ?
    `
    
    const result = db.prepare(updateQuery).run(...updateValues, serialNumber)
    return result.changes > 0

  } catch (error) {
    console.error('Error updating serial number:', error)
    return false
  }
}