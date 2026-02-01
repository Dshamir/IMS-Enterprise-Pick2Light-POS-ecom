/**
 * Knowledge Base AI Settings
 *
 * CRUD operations for AI button configuration
 */

import { getDatabase } from '@/lib/database/sqlite'

// Default values (used when no settings saved or for reset)
export const DEFAULT_SETTINGS = {
  // General Settings
  default_model: 'gpt-4o-mini',
  auto_approve_threshold: 0.85,
  validation_enabled: true,

  // Price Lookup Defaults
  price_system_prompt: `You are a pricing expert for industrial and commercial products.
Given a product description, estimate a reasonable price range in USD.
Be conservative and realistic based on typical market prices.
If you cannot provide a reasonable estimate, say so.

Respond in JSON format:
{
  "can_estimate": boolean,
  "price_low": number or null,
  "price_high": number or null,
  "suggested_price": number or null,
  "reasoning": "brief explanation"
}`,
  price_model: 'gpt-4o-mini',
  price_temperature: 0.3,
  price_max_tokens: 300,
  price_high_confidence: 0.75,
  price_medium_confidence: 0.50,
  price_kb_search_limit: 10,

  // Name Generation Defaults
  name_system_prompt: `You are a product naming expert for medical and industrial equipment.
Generate professional product names following these rules:
1. Format: [Brand] [Product Line] [Key Attribute] [Size/Variant]
2. Use Title Case
3. Maximum 80 characters
4. No special characters except hyphens
5. Include relevant technical identifiers

Banned words: "cheap", "fake", "generic", "knockoff", "replica"

Respond in JSON format:
{
  "suggested_name": "string",
  "confidence": "high" | "medium" | "low",
  "reasoning": "brief explanation"
}`,
  name_model: 'gpt-4o-mini',
  name_temperature: 0.4,
  name_max_tokens: 200,
  name_kb_search_limit: 10,
  name_max_length: 80,
  name_banned_words: ['cheap', 'fake', 'generic', 'knockoff', 'replica', 'copy'],

  // Description Enhancement Defaults
  description_system_prompt: `You are a technical writer for medical and industrial products.
Enhance product descriptions following these guidelines:
1. Short description: 150 characters max, key features only
2. Long description: 1000 characters max, comprehensive details
3. Include compliance standards if known (FDA, CE, ISO)
4. Highlight safety information
5. IMPORTANT: If product is RECALLED, mark prominently

Respond in JSON format:
{
  "short_description": "string (max 150 chars)",
  "long_description": "string (max 1000 chars)",
  "compliance_standards": ["ISO 13485", "FDA 510(k)", etc.],
  "has_recall_notice": boolean,
  "confidence": "high" | "medium" | "low",
  "reasoning": "brief explanation"
}`,
  description_model: 'gpt-4o-mini',
  description_temperature: 0.5,
  description_max_tokens: 800,
  description_kb_search_limit: 15,
  description_short_max_length: 150,
  description_long_max_length: 1000,

  // Barcode Lookup Defaults
  barcode_category_prefixes: {
    "equipment": "10",
    "parts": "20",
    "consumables": "30",
    "tools": "40",
    "safety": "50",
    "maintenance": "60",
    "instruments": "70",
    "surgical": "80",
    "pcr": "90",
    "laboratory": "91",
    "reagents": "92",
    "default": "00"
  },
  barcode_format: '{PREFIX}-{COUNTER}-{VERSION}',
  barcode_counter_padding: 6,
  barcode_default_version: 'A',
  barcode_kb_search_limit: 10,
  barcode_alternatives_count: 3,

  // Part Number Lookup Defaults
  part_kb_search_limit: 10,
  part_return_count: 5,
  part_high_confidence: 0.75,
  part_medium_confidence: 0.50,

  // PDF Summarization Defaults
  pdf_system_prompt: `You are a document summarizer for a product inventory system.
Summarize the PDF focusing on product-relevant information.

Context from user:
{pdf_description}

Product context:
- Name: {product_name}
- Description: {product_description}

Guidelines:
1. Focus on technical specifications, compliance info, and key features
2. Include safety information if present
3. Note any regulatory standards (FDA, CE, ISO)
4. Maximum {max_length} characters

Return only the summary text, no formatting.`,
  pdf_model: 'gpt-4o',
  pdf_temperature: 0.3,
  pdf_max_tokens: 512,
}

