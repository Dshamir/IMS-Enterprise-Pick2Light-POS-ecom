/**
 * Query Expansion
 *
 * Improves search recall by expanding user queries with:
 * - Synonyms and abbreviations
 * - Unit conversions (10K → 10000)
 * - Common misspellings
 * - Technical term variations
 *
 * This helps find relevant content even when exact terms don't match.
 */

// ============================================================================
// Expansion Rules
// ============================================================================

// Common abbreviations and their expansions
const ABBREVIATION_MAP: Record<string, string[]> = {
  // Electrical
  'k': ['thousand', '000'],
  'K': ['thousand', '000'],
  'ohm': ['Ω', 'ohms', 'resistance'],
  'Ω': ['ohm', 'ohms'],
  'v': ['volt', 'volts', 'voltage'],
  'V': ['volt', 'volts', 'voltage'],
  'a': ['amp', 'ampere', 'amps'],
  'A': ['amp', 'ampere', 'amps'],
  'mA': ['milliamp', 'milliampere'],
  'uF': ['microfarad', 'µF'],
  'µF': ['microfarad', 'uF'],
  'pF': ['picofarad'],
  'nF': ['nanofarad'],
  'mH': ['millihenry'],
  'uH': ['microhenry', 'µH'],

  // Size/measurements
  'mm': ['millimeter', 'millimeters'],
  'cm': ['centimeter', 'centimeters'],
  'in': ['inch', 'inches'],
  '"': ['inch', 'inches'],
  'ml': ['milliliter', 'milliliters', 'mL'],
  'ul': ['microliter', 'microliters', 'µL', 'µl'],
  'mg': ['milligram', 'milligrams'],
  'ug': ['microgram', 'micrograms', 'µg'],

  // Lab/scientific
  'pcr': ['polymerase chain reaction', 'PCR'],
  'dna': ['DNA', 'deoxyribonucleic acid'],
  'rna': ['RNA', 'ribonucleic acid'],
  'elisa': ['ELISA', 'enzyme-linked immunosorbent assay'],
  'hplc': ['HPLC', 'high performance liquid chromatography'],
  'gc': ['gas chromatography', 'GC'],
  'ms': ['mass spectrometry', 'MS'],
  'nmr': ['NMR', 'nuclear magnetic resonance'],
  'uv': ['UV', 'ultraviolet'],
  'ir': ['IR', 'infrared'],

  // Manufacturing
  'sn': ['serial number', 'S/N'],
  'pn': ['part number', 'P/N'],
  'bom': ['bill of materials', 'BOM'],
  'qc': ['quality control', 'QC'],
  'qa': ['quality assurance', 'QA'],
  'iso': ['ISO', 'International Organization for Standardization'],
  'fda': ['FDA', 'Food and Drug Administration'],
  'ce': ['CE', 'Conformité Européenne'],
  'rohs': ['RoHS', 'Restriction of Hazardous Substances'],

  // Components
  'ic': ['integrated circuit', 'IC', 'chip'],
  'led': ['LED', 'light emitting diode'],
  'lcd': ['LCD', 'liquid crystal display'],
  'pcb': ['PCB', 'printed circuit board'],
  'smd': ['SMD', 'surface mount device'],
  'thru-hole': ['through-hole', 'through hole', 'THT'],
  'dip': ['DIP', 'dual in-line package'],
  'soic': ['SOIC', 'small outline integrated circuit'],
  'qfp': ['QFP', 'quad flat package'],
  'bga': ['BGA', 'ball grid array'],

  // General
  'mfr': ['manufacturer', 'mfg'],
  'mfg': ['manufacturer', 'mfr'],
  'qty': ['quantity'],
  'no': ['number', '#'],
  '#': ['number', 'no'],
  'desc': ['description'],
  'spec': ['specification', 'specs'],
  'temp': ['temperature'],
  'max': ['maximum'],
  'min': ['minimum'],
  'avg': ['average'],
  'std': ['standard'],
  'ref': ['reference'],
  'req': ['required', 'requirement'],
}

// Numeric pattern expansions (e.g., "10K" → "10000")
const NUMERIC_PATTERNS: Array<{
  pattern: RegExp
  expand: (match: RegExpMatchArray) => string[]
}> = [
  // 10K, 4.7K → 10000, 4700
  {
    pattern: /(\d+(?:\.\d+)?)\s*[kK]\b/g,
    expand: (match) => {
      const num = parseFloat(match[1]) * 1000
      return [num.toString(), `${match[1]}K`, `${match[1]}k`, `${match[1]} thousand`]
    }
  },
  // 1M, 2.2M → 1000000, 2200000
  {
    pattern: /(\d+(?:\.\d+)?)\s*[mM]\b(?!Hz|hz|V|v|A|a|F|f|H|h|L|l|g)/g,
    expand: (match) => {
      const num = parseFloat(match[1]) * 1000000
      return [num.toString(), `${match[1]}M`, `${match[1]} million`]
    }
  },
  // Percentages: 5% tolerance
  {
    pattern: /(\d+(?:\.\d+)?)\s*%/g,
    expand: (match) => {
      const num = parseFloat(match[1])
      return [`${num}%`, `${num} percent`, `${num / 100} tolerance`]
    }
  },
]

// Common misspellings
const MISSPELLING_MAP: Record<string, string> = {
  'resistor': 'resistor',
  'resister': 'resistor',
  'resitor': 'resistor',
  'capacitor': 'capacitor',
  'capicitor': 'capacitor',
  'capaciter': 'capacitor',
  'transistor': 'transistor',
  'transister': 'transistor',
  'oscilator': 'oscillator',
  'oscillater': 'oscillator',
  'thermocouple': 'thermocouple',
  'thermocuple': 'thermocouple',
  'syringe': 'syringe',
  'seringe': 'syringe',
  'pipette': 'pipette',
  'pipet': 'pipette',
  'centrifuge': 'centrifuge',
  'centrafuge': 'centrifuge',
}

