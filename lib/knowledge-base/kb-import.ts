/**
 * Knowledge Base Import System
 *
 * Handles parsing and importing data from XLSX, CSV, and DOC files.
 * Supports auto-detection of column mappings and batch import with embedding generation.
 */

import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import * as fs from 'fs'
import * as path from 'path'
import {
  createKBItemsBatch,
  createKBSource,
  updateKBSourceStatus,
  type KBItemInput
} from './kb-database'

// Column mapping definitions - maps KB fields to possible header names
export const COLUMN_MAPPING_ALIASES: Record<string, string[]> = {
  item_name: ['name', 'item', 'product', 'title', 'part name', 'description', 'item name', 'product name', 'part'],
  description: ['description', 'desc', 'details', 'notes', 'long description', 'item description'],
  manufacturer: ['manufacturer', 'mfg', 'brand', 'vendor', 'supplier', 'make', 'manufacturer name'],
  manufacturer_part_number: ['part number', 'part#', 'mfg#', 'pn', 'mpn', 'sku', 'manufacturer part number', 'mfg part#', 'part no', 'partnumber'],
  category: ['category', 'type', 'class', 'group', 'product type', 'item type', 'classification'],
  price_low: ['price', 'cost', 'unit price', 'price_low', 'min price', 'unit cost', 'purchase price', 'buy price'],
  price_high: ['msrp', 'list price', 'price_high', 'max price', 'retail price', 'sell price', 'suggested price'],
  barcode: ['barcode', 'upc', 'ean', 'gtin', 'upc code', 'ean code'],
  sku: ['sku', 'stock number', 'item code', 'product code', 'internal sku'],
  image_url: ['image', 'image url', 'picture', 'photo', 'image_url', 'picture url']
}

export interface ColumnMapping {
  [kbField: string]: string // maps KB field name to source column name
}

export interface ImportPreview {
  headers: string[]
  sampleRows: Record<string, any>[]
  suggestedMapping: ColumnMapping
  totalRows: number
}

export interface ImportResult {
  success: boolean
  sourceId: string
  itemsImported: number
  itemsWithPrice: number
  errors: string[]
}

/**
 * Parse an XLSX file and return raw data
 */
export function parseXLSXFile(buffer: Buffer): { headers: string[]; rows: Record<string, any>[]; sheetName: string } {
  const workbook = XLSX.read(buffer, { type: 'buffer' })

  // Use the first sheet
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]

  // Convert to JSON with header row
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' })

  if (jsonData.length === 0) {
    return { headers: [], rows: [], sheetName }
  }

  // Get headers from first row keys
  const headers = Object.keys(jsonData[0])

  return {
    headers,
    rows: jsonData,
    sheetName
  }
}

/**
 * Parse a CSV file and return raw data
 */
export function parseCSVFile(content: string): { headers: string[]; rows: Record<string, any>[] } {
  const result = Papa.parse<Record<string, any>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim()
  })

  if (result.errors.length > 0) {
    console.warn('CSV parsing warnings:', result.errors)
  }

  const headers = result.meta.fields || []

  return {
    headers,
    rows: result.data
  }
}

/**
 * Auto-detect column mapping based on header names
 */
export function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {}
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim())

  for (const [kbField, aliases] of Object.entries(COLUMN_MAPPING_ALIASES)) {
    for (const alias of aliases) {
      const idx = normalizedHeaders.findIndex(h =>
        h === alias.toLowerCase() ||
        h.includes(alias.toLowerCase()) ||
        alias.toLowerCase().includes(h)
      )

      if (idx !== -1 && !Object.values(mapping).includes(headers[idx])) {
        mapping[kbField] = headers[idx]
        break
      }
    }
  }

  // If no item_name mapping found, try to use the first column
  if (!mapping.item_name && headers.length > 0) {
    mapping.item_name = headers[0]
  }

  return mapping
}

/**
 * Preview a file before import
 */