export interface KBAISettings {
  id: string

  // General Settings
  default_model: string
  auto_approve_threshold: number
  validation_enabled: boolean

  // Price Lookup Settings
  price_system_prompt: string
  price_model: string
  price_temperature: number
  price_max_tokens: number
  price_high_confidence: number
  price_medium_confidence: number
  price_kb_search_limit: number

  // Name Generation Settings
  name_system_prompt: string
  name_model: string
  name_temperature: number
  name_max_tokens: number
  name_kb_search_limit: number
  name_max_length: number
  name_banned_words: string[]

  // Description Enhancement Settings
  description_system_prompt: string
  description_model: string
  description_temperature: number
  description_max_tokens: number
  description_kb_search_limit: number
  description_short_max_length: number
  description_long_max_length: number

  // Barcode Lookup Settings
  barcode_category_prefixes: Record<string, string>
  barcode_format: string
  barcode_counter_padding: number
  barcode_default_version: string
  barcode_kb_search_limit: number
  barcode_alternatives_count: number

  // Part Number Lookup Settings
  part_kb_search_limit: number
  part_return_count: number
  part_high_confidence: number
  part_medium_confidence: number

  // PDF Summarization Settings
  pdf_system_prompt: string
  pdf_model: string
  pdf_temperature: number
  pdf_max_tokens: number

  updated_at: string
}

interface RawSettings {
  id: string
  // General
  default_model: string | null
  auto_approve_threshold: number | null
  validation_enabled: number | null  // SQLite stores booleans as 0/1
  // Price
  price_system_prompt: string | null
  price_model: string | null
  price_temperature: number | null
  price_max_tokens: number | null
  price_high_confidence: number | null
  price_medium_confidence: number | null
  price_kb_search_limit: number | null
  // Name
  name_system_prompt: string | null
  name_model: string | null
  name_temperature: number | null
  name_max_tokens: number | null
  name_kb_search_limit: number | null
  name_max_length: number | null
  name_banned_words: string | null  // JSON array
  // Description
  description_system_prompt: string | null
  description_model: string | null
  description_temperature: number | null
  description_max_tokens: number | null
  description_kb_search_limit: number | null
  description_short_max_length: number | null
  description_long_max_length: number | null
  // Barcode
  barcode_category_prefixes: string | null
  barcode_format: string | null
  barcode_counter_padding: number | null
  barcode_default_version: string | null
  barcode_kb_search_limit: number | null
  barcode_alternatives_count: number | null
  // Part Number
  part_kb_search_limit: number | null
  part_return_count: number | null
  part_high_confidence: number | null
  part_medium_confidence: number | null
  // PDF
  pdf_system_prompt: string | null
  pdf_model: string | null
  pdf_temperature: number | null
  pdf_max_tokens: number | null
  updated_at: string
}

/**
 * Get current AI settings (with defaults for missing values)
 */
