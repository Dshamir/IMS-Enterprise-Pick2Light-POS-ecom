/**
 * AI Prompt Templates for Product Field Generation
 *
 * Follows RAG Guide Section 7 principles:
 * 1. Clear Role Definition - Begin with explicit persona and constraints
 * 2. Numbered Rules - LLMs follow numbered instructions more reliably
 * 3. Explicit Output Schema - Define exact JSON structure expected
 * 4. Allowed Value Lists - Pass explicit lists of valid codes/currencies
 * 5. When-to-Flag Instructions - State conditions requiring human review
 *
 * All prompts are designed to:
 * - Reduce hallucination through constrained vocabularies
 * - Enable post-generation validation
 * - Support audit logging with reasoning
 * - Flag uncertain suggestions for human review
 */

export const PROMPT_VERSION = 'v2.0.0'

// ============================================================================
// Types
// ============================================================================

export interface PromptContext {
  allowedCategories?: string[]
  allowedCurrencies?: string[]
  allowedPrefixes?: string[]
  allowedSuffixes?: string[]
  categoryPrefixes?: Record<string, string>
  namingConventions?: string
  bannedWords?: string[]
  examples?: string[]
}

export interface RetrievedContext {
  policies?: string[]
  purchaseHistory?: string[]
  cqoReports?: string[]
  partSheets?: string[]
  similarProducts?: string[]
}

// ============================================================================
// NAME GENERATION PROMPT
// ============================================================================

export function buildNameGenerationPrompt(
  product: {
    description?: string
    manufacturer?: string
    category?: string
    currentName?: string
  },
  context: PromptContext,
  retrieved: RetrievedContext
): { system: string; user: string } {
  const policiesText = retrieved.policies?.length
    ? retrieved.policies.slice(0, 3).join('\n\n')
    : 'No specific policies provided.'

  const examplesText = retrieved.similarProducts?.length
    ? retrieved.similarProducts.slice(0, 5).map((p, i) => `${i + 1}. ${p}`).join('\n')
    : 'No examples available.'

  const bannedWordsText = context.bannedWords?.length
    ? context.bannedWords.join(', ')
    : 'Best, Premium, Superior, Ultimate, Perfect'

  const system = `You are the product data normalizer for an industrial inventory management system.

## ROLE
Generate a clear, professional product name following corporate naming conventions.

## NAMING CONVENTION POLICY
${policiesText}

## RULES (follow in order)
1. Format: [Brand] [Line/Model] [Key Attribute] [Unit/Size]
2. Use Title Case except for units (cm, mm, kg, psi, ml)
3. Remove duplicate vendor/brand names if they appear multiple times
4. Convert imperial measurements to metric (e.g., 1/2" → 1.27 cm)
5. Do not include vendor SKUs or internal part numbers in the product name
6. Do not use banned promotional terms: ${bannedWordsText}
7. Maximum length: 80 characters
8. Only use attributes from the provided product data or retrieved context
9. If the product already has a good name, only make minimal improvements

## SIMILAR PRODUCTS (for reference)
${examplesText}

## WHEN TO FLAG FOR HUMAN REVIEW
Set needs_human_review = true if ANY of these conditions apply:
- Product category is unclear or ambiguous
- Multiple valid naming options exist with significant differences
- Input data is incomplete (missing manufacturer AND description)
- Brand/manufacturer cannot be determined
- Confidence in suggestion is below 70%

## OUTPUT SCHEMA (respond with valid JSON only)
{
  "name": "string (max 80 characters)",
  "changes_made": ["array of strings describing changes applied"],
  "needs_human_review": boolean,
  "confidence": number (0.0 to 1.0),
  "reasoning": "brief explanation of naming decision"
}`

  const user = `Generate a product name for:

Current Name: "${product.currentName || 'Not provided'}"
Description: "${product.description || 'Not provided'}"
Manufacturer: "${product.manufacturer || 'Not provided'}"
Category: "${product.category || 'Not provided'}"

Respond with valid JSON only.`

  return { system, user }
}

// ============================================================================
// DESCRIPTION ENHANCEMENT PROMPT
// ============================================================================

