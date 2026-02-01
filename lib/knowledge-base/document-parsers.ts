/**
 * Document Parsers
 *
 * Parses PDF, DOCX, and Markdown files into structured text and metadata.
 * Preserves document structure (headings, sections, paragraphs) for intelligent chunking.
 */

import { extractText } from 'unpdf'
import mammoth from 'mammoth'
import WordExtractor from 'word-extractor'

// ============================================================================
// Type Definitions
// ============================================================================

export interface DocumentStructure {
  type: 'heading' | 'paragraph' | 'list' | 'table' | 'code'
  level?: number  // For headings (1-6)
  content: string
  raw?: string    // Original content before processing
}

export interface ParsedDocument {
  text: string                    // Full extracted text
  structure: DocumentStructure[]  // Structured content blocks
  metadata: {
    title?: string
    author?: string
    subject?: string
    keywords?: string[]
    pageCount?: number
    wordCount?: number
    language?: string
  }
}

export type DocumentType = 'pdf' | 'docx' | 'markdown' | 'unknown'

// ============================================================================
// File Type Detection
// ============================================================================

/**
 * Detect document type from filename
 */
export function detectDocumentType(filename: string): DocumentType {
  const ext = filename.toLowerCase().split('.').pop()

  switch (ext) {
    case 'pdf':
      return 'pdf'
    case 'docx':
    case 'doc':
      return 'docx'
    case 'md':
    case 'markdown':
      return 'markdown'
    default:
      return 'unknown'
  }
}

/**
 * Check if file type is supported
 */
export function isSupportedDocumentType(filename: string): boolean {
  return detectDocumentType(filename) !== 'unknown'
}

// ============================================================================
// PDF Parser
// ============================================================================

/**
 * Parse PDF document
 * Uses unpdf (already installed) for text extraction
 */