// ============================================================================
// Query Expansion Functions
// ============================================================================

export interface ExpandedQuery {
  original: string
  expanded: string
  variations: string[]
  expansionTypes: string[]
}

/**
 * Expand a query with synonyms, abbreviations, and variations
 */
export function expandQuery(query: string): ExpandedQuery {
  const original = query.trim()
  const variations: string[] = [original]
  const expansionTypes: string[] = []

  // 1. Fix common misspellings
  let corrected = original
  for (const [misspelling, correct] of Object.entries(MISSPELLING_MAP)) {
    const regex = new RegExp(`\\b${misspelling}\\b`, 'gi')
    if (regex.test(corrected)) {
      corrected = corrected.replace(regex, correct)
      expansionTypes.push('spelling_correction')
    }
  }
  if (corrected !== original) {
    variations.push(corrected)
  }

  // 2. Expand abbreviations
  const words = corrected.split(/\s+/)
  const expandedWords: string[][] = words.map(word => {
    const lower = word.toLowerCase()
    const expansions = ABBREVIATION_MAP[word] || ABBREVIATION_MAP[lower]
    if (expansions) {
      expansionTypes.push('abbreviation')
      return [word, ...expansions]
    }
    return [word]
  })

  // Generate variations with different combinations (limit to avoid explosion)
  const abbreviationVariations = generateVariations(expandedWords, 3)
  variations.push(...abbreviationVariations)

  // 3. Expand numeric patterns
  for (const { pattern, expand } of NUMERIC_PATTERNS) {
    const matches = [...corrected.matchAll(pattern)]
    for (const match of matches) {
      const expanded = expand(match)
      for (const exp of expanded) {
        const variant = corrected.replace(match[0], exp)
        if (!variations.includes(variant)) {
          variations.push(variant)
          expansionTypes.push('numeric')
        }
      }
    }
  }

  // 4. Add lowercase and uppercase variants
  const lowerVariant = corrected.toLowerCase()
  const upperVariant = corrected.toUpperCase()
  if (!variations.includes(lowerVariant)) variations.push(lowerVariant)
  if (!variations.includes(upperVariant)) variations.push(upperVariant)

  // Deduplicate and limit
  const uniqueVariations = [...new Set(variations)].slice(0, 10)

  // Create expanded query (combine top variations for embedding)
  const expanded = uniqueVariations.slice(0, 3).join(' | ')

  return {
    original,
    expanded,
    variations: uniqueVariations,
    expansionTypes: [...new Set(expansionTypes)]
  }
}

/**
 * Generate word combinations from expanded options
 */
function generateVariations(wordOptions: string[][], maxVariations: number): string[] {
  const variations: string[] = []

  // Just use first expansion for each word to avoid explosion
  if (wordOptions.length > 0) {
    // Original with all first options
    const firstExpansion = wordOptions.map(opts => opts[0]).join(' ')
    variations.push(firstExpansion)

    // Try replacing each word with its first expansion
    for (let i = 0; i < wordOptions.length && variations.length < maxVariations; i++) {
      if (wordOptions[i].length > 1) {
        const variant = wordOptions.map((opts, j) => j === i ? opts[1] : opts[0]).join(' ')
        if (!variations.includes(variant)) {
          variations.push(variant)
        }
      }
    }
  }

  return variations
}

/**
 * Get embedding-optimized query (combines variations for better semantic coverage)
 */
export function getOptimizedQueryForEmbedding(query: string): string {
  const { variations } = expandQuery(query)

  // Combine top 3 variations for embedding
  // This creates a richer semantic representation
  return variations.slice(0, 3).join('. ')
}

/**
 * Get search terms for keyword/FTS search
 */
export function getKeywordSearchTerms(query: string): string[] {
  const { variations } = expandQuery(query)

  // Extract all unique significant words
  const allWords = new Set<string>()

  for (const variation of variations) {
    const words = variation.split(/\s+/)
    for (const word of words) {
      // Skip very short words and common stop words
      if (word.length >= 2 && !isStopWord(word)) {
        allWords.add(word.toLowerCase())
      }
    }
  }

  return [...allWords]
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
  'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
  'we', 'they', 'what', 'which', 'who', 'whom', 'how', 'when', 'where', 'why'
])

function isStopWord(word: string): boolean {
  return STOP_WORDS.has(word.toLowerCase())
}

// ============================================================================
// Domain-Specific Expansions
// ============================================================================

/**
 * Add custom expansion rules for your specific domain
 */
export function addCustomExpansion(term: string, expansions: string[]): void {
  ABBREVIATION_MAP[term] = expansions
  ABBREVIATION_MAP[term.toLowerCase()] = expansions
}

/**
 * Add custom misspelling correction
 */
export function addMisspellingCorrection(misspelling: string, correct: string): void {
  MISSPELLING_MAP[misspelling.toLowerCase()] = correct
}

/**
 * Get all registered expansions (for debugging/admin)
 */
export function getExpansionRules(): {
  abbreviations: Record<string, string[]>
  misspellings: Record<string, string>
  numericPatterns: number
} {
  return {
    abbreviations: { ...ABBREVIATION_MAP },
    misspellings: { ...MISSPELLING_MAP },
    numericPatterns: NUMERIC_PATTERNS.length
  }
}