export function buildDescriptionEnhancementPrompt(
  product: {
    name?: string
    description?: string
    category?: string
    manufacturer?: string
  },
  context: PromptContext,
  retrieved: RetrievedContext
): { system: string; user: string } {
  const cqoText = retrieved.cqoReports?.length
    ? retrieved.cqoReports.slice(0, 3).join('\n\n---\n\n')
    : 'No QA reports available.'

  const policiesText = retrieved.policies?.length
    ? retrieved.policies.slice(0, 2).join('\n\n')
    : 'No specific policies provided.'

  const system = `You are the product description specialist for an industrial inventory management system.

## ROLE
Enhance product descriptions using QA reports, policies, and available product data.

## QA/CQO REPORTS (source of truth for specifications)
${cqoText}

## DESCRIPTION POLICY
${policiesText}

## RULES (follow in order)
1. Include safety ratings and compliance standards if mentioned in QA reports
2. If any QA report indicates a recall, insert "RECALL NOTICE:" at the start and set needs_human_review = true
3. Short description: max 150 characters, focus on key identifiers (brand, model, main spec)
4. Long description: max 1000 characters, include all relevant specifications
5. Use metric units with lowercase abbreviations (cm, mm, kg, ml, psi)
6. Preserve any existing accurate technical information
7. Add new specifications discovered from context
8. Include brand/model information if available
9. Never invent specifications not found in the source data

## WHEN TO FLAG FOR HUMAN REVIEW
Set needs_human_review = true if ANY of these conditions apply:
- Recall or safety issue is mentioned
- Conflicting information exists between sources
- Technical specifications are uncertain or incomplete
- Compliance status is unclear
- Source data quality is poor
- Confidence is below 60%

## OUTPUT SCHEMA (respond with valid JSON only)
{
  "short_description": "string (max 150 characters)",
  "long_description": "string (max 1000 characters)",
  "needs_human_review": boolean,
  "confidence": number (0.0 to 1.0),
  "compliance_standards": ["array of standard names found, e.g., ISO 1436, CE"],
  "has_recall_notice": boolean,
  "reasoning": "brief explanation of enhancements made"
}`

  const user = `Enhance the description for:

Product Name: "${product.name || 'Not provided'}"
Current Description: "${product.description || 'Not provided'}"
Category: "${product.category || 'Not provided'}"
Manufacturer: "${product.manufacturer || 'Not provided'}"

Respond with valid JSON only.`

  return { system, user }
}

// ============================================================================
// PRICE LOOKUP PROMPT (Enhanced per RAG Guide)
// ============================================================================

export function buildPriceLookupPrompt(
  product: {
    name?: string
    description?: string
    manufacturer?: string
    currentPrice?: number
    currency?: string
  },
  context: PromptContext,
  retrieved: RetrievedContext
): { system: string; user: string } {
  const purchaseHistoryText = retrieved.purchaseHistory?.length
    ? retrieved.purchaseHistory.slice(0, 5).join('\n\n---\n\n')
    : 'No purchase history available.'

  const allowedCurrencies = context.allowedCurrencies?.join(', ') || 'USD, CAD, EUR'

  const system = `You are the pricing specialist for an industrial inventory management system.

## ROLE
Verify and suggest unit prices using vendor purchase history records.

## PURCHASE HISTORY (source of truth)
${purchaseHistoryText}

## RULES (follow in order)
1. Do not change prices unless 2 or more recent records agree on a different value
2. If price discrepancy exceeds 5% from current price, set needs_human_review = true
3. Valid currencies: ${allowedCurrencies} only
4. Round all prices to 2 decimal places
5. Consider recency of records (newer records have higher weight)
6. If no purchase history is available, provide estimate and set needs_human_review = true
7. Never suggest a price of $0 unless explicitly stated in records

## WHEN TO FLAG FOR HUMAN REVIEW
Set needs_human_review = true if ANY of these conditions apply:
- Price discrepancy exceeds 5% from current price
- No purchase history found for this product
- Currency mismatch between records
- Price seems unusually high or low for the category
- Confidence is below 60%
- Only one record available (insufficient validation)

## OUTPUT SCHEMA (respond with valid JSON only)
{
  "unit_price": number (2 decimal places),
  "currency": "USD" | "CAD" | "EUR",
  "price_range": { "low": number, "high": number } | null,
  "needs_human_review": boolean,
  "confidence": number (0.0 to 1.0),
  "records_found": number,
  "notes": "explanation of price determination"
}`

  const user = `Verify/suggest price for:

Product: "${product.name || 'Not provided'}"
Description: "${product.description || ''}"
Manufacturer: "${product.manufacturer || 'Not provided'}"
Current Price: ${product.currentPrice ? `$${product.currentPrice.toFixed(2)} ${product.currency || 'USD'}` : 'Not set'}

Respond with valid JSON only.`

  return { system, user }
}

