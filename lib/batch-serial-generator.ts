/**
 * Batch Serial Number Generator with Template Support
 * Generates multiple serial numbers for production runs using templates
 */

export interface SerialNumberTemplate {
  id: string
  name: string
  format_template: string
  model_pattern?: string
  version_pattern?: string
  num_wells_pattern?: string
  kind_pattern?: string
  color_code_pattern?: string
  year_format?: string
  month_format?: string
  prefix_default?: string
  counter_padding?: number
  suffix_pattern?: string
  counter_start?: number
  counter_increment?: number
  validation_regex?: string
  product_type?: string
  facility_code?: string
}

export interface SerialGenerationRequest {
  template: SerialNumberTemplate
  productionRunId: string
  quantity: number
  startingCounter?: number
  overrides?: {
    model?: string
    prefix?: string
    facility_code?: string
    year?: string
    month?: string
  }
}

export interface GeneratedSerial {
  serial_number: string
  model: string
  part_number: string
  counter: number
  version?: string
  year?: string
  month?: string
  prefix?: string
  suffix?: string
  facility_code?: string
  sequence_number: number
  template_id: string
  production_run_id: string
}

export interface BatchSerialResult {
  success: boolean
  serials: GeneratedSerial[]
  errors: string[]
  template_used: SerialNumberTemplate
  total_generated: number
}

/**
 * Generate batch serial numbers using template
 */
export function generateBatchSerialNumbers(request: SerialGenerationRequest): BatchSerialResult {
  const errors: string[] = []
  const serials: GeneratedSerial[] = []
  
  try {
    // Validate request
    if (!request.template || !request.productionRunId || request.quantity <= 0) {
      errors.push('Invalid request parameters')
      return {
        success: false,
        serials: [],
        errors,
        template_used: request.template,
        total_generated: 0
      }
    }

    // Get current date for date placeholders
    const currentDate = new Date()
    const year = request.overrides?.year || formatYear(currentDate, request.template.year_format || 'YY')
    const month = request.overrides?.month || formatMonth(currentDate, request.template.month_format || 'MM')
    
    // Get starting counter
    const startingCounter = request.startingCounter || request.template.counter_start || 1
    const counterIncrement = request.template.counter_increment || 1
    
    // Generate serials for requested quantity
    for (let i = 0; i < request.quantity; i++) {
      const sequenceNumber = i + 1
      const counter = startingCounter + (i * counterIncrement)
      
      // Build serial number components
      const components = {
        MODEL: request.overrides?.model || request.template.model_pattern || 'UNKNOWN',
        VERSION: request.template.version_pattern || 'P4V3C',
        YEAR: year,
        MONTH: month,
        PREFIX: request.overrides?.prefix || request.template.prefix_default || 'LAB',
        COUNTER: counter.toString().padStart(request.template.counter_padding || 5, '0'),
        SUFFIX: request.template.suffix_pattern || 'xxx',
        FACILITY: request.overrides?.facility_code || request.template.facility_code || '',
        PRODUCTION_RUN: request.productionRunId.slice(0, 8)
      }
      
      // Generate serial number using template
      let serialNumber = request.template.format_template
      
      // Replace all placeholders
      Object.entries(components).forEach(([key, value]) => {
        const placeholder = `{${key}}`
        serialNumber = serialNumber.replace(new RegExp(placeholder, 'g'), value)
      })
      
      // Validate generated serial number
      if (request.template.validation_regex) {
        const regex = new RegExp(request.template.validation_regex)
        if (!regex.test(serialNumber)) {
          errors.push(`Generated serial number "${serialNumber}" does not match validation pattern`)
          continue
        }
      }
      
      // Create generated serial object
      const generatedSerial: GeneratedSerial = {
        serial_number: serialNumber,
        model: components.MODEL,
        part_number: `${request.template.model_pattern || 'P/N'}-${request.productionRunId.slice(0, 8)}`,
        counter,
        version: components.VERSION,
        year: components.YEAR,
        month: components.MONTH,
        prefix: components.PREFIX,
        suffix: components.SUFFIX,
        facility_code: components.FACILITY,
        sequence_number: sequenceNumber,
        template_id: request.template.id,
        production_run_id: request.productionRunId
      }
      
      serials.push(generatedSerial)
    }
    
    return {
      success: errors.length === 0,
      serials,
      errors,
      template_used: request.template,
      total_generated: serials.length
    }
    
  } catch (error) {
    errors.push(`Generation failed: ${error.message}`)
    return {
      success: false,
      serials: [],
      errors,
      template_used: request.template,
      total_generated: 0
    }
  }
}