export async function previewFile(
  buffer: Buffer,
  filename: string,
  fileType: 'xlsx' | 'csv'
): Promise<ImportPreview> {
  let headers: string[] = []
  let rows: Record<string, any>[] = []

  if (fileType === 'xlsx') {
    const parsed = parseXLSXFile(buffer)
    headers = parsed.headers
    rows = parsed.rows
  } else if (fileType === 'csv') {
    const content = buffer.toString('utf-8')
    const parsed = parseCSVFile(content)
    headers = parsed.headers
    rows = parsed.rows
  }

  // Auto-detect column mapping
  const suggestedMapping = detectColumnMapping(headers)

  // Return preview with sample rows
  return {
    headers,
    sampleRows: rows.slice(0, 5), // First 5 rows as sample
    suggestedMapping,
    totalRows: rows.length
  }
}

/**
 * Transform a raw row to KB item format using column mapping
 */
function transformRowToKBItem(
  row: Record<string, any>,
  mapping: ColumnMapping,
  sourceType: string,
  sourceFilename: string
): KBItemInput | null {
  // item_name is required
  const itemNameColumn = mapping.item_name
  if (!itemNameColumn || !row[itemNameColumn]) {
    return null
  }

  const item: KBItemInput = {
    source_type: sourceType,
    source_filename: sourceFilename,
    item_name: String(row[itemNameColumn]).trim()
  }

  // Map optional fields
  if (mapping.description && row[mapping.description]) {
    item.description = String(row[mapping.description]).trim()
  }

  if (mapping.manufacturer && row[mapping.manufacturer]) {
    item.manufacturer = String(row[mapping.manufacturer]).trim()
  }

  if (mapping.manufacturer_part_number && row[mapping.manufacturer_part_number]) {
    item.manufacturer_part_number = String(row[mapping.manufacturer_part_number]).trim()
  }

  if (mapping.category && row[mapping.category]) {
    item.category = String(row[mapping.category]).trim()
  }

  if (mapping.price_low && row[mapping.price_low]) {
    const price = parseFloat(String(row[mapping.price_low]).replace(/[^0-9.-]/g, ''))
    if (!isNaN(price)) {
      item.price_low = price
    }
  }

  if (mapping.price_high && row[mapping.price_high]) {
    const price = parseFloat(String(row[mapping.price_high]).replace(/[^0-9.-]/g, ''))
    if (!isNaN(price)) {
      item.price_high = price
    }
  }

  if (mapping.barcode && row[mapping.barcode]) {
    item.barcode = String(row[mapping.barcode]).trim()
  }

  if (mapping.sku && row[mapping.sku]) {
    item.sku = String(row[mapping.sku]).trim()
  }

  if (mapping.image_url && row[mapping.image_url]) {
    item.image_url = String(row[mapping.image_url]).trim()
  }

  // Store unmapped columns as metadata
  const mappedColumns = new Set(Object.values(mapping))
  const metadata: Record<string, any> = {}

  for (const [key, value] of Object.entries(row)) {
    if (!mappedColumns.has(key) && value !== '' && value !== null && value !== undefined) {
      metadata[key] = value
    }
  }

  if (Object.keys(metadata).length > 0) {
    item.metadata = metadata
  }

  return item
}

/**
 * Import a file to the Knowledge Base
 */
