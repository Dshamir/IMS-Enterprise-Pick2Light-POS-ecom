import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/supabase-helpers'
import { v4 as uuidv4 } from 'uuid'

interface RegistryPattern {
  pattern: string
  count: number
  examples: string[]
  fields: {
    model?: string
    kind?: string
    version?: string
    num_wells?: string
    color_code?: string
    use_case?: string
    production_year?: number
  }
}

export async function GET(request: NextRequest) {
  try {
    // Fetch all serial numbers from registry
    const serials = await sqliteHelpers.db.all(`
      SELECT 
        serial_number,
        model,
        kind,
        use_case,
        version,
        num_wells,
        color_code,
        color,
        production_year,
        counter,
        created_at
      FROM serial_number_registry
      ORDER BY created_at DESC
      LIMIT 1000
    `)

    // Analyze patterns
    const patterns: Map<string, RegistryPattern> = new Map()
    
    for (const serial of serials) {
      // Extract pattern from serial number
      const patternKey = analyzeSerialPattern(serial.serial_number, serial)
      
      if (!patterns.has(patternKey)) {
        patterns.set(patternKey, {
          pattern: patternKey,
          count: 0,
          examples: [],
          fields: extractFieldsFromSerial(serial)
        })
      }
      
      const pattern = patterns.get(patternKey)!
      pattern.count++
      if (pattern.examples.length < 3) {
        pattern.examples.push(serial.serial_number)
      }
    }

    // Sort patterns by frequency
    const sortedPatterns = Array.from(patterns.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // Top 10 patterns

    return NextResponse.json({
      totalSerials: serials.length,
      patterns: sortedPatterns,
      suggestions: generateTemplateSuggestions(sortedPatterns)
    })
  } catch (error) {
    console.error('Error analyzing registry:', error)
    return NextResponse.json({ error: 'Failed to analyze registry' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { createTemplates = false } = await request.json()
    
    if (!createTemplates) {
      return NextResponse.json({ error: 'createTemplates flag required' }, { status: 400 })
    }

    // Get analysis data
    const analysisResponse = await GET(request)
    const analysisData = await analysisResponse.json()
    
    if (!analysisData.suggestions) {
      return NextResponse.json({ error: 'No template suggestions found' }, { status: 400 })
    }

    const createdTemplates = []
    
    // Create templates based on suggestions
    for (const suggestion of analysisData.suggestions) {
      const templateId = uuidv4()
      const now = new Date().toISOString()
      
      await sqliteHelpers.db.run(`
        INSERT INTO serial_number_templates (
          id, name, description, format_template, model_pattern, version_pattern,
          year_format, month_format, prefix_default, counter_padding, suffix_pattern,
          counter_start, counter_increment, validation_regex, product_type,
          facility_code, is_active, is_default, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        templateId,
        suggestion.name,
        suggestion.description,
        suggestion.format_template,
        suggestion.model_pattern || '',
        suggestion.version_pattern || '',
        suggestion.year_format || 'YY',
        suggestion.month_format || 'MM',
        suggestion.prefix_default || '',
        suggestion.counter_padding || 5,
        suggestion.suffix_pattern || '',
        suggestion.counter_start || 1,
        suggestion.counter_increment || 1,
        suggestion.validation_regex || '',
        suggestion.product_type || 'Generated from Registry',
        suggestion.facility_code || '',
        1, // is_active
        createdTemplates.length === 0 ? 1 : 0, // first one is default
        now,
        now
      ])
      
      createdTemplates.push({
        id: templateId,
        name: suggestion.name,
        format_template: suggestion.format_template
      })
    }

    return NextResponse.json({
      success: true,
      created: createdTemplates.length,
      templates: createdTemplates
    })
  } catch (error) {
    console.error('Error creating templates from registry:', error)
    return NextResponse.json({ error: 'Failed to create templates' }, { status: 500 })
  }
}

function analyzeSerialPattern(serialNumber: string, serial: any): string {
  // Try to identify the pattern structure
  // Format: RTPCR25PIV-RTPCR-V5W-00072
  const parts = serialNumber.split('-')
  
  if (parts.length === 4) {
    // Standard RTPCR format
    return 'RTPCR_STANDARD'
  } else if (parts.length === 3) {
    // Alternative format
    return 'THREE_PART'
  } else if (parts.length === 2) {
    // Two part format
    return 'TWO_PART'
  } else if (serialNumber.includes(' ')) {
    // Space-separated format (legacy)
    return 'LEGACY_SPACE'
  } else {
    // Single continuous format
    return 'CONTINUOUS'
  }
}

function extractFieldsFromSerial(serial: any) {
  return {
    model: serial.model || '',
    kind: serial.kind || '',
    version: serial.version || '',
    num_wells: serial.num_wells || '',
    color_code: serial.color_code || '',
    use_case: serial.use_case || '',
    production_year: serial.production_year || new Date().getFullYear()
  }
}

function generateTemplateSuggestions(patterns: RegistryPattern[]) {
  const suggestions = []
  
  for (const pattern of patterns) {
    const fields = pattern.fields
    
    switch (pattern.pattern) {
      case 'RTPCR_STANDARD':
        suggestions.push({
          name: `RTPCR Standard Format (${pattern.count} serials)`,
          description: `Generated from ${pattern.count} serial numbers in registry`,
          format_template: '{MODEL}{NUM_WELLS}-{KIND}-{VERSION}{COLOR_CODE}-{COUNTER}',
          model_pattern: fields.model || 'RTPCR25',
          version_pattern: fields.version || 'V5',
          prefix_default: fields.use_case || 'LAB',
          counter_padding: 5,
          product_type: 'RT-qPCR Device',
          validation_regex: '^[A-Z0-9]+-[A-Z]+-[A-Z0-9]+-\\d{5}$'
        })
        break
        
      case 'LEGACY_SPACE':
        suggestions.push({
          name: `Legacy Space Format (${pattern.count} serials)`,
          description: `Legacy format with spaces from ${pattern.count} serial numbers`,
          format_template: '{MODEL} P4V3C{YEAR}{MONTH}{PREFIX}{COUNTER}xxx',
          model_pattern: fields.model || 'RTPCR',
          version_pattern: 'P4V3C',
          prefix_default: fields.use_case || 'LAB',
          counter_padding: 5,
          suffix_pattern: 'xxx',
          product_type: 'Legacy RT-qPCR Device'
        })
        break
        
      case 'THREE_PART':
        suggestions.push({
          name: `Three Part Format (${pattern.count} serials)`,
          description: `Three-part format from ${pattern.count} serial numbers`,
          format_template: '{MODEL}-{VERSION}-{COUNTER}',
          model_pattern: fields.model || 'LAB',
          version_pattern: fields.version || 'V1',
          counter_padding: 5,
          product_type: 'Laboratory Equipment'
        })
        break
        
      default:
        suggestions.push({
          name: `${pattern.pattern} Format (${pattern.count} serials)`,
          description: `Auto-detected format from ${pattern.count} serial numbers`,
          format_template: '{MODEL}-{YEAR}-{MONTH}-{COUNTER}',
          model_pattern: fields.model || 'DEVICE',
          counter_padding: 5,
          product_type: 'General Equipment'
        })
    }
  }
  
  return suggestions.slice(0, 5) // Max 5 suggestions
}