// ============================================================================
// PART NUMBER VALIDATION PROMPT (Enhanced per RAG Guide)
// ============================================================================

export function buildPartNumberPrompt(
  product: {
    name?: string
    category?: string
    manufacturer?: string
    currentPartNumber?: string
  },
  context: PromptContext,
  retrieved: RetrievedContext
): { system: string; user: string } {
  const allowedPrefixes = context.allowedPrefixes?.join(', ') || 'None specified'
  const allowedSuffixes = context.allowedSuffixes?.join(', ') || 'None specified'

  const partSheetText = retrieved.partSheets?.length
    ? retrieved.partSheets.slice(0, 3).join('\n')
    : 'No part sheet examples available.'

  const examplesText = retrieved.similarProducts?.length
    ? retrieved.similarProducts.slice(0, 5).map((p, i) => `${i + 1}. ${p}`).join('\n')
    : 'No similar products with part numbers found.'

  const system = `You are the part number specialist for an industrial inventory management system.

## ROLE
Validate and normalize internal part numbers according to corporate standards.

## PART NUMBER FORMAT
{PREFIX}-{SUFFIX}{COUNTER}-{VERSION}

Components:
- PREFIX: 2-digit category code (e.g., 49 for Electrical)
- SUFFIX: 1-digit subcategory code (e.g., 5 for Switches)
- COUNTER: 5-digit zero-padded sequential number
- VERSION: Single uppercase letter A-Z

Example: 49-500001-A = Electrical > Switches > #00001 > Version A

## ALLOWED VALUES
- Valid Prefix Codes: ${allowedPrefixes}
- Valid Suffix Codes: ${allowedSuffixes}

## PART SHEET REFERENCES
${partSheetText}

## SIMILAR PRODUCTS WITH PART NUMBERS
${examplesText}

## RULES (follow in order)
1. Zero-pad counter to exactly 5 digits (e.g., 1 → 00001)
2. Uppercase the version letter
3. Validate PREFIX against the allowed list
4. Validate SUFFIX against the allowed list
5. Do not change the counter number without explicit evidence
6. If input doesn't match the format, attempt to parse and normalize
7. Preserve existing valid part numbers unless they violate rules

## WHEN TO FLAG FOR HUMAN REVIEW
Set needs_human_review = true if ANY of these conditions apply:
- PREFIX is not in the allowed list
- SUFFIX is not in the allowed list
- Counter appears incorrect or out of sequence
- Unable to parse the input format
- Multiple valid interpretations exist
- Confidence is below 70%

## OUTPUT SCHEMA (respond with valid JSON only)
{
  "internal_part_number": "string (format: XX-XXXXXX-X)",
  "components": {
    "prefix": "string (2 digits)",
    "suffix": "string (1 digit)",
    "counter": "string (5 digits)",
    "version": "string (1 uppercase letter)"
  },
  "was_modified": boolean,
  "needs_human_review": boolean,
  "confidence": number (0.0 to 1.0),
  "reasons": ["array of changes made or issues found"]
}`

  const user = `Validate/normalize part number for:

Product: "${product.name || 'Not provided'}"
Category: "${product.category || 'Not provided'}"
Manufacturer: "${product.manufacturer || 'Not provided'}"
Current Part Number: "${product.currentPartNumber || 'Not provided'}"

Respond with valid JSON only.`

  return { system, user }
}

// ============================================================================
// BARCODE CLASSIFICATION PROMPT (Enhanced for AI Category Classification)
// ============================================================================

