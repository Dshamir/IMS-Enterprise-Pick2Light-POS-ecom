/**
 * Serial Number Generation Utilities
 * Supports both legacy format and custom user-defined formats
 */

export interface SerialNumberConfig {
  model?: string
  prefix?: string
  includeDate?: boolean
  includeCounter?: boolean
  counterPadding?: number
  customFormat?: string
  partNumber?: string
}

export interface SerialNumberResult {
  serialNumber: string
  serialNumberCustom: string
  model: string
  partNumber: string
  counter: number
}

/**
 * Generate serial number based on configuration
 * Supports formats like "RTPCR P4V3C202103LAB00001xxx"
 */
export function generateSerialNumber(
  productName: string,
  productionRunId: string,
  config: SerialNumberConfig = {},
  instanceIndex: number = 0
): SerialNumberResult {
  const currentDate = new Date()
  const year = currentDate.getFullYear().toString().slice(-2)
  const month = currentDate.getMonth() + 1
  const monthStr = month.toString().padStart(2, '0')
  
  // Default legacy format for backward compatibility
  const prefix = config.prefix || productName.split(' ').map(word => word.charAt(0).toUpperCase()).join('')
  const timestamp = Date.now().toString().slice(-6)
  const runShort = productionRunId.slice(0, 8)
  const legacySerial = `${prefix}-${timestamp}-${runShort}`
  
  // Custom format generation
  let customSerial = config.customFormat || ''
  let model = config.model || prefix
  let partNumber = config.partNumber || ''
  let counter = instanceIndex + 1
  
  if (config.customFormat) {
    // Replace placeholders in custom format
    customSerial = config.customFormat
      .replace('{MODEL}', model)
      .replace('{PART_NUMBER}', partNumber)
      .replace('{YEAR}', year)
      .replace('{MONTH}', monthStr)
      .replace('{COUNTER}', counter.toString().padStart(config.counterPadding || 5, '0'))
      .replace('{PREFIX}', config.prefix || 'LAB')
  } else {
    // Generate RTPCR-style format as default custom format
    const counterStr = counter.toString().padStart(5, '0')
    customSerial = `${model} P4V3C${year}${monthStr}${config.prefix || 'LAB'}${counterStr}xxx`
  }
  
  return {
    serialNumber: legacySerial,
    serialNumberCustom: customSerial,
    model,
    partNumber,
    counter
  }
}

/**
 * Parse existing serial number to extract components
 */
export function parseSerialNumber(serialNumber: string): Partial<SerialNumberResult> {
  // Try to parse RTPCR-style format first
  const rtpcrMatch = serialNumber.match(/^(\w+)\s+P4V3C(\d{4})(\d{2})(\w+)(\d{5})xxx$/i)
  if (rtpcrMatch) {
    return {
      model: rtpcrMatch[1],
      counter: parseInt(rtpcrMatch[5], 10),
      serialNumberCustom: serialNumber
    }
  }
  
  // Try to parse legacy format
  const legacyMatch = serialNumber.match(/^(\w+)-(\d+)-(\w+)$/)
  if (legacyMatch) {
    return {
      model: legacyMatch[1],
      serialNumber: serialNumber
    }
  }
  
  return {
    serialNumberCustom: serialNumber
  }
}

/**
 * Validate serial number format
 */
export function validateSerialNumber(serialNumber: string, format?: string): boolean {
  if (!serialNumber) return false
  
  if (format === 'rtpcr') {
    return /^(\w+)\s+P4V3C(\d{4})(\d{2})(\w+)(\d{5})xxx$/i.test(serialNumber)
  }
  
  if (format === 'legacy') {
    return /^(\w+)-(\d+)-(\w+)$/.test(serialNumber)
  }
  
  // Default: accept any non-empty string
  return serialNumber.trim().length > 0
}

/**
 * Get next available counter for a given model/part combination
 */
export async function getNextCounter(
  model: string,
  partNumber?: string,
  dbQuery?: (sql: string, params: any[]) => Promise<any>
): Promise<number> {
  if (!dbQuery) {
    // Return default counter if no DB query function provided
    return 1
  }
  
  try {
    const result = await dbQuery(
      `SELECT MAX(counter) as max_counter 
       FROM product_instances 
       WHERE model = ? AND (part_number = ? OR (part_number IS NULL AND ? IS NULL))`,
      [model, partNumber, partNumber]
    )
    
    return (result?.max_counter || 0) + 1
  } catch (error) {
    console.error('Error getting next counter:', error)
    return 1
  }
}