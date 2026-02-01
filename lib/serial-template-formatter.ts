import { type SerialNumberTemplate } from "@/lib/batch-serial-generator"

// Format a serial number using a template
export function formatSerialNumberWithTemplate(
  serialData: {
    model?: string
    num_wells?: number | string
    kind?: string
    production_year?: number
    version?: string
    color_code?: string
    counter: number
    [key: string]: any
  },
  template?: SerialNumberTemplate | null
): string {
  if (!template || !template.format_template) {
    // Fallback to basic concatenation if no template
    return serialData.model || 'UNKNOWN'
  }

  try {
    let formatted = template.format_template

    // Extract year and month from production_year if needed
    const year = serialData.production_year ? String(serialData.production_year) : ''
    const shortYear = year.slice(-2) // Last 2 digits (e.g., '25' from '2025')
    
    // Extract month from production_year if it's in YYYYMM format, otherwise use current month
    let month: number
    if (year.length >= 6) {
      // If production_year is in YYYYMM format (e.g., 202507)
      month = parseInt(year.slice(4, 6)) || new Date().getMonth() + 1
    } else {
      // Default to current month if format is unclear
      month = new Date().getMonth() + 1
    }
    const monthPadded = month.toString().padStart(2, '0')

    // Define replacement map
    const replacements: Record<string, string> = {
      '{MODEL}': serialData.model || '',
      '{NUM_WELLS}': String(serialData.num_wells || ''),
      '{KIND}': serialData.kind || '',
      '{YEAR}': shortYear,
      '{MONTH}': monthPadded,
      '{VERSION}': serialData.version || '',
      '{COLOR_CODE}': serialData.color_code || '',
      '{PREFIX}': serialData.use_case || template.prefix_default || '', // Map use_case to PREFIX
      '{COUNTER}': serialData.counter.toString().padStart(template.counter_padding || 5, '0'),
      '{PRODUCTION_YEAR}': year,
      '{USE_CASE}': serialData.use_case || '',
      '{APPLICATION}': serialData.application || ''
    }

    // Apply replacements
    for (const [placeholder, value] of Object.entries(replacements)) {
      formatted = formatted.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value)
    }

    return formatted

  } catch (error) {
    console.error('Error formatting serial number with template:', error)
    // Fallback to original serial number if formatting fails
    return serialData.model || 'UNKNOWN'
  }
}

// Get the default template format string (Kimera P-IV Format equivalent)
export function getDefaultTemplateFormat(): string {
  return '{MODEL}{NUM_WELLS}-{KIND}-{YEAR}{MONTH}{VERSION}{COLOR_CODE}-{PREFIX}-{COUNTER}'
}

// Preview a template format with sample data
export function previewTemplateFormat(
  templateFormat: string,
  sampleData?: Partial<{
    model: string
    num_wells: number
    kind: string
    production_year: number
    version: string
    color_code: string
    counter: number
    prefix: string
  }>
): string {
  const defaultSample = {
    model: 'RTPCR',
    num_wells: 25,
    kind: 'PIV',
    production_year: 2025,
    version: 'V5',
    color_code: 'W',
    counter: 1,
    prefix: 'LAB',
    ...sampleData
  }

  const mockTemplate: SerialNumberTemplate = {
    id: 'preview',
    name: 'Preview',
    format_template: templateFormat,
    prefix_default: defaultSample.prefix,
    counter_padding: 5
  }

  return formatSerialNumberWithTemplate(defaultSample, mockTemplate)
}

// Extract template components from a formatted serial number (reverse engineering)
export function parseFormattedSerial(formattedSerial: string, template: SerialNumberTemplate): Partial<{
  model: string
  num_wells: number
  kind: string
  year: string
  month: string
  version: string
  color_code: string
  prefix: string
  counter: number
}> {
  const result: any = {}

  try {
    // This is a complex reverse parsing - simplified implementation
    // In a real scenario, you'd need more sophisticated parsing based on the template
    
    // For now, return empty object - this would need custom implementation
    // based on your specific template patterns
    return result

  } catch (error) {
    console.error('Error parsing formatted serial:', error)
    return {}
  }
}

// Validate if a serial number matches a template format
export function validateSerialAgainstTemplate(
  serialNumber: string,
  template: SerialNumberTemplate
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  try {
    if (!serialNumber || !template) {
      errors.push('Serial number or template is missing')
      return { isValid: false, errors }
    }

    // Apply template validation regex if available
    if (template.validation_regex) {
      const regex = new RegExp(template.validation_regex)
      if (!regex.test(serialNumber)) {
        errors.push(`Serial number does not match template pattern: ${template.validation_regex}`)
      }
    }

    // Additional validation logic could go here
    // For example, checking specific field formats, lengths, etc.

    return { isValid: errors.length === 0, errors }

  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return { isValid: false, errors }
  }
}

// Get available template placeholders
export function getAvailablePlaceholders(): Array<{
  placeholder: string
  description: string
  example: string
}> {
  return [
    { placeholder: '{MODEL}', description: 'Product model', example: 'RTPCR' },
    { placeholder: '{NUM_WELLS}', description: 'Number of wells', example: '25' },
    { placeholder: '{KIND}', description: 'Product kind/type', example: 'PIV' },
    { placeholder: '{YEAR}', description: 'Production year (2 digits)', example: '25' },
    { placeholder: '{MONTH}', description: 'Production month (2 digits)', example: '07' },
    { placeholder: '{VERSION}', description: 'Product version', example: 'V5' },
    { placeholder: '{COLOR_CODE}', description: 'Color code', example: 'W' },
    { placeholder: '{PREFIX}', description: 'Prefix from template', example: 'LAB' },
    { placeholder: '{COUNTER}', description: 'Sequential counter (padded)', example: '00001' },
    { placeholder: '{PRODUCTION_YEAR}', description: 'Full production year', example: '2025' },
    { placeholder: '{USE_CASE}', description: 'Use case', example: 'NEX' },
    { placeholder: '{APPLICATION}', description: 'Application', example: 'Testing' }
  ]
}