/**
 * Preview serial numbers without generating them
 */
export function previewSerialNumbers(request: SerialGenerationRequest, count: number = 3): string[] {
  const previewRequest = {
    ...request,
    quantity: Math.min(count, request.quantity)
  }
  
  const result = generateBatchSerialNumbers(previewRequest)
  return result.serials.map(s => s.serial_number)
}

/**
 * Validate serial number template format
 */
export function validateTemplate(template: SerialNumberTemplate): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check required fields
  if (!template.format_template) {
    errors.push('Format template is required')
  }
  
  if (!template.name) {
    errors.push('Template name is required')
  }
  
  // Check for valid placeholders
  const validPlaceholders = ['MODEL', 'VERSION', 'YEAR', 'MONTH', 'PREFIX', 'COUNTER', 'SUFFIX', 'FACILITY', 'PRODUCTION_RUN']
  const foundPlaceholders = template.format_template.match(/\\{(\\w+)\\}/g) || []
  
  foundPlaceholders.forEach(placeholder => {
    const key = placeholder.replace(/[{}]/g, '')
    if (!validPlaceholders.includes(key)) {
      errors.push(`Invalid placeholder: ${placeholder}. Valid placeholders: ${validPlaceholders.map(p => `{${p}}`).join(', ')}`)
    }
  })
  
  // Check counter padding
  if (template.counter_padding && (template.counter_padding < 1 || template.counter_padding > 10)) {
    errors.push('Counter padding must be between 1 and 10')
  }
  
  // Check regex if provided
  if (template.validation_regex) {
    try {
      new RegExp(template.validation_regex)
    } catch (e) {
      errors.push(`Invalid validation regex: ${e.message}`)
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Get next available counter for a template
 */
export async function getNextAvailableCounter(
  templateId: string,
  dbQuery: (sql: string, params: any[]) => Promise<any>
): Promise<number> {
  try {
    const result = await dbQuery(
      `SELECT MAX(counter) as max_counter 
       FROM serial_number_pool 
       WHERE template_id = ? AND status != 'cancelled'`,
      [templateId]
    )
    
    return (result?.max_counter || 0) + 1
  } catch (error) {
    console.error('Error getting next counter:', error)
    return 1
  }
}

/**
 * Check for serial number conflicts
 */
export async function checkSerialConflicts(
  serialNumbers: string[],
  dbQuery: (sql: string, params: any[]) => Promise<any[]>
): Promise<string[]> {
  if (serialNumbers.length === 0) return []
  
  try {
    const placeholders = serialNumbers.map(() => '?').join(',')
    const conflicts = await dbQuery(
      `SELECT serial_number 
       FROM serial_number_pool 
       WHERE serial_number IN (${placeholders}) AND status != 'cancelled'`,
      serialNumbers
    )
    
    return conflicts.map(c => c.serial_number)
  } catch (error) {
    console.error('Error checking conflicts:', error)
    return []
  }
}

/**
 * Helper functions for date formatting
 */
function formatYear(date: Date, format: string): string {
  const year = date.getFullYear()
  return format === 'YYYY' ? year.toString() : year.toString().slice(-2)
}

function formatMonth(date: Date, format: string): string {
  const month = date.getMonth() + 1
  return format === 'MM' ? month.toString().padStart(2, '0') : month.toString()
}

/**
 * Parse template format to extract components
 */
export function parseTemplateFormat(formatTemplate: string): {
  placeholders: string[]
  structure: string
  example: string
} {
  const placeholders = (formatTemplate.match(/\\{(\\w+)\\}/g) || []).map(p => p.replace(/[{}]/g, ''))
  
  // Create example by replacing placeholders with sample values
  const sampleValues = {
    MODEL: 'RTPCR',
    VERSION: 'P4V3C',
    YEAR: '25',
    MONTH: '07',
    PREFIX: 'LAB',
    COUNTER: '00001',
    SUFFIX: 'xxx',
    FACILITY: 'FAC1',
    PRODUCTION_RUN: 'abcd1234'
  }
  
  let example = formatTemplate
  Object.entries(sampleValues).forEach(([key, value]) => {
    example = example.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  })
  
  return {
    placeholders,
    structure: formatTemplate,
    example
  }
}