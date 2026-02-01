/**
 * Document Chunker
 *
 * Intelligently splits documents into chunks for embedding.
 * Preserves document structure and maintains context through overlapping.
 */

import type { DocumentStructure, ParsedDocument } from './document-parsers'

// ============================================================================
// Type Definitions
// ============================================================================

export interface ChunkingOptions {
  maxTokens: number       // Maximum tokens per chunk (default: 500)
  overlapTokens: number   // Overlap between chunks (default: 50)
  preserveStructure: boolean  // Keep headings together (default: true)
  minChunkSize: number    // Minimum chunk size in tokens (default: 50)
}

export interface DocumentChunk {
  index: number
  content: string
  contentType: 'text' | 'heading' | 'list' | 'table' | 'code' | 'mixed'
  sectionTitle: string | null
  sectionPath: string | null
  pageNumber: number | null
  wordCount: number
  tokenEstimate: number
}

// ============================================================================
// Default Options
// ============================================================================

export const DEFAULT_CHUNKING_OPTIONS: ChunkingOptions = {
  maxTokens: 500,
  overlapTokens: 50,
  preserveStructure: true,
  minChunkSize: 50,
}

// ============================================================================
// Token Estimation
// ============================================================================

/**
 * Estimate token count from text
 * Rough estimation: ~4 characters per token for English text
 */
export function estimateTokens(text: string): number {
  // More accurate: count words and punctuation
  const words = text.split(/\s+/).filter(w => w.length > 0).length
  // Average word is ~1.3 tokens, plus punctuation
  return Math.ceil(words * 1.3)
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length
}

// ============================================================================
// Main Chunking Function
// ============================================================================

/**
 * Split a parsed document into chunks
 */
export function chunkDocument(
  document: ParsedDocument,
  options: Partial<ChunkingOptions> = {}
): DocumentChunk[] {
  const opts: ChunkingOptions = { ...DEFAULT_CHUNKING_OPTIONS, ...options }
  const chunks: DocumentChunk[] = []

  // Track current section path
  let currentSectionTitle: string | null = null
  let sectionPath: string[] = []
  let currentPageNumber: number | null = null

  // Process structure blocks
  const { structure } = document

  if (structure.length === 0) {
    // No structure - chunk by paragraphs from raw text
    return chunkPlainText(document.text, opts)
  }

  // Group content by sections
  interface Section {
    title: string | null
    path: string | null
    pageNumber: number | null
    blocks: DocumentStructure[]
  }

  const sections: Section[] = []
  let currentSection: Section = {
    title: null,
    path: null,
    pageNumber: null,
    blocks: [],
  }

  for (const block of structure) {
    // Update page number if present in content
    const pageMatch = block.content.match(/\[Page (\d+)\]/)
    if (pageMatch) {
      currentPageNumber = parseInt(pageMatch[1])
    }

    if (block.type === 'heading') {
      // Save previous section if it has content
      if (currentSection.blocks.length > 0) {
        sections.push(currentSection)
      }

      // Update section path
      const level = block.level || 1
      sectionPath = sectionPath.slice(0, level - 1)
      sectionPath[level - 1] = block.content

      currentSectionTitle = block.content

      currentSection = {
        title: currentSectionTitle,
        path: sectionPath.join(' > '),
        pageNumber: currentPageNumber,
        blocks: [block], // Include heading in section
      }
    } else {
      currentSection.blocks.push(block)
      if (currentPageNumber && !currentSection.pageNumber) {
        currentSection.pageNumber = currentPageNumber
      }
    }
  }

  // Don't forget the last section
  if (currentSection.blocks.length > 0) {
    sections.push(currentSection)
  }

  // Process each section into chunks
  for (const section of sections) {
    const sectionChunks = chunkSection(section, opts)

    for (const chunk of sectionChunks) {
      chunks.push({
        ...chunk,
        index: chunks.length,
      })
    }
  }

  // Apply overlap between chunks
  if (opts.overlapTokens > 0) {
    applyOverlap(chunks, opts.overlapTokens)
  }

  return chunks
}

// ============================================================================
// Section Chunking
// ============================================================================

interface Section {
  title: string | null
  path: string | null
  pageNumber: number | null
  blocks: DocumentStructure[]
}

/**
 * Chunk a single section
 */
