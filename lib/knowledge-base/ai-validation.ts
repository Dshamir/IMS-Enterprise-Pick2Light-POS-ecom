/**
 * Post-Generation Validation Layer
 *
 * Validates AI outputs against business rules and regex patterns
 * per RAG Guide Section 8.7 and Appendix C
 *
 * This module provides:
 * - Regex-based format validation
 * - Business rule validation
 * - Constraint checking against allowed values
 * - Validation result aggregation for audit logging
 */

// ============================================================================
// Types
// ============================================================================

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  needsReview: boolean
  validatedValue?: string | number
}

export interface PartNumberComponents {
  prefix: string
  suffix: string
  counter: string
  version: string
}

// ============================================================================
// Validation Patterns (from RAG Guide Appendix C)
// ============================================================================

export const VALIDATION_PATTERNS = {
  // Full part number: XX-XXXXXX-X (2-digit prefix, 1-digit suffix, 5-digit counter, 1 letter version)
  partNumber: /^([0-9]{2})-([0-9]{1})([0-9]{5})-([A-Z])$/,

  // Part number components
  partNumberPrefix: /^[0-9]{2}$/,
  partNumberSuffix: /^[0-9]{1}$/,
  partNumberCounter: /^[0-9]{5}$/,
  partNumberVersion: /^[A-Z]$/,

  // Currency
  currency: /^(USD|CAD|EUR)$/,

  // Barcode: XX-XXXXXX-X (2-digit prefix, 6-digit counter, 1 letter version)
  barcode: /^([0-9]{2})-([0-9]{6})-([A-Z])$/,

  // Barcode prefix only
  barcodePrefix: /^[0-9]{2}$/,

  // Price (positive number with up to 2 decimals)
  price: /^\d+(\.\d{1,2})?$/,

  // Product name (basic validation)
  productName: /^.{3,80}$/,
} as const

// ============================================================================
// Part Number Validation
// ============================================================================

/**
 * Validate a part number against format and allowed values
 */
export function validatePartNumber(
  partNumber: string,
  allowedPrefixes: string[],
  allowedSuffixes: string[]
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check overall format
  const match = VALIDATION_PATTERNS.partNumber.exec(partNumber)

  if (!match) {
    return {
      isValid: false,
      errors: [`Part number "${partNumber}" does not match required format XX-XXXXXX-X`],
      warnings: [],
      needsReview: true,
    }
  }

  const [, prefix, suffix, counter, version] = match

  // Validate prefix against allowed list
  if (allowedPrefixes.length > 0 && !allowedPrefixes.includes(prefix)) {
    errors.push(`Invalid prefix: ${prefix}. Allowed values: ${allowedPrefixes.join(', ')}`)
  }

  // Validate suffix against allowed list
  if (allowedSuffixes.length > 0 && !allowedSuffixes.includes(suffix)) {
    errors.push(`Invalid suffix: ${suffix}. Allowed values: ${allowedSuffixes.join(', ')}`)
  }

  // Check for unusual counter values (all zeros or very high)
  const counterNum = parseInt(counter, 10)
  if (counterNum === 0) {
    warnings.push('Counter is 00000 - verify this is correct')
  }
  if (counterNum > 99000) {
    warnings.push(`Counter ${counter} is very high - verify sequence`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    needsReview: errors.length > 0 || warnings.length > 0,
    validatedValue: partNumber.toUpperCase(),
  }
}

/**
 * Parse a part number into its components
 */
export function parsePartNumber(partNumber: string): PartNumberComponents | null {
  const match = VALIDATION_PATTERNS.partNumber.exec(partNumber)
  if (!match) return null

  return {
    prefix: match[1],
    suffix: match[2],
    counter: match[3],
    version: match[4],
  }
}

/**
 * Normalize a part number to standard format
 */
export function normalizePartNumber(partNumber: string): string | null {
  // Try to parse various formats
  const cleanedInput = partNumber.trim().toUpperCase()

  // Already in correct format
  if (VALIDATION_PATTERNS.partNumber.test(cleanedInput)) {
    return cleanedInput
  }

  // Try to parse: XX-XXXX-X (4-digit counter instead of 5)
  const shortCounterMatch = /^([0-9]{2})-([0-9]{1})([0-9]{4})-([A-Z])$/.exec(cleanedInput)
  if (shortCounterMatch) {
    const [, prefix, suffix, counter, version] = shortCounterMatch
    return `${prefix}-${suffix}${counter.padStart(5, '0')}-${version}`
  }

  // Try to parse: XX-XXXXX-a (lowercase version)
  const lowercaseVersionMatch = /^([0-9]{2})-([0-9]{1})([0-9]{5})-([a-z])$/.exec(cleanedInput)
  if (lowercaseVersionMatch) {
    const [, prefix, suffix, counter, version] = lowercaseVersionMatch
    return `${prefix}-${suffix}${counter}-${version.toUpperCase()}`
  }

  return null
}

// ============================================================================
// Price Validation
// ============================================================================

/**
 * Validate price value and currency
 */
export function validatePrice(
  price: number,
  currency: string,
  allowedCurrencies: string[] = ['USD', 'CAD', 'EUR']
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check for valid positive price
  if (typeof price !== 'number' || isNaN(price)) {
    errors.push(`Invalid price value: ${price}`)
  } else if (price < 0) {
    errors.push('Price cannot be negative')
  } else if (price === 0) {
    warnings.push('Price is $0.00 - verify this is correct')
  }

  // Check for reasonable price range
  if (price > 1000000) {
    warnings.push(`Price $${price.toFixed(2)} exceeds $1,000,000 - verify accuracy`)
  }

  // Validate currency
  if (!VALIDATION_PATTERNS.currency.test(currency)) {
    errors.push(`Invalid currency: ${currency}. Allowed values: ${allowedCurrencies.join(', ')}`)
  }

  // Round to 2 decimal places
  const roundedPrice = Math.round(price * 100) / 100

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    needsReview: warnings.length > 0 || errors.length > 0,
    validatedValue: roundedPrice,
  }
}

