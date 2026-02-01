import Papa from "papaparse"
import type { Database } from "./database.types"

export type ProductRow = Omit<
  Database["public"]["Tables"]["products"]["Insert"],
  "id" | "created_at" | "updated_at" | "feature_vector"
>

// Define the CSV headers (matching your actual CSV format)
export const productHeaders = [
  "barcode",
  "description", 
  "category",
  "name",
  "mfgname",
  "mfgnum",
  "price",
  "Location",
  "loc_tag",
  "stock_quantity",
  "min_stock_level",
  "max_stock_level",
  "reorder_quantity",
  "distributor",
  "image_url",
  "Product_url_1",
  "Product_url_2",
  "Product_url_3",
  "unit_id",
]

// Parse CSV text to product data
export function parseProductsCSV(csvText: string): {
  data: ProductRow[]
  errors: Papa.ParseError[]
} {
  const result = Papa.parse<any>(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: {
      price: true,
      stock_quantity: true,
      min_stock_level: true,
      max_stock_level: true,
      reorder_quantity: true,
    },
    transformHeader: (header) => header.trim(),
  })

  // Map parsed data to product structure
  const products: ProductRow[] = result.data.map((row) => ({
    name: row.name || "",
    description: row.description || null,
    price: typeof row.price === "number" ? row.price : 0,
    stock_quantity: typeof row.stock_quantity === "number" ? row.stock_quantity : 0,
    min_stock_level: typeof row.min_stock_level === "number" ? row.min_stock_level : 0,
    max_stock_level: typeof row.max_stock_level === "number" ? row.max_stock_level : 0,
    reorder_quantity: typeof row.reorder_quantity === "number" ? row.reorder_quantity : 0,
    category: row.category || "equipment",
    barcode: row.barcode || null,
    image_url: row.image_url || null,
    mfgname: row.mfgname || null,
    mfgnum: row.mfgnum || null,
    Location: row.Location || null,
    loc_tag: row.loc_tag || null,
    distributor: row.distributor || null,
    Product_url_1: row.Product_url_1 || null,
    Product_url_2: row.Product_url_2 || null,
    Product_url_3: row.Product_url_3 || null,
    unit_id: row.unit_id || null,
  }))

  return {
    data: products,
    errors: result.errors,
  }
}

// Convert product data to CSV format
export function formatProductsCSV(products: any[]): string {
  // Filter and transform products to match CSV format
  const csvData = products.map((product) => ({
    barcode: product.barcode || "",
    description: product.description || "",
    category: product.category,
    name: product.name,
    mfgname: product.mfgname || "",
    mfgnum: product.mfgnum || "",
    price: product.price,
    Location: product.Location || "",
    loc_tag: product.loc_tag || "",
    stock_quantity: product.stock_quantity,
    min_stock_level: product.min_stock_level || 0,
    max_stock_level: product.max_stock_level || 0,
    reorder_quantity: product.reorder_quantity || 0,
    distributor: product.distributor || "",
    image_url: product.image_url || "",
    Product_url_1: product.Product_url_1 || "",
    Product_url_2: product.Product_url_2 || "",
    Product_url_3: product.Product_url_3 || "",
    unit_id: product.unit_id || "",
  }))

  return Papa.unparse(csvData, {
    header: true,
    columns: productHeaders,
  })
}

// Define valid updateable fields (excluding id, created_at, updated_at, feature_vector)
export const validUpdateFields = [
  "description", "category", "name", "mfgname", "mfgnum", "price", 
  "Location", "loc_tag", "stock_quantity", "min_stock_level", 
  "max_stock_level", "reorder_quantity", "distributor", "image_url", 
  "Product_url_1", "Product_url_2", "Product_url_3", "unit_id"
]

// Parse CSV for dynamic updates
export function parseDynamicUpdateCSV(csvText: string): {
  data: any[]
  errors: Papa.ParseError[]
  headers: string[]
  validUpdateFields: string[]
  invalidFields: string[]
} {
  const result = Papa.parse<any>(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: {
      price: true,
      stock_quantity: true,
      min_stock_level: true,
      max_stock_level: true,
      reorder_quantity: true,
    },
    transformHeader: (header) => header.trim(),
  })

  const headers = result.meta.fields || []
  
  // Check which headers are valid for updates (excluding barcode which is used for matching)
  const updateFields = headers.filter(h => h !== 'barcode')
  const validFields = updateFields.filter(field => validUpdateFields.includes(field))
  const invalidFields = updateFields.filter(field => !validUpdateFields.includes(field))

  return {
    data: result.data,
    errors: result.errors,
    headers,
    validUpdateFields: validFields,
    invalidFields
  }
}

// Validate dynamic update CSV requirements
export function validateDynamicUpdateCSV(csvText: string): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    const parseResult = parseDynamicUpdateCSV(csvText)
    const { headers, validUpdateFields, invalidFields } = parseResult

    // Check if barcode column exists
    if (!headers.includes('barcode')) {
      errors.push("CSV must contain a 'barcode' column for matching existing products")
    }

    // Check if there are any valid update fields
    if (validUpdateFields.length === 0) {
      errors.push("CSV must contain at least one valid updateable field")
    }

    // Warn about invalid fields
    if (invalidFields.length > 0) {
      warnings.push(`The following fields will be ignored: ${invalidFields.join(', ')}`)
    }

    // Check for empty CSV
    if (parseResult.data.length === 0) {
      errors.push("CSV file appears to be empty or contains no valid data rows")
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  } catch (error) {
    return {
      isValid: false,
      errors: ["Failed to parse CSV file. Please check the file format."],
      warnings: []
    }
  }
}

