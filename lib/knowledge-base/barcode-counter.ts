/**
 * Barcode Counter Management
 *
 * Provides atomic counter management for sequential barcode generation.
 * Each prefix (category) has its own counter that auto-increments.
 *
 * Barcode Format: {PREFIX}-{COUNTER}-{VERSION}
 * Example: 90-000276-A
 */

import { getDatabase } from '@/lib/database/sqlite'

export interface BarcodeCounter {
  id: string
  prefix: string
  current_counter: number
  last_generated_barcode: string | null
  created_at: string
  updated_at: string
}

/**
 * Get current counter value for a prefix
 */
export function getCounterForPrefix(prefix: string): number {
  const db = getDatabase()
  const row = db.prepare(`
    SELECT current_counter FROM barcode_prefix_counters WHERE prefix = ?
  `).get(prefix) as { current_counter: number } | undefined

  return row?.current_counter ?? 0
}

/**
 * Get all prefix counters
 */
export function getAllPrefixCounters(): BarcodeCounter[] {
  const db = getDatabase()
  return db.prepare(`
    SELECT * FROM barcode_prefix_counters ORDER BY prefix
  `).all() as BarcodeCounter[]
}

/**
 * Get or create a counter for a prefix
 * Returns the current counter value (0 if new)
 */
export function getOrCreateCounter(prefix: string): number {
  const db = getDatabase()

  // Try to get existing counter
  const existing = db.prepare(`
    SELECT current_counter FROM barcode_prefix_counters WHERE prefix = ?
  `).get(prefix) as { current_counter: number } | undefined

  if (existing !== undefined) {
    return existing.current_counter
  }

  // Create new counter entry
  const id = crypto.randomUUID().replace(/-/g, '')
  db.prepare(`
    INSERT INTO barcode_prefix_counters (id, prefix, current_counter)
    VALUES (?, ?, 0)
  `).run(id, prefix)

  return 0
}

/**
 * Atomically increment and return the next counter value for a prefix
 * This is the primary function for generating new barcodes
 */
export function getNextCounter(prefix: string): number {
  const db = getDatabase()

  // Use a transaction to ensure atomicity
  const transaction = db.transaction(() => {
    // Get or create the counter
    let row = db.prepare(`
      SELECT id, current_counter FROM barcode_prefix_counters WHERE prefix = ?
    `).get(prefix) as { id: string; current_counter: number } | undefined

    if (!row) {
      // Create new counter entry
      const id = crypto.randomUUID().replace(/-/g, '')
      db.prepare(`
        INSERT INTO barcode_prefix_counters (id, prefix, current_counter)
        VALUES (?, ?, 0)
      `).run(id, prefix)
      row = { id, current_counter: 0 }
    }

    // Increment counter
    const nextCounter = row.current_counter + 1
    db.prepare(`
      UPDATE barcode_prefix_counters
      SET current_counter = ?, updated_at = datetime('now')
      WHERE prefix = ?
    `).run(nextCounter, prefix)

    return nextCounter
  })

  return transaction()
}

/**
 * Update the last generated barcode for a prefix
 */
export function updateLastGeneratedBarcode(prefix: string, barcode: string): void {
  const db = getDatabase()
  db.prepare(`
    UPDATE barcode_prefix_counters
    SET last_generated_barcode = ?, updated_at = datetime('now')
    WHERE prefix = ?
  `).run(barcode, prefix)
}

/**
 * Generate a sequential barcode with the specified format
 * Format: {PREFIX}-{PADDED_COUNTER}-{VERSION}
 * Example: 90-000276-A
 *
 * @param prefix - The category prefix (e.g., "90", "10")
 * @param version - The version suffix (default: "A")
 * @param padding - Number of digits for counter (default: 6)
 * @returns The generated barcode string
 */
