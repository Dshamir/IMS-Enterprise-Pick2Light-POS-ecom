"use server"

import { parseDynamicUpdateCSV, validateDynamicUpdateCSV, validUpdateFields } from "@/lib/csv-utils"
import { sqliteHelpers } from "@/lib/database/sqlite"
import { revalidatePath } from "next/cache"
import { logDynamicUpdate, generateAuditMessage } from "@/lib/audit-log"

export async function dynamicUpdateProductsFromCSV(formData: FormData) {
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
    const validation = validateDynamicUpdateCSV(csvText)
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
    const { data: csvData, errors: parseErrors, validUpdateFields: updateFields, invalidFields } = parseDynamicUpdateCSV(csvText)

    if (parseErrors.length > 0) {
      return {
        error: "CSV parsing errors",
        details: parseErrors.map((e) => `Row ${e.row}: ${e.message}`),
      }
    }

    // Prepare update data with intelligent unit_id handling
    const updateData = csvData.map((row) => {
      const barcode = row.barcode
      const updates: Record<string, any> = {}

      // Only include valid update fields that exist in the CSV
      for (const field of updateFields) {
        if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
          // Special handling for unit_id - support both name and UUID formats
          if (field === 'unit_id') {
            // Validate and resolve unit name or ID to actual UUID
            if (!sqliteHelpers.isValidUnitReference(row[field])) {
              // Skip invalid unit_id updates
              continue
            }
            
            // Convert unit name to UUID if necessary
            const resolvedUnitId = sqliteHelpers.resolveUnitId(row[field])
            if (resolvedUnitId) {
              updates[field] = resolvedUnitId
            } else {
              // This shouldn't happen if validation passed, but safety check
              continue
            }
          } else {
            updates[field] = row[field]
          }
        }
      }

      return { barcode, updates }
    }).filter(item => item.barcode && Object.keys(item.updates).length > 0)

    if (updateData.length === 0) {
      return {
        error: "No valid data to update",
        details: ["CSV contains no rows with valid barcode and update fields"]
      }
    }

    // Perform dynamic updates using SQLite
    const results = sqliteHelpers.dynamicUpdateProducts(updateData)

    // Collect warnings about invalid fields
    const warnings: string[] = []
    if (invalidFields.length > 0) {
      warnings.push(`Ignored invalid fields: ${invalidFields.join(', ')}`)
    }

    // Generate audit message and log the operation
    const auditInfo = generateAuditMessage(results.updated, results.failed, filename)
    await logDynamicUpdate({
      filename,
      status: auditInfo.status,
      message: auditInfo.message,
      details: auditInfo.details,
      updatedCount: results.updated,
      failedCount: results.failed,
      errors: results.errors
    })

    // Revalidate paths to reflect new data
    revalidatePath("/products")
    revalidatePath("/dashboard")
    revalidatePath("/parts")
    revalidatePath("/consumables")
    revalidatePath("/equipment")

    return {
      success: true,
      updatedCount: results.updated,
      failedCount: results.failed,
      errors: results.errors,
      warnings: warnings.length > 0 ? warnings : undefined,
      filename, // Include filename in response for UI
    }
  } catch (error: any) {
    console.error("Error in dynamic update:", error)
    await logDynamicUpdate({
      filename,
      status: 'error',
      message: 'Unexpected error occurred',
      details: error.message || 'Unknown error'
    })
    return { error: error.message || "An unexpected error occurred" }
  }
}