export function getKBAISettings(): KBAISettings {
  const db = getDatabase()

  try {
    const row = db.prepare(`
      SELECT * FROM kb_ai_settings WHERE id = 'default'
    `).get() as RawSettings | undefined

    if (!row) {
      // Return all defaults if no row exists
      return {
        id: 'default',
        ...DEFAULT_SETTINGS,
        barcode_category_prefixes: DEFAULT_SETTINGS.barcode_category_prefixes,
        updated_at: new Date().toISOString()
      }
    }

    // Parse JSON fields and merge with defaults
    let categoryPrefixes = DEFAULT_SETTINGS.barcode_category_prefixes
    if (row.barcode_category_prefixes) {
      try {
        categoryPrefixes = JSON.parse(row.barcode_category_prefixes)
      } catch (e) {
        console.warn('Failed to parse barcode_category_prefixes, using defaults')
      }
    }

    let bannedWords = DEFAULT_SETTINGS.name_banned_words
    if (row.name_banned_words) {
      try {
        bannedWords = JSON.parse(row.name_banned_words)
      } catch (e) {
        console.warn('Failed to parse name_banned_words, using defaults')
      }
    }

    return {
      id: row.id,
      // General
      default_model: row.default_model || DEFAULT_SETTINGS.default_model,
      auto_approve_threshold: row.auto_approve_threshold ?? DEFAULT_SETTINGS.auto_approve_threshold,
      validation_enabled: row.validation_enabled !== null ? Boolean(row.validation_enabled) : DEFAULT_SETTINGS.validation_enabled,
      // Price
      price_system_prompt: row.price_system_prompt || DEFAULT_SETTINGS.price_system_prompt,
      price_model: row.price_model || DEFAULT_SETTINGS.price_model,
      price_temperature: row.price_temperature ?? DEFAULT_SETTINGS.price_temperature,
      price_max_tokens: row.price_max_tokens ?? DEFAULT_SETTINGS.price_max_tokens,
      price_high_confidence: row.price_high_confidence ?? DEFAULT_SETTINGS.price_high_confidence,
      price_medium_confidence: row.price_medium_confidence ?? DEFAULT_SETTINGS.price_medium_confidence,
      price_kb_search_limit: row.price_kb_search_limit ?? DEFAULT_SETTINGS.price_kb_search_limit,
      // Name
      name_system_prompt: row.name_system_prompt || DEFAULT_SETTINGS.name_system_prompt,
      name_model: row.name_model || DEFAULT_SETTINGS.name_model,
      name_temperature: row.name_temperature ?? DEFAULT_SETTINGS.name_temperature,
      name_max_tokens: row.name_max_tokens ?? DEFAULT_SETTINGS.name_max_tokens,
      name_kb_search_limit: row.name_kb_search_limit ?? DEFAULT_SETTINGS.name_kb_search_limit,
      name_max_length: row.name_max_length ?? DEFAULT_SETTINGS.name_max_length,
      name_banned_words: bannedWords,
      // Description
      description_system_prompt: row.description_system_prompt || DEFAULT_SETTINGS.description_system_prompt,
      description_model: row.description_model || DEFAULT_SETTINGS.description_model,
      description_temperature: row.description_temperature ?? DEFAULT_SETTINGS.description_temperature,
      description_max_tokens: row.description_max_tokens ?? DEFAULT_SETTINGS.description_max_tokens,
      description_kb_search_limit: row.description_kb_search_limit ?? DEFAULT_SETTINGS.description_kb_search_limit,
      description_short_max_length: row.description_short_max_length ?? DEFAULT_SETTINGS.description_short_max_length,
      description_long_max_length: row.description_long_max_length ?? DEFAULT_SETTINGS.description_long_max_length,
      // Barcode
      barcode_category_prefixes: categoryPrefixes,
      barcode_format: row.barcode_format || DEFAULT_SETTINGS.barcode_format,
      barcode_counter_padding: row.barcode_counter_padding ?? DEFAULT_SETTINGS.barcode_counter_padding,
      barcode_default_version: row.barcode_default_version || DEFAULT_SETTINGS.barcode_default_version,
      barcode_kb_search_limit: row.barcode_kb_search_limit ?? DEFAULT_SETTINGS.barcode_kb_search_limit,
      barcode_alternatives_count: row.barcode_alternatives_count ?? DEFAULT_SETTINGS.barcode_alternatives_count,
      // Part Number
      part_kb_search_limit: row.part_kb_search_limit ?? DEFAULT_SETTINGS.part_kb_search_limit,
      part_return_count: row.part_return_count ?? DEFAULT_SETTINGS.part_return_count,
      part_high_confidence: row.part_high_confidence ?? DEFAULT_SETTINGS.part_high_confidence,
      part_medium_confidence: row.part_medium_confidence ?? DEFAULT_SETTINGS.part_medium_confidence,
      // PDF
      pdf_system_prompt: row.pdf_system_prompt || DEFAULT_SETTINGS.pdf_system_prompt,
      pdf_model: row.pdf_model || DEFAULT_SETTINGS.pdf_model,
      pdf_temperature: row.pdf_temperature ?? DEFAULT_SETTINGS.pdf_temperature,
      pdf_max_tokens: row.pdf_max_tokens ?? DEFAULT_SETTINGS.pdf_max_tokens,
      updated_at: row.updated_at
    }
  } catch (error) {
    console.error('Error fetching KB AI settings:', error)
    // Return defaults on error
    return {
      id: 'default',
      ...DEFAULT_SETTINGS,
      barcode_category_prefixes: DEFAULT_SETTINGS.barcode_category_prefixes,
      updated_at: new Date().toISOString()
    }
  }
}