export function generateSequentialBarcode(
  prefix: string,
  version: string = 'A',
  padding: number = 6
): string {
  // Get the next counter value (atomic increment)
  const counter = getNextCounter(prefix)

  // Pad the counter to the specified number of digits
  const paddedCounter = counter.toString().padStart(padding, '0')

  // Generate the barcode
  const barcode = `${prefix}-${paddedCounter}-${version}`

  // Update the last generated barcode
  updateLastGeneratedBarcode(prefix, barcode)

  return barcode
}

/**
 * Parse a barcode to extract its components
 * @param barcode - The barcode string (e.g., "90-000276-A")
 * @returns Parsed components or null if invalid format
 */
export function parseBarcode(barcode: string): {
  prefix: string
  counter: number
  version: string
} | null {
  if (!barcode) return null

  // Match format: PREFIX-COUNTER-VERSION
  const match = barcode.match(/^(\d+)-(\d+)-([A-Z]+)$/i)
  if (!match) return null

  return {
    prefix: match[1],
    counter: parseInt(match[2], 10),
    version: match[3].toUpperCase()
  }
}

/**
 * Check if a barcode already exists in the database
 */
export function barcodeExists(barcode: string): boolean {
  const db = getDatabase()

  // Check in products table
  const productMatch = db.prepare(`
    SELECT 1 FROM products WHERE barcode = ? LIMIT 1
  `).get(barcode)

  if (productMatch) return true

  // Check in kb_items table
  const kbMatch = db.prepare(`
    SELECT 1 FROM kb_items WHERE barcode = ? LIMIT 1
  `).get(barcode)

  return !!kbMatch
}

/**
 * Generate a unique barcode, handling collisions by incrementing version
 * @param prefix - The category prefix
 * @param startVersion - Starting version letter (default: "A")
 * @param padding - Number of digits for counter (default: 6)
 * @returns A unique barcode string
 */
export function generateUniqueBarcode(
  prefix: string,
  startVersion: string = 'A',
  padding: number = 6
): string {
  let version = startVersion.toUpperCase()
  let barcode = generateSequentialBarcode(prefix, version, padding)

  // Handle extremely rare collision case by incrementing version
  let attempts = 0
  while (barcodeExists(barcode) && attempts < 26) {
    // Increment version letter (A -> B -> C -> ... -> Z)
    const nextCharCode = version.charCodeAt(0) + 1
    if (nextCharCode > 90) { // Past 'Z'
      // Start new counter sequence
      barcode = generateSequentialBarcode(prefix, 'A', padding)
      break
    }
    version = String.fromCharCode(nextCharCode)
    // Re-generate with same counter but new version
    const parsed = parseBarcode(barcode)
    if (parsed) {
      barcode = `${prefix}-${parsed.counter.toString().padStart(padding, '0')}-${version}`
    }
    attempts++
  }

  return barcode
}

/**
 * Reset counter for a specific prefix (admin function)
 * Use with caution - can cause barcode collisions
 */
export function resetCounter(prefix: string, newValue: number = 0): void {
  const db = getDatabase()
  db.prepare(`
    UPDATE barcode_prefix_counters
    SET current_counter = ?, last_generated_barcode = NULL, updated_at = datetime('now')
    WHERE prefix = ?
  `).run(newValue, prefix)
}

/**
 * Delete a counter entry (admin function)
 */
export function deleteCounter(prefix: string): boolean {
  const db = getDatabase()
  const result = db.prepare(`
    DELETE FROM barcode_prefix_counters WHERE prefix = ?
  `).run(prefix)
  return result.changes > 0
}

/**
 * Get statistics about barcode usage
 */
export function getBarcodeStats(): {
  totalPrefixes: number
  totalGenerated: number
  prefixes: Array<{
    prefix: string
    current_counter: number
    last_barcode: string | null
  }>
} {
  const counters = getAllPrefixCounters()

  const totalGenerated = counters.reduce((sum, c) => sum + c.current_counter, 0)

  return {
    totalPrefixes: counters.length,
    totalGenerated,
    prefixes: counters.map(c => ({
      prefix: c.prefix,
      current_counter: c.current_counter,
      last_barcode: c.last_generated_barcode
    }))
  }
}