/**
 * Check price discrepancy between suggested and current
 */
export function checkPriceDiscrepancy(
  suggestedPrice: number,
  currentPrice: number,
  thresholdPercent: number = 5
): { hasDiscrepancy: boolean; percentDiff: number; message: string } {
  if (currentPrice === 0) {
    return {
      hasDiscrepancy: false,
      percentDiff: 0,
      message: 'No current price to compare',
    }
  }

  const percentDiff = Math.abs((suggestedPrice - currentPrice) / currentPrice) * 100
  const hasDiscrepancy = percentDiff > thresholdPercent

  return {
    hasDiscrepancy,
    percentDiff: Math.round(percentDiff * 10) / 10,
    message: hasDiscrepancy
      ? `Price differs by ${percentDiff.toFixed(1)}% (threshold: ${thresholdPercent}%)`
      : `Price within ${thresholdPercent}% threshold`,
  }
}

// ============================================================================
// Barcode Validation
// ============================================================================

/**
 * Validate barcode format and prefix
 */
export function validateBarcode(
  barcode: string,
  categoryPrefixes: Record<string, string>
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const match = VALIDATION_PATTERNS.barcode.exec(barcode)

  if (!match) {
    return {
      isValid: false,
      errors: [`Barcode "${barcode}" does not match required format XX-XXXXXX-X`],
      warnings: [],
      needsReview: true,
    }
  }

  const [, prefix, counter, version] = match
  const validPrefixes = Object.values(categoryPrefixes)

  // Check if prefix is valid
  if (!validPrefixes.includes(prefix)) {
    errors.push(`Unknown barcode prefix: ${prefix}`)
  }

  // Check for unusual counter values
  const counterNum = parseInt(counter, 10)
  if (counterNum === 0) {
    warnings.push('Barcode counter is 000000 - verify this is correct')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    needsReview: errors.length > 0,
    validatedValue: barcode.toUpperCase(),
  }
}

/**
 * Parse barcode into components
 */
export function parseBarcode(barcode: string): { prefix: string; counter: number; version: string } | null {
  const match = VALIDATION_PATTERNS.barcode.exec(barcode)
  if (!match) return null

  return {
    prefix: match[1],
    counter: parseInt(match[2], 10),
    version: match[3],
  }
}