/**
 * Update AI settings
 */
export function updateKBAISettings(settings: Partial<Omit<KBAISettings, 'id' | 'updated_at'>>): KBAISettings {
  const db = getDatabase()

  // Build update fields dynamically
  const updates: string[] = []
  const values: any[] = []

  if (settings.price_system_prompt !== undefined) {
    updates.push('price_system_prompt = ?')
    values.push(settings.price_system_prompt)
  }
  if (settings.price_model !== undefined) {
    updates.push('price_model = ?')
    values.push(settings.price_model)
  }
  if (settings.price_temperature !== undefined) {
    updates.push('price_temperature = ?')
    values.push(settings.price_temperature)
  }
  if (settings.price_max_tokens !== undefined) {
    updates.push('price_max_tokens = ?')
    values.push(settings.price_max_tokens)
  }
  if (settings.price_high_confidence !== undefined) {
    updates.push('price_high_confidence = ?')
    values.push(settings.price_high_confidence)
  }
  if (settings.price_medium_confidence !== undefined) {
    updates.push('price_medium_confidence = ?')
    values.push(settings.price_medium_confidence)
  }
  if (settings.price_kb_search_limit !== undefined) {
    updates.push('price_kb_search_limit = ?')
    values.push(settings.price_kb_search_limit)
  }
  if (settings.barcode_category_prefixes !== undefined) {
    updates.push('barcode_category_prefixes = ?')
    values.push(JSON.stringify(settings.barcode_category_prefixes))
  }
  if (settings.barcode_format !== undefined) {
    updates.push('barcode_format = ?')
    values.push(settings.barcode_format)
  }
  if (settings.barcode_kb_search_limit !== undefined) {
    updates.push('barcode_kb_search_limit = ?')
    values.push(settings.barcode_kb_search_limit)
  }
  if (settings.barcode_alternatives_count !== undefined) {
    updates.push('barcode_alternatives_count = ?')
    values.push(settings.barcode_alternatives_count)
  }
  if (settings.part_kb_search_limit !== undefined) {
    updates.push('part_kb_search_limit = ?')
    values.push(settings.part_kb_search_limit)
  }
  if (settings.part_return_count !== undefined) {
    updates.push('part_return_count = ?')
    values.push(settings.part_return_count)
  }
  if (settings.part_high_confidence !== undefined) {
    updates.push('part_high_confidence = ?')
    values.push(settings.part_high_confidence)
  }
  if (settings.part_medium_confidence !== undefined) {
    updates.push('part_medium_confidence = ?')
    values.push(settings.part_medium_confidence)
  }

  // General settings
  if (settings.default_model !== undefined) {
    updates.push('default_model = ?')
    values.push(settings.default_model)
  }
  if (settings.auto_approve_threshold !== undefined) {
    updates.push('auto_approve_threshold = ?')
    values.push(settings.auto_approve_threshold)
  }
  if (settings.validation_enabled !== undefined) {
    updates.push('validation_enabled = ?')
    values.push(settings.validation_enabled ? 1 : 0)
  }

  // Name Generation settings
  if (settings.name_system_prompt !== undefined) {
    updates.push('name_system_prompt = ?')
    values.push(settings.name_system_prompt)
  }
  if (settings.name_model !== undefined) {
    updates.push('name_model = ?')
    values.push(settings.name_model)
  }
  if (settings.name_temperature !== undefined) {
    updates.push('name_temperature = ?')
    values.push(settings.name_temperature)
  }
  if (settings.name_max_tokens !== undefined) {
    updates.push('name_max_tokens = ?')
    values.push(settings.name_max_tokens)
  }
  if (settings.name_kb_search_limit !== undefined) {
    updates.push('name_kb_search_limit = ?')
    values.push(settings.name_kb_search_limit)
  }
  if (settings.name_max_length !== undefined) {
    updates.push('name_max_length = ?')
    values.push(settings.name_max_length)
  }
  if (settings.name_banned_words !== undefined) {
    updates.push('name_banned_words = ?')
    values.push(JSON.stringify(settings.name_banned_words))
  }

  // Description Enhancement settings
  if (settings.description_system_prompt !== undefined) {
    updates.push('description_system_prompt = ?')
    values.push(settings.description_system_prompt)
  }
  if (settings.description_model !== undefined) {
    updates.push('description_model = ?')
    values.push(settings.description_model)
  }
  if (settings.description_temperature !== undefined) {
    updates.push('description_temperature = ?')
    values.push(settings.description_temperature)
  }
  if (settings.description_max_tokens !== undefined) {
    updates.push('description_max_tokens = ?')
    values.push(settings.description_max_tokens)
  }
  if (settings.description_kb_search_limit !== undefined) {
    updates.push('description_kb_search_limit = ?')
    values.push(settings.description_kb_search_limit)
  }
  if (settings.description_short_max_length !== undefined) {
    updates.push('description_short_max_length = ?')
    values.push(settings.description_short_max_length)
  }
  if (settings.description_long_max_length !== undefined) {
    updates.push('description_long_max_length = ?')
    values.push(settings.description_long_max_length)
  }

  // PDF Summarization settings
  if (settings.pdf_system_prompt !== undefined) {
    updates.push('pdf_system_prompt = ?')
    values.push(settings.pdf_system_prompt)
  }
  if (settings.pdf_model !== undefined) {
    updates.push('pdf_model = ?')
    values.push(settings.pdf_model)
  }
  if (settings.pdf_temperature !== undefined) {
    updates.push('pdf_temperature = ?')
    values.push(settings.pdf_temperature)
  }
  if (settings.pdf_max_tokens !== undefined) {
    updates.push('pdf_max_tokens = ?')
    values.push(settings.pdf_max_tokens)
  }

  // Always update timestamp
  updates.push("updated_at = datetime('now')")

  if (updates.length > 1) {  // More than just timestamp
    const sql = `UPDATE kb_ai_settings SET ${updates.join(', ')} WHERE id = 'default'`
    db.prepare(sql).run(...values)
  }

  return getKBAISettings()
}

