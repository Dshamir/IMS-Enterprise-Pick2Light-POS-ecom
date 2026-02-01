import fs from 'fs'
import path from 'path'

export interface DocMetadata {
  title: string
  category: string
  tags: string[]
  lastUpdated: string
  description?: string
  slug: string
  filePath: string
  size: string
}

export interface DocContent extends DocMetadata {
  content: string
  rawContent: string
}

export interface DocCategory {
  name: string
  slug: string
  description: string
  docs: DocMetadata[]
  count: number
}

const PROJECT_ROOT = process.cwd()

// Define documentation categories and their patterns
const DOC_CATEGORIES = {
  'getting-started': {
    name: 'Getting Started',
    description: 'Setup guides and initial configuration',
    patterns: ['README.md', 'CLAUDE.md', '*SETUP*', '*INSTALL*']
  },
  'user-guides': {
    name: 'User Guides', 
    description: 'How-to guides for end users',
    patterns: ['*GUIDE*', '*QUICK*', 'docs/**']
  },
  'technical': {
    name: 'Technical Documentation',
    description: 'Developer and technical implementation details',
    patterns: ['*IMPLEMENTATION*', '*API*', '*SCHEMA*', '*TECH*']
  },
  'troubleshooting': {
    name: 'Troubleshooting',
    description: 'Problem resolution and debugging guides', 
    patterns: ['*FIX*', '*TROUBLESHOOT*', '*ERROR*', '*DEBUG*', '*EMERGENCY*']
  },
  'project-status': {
    name: 'Project Status',
    description: 'Project updates, changelogs, and completion reports',
    patterns: ['CHANGELOG*', '*COMPLETE*', '*SUMMARY*', '*STATUS*', '*REPORT*']
  },
  'system-audits': {
    name: 'System Audits',
    description: 'Automated system audits and page analysis',
    patterns: ['audit_logs/**']
  }
}