// ============================================================================
// Product Name Validation
// ============================================================================

/**
 * Validate product name
 */
export function validateProductName(
  name: string,
  bannedWords: string[] = []
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check length
  if (!name || name.trim().length === 0) {
    errors.push('Product name is required')
  } else if (name.length < 3) {
    errors.push('Product name too short (minimum 3 characters)')
  } else if (name.length > 80) {
    errors.push('Product name too long (maximum 80 characters)')
  }

  // Check for banned words
  const lowerName = name.toLowerCase()
  for (const banned of bannedWords) {
    if (lowerName.includes(banned.toLowerCase())) {
      warnings.push(`Contains promotional term: "${banned}"`)
    }
  }

  // Check for vendor SKUs in name (common pattern)
  if (/\b[A-Z]{2,3}-\d{4,}\b/.test(name)) {
    warnings.push('Name may contain vendor SKU - consider removing')
  }

  // Check for duplicate words
  const words = name.toLowerCase().split(/\s+/)
  const duplicates = words.filter((word, index) => words.indexOf(word) !== index && word.length > 2)
  if (duplicates.length > 0) {
    warnings.push(`Possible duplicate words: ${[...new Set(duplicates)].join(', ')}`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    needsReview: warnings.length > 0,
    validatedValue: name.trim(),
  }
}

// ============================================================================
// Description Validation
// ============================================================================

/**
 * Validate product descriptions
 */
export function validateDescription(
  shortDesc: string,
  longDesc: string
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate short description
  if (shortDesc.length > 150) {
    errors.push(`Short description exceeds 150 characters (current: ${shortDesc.length})`)
  }

  // Validate long description
  if (longDesc.length > 1000) {
    errors.push(`Long description exceeds 1000 characters (current: ${longDesc.length})`)
  }

  // Check for recall notices
  const hasRecall = shortDesc.toLowerCase().includes('recall') || longDesc.toLowerCase().includes('recall')
  if (hasRecall) {
    warnings.push('Contains recall notice - requires human review')
  }

  // Check for safety warnings
  const hasSafetyWarning = /\b(warning|caution|danger|hazard)\b/i.test(longDesc)
  if (hasSafetyWarning) {
    warnings.push('Contains safety-related content - verify accuracy')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    needsReview: warnings.length > 0,
  }
}

// ============================================================================
// Confidence Validation
// ============================================================================

/**
 * Validate AI confidence score and determine if review is needed
 */
export function validateConfidence(
  confidence: number,
  autoApproveThreshold: number = 0.8
): { isValid: boolean; needsReview: boolean; label: 'high' | 'medium' | 'low' } {
  const isValid = typeof confidence === 'number' && confidence >= 0 && confidence <= 1

  if (!isValid) {
    return { isValid: false, needsReview: true, label: 'low' }
  }

  let label: 'high' | 'medium' | 'low'
  if (confidence >= 0.8) {
    label = 'high'
  } else if (confidence >= 0.5) {
    label = 'medium'
  } else {
    label = 'low'
  }

  return {
    isValid: true,
    needsReview: confidence < autoApproveThreshold,
    label,
  }
}

// ============================================================================
// Combined Validation
// ============================================================================

/**
 * Aggregate multiple validation results
 */
export function aggregateValidationResults(
  results: ValidationResult[]
): ValidationResult {
  const allErrors: string[] = []
  const allWarnings: string[] = []
  let anyNeedsReview = false

  for (const result of results) {
    allErrors.push(...result.errors)
    allWarnings.push(...result.warnings)
    if (result.needsReview) anyNeedsReview = true
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    needsReview: anyNeedsReview || allWarnings.length > 0,
  }
}

/**
 * Format validation result for logging
 */
export function formatValidationForLog(result: ValidationResult): string {
  const parts: string[] = []

  if (result.errors.length > 0) {
    parts.push(`Errors: ${result.errors.join('; ')}`)
  }

  if (result.warnings.length > 0) {
    parts.push(`Warnings: ${result.warnings.join('; ')}`)
  }

  if (parts.length === 0) {
    return 'Validation passed'
  }

  return parts.join(' | ')
}