/**
 * Reset all settings to defaults
 */
export function resetKBAISettings(): KBAISettings {
  const db = getDatabase()

  const categoryPrefixesJson = JSON.stringify(DEFAULT_SETTINGS.barcode_category_prefixes)

  db.prepare(`
    UPDATE kb_ai_settings SET
      price_system_prompt = ?,
      price_model = ?,
      price_temperature = ?,
      price_max_tokens = ?,
      price_high_confidence = ?,
      price_medium_confidence = ?,
      price_kb_search_limit = ?,
      barcode_category_prefixes = ?,
      barcode_format = ?,
      barcode_kb_search_limit = ?,
      barcode_alternatives_count = ?,
      part_kb_search_limit = ?,
      part_return_count = ?,
      part_high_confidence = ?,
      part_medium_confidence = ?,
      updated_at = datetime('now')
    WHERE id = 'default'
  `).run(
    DEFAULT_SETTINGS.price_system_prompt,
    DEFAULT_SETTINGS.price_model,
    DEFAULT_SETTINGS.price_temperature,
    DEFAULT_SETTINGS.price_max_tokens,
    DEFAULT_SETTINGS.price_high_confidence,
    DEFAULT_SETTINGS.price_medium_confidence,
    DEFAULT_SETTINGS.price_kb_search_limit,
    categoryPrefixesJson,
    DEFAULT_SETTINGS.barcode_format,
    DEFAULT_SETTINGS.barcode_kb_search_limit,
    DEFAULT_SETTINGS.barcode_alternatives_count,
    DEFAULT_SETTINGS.part_kb_search_limit,
    DEFAULT_SETTINGS.part_return_count,
    DEFAULT_SETTINGS.part_high_confidence,
    DEFAULT_SETTINGS.part_medium_confidence
  )

  return getKBAISettings()
}