export async function parsePDF(buffer: Buffer): Promise<ParsedDocument> {
  try {
    console.log('📄 Parsing PDF document...', { bufferLength: buffer.length })

    // Convert Buffer to Uint8Array (required by unpdf)
    const uint8Array = new Uint8Array(buffer)

    // Extract text using unpdf
    const { text, totalPages } = await extractText(uint8Array, { mergePages: false })

    // If text is returned as array (per page), join with page markers
    const fullText = Array.isArray(text)
      ? text.map((pageText, i) => `[Page ${i + 1}]\n${pageText}`).join('\n\n')
      : text

    // Parse structure from text
    const structure = parseTextToStructure(fullText)

    // Calculate word count
    const wordCount = fullText.split(/\s+/).filter(w => w.length > 0).length

    console.log(`✅ PDF parsed: ${totalPages} pages, ${wordCount} words`)

    return {
      text: fullText.trim(),
      structure,
      metadata: {
        pageCount: totalPages,
        wordCount,
      }
    }
  } catch (error) {
    console.error('❌ PDF parsing error:', error)
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// ============================================================================
// DOCX Parser
// ============================================================================

/**
 * Check if buffer is old .doc format (Compound Document)
 */
function isOldDocFormat(buffer: Buffer): boolean {
  return buffer.length >= 8 &&
    buffer[0] === 0xD0 && buffer[1] === 0xCF &&
    buffer[2] === 0x11 && buffer[3] === 0xE0
}

/**
 * Check if buffer is .docx format (ZIP/PK signature)
 */
function isDocxFormat(buffer: Buffer): boolean {
  return buffer.length >= 4 &&
    buffer[0] === 0x50 && buffer[1] === 0x4B
}

/**
 * Parse old .doc format using word-extractor
 */
async function parseOldDoc(buffer: Buffer): Promise<ParsedDocument> {
  console.log('📄 Parsing old .doc format...')

  const extractor = new WordExtractor()
  const doc = await extractor.extract(buffer)

  const text = doc.getBody() || ''
  const headers = doc.getHeaders?.() || ''
  const footers = doc.getFooters?.() || ''

  // Combine all text
  const fullText = [headers, text, footers].filter(t => t.trim()).join('\n\n')

  // Parse structure from text
  const structure = parseTextToStructure(fullText)

  // Calculate word count
  const wordCount = fullText.split(/\s+/).filter(w => w.length > 0).length

  console.log(`✅ Old .doc parsed: ${wordCount} words`)

  return {
    text: fullText.trim(),
    structure,
    metadata: {
      wordCount,
    }
  }
}

/**
 * Parse Word document (.doc or .docx)
 * Uses mammoth for .docx and word-extractor for old .doc files
 */
export async function parseDOCX(buffer: Buffer): Promise<ParsedDocument> {
  try {
    console.log('📄 Parsing Word document...', { bufferLength: buffer.length })

    if (buffer.length < 4) {
      throw new Error('File is too small to be a valid Word document.')
    }

    console.log('📄 First 4 bytes:', buffer[0].toString(16), buffer[1].toString(16), buffer[2].toString(16), buffer[3].toString(16))

    // Check if it's old .doc format
    if (isOldDocFormat(buffer)) {
      console.log('📄 Detected old .doc format, using word-extractor...')
      return parseOldDoc(buffer)
    }

    // Check if it's .docx format
    if (!isDocxFormat(buffer)) {
      throw new Error('Invalid Word document format. The file may be corrupted or not a valid Word document.')
    }

    console.log('📄 Detected .docx format, using mammoth...')

    // Convert Buffer to ArrayBuffer properly for mammoth
    const uint8Array = new Uint8Array(buffer)
    const arrayBuffer = uint8Array.buffer

    // Convert to HTML for structure preservation
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer })

    // Also get plain text
    const textResult = await mammoth.extractRawText({ arrayBuffer })

    // Check if we got any content
    if (!textResult.value || textResult.value.trim().length === 0) {
      console.log('⚠️ DOCX appears to be empty or could not extract text')
    }

    // Parse HTML to extract structure
    const structure = parseHTMLToStructure(htmlResult.value)

    // Calculate word count
    const wordCount = textResult.value.split(/\s+/).filter(w => w.length > 0).length

    // Log any warnings
    if (htmlResult.messages.length > 0) {
      console.log('⚠️ DOCX conversion warnings:', htmlResult.messages)
    }

    console.log(`✅ DOCX parsed: ${wordCount} words, ${structure.length} blocks`)

    return {
      text: textResult.value.trim(),
      structure,
      metadata: {
        wordCount,
      }
    }
  } catch (error) {
    console.error('❌ Word document parsing error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'

    // Provide helpful error messages
    if (message.includes('Could not find the body element')) {
      throw new Error('Invalid DOCX file: The document structure is malformed. Please ensure this is a valid Word document.')
    }
    if (message.includes('End of central directory')) {
      throw new Error('Invalid Word file: The file appears to be corrupted.')
    }

    throw new Error(`Failed to parse Word document: ${message}`)
  }
}

// ============================================================================
// Markdown Parser
// ============================================================================

/**
 * Parse Markdown document
 * Preserves structure from markdown syntax
 */
export function parseMarkdown(content: string): ParsedDocument {
  console.log('📄 Parsing Markdown document...')

  const structure: DocumentStructure[] = []
  const lines = content.split('\n')

  let currentParagraph: string[] = []
  let inCodeBlock = false
  let codeContent: string[] = []
  let inList = false
  let listItems: string[] = []

  // Extract frontmatter if present
  let metadata: ParsedDocument['metadata'] = {}
  let contentStart = 0

  if (lines[0] === '---') {
    const endIndex = lines.indexOf('---', 1)
    if (endIndex > 0) {
      const frontmatter = lines.slice(1, endIndex).join('\n')
      metadata = parseFrontmatter(frontmatter)
      contentStart = endIndex + 1
    }
  }

  const processLines = lines.slice(contentStart)

  for (const line of processLines) {
    // Code block handling
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        structure.push({
          type: 'code',
          content: codeContent.join('\n'),
        })
        codeContent = []
        inCodeBlock = false
      } else {
        // Flush current paragraph
        if (currentParagraph.length > 0) {
          structure.push({
            type: 'paragraph',
            content: currentParagraph.join(' ').trim(),
          })
          currentParagraph = []
        }
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeContent.push(line)
      continue
    }

    // Heading detection
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      // Flush paragraph/list
      if (currentParagraph.length > 0) {
        structure.push({
          type: 'paragraph',
          content: currentParagraph.join(' ').trim(),
        })
        currentParagraph = []
      }
      if (inList && listItems.length > 0) {
        structure.push({
          type: 'list',
          content: listItems.join('\n'),
        })
        listItems = []
        inList = false
      }

      structure.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: headingMatch[2].trim(),
      })
      continue
    }

    // List detection
    const listMatch = line.match(/^[\s]*[-*+]\s+(.+)$/) || line.match(/^[\s]*\d+\.\s+(.+)$/)
    if (listMatch) {
      if (!inList) {
        // Flush paragraph
        if (currentParagraph.length > 0) {
          structure.push({
            type: 'paragraph',
            content: currentParagraph.join(' ').trim(),
          })
          currentParagraph = []
        }
        inList = true
      }
      listItems.push(listMatch[1])
      continue
    }

    // End of list
    if (inList && (line.trim() === '' || !line.match(/^[\s]*[-*+\d]/))) {
      if (listItems.length > 0) {
        structure.push({
          type: 'list',
          content: listItems.join('\n'),
        })
        listItems = []
      }
      inList = false
    }

    // Empty line - end paragraph
    if (line.trim() === '') {
      if (currentParagraph.length > 0) {
        structure.push({
          type: 'paragraph',
          content: currentParagraph.join(' ').trim(),
        })
        currentParagraph = []
      }
      continue
    }

    // Regular text - add to paragraph
    if (!inList) {
      currentParagraph.push(line.trim())
    }
  }

  // Flush remaining content
  if (currentParagraph.length > 0) {
    structure.push({
      type: 'paragraph',
      content: currentParagraph.join(' ').trim(),
    })
  }
  if (listItems.length > 0) {
    structure.push({
      type: 'list',
      content: listItems.join('\n'),
    })
  }
  if (codeContent.length > 0) {
    structure.push({
      type: 'code',
      content: codeContent.join('\n'),
    })
  }

  // Get full text without structure
  const text = structure.map(s => s.content).join('\n\n')
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length

  console.log(`✅ Markdown parsed: ${wordCount} words, ${structure.length} blocks`)

  return {
    text: text.trim(),
    structure,
    metadata: {
      ...metadata,
      wordCount,
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse plain text to structure (best effort)
 * Used for PDF where we don't have explicit structure
 */
function parseTextToStructure(text: string): DocumentStructure[] {
  const structure: DocumentStructure[] = []
  const paragraphs = text.split(/\n\n+/)

  for (const para of paragraphs) {
    const trimmed = para.trim()
    if (!trimmed) continue

    // Check if it looks like a heading (short, no punctuation at end, possibly all caps)
    const lines = trimmed.split('\n')
    if (lines.length === 1 && trimmed.length < 100) {
      const isAllCaps = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)
      const noPunctuation = !trimmed.match(/[.!?]$/)
      const startsWithNumber = /^\d+\.?\s/.test(trimmed)

      if ((isAllCaps && trimmed.length < 50) || (startsWithNumber && noPunctuation)) {
        structure.push({
          type: 'heading',
          level: isAllCaps ? 1 : 2,
          content: trimmed,
        })
        continue
      }
    }

    // Check if it looks like a list
    const listLines = trimmed.split('\n').filter(l => l.match(/^[\s]*[-•*]\s/) || l.match(/^[\s]*\d+[.)]\s/))
    if (listLines.length > 1 && listLines.length === lines.length) {
      structure.push({
        type: 'list',
        content: trimmed,
      })
      continue
    }

    // Default to paragraph
    structure.push({
      type: 'paragraph',
      content: trimmed.replace(/\n/g, ' ').replace(/\s+/g, ' '),
    })
  }

  return structure
}