function chunkSection(
  section: Section,
  opts: ChunkingOptions
): Omit<DocumentChunk, 'index'>[] {
  const chunks: Omit<DocumentChunk, 'index'>[] = []

  // Combine all blocks into text
  let currentChunkContent: string[] = []
  let currentChunkTokens = 0
  let currentContentType: DocumentChunk['contentType'] = 'text'
  let hasMultipleTypes = false

  const flushChunk = () => {
    if (currentChunkContent.length === 0) return

    const content = currentChunkContent.join('\n\n').trim()
    if (estimateTokens(content) < opts.minChunkSize) {
      // Too small - will be merged with next
      return
    }

    chunks.push({
      content,
      contentType: hasMultipleTypes ? 'mixed' : currentContentType,
      sectionTitle: section.title,
      sectionPath: section.path,
      pageNumber: section.pageNumber,
      wordCount: countWords(content),
      tokenEstimate: estimateTokens(content),
    })

    currentChunkContent = []
    currentChunkTokens = 0
    currentContentType = 'text'
    hasMultipleTypes = false
  }

  for (const block of section.blocks) {
    const blockTokens = estimateTokens(block.content)
    const blockType = block.type as DocumentChunk['contentType']

    // Check if adding this block would exceed max tokens
    if (currentChunkTokens + blockTokens > opts.maxTokens && currentChunkContent.length > 0) {
      flushChunk()
    }

    // Handle very large blocks
    if (blockTokens > opts.maxTokens) {
      // Need to split this block
      const subChunks = splitLargeBlock(block.content, opts)
      for (const subChunk of subChunks) {
        if (currentChunkContent.length > 0) {
          flushChunk()
        }
        currentChunkContent.push(subChunk)
        currentChunkTokens = estimateTokens(subChunk)
        currentContentType = blockType
        flushChunk()
      }
    } else {
      // Add block to current chunk
      if (currentContentType !== blockType && currentChunkContent.length > 0) {
        hasMultipleTypes = true
      }
      if (currentChunkContent.length === 0) {
        currentContentType = blockType
      }

      // For headings in preserve mode, always include them
      if (opts.preserveStructure && block.type === 'heading') {
        // Include heading at the start of chunk
        currentChunkContent.unshift(block.content)
        currentChunkTokens += blockTokens
      } else {
        currentChunkContent.push(block.content)
        currentChunkTokens += blockTokens
      }
    }
  }

  // Flush remaining content
  flushChunk()

  // Merge very small chunks
  if (chunks.length > 1) {
    const mergedChunks: typeof chunks = []
    let pendingChunk: typeof chunks[0] | null = null

    for (const chunk of chunks) {
      if (pendingChunk) {
        // Try to merge with pending
        const combined = pendingChunk.content + '\n\n' + chunk.content
        const combinedTokens = estimateTokens(combined)

        if (combinedTokens <= opts.maxTokens) {
          pendingChunk = {
            ...pendingChunk,
            content: combined,
            wordCount: countWords(combined),
            tokenEstimate: combinedTokens,
            contentType: pendingChunk.contentType === chunk.contentType
              ? pendingChunk.contentType
              : 'mixed',
          }
        } else {
          mergedChunks.push(pendingChunk)
          pendingChunk = chunk
        }
      } else {
        pendingChunk = chunk
      }
    }

    if (pendingChunk) {
      mergedChunks.push(pendingChunk)
    }

    return mergedChunks
  }

  return chunks
}

// ============================================================================
// Text Splitting
// ============================================================================

/**
 * Split a large block of text into smaller chunks
 */
function splitLargeBlock(text: string, opts: ChunkingOptions): string[] {
  const chunks: string[] = []
  const sentences = splitIntoSentences(text)

  let currentChunk: string[] = []
  let currentTokens = 0

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence)

    if (currentTokens + sentenceTokens > opts.maxTokens && currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '))
      currentChunk = []
      currentTokens = 0
    }

    // Handle very long sentences
    if (sentenceTokens > opts.maxTokens) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '))
        currentChunk = []
        currentTokens = 0
      }
      // Split sentence at word boundaries
      const words = sentence.split(/\s+/)
      let wordChunk: string[] = []
      let wordTokens = 0

      for (const word of words) {
        const wt = estimateTokens(word)
        if (wordTokens + wt > opts.maxTokens && wordChunk.length > 0) {
          chunks.push(wordChunk.join(' '))
          wordChunk = []
          wordTokens = 0
        }
        wordChunk.push(word)
        wordTokens += wt
      }

      if (wordChunk.length > 0) {
        chunks.push(wordChunk.join(' '))
      }
    } else {
      currentChunk.push(sentence)
      currentTokens += sentenceTokens
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '))
  }

  return chunks
}

