"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { parseProductsCSV, formatProductsCSV, type ProductRow, parseDynamicUpdateCSV, validateDynamicUpdateCSV, validUpdateFields } from "@/lib/csv-utils"
import { sqliteHelpers } from "@/lib/database/sqlite"
import { revalidatePath } from "next/cache"

export async function exportProductsToCSV() {
  try {
    const supabase = createServerSupabaseClient()

    // Fetch all products directly from Supabase
    const { data, error } = await supabase.from("products").select("*")

    if (error) {
      console.error("Supabase error:", error)
      return { error: error.message }
    }

    if (!data || data.length === 0) {
      return { csvContent: formatProductsCSV([]), count: 0 }
    }

    // Format products as CSV
    const csvContent = formatProductsCSV(data)

    return { csvContent, count: data.length }
  } catch (error: any) {
    console.error("Error exporting products:", error)
    return { error: error.message || "An unexpected error occurred" }
  }
}

export async function importProductsFromCSV(formData: FormData) {
  try {
    const csvFile = formData.get("csvFile") as File

    if (!csvFile) {
      return { error: "No CSV file provided" }
    }

    // Read file content
    const csvText = await csvFile.text()

    // Parse CSV data
    const { data: products, errors: parseErrors } = parseProductsCSV(csvText)

    if (parseErrors.length > 0) {
      return {
        error: "CSV parsing errors",
        details: parseErrors.map((e) => `Row ${e.row}: ${e.message}`).join(", "),
      }
    }

    // Validate products
    const validationErrors = validateProducts(products)
    if (validationErrors.length > 0) {
      return {
        error: "Validation errors",
        details: validationErrors,
      }
    }

    // Import products
    const supabase = createServerSupabaseClient()
    const now = new Date().toISOString()

    const { error } = await supabase.from("products").insert(
      products.map((product) => ({
        ...product,
        created_at: now,
        updated_at: now,
      })),
    )

    if (error) {
      console.error("Supabase insert error:", error)
      return { error: error.message }
    }

    // Revalidate paths to reflect new data
    revalidatePath("/products")
    revalidatePath("/dashboard")
    revalidatePath("/parts")
    revalidatePath("/consumables")
    revalidatePath("/equipment")

    return {
      success: true,
      importedCount: products.length,
    }
  } catch (error: any) {
    console.error("Error importing products:", error)
    return { error: error.message || "An unexpected error occurred" }
  }
}

// Validate products before import
function validateProducts(products: ProductRow[]): string[] {
  const errors: string[] = []
  
  // Get default unit for fallback
  const defaultUnitId = sqliteHelpers.resolveUnitId('UNITS')

  products.forEach((product, index) => {
    if (!product.name) {
      errors.push(`Row ${index + 1}: Name is required`)
    }

    if (typeof product.price !== "number" || product.price <= 0) {
      errors.push(`Row ${index + 1}: Price must be a positive number`)
    }

    if (!product.category) {
      errors.push(`Row ${index + 1}: Category is required`)
    }
    
    // Validate and resolve unit_id if provided (support both names and UUIDs)
    if (product.unit_id) {
      if (!sqliteHelpers.isValidUnitReference(product.unit_id)) {
        errors.push(`Row ${index + 1}: Invalid unit_id '${product.unit_id}'. Must be a valid unit name or ID.`)
      } else {
        // Convert unit name to UUID if necessary
        const resolvedUnitId = sqliteHelpers.resolveUnitId(product.unit_id)
        if (resolvedUnitId) {
          product.unit_id = resolvedUnitId
        }
      }
    }
    
    // Assign default unit if not provided
    if (!product.unit_id && defaultUnitId) {
      product.unit_id = defaultUnitId
    }
  })

  return errors
}

// SQLite-based alternative functions
export async function exportProductsToCSVSQLite() {
  try {
    // Fetch all products from SQLite
    const products = sqliteHelpers.getAllProducts()

    if (!products || products.length === 0) {
      return { csvContent: formatProductsCSV([]), count: 0 }
    }

    // Format products as CSV
    const csvContent = formatProductsCSV(products)

    return { csvContent, count: products.length }
  } catch (error: any) {
    console.error("Error exporting products:", error)
    return { error: error.message || "An unexpected error occurred" }
  }
}

export async function importProductsFromCSVSQLite(formData: FormData) {
  try {
    const csvFile = formData.get("csvFile") as File

    if (!csvFile) {
      return { error: "No CSV file provided" }
    }

    // Read file content
    const csvText = await csvFile.text()

    // Parse CSV data
    const { data: products, errors: parseErrors } = parseProductsCSV(csvText)

    if (parseErrors.length > 0) {
      return {
        error: "CSV parsing errors",
        details: parseErrors.map((e) => `Row ${e.row}: ${e.message}`).join(", "),
      }
    }

    // Validate products
    const validationErrors = validateProducts(products)
    if (validationErrors.length > 0) {
      return {
        error: "Validation errors",
        details: validationErrors,
      }
    }

    // Import products using SQLite
    let importedCount = 0
    const errors: string[] = []
    
    for (const product of products) {
      try {
        sqliteHelpers.createProduct(product)
        importedCount++
      } catch (error: any) {
        errors.push(`Failed to import product "${product.name}": ${error.message}`)
      }
    }

    if (errors.length > 0 && importedCount === 0) {
      return { error: "Failed to import any products", details: errors }
    }

    // Revalidate paths to reflect new data
    revalidatePath("/products")
    revalidatePath("/dashboard")
    revalidatePath("/parts")
    revalidatePath("/consumables")
    revalidatePath("/equipment")

    return {
      success: true,
      importedCount,
      warnings: errors.length > 0 ? errors : undefined
    }
  } catch (error: any) {
    console.error("Error importing products:", error)
    return { error: error.message || "An unexpected error occurred" }
  }
}