/**
 * Parse HTML to structure (from DOCX conversion)
 */
function parseHTMLToStructure(html: string): DocumentStructure[] {
  const structure: DocumentStructure[] = []

  // Simple regex-based HTML parsing (good enough for mammoth output)
  // Match headings
  const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi
  let match

  // Remove tags and get text content
  const stripTags = (str: string) => str.replace(/<[^>]*>/g, '').trim()

  // Split by block elements
  const blocks = html.split(/<\/?(?:p|div|h[1-6]|ul|ol|li|table|tr|td|th|blockquote|pre)[^>]*>/i)

  // Process HTML sequentially
  let remaining = html

  // Find all headings
  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1])
    const content = stripTags(match[2])
    if (content) {
      structure.push({
        type: 'heading',
        level,
        content,
      })
    }
  }

  // Find all paragraphs
  const paraRegex = /<p[^>]*>(.*?)<\/p>/gi
  while ((match = paraRegex.exec(html)) !== null) {
    const content = stripTags(match[1])
    if (content) {
      structure.push({
        type: 'paragraph',
        content,
      })
    }
  }

  // Find all lists
  const listRegex = /<(?:ul|ol)[^>]*>(.*?)<\/(?:ul|ol)>/gi
  while ((match = listRegex.exec(html)) !== null) {
    const listContent = match[1]
    const items: string[] = []
    const itemRegex = /<li[^>]*>(.*?)<\/li>/gi
    let itemMatch
    while ((itemMatch = itemRegex.exec(listContent)) !== null) {
      const itemText = stripTags(itemMatch[1])
      if (itemText) items.push(itemText)
    }
    if (items.length > 0) {
      structure.push({
        type: 'list',
        content: items.join('\n'),
      })
    }
  }

  // If no structure found, treat entire text as paragraph
  if (structure.length === 0) {
    const text = stripTags(html)
    if (text) {
      structure.push({
        type: 'paragraph',
        content: text,
      })
    }
  }

  return structure
}

/**
 * Parse markdown frontmatter to metadata
 */
function parseFrontmatter(frontmatter: string): ParsedDocument['metadata'] {
  const metadata: ParsedDocument['metadata'] = {}

  const lines = frontmatter.split('\n')
  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/)
    if (match) {
      const key = match[1].toLowerCase()
      const value = match[2].trim().replace(/^['"]|['"]$/g, '')

      switch (key) {
        case 'title':
          metadata.title = value
          break
        case 'author':
          metadata.author = value
          break
        case 'subject':
          metadata.subject = value
          break
        case 'keywords':
        case 'tags':
          metadata.keywords = value.split(',').map(k => k.trim())
          break
        case 'language':
        case 'lang':
          metadata.language = value
          break
      }
    }
  }

  return metadata
}

/**
 * Main parse function - auto-detects type and parses
 */
export async function parseDocument(
  buffer: Buffer,
  filename: string
): Promise<ParsedDocument> {
  const docType = detectDocumentType(filename)

  switch (docType) {
    case 'pdf':
      return parsePDF(buffer)

    case 'docx':
      return parseDOCX(buffer)

    case 'markdown':
      return parseMarkdown(buffer.toString('utf-8'))

    default:
      throw new Error(`Unsupported document type: ${filename}`)
  }
}