export async function importKBFile(
  buffer: Buffer,
  filename: string,
  fileType: 'xlsx' | 'csv',
  mapping?: ColumnMapping,
  onProgress?: (progress: number, message: string) => void
): Promise<ImportResult> {
  // Create source record
  const source = createKBSource({
    filename,
    file_type: fileType,
    file_size: buffer.length,
    column_mapping: mapping
  })

  updateKBSourceStatus(source.id, 'importing')

  try {
    // Parse the file
    let headers: string[] = []
    let rows: Record<string, any>[] = []

    if (fileType === 'xlsx') {
      const parsed = parseXLSXFile(buffer)
      headers = parsed.headers
      rows = parsed.rows
    } else if (fileType === 'csv') {
      const content = buffer.toString('utf-8')
      const parsed = parseCSVFile(content)
      headers = parsed.headers
      rows = parsed.rows
    }

    onProgress?.(10, `Parsed ${rows.length} rows from ${filename}`)

    // Use provided mapping or auto-detect
    const finalMapping = mapping || detectColumnMapping(headers)

    // Transform rows to KB items
    const items: KBItemInput[] = []
    const transformErrors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const item = transformRowToKBItem(rows[i], finalMapping, fileType, filename)
      if (item) {
        item.source_id = source.id
        items.push(item)
      } else {
        transformErrors.push(`Row ${i + 2}: Missing required item_name field`)
      }

      // Report progress every 100 rows
      if (i > 0 && i % 100 === 0) {
        const progress = 10 + Math.floor((i / rows.length) * 40)
        onProgress?.(progress, `Transforming row ${i} of ${rows.length}`)
      }
    }

    onProgress?.(50, `Transformed ${items.length} valid items`)

    // Batch insert items
    const { inserted, errors: insertErrors } = createKBItemsBatch(items, source.id)

    onProgress?.(90, `Inserted ${inserted} items into database`)

    // Count items with price
    const itemsWithPrice = items.filter(
      item => item.price_low !== undefined || item.price_high !== undefined
    ).length

    // Update source status
    updateKBSourceStatus(source.id, 'completed', {
      items_imported: inserted,
      items_with_price: itemsWithPrice
    })

    onProgress?.(100, `Import completed: ${inserted} items`)

    return {
      success: true,
      sourceId: source.id,
      itemsImported: inserted,
      itemsWithPrice,
      errors: [...transformErrors, ...insertErrors]
    }
  } catch (error: any) {
    updateKBSourceStatus(source.id, 'failed', {
      error_message: error.message
    })

    return {
      success: false,
      sourceId: source.id,
      itemsImported: 0,
      itemsWithPrice: 0,
      errors: [error.message]
    }
  }
}

/**
 * Auto-import files from the /knowledgebase directory
 * Called on first setup to import existing reference files
 */
export async function autoImportKnowledgebaseFiles(
  onProgress?: (filename: string, progress: number, message: string) => void
): Promise<{ imported: string[]; failed: string[] }> {
  const kbDir = path.join(process.cwd(), 'knowledgebase')
  const imported: string[] = []
  const failed: string[] = []

  if (!fs.existsSync(kbDir)) {
    console.log('Knowledge base directory not found, skipping auto-import')
    return { imported, failed }
  }

  const files = fs.readdirSync(kbDir)

  for (const filename of files) {
    const filePath = path.join(kbDir, filename)
    const ext = path.extname(filename).toLowerCase()

    // Skip non-data files
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
      continue
    }

    try {
      const buffer = fs.readFileSync(filePath)
      const fileType = ext === '.csv' ? 'csv' : 'xlsx'

      onProgress?.(filename, 0, `Starting import of ${filename}`)

      const result = await importKBFile(
        buffer,
        filename,
        fileType as 'xlsx' | 'csv',
        undefined, // Auto-detect mapping
        (progress, message) => onProgress?.(filename, progress, message)
      )

      if (result.success) {
        imported.push(filename)
        console.log(`✅ Imported ${filename}: ${result.itemsImported} items`)
      } else {
        failed.push(filename)
        console.error(`❌ Failed to import ${filename}:`, result.errors)
      }
    } catch (error: any) {
      failed.push(filename)
      console.error(`❌ Error importing ${filename}:`, error.message)
    }
  }

  return { imported, failed }
}

/**
 * Get file type from filename extension
 */
export function getFileType(filename: string): 'xlsx' | 'csv' | 'unknown' {
  const ext = path.extname(filename).toLowerCase()
  if (['.xlsx', '.xls'].includes(ext)) return 'xlsx'
  if (['.csv'].includes(ext)) return 'csv'
  return 'unknown'
}