/**
 * Split text into sentences
 */
function splitIntoSentences(text: string): string[] {
  // Split on sentence boundaries but preserve the punctuation
  const sentences: string[] = []
  const regex = /[^.!?]+[.!?]+\s*/g
  let match

  while ((match = regex.exec(text)) !== null) {
    sentences.push(match[0].trim())
  }

  // Handle text without sentence-ending punctuation
  const lastIndex = regex.lastIndex || 0
  if (lastIndex < text.length) {
    const remaining = text.substring(lastIndex).trim()
    if (remaining) {
      sentences.push(remaining)
    }
  }

  // If no sentences found, return the whole text
  if (sentences.length === 0 && text.trim()) {
    sentences.push(text.trim())
  }

  return sentences
}

/**
 * Chunk plain text without structure
 */
function chunkPlainText(text: string, opts: ChunkingOptions): DocumentChunk[] {
  const chunks: DocumentChunk[] = []
  const paragraphs = text.split(/\n\n+/)

  let currentContent: string[] = []
  let currentTokens = 0

  for (const para of paragraphs) {
    const trimmed = para.trim()
    if (!trimmed) continue

    const paraTokens = estimateTokens(trimmed)

    if (currentTokens + paraTokens > opts.maxTokens && currentContent.length > 0) {
      const content = currentContent.join('\n\n')
      chunks.push({
        index: chunks.length,
        content,
        contentType: 'text',
        sectionTitle: null,
        sectionPath: null,
        pageNumber: null,
        wordCount: countWords(content),
        tokenEstimate: estimateTokens(content),
      })
      currentContent = []
      currentTokens = 0
    }

    // Handle large paragraphs
    if (paraTokens > opts.maxTokens) {
      if (currentContent.length > 0) {
        const content = currentContent.join('\n\n')
        chunks.push({
          index: chunks.length,
          content,
          contentType: 'text',
          sectionTitle: null,
          sectionPath: null,
          pageNumber: null,
          wordCount: countWords(content),
          tokenEstimate: estimateTokens(content),
        })
        currentContent = []
        currentTokens = 0
      }

      const subChunks = splitLargeBlock(trimmed, opts)
      for (const subChunk of subChunks) {
        chunks.push({
          index: chunks.length,
          content: subChunk,
          contentType: 'text',
          sectionTitle: null,
          sectionPath: null,
          pageNumber: null,
          wordCount: countWords(subChunk),
          tokenEstimate: estimateTokens(subChunk),
        })
      }
    } else {
      currentContent.push(trimmed)
      currentTokens += paraTokens
    }
  }

  // Flush remaining
  if (currentContent.length > 0) {
    const content = currentContent.join('\n\n')
    chunks.push({
      index: chunks.length,
      content,
      contentType: 'text',
      sectionTitle: null,
      sectionPath: null,
      pageNumber: null,
      wordCount: countWords(content),
      tokenEstimate: estimateTokens(content),
    })
  }

  // Apply overlap
  if (opts.overlapTokens > 0) {
    applyOverlap(chunks, opts.overlapTokens)
  }

  return chunks
}

// ============================================================================
// Overlap Application
// ============================================================================

/**
 * Add overlap from previous chunk to maintain context
 */
function applyOverlap(chunks: DocumentChunk[], overlapTokens: number): void {
  for (let i = 1; i < chunks.length; i++) {
    const prevChunk = chunks[i - 1]
    const currentChunk = chunks[i]

    // Get overlap text from end of previous chunk
    const overlapText = getOverlapText(prevChunk.content, overlapTokens)

    if (overlapText) {
      // Prepend overlap with a marker
      currentChunk.content = `[...] ${overlapText}\n\n${currentChunk.content}`
      currentChunk.wordCount = countWords(currentChunk.content)
      currentChunk.tokenEstimate = estimateTokens(currentChunk.content)
    }
  }
}

/**
 * Extract overlap text from the end of content
 */
function getOverlapText(content: string, targetTokens: number): string {
  const sentences = splitIntoSentences(content)

  // Work backwards from the end
  const overlapSentences: string[] = []
  let tokens = 0

  for (let i = sentences.length - 1; i >= 0 && tokens < targetTokens; i--) {
    const sentence = sentences[i]
    const sentenceTokens = estimateTokens(sentence)

    if (tokens + sentenceTokens <= targetTokens * 1.5) {
      overlapSentences.unshift(sentence)
      tokens += sentenceTokens
    } else {
      break
    }
  }

  return overlapSentences.join(' ')
}