// Helper functions for individual lookups
export function getPriceSettings() {
  const settings = getKBAISettings()
  return {
    systemPrompt: settings.price_system_prompt,
    model: settings.price_model,
    temperature: settings.price_temperature,
    maxTokens: settings.price_max_tokens,
    highConfidence: settings.price_high_confidence,
    mediumConfidence: settings.price_medium_confidence,
    kbSearchLimit: settings.price_kb_search_limit,
  }
}

export function getBarcodeSettings() {
  const settings = getKBAISettings()
  return {
    categoryPrefixes: settings.barcode_category_prefixes,
    format: settings.barcode_format,
    counterPadding: settings.barcode_counter_padding,
    defaultVersion: settings.barcode_default_version,
    kbSearchLimit: settings.barcode_kb_search_limit,
    alternativesCount: settings.barcode_alternatives_count,
  }
}

export function getPartNumberSettings() {
  const settings = getKBAISettings()
  return {
    kbSearchLimit: settings.part_kb_search_limit,
    returnCount: settings.part_return_count,
    highConfidence: settings.part_high_confidence,
    mediumConfidence: settings.part_medium_confidence,
  }
}

export function getNameGenerationSettings() {
  const settings = getKBAISettings()
  return {
    systemPrompt: settings.name_system_prompt,
    model: settings.name_model,
    temperature: settings.name_temperature,
    maxTokens: settings.name_max_tokens,
    kbSearchLimit: settings.name_kb_search_limit,
    maxLength: settings.name_max_length,
    bannedWords: settings.name_banned_words,
  }
}

export function getDescriptionEnhancementSettings() {
  const settings = getKBAISettings()
  return {
    systemPrompt: settings.description_system_prompt,
    model: settings.description_model,
    temperature: settings.description_temperature,
    maxTokens: settings.description_max_tokens,
    kbSearchLimit: settings.description_kb_search_limit,
    shortMaxLength: settings.description_short_max_length,
    longMaxLength: settings.description_long_max_length,
  }
}

export function getPDFSummarizationSettings() {
  const settings = getKBAISettings()
  return {
    systemPrompt: settings.pdf_system_prompt,
    model: settings.pdf_model,
    temperature: settings.pdf_temperature,
    maxTokens: settings.pdf_max_tokens,
  }
}

/**
 * Alias for getKBAISettings for backwards compatibility
 * Used by routes that need access to general settings like default_model
 */
export function getKBSettings() {
  return getKBAISettings()
}