export function getAllMarkdownFiles(): string[] {
  const files: string[] = []
  
  function walkDir(dir: string, basePath: string = '') {
    try {
      const items = fs.readdirSync(dir)
      
      for (const item of items) {
        const fullPath = path.join(dir, item)
        const relativePath = path.join(basePath, item)
        
        // Skip node_modules and other unnecessary directories
        if (item === 'node_modules' || item === '.git' || item === '.next' || item.startsWith('.')) {
          continue
        }
        
        const stat = fs.statSync(fullPath)
        
        if (stat.isDirectory()) {
          walkDir(fullPath, relativePath)
        } else if (item.endsWith('.md')) {
          files.push(relativePath)
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error)
    }
  }
  
  walkDir(PROJECT_ROOT)
  return files.sort()
}

function categorizeDoc(filePath: string): string {
  const normalizedPath = filePath.toLowerCase()
  
  for (const [categorySlug, category] of Object.entries(DOC_CATEGORIES)) {
    for (const pattern of category.patterns) {
      const regexPattern = pattern
        .replace(/\*\*/g, '.*')  // ** matches any path
        .replace(/\*/g, '[^/]*') // * matches any filename part
        .replace(/\//g, '[\\\\/]') // Handle path separators
      
      const regex = new RegExp(regexPattern, 'i')
      
      if (regex.test(normalizedPath)) {
        return categorySlug
      }
    }
  }
  
  return 'technical' // Default category
}

function generateTitle(filePath: string, frontmatterTitle?: string): string {
  if (frontmatterTitle) return frontmatterTitle
  
  const filename = path.basename(filePath, '.md')
  
  // Convert common patterns to readable titles
  return filename
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/\bMd\b/g, 'MD')
    .replace(/\bApi\b/g, 'API')
    .replace(/\bUi\b/g, 'UI')
    .replace(/\bDb\b/g, 'Database')
    .replace(/\bOcr\b/g, 'OCR')
}

function parseFrontmatter(content: string): { data: any; content: string } {
  if (!content.startsWith('---')) {
    return { data: {}, content }
  }
  
  const endMatch = content.indexOf('\n---\n', 3)
  if (endMatch === -1) {
    return { data: {}, content }
  }
  
  const frontmatterText = content.slice(4, endMatch)
  const actualContent = content.slice(endMatch + 5)
  
  // Simple YAML-like parsing for basic frontmatter
  const data: any = {}
  frontmatterText.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':')
    if (key && valueParts.length > 0) {
      const value = valueParts.join(':').trim()
      if (value.startsWith('[') && value.endsWith(']')) {
        // Simple array parsing
        data[key.trim()] = value.slice(1, -1).split(',').map(v => v.trim().replace(/['"]/g, ''))
      } else {
        data[key.trim()] = value.replace(/['"]/g, '')
      }
    }
  })
  
  return { data, content: actualContent }
}

function extractTags(content: string, filePath: string): string[] {
  const tags: Set<string> = new Set()
  
  // Extract from frontmatter if available
  const { data } = parseFrontmatter(content)
  if (data.tags && Array.isArray(data.tags)) {
    data.tags.forEach(tag => tags.add(tag))
  }
  
  // Auto-generate tags from filename and path
  const pathParts = filePath.toLowerCase().split(/[\/\\-_]/)
  pathParts.forEach(part => {
    if (part && part.length > 2 && part !== 'md') {
      tags.add(part)
    }
  })
  
  // Extract technical keywords from content
  const techKeywords = [
    'api', 'database', 'sqlite', 'supabase', 'react', 'nextjs', 'typescript',
    'ai', 'vision', 'ocr', 'category', 'inventory', 'barcode', 'mobile',
    'troubleshooting', 'setup', 'installation', 'configuration'
  ]
  
  const contentLower = content.toLowerCase()
  techKeywords.forEach(keyword => {
    if (contentLower.includes(keyword)) {
      tags.add(keyword)
    }
  })
  
  return Array.from(tags).slice(0, 8) // Limit to 8 tags
}

export function parseMarkdownFile(filePath: string): DocContent | null {
  try {
    const fullPath = path.join(PROJECT_ROOT, filePath)
    const fileContent = fs.readFileSync(fullPath, 'utf-8')
    const stats = fs.statSync(fullPath)
    
    const { data: frontmatter, content } = parseFrontmatter(fileContent)
    
    const title = generateTitle(filePath, frontmatter.title)
    const category = frontmatter.category || categorizeDoc(filePath)
    const tags = extractTags(fileContent, filePath)
    const slug = filePath.replace(/\.md$/, '').replace(/[\/\\]/g, '--')
    
    // Calculate file size
    const sizeInBytes = stats.size
    const sizeFormatted = sizeInBytes < 1024 
      ? `${sizeInBytes} B`
      : sizeInBytes < 1024 * 1024
      ? `${Math.round(sizeInBytes / 1024)} KB` 
      : `${Math.round(sizeInBytes / (1024 * 1024))} MB`
    
    return {
      title,
      category,
      tags,
      lastUpdated: stats.mtime.toISOString(),
      description: frontmatter.description || content.substring(0, 200).replace(/[#*`]/g, '').trim() + '...',
      slug,
      filePath,
      size: sizeFormatted,
      content,
      rawContent: fileContent
    }
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error)
    return null
  }
}

export function getDocumentationIndex(): DocCategory[] {
  const files = getAllMarkdownFiles()
  const docs: DocMetadata[] = []
  
  for (const file of files) {
    const doc = parseMarkdownFile(file)
    if (doc) {
      // Remove content for index (memory optimization)
      const { content, rawContent, ...metadata } = doc
      docs.push(metadata)
    }
  }
  
  // Group by category
  const categoriesMap = new Map<string, DocMetadata[]>()
  
  docs.forEach(doc => {
    if (!categoriesMap.has(doc.category)) {
      categoriesMap.set(doc.category, [])
    }
    categoriesMap.get(doc.category)!.push(doc)
  })
  
  // Convert to category objects
  const categories: DocCategory[] = []
  
  for (const [categorySlug, categoryDocs] of categoriesMap) {
    const categoryInfo = DOC_CATEGORIES[categorySlug as keyof typeof DOC_CATEGORIES] || {
      name: categorySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: 'Documentation files'
    }
    
    categories.push({
      name: categoryInfo.name,
      slug: categorySlug,
      description: categoryInfo.description,
      docs: categoryDocs.sort((a, b) => a.title.localeCompare(b.title)),
      count: categoryDocs.length
    })
  }
  
  // Sort categories by priority and name
  const categoryOrder = ['getting-started', 'user-guides', 'technical', 'troubleshooting', 'project-status', 'system-audits']
  
  return categories.sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a.slug)
    const bIndex = categoryOrder.indexOf(b.slug)
    
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex
    } else if (aIndex !== -1) {
      return -1
    } else if (bIndex !== -1) {
      return 1
    } else {
      return a.name.localeCompare(b.name)
    }
  })
}

export function searchDocumentation(query: string): DocMetadata[] {
  const files = getAllMarkdownFiles()
  const results: Array<DocMetadata & { relevance: number }> = []
  const queryLower = query.toLowerCase()
  
  for (const file of files) {
    const doc = parseMarkdownFile(file)
    if (!doc) continue
    
    let relevance = 0
    
    // Check title (highest weight)
    if (doc.title.toLowerCase().includes(queryLower)) {
      relevance += 10
    }
    
    // Check tags (high weight)
    if (doc.tags.some(tag => tag.toLowerCase().includes(queryLower))) {
      relevance += 5
    }
    
    // Check content (medium weight)
    if (doc.content.toLowerCase().includes(queryLower)) {
      relevance += 2
    }
    
    // Check file path (low weight)
    if (doc.filePath.toLowerCase().includes(queryLower)) {
      relevance += 1
    }
    
    if (relevance > 0) {
      const { content, rawContent, ...metadata } = doc
      results.push({ ...metadata, relevance })
    }
  }
  
  return results
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 20) // Limit results
    .map(({ relevance, ...doc }) => doc)
}