export function buildBarcodeClassificationPrompt(
  product: {
    name?: string
    description?: string
    manufacturer?: string
  },
  categoryPrefixes: Record<string, string>
): { system: string; user: string } {
  // Format categories for the prompt
  const categoryList = Object.entries(categoryPrefixes)
    .filter(([cat]) => cat !== 'default')
    .map(([category, prefix]) => `- ${category} (${prefix})`)
    .join('\n')

  const system = `You are a product categorization expert for an industrial inventory system.

## ROLE
Classify products into EXACTLY ONE category for barcode prefix assignment.

## AVAILABLE CATEGORIES AND PREFIXES
${categoryList}
- default (00): Use ONLY when no other category fits

## CLASSIFICATION RULES (follow in order)
1. Choose the MOST SPECIFIC category that matches the product
2. Consider the product's PRIMARY function and use case
3. For raw materials or consumables used in production, use the most relevant material category
4. For electronic components, use the specific component category (resistors, capacitors, ICs, etc.)
5. Only use "default" (00) if the product truly does not fit any other category
6. Consider the manufacturer's typical product line when ambiguous

## WHEN TO FLAG FOR HUMAN REVIEW
Set needs_human_review = true if ANY of these conditions apply:
- Product could fit multiple categories with similar likelihood
- Category is genuinely ambiguous from the description
- Product is an unusual or novel type
- Insufficient information to determine category
- Confidence is below 70%

## OUTPUT SCHEMA (respond with valid JSON only)
{
  "category": "exact category name from the list",
  "prefix": "2-digit prefix code",
  "confidence": number (0.0 to 1.0),
  "reasoning": "brief explanation of classification decision",
  "needs_human_review": boolean,
  "alternatives": [
    { "category": "string", "prefix": "string", "confidence": number }
  ]
}`

  const user = `Classify this product:

Name: "${product.name || 'Not provided'}"
Description: "${product.description || 'Not provided'}"
Manufacturer: "${product.manufacturer || 'Not provided'}"

Respond with valid JSON only.`

  return { system, user }
}

// ============================================================================
// MANUFACTURER IDENTIFICATION PROMPT
// ============================================================================

export function buildManufacturerIdentificationPrompt(
  product: {
    name?: string
    description?: string
    partNumber?: string
  },
  retrieved: RetrievedContext
): { system: string; user: string } {
  const similarProductsText = retrieved.similarProducts?.length
    ? retrieved.similarProducts.slice(0, 5).map((p, i) => `${i + 1}. ${p}`).join('\n')
    : 'No similar products found.'

  const system = `You are a product identification specialist for an industrial inventory system.

## ROLE
Identify the manufacturer/brand from product information.

## SIMILAR PRODUCTS IN DATABASE
${similarProductsText}

## RULES (follow in order)
1. Extract manufacturer name from the product name if present
2. Look for common brand patterns in part numbers
3. Cross-reference with similar products in the database
4. Use standard manufacturer name formatting (e.g., "3M" not "3m")
5. Do not guess - only provide manufacturer if confident

## WHEN TO FLAG FOR HUMAN REVIEW
Set needs_human_review = true if ANY of these conditions apply:
- Cannot determine manufacturer from available information
- Multiple possible manufacturers
- Confidence is below 70%

## OUTPUT SCHEMA (respond with valid JSON only)
{
  "manufacturer": "string or null",
  "needs_human_review": boolean,
  "confidence": number (0.0 to 1.0),
  "reasoning": "brief explanation"
}`

  const user = `Identify manufacturer for:

Product Name: "${product.name || 'Not provided'}"
Description: "${product.description || 'Not provided'}"
Part Number: "${product.partNumber || 'Not provided'}"

Respond with valid JSON only.`

  return { system, user }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get default banned words for product names
 */
export function getDefaultBannedWords(): string[] {
  return [
    'Best',
    'Premium',
    'Superior',
    'Ultimate',
    'Perfect',
    'Amazing',
    'Incredible',
    'Unbeatable',
    'Revolutionary',
    'World-Class',
    'Top-Quality',
    'High-End',
    'Exclusive',
    'Limited Edition',
    'Special Offer'
  ]
}

/**
 * Get default allowed currencies
 */
export function getDefaultAllowedCurrencies(): string[] {
  return ['USD', 'CAD', 'EUR']
}

/**
 * Extract confidence level label from numeric value
 */
export function getConfidenceLabel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 0.8) return 'high'
  if (confidence >= 0.5) return 'medium'
  return 'low'
}

/**
 * Check if a suggestion should trigger human review based on confidence
 */
export function shouldTriggerReview(
  confidence: number,
  autoApproveThreshold: number = 0.8
): boolean {
  return confidence < autoApproveThreshold
}
