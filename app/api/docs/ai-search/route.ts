import { NextRequest, NextResponse } from 'next/server'
import { searchDocumentation, parseMarkdownFile } from '@/lib/docs-parser'
import { AIProviderFactory } from '@/lib/ai/ai-provider-factory'
import { readFileSync } from 'fs'
import { join } from 'path'

interface AISearchRequest {
  query: string
  maxResults?: number
  includeContent?: boolean
}

interface AISearchResult {
  document: any
  aiSummary: string
  relevanceScore: number
  keyPoints: string[]
  directAnswer?: string
}

interface AISearchResponse {
  results: AISearchResult[]
  directAnswer?: string
  suggestedQueries: string[]
  processingTime: number
  query: string
  aiProcessed: boolean
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body: AISearchRequest = await request.json()
    const { query, maxResults = 5, includeContent = true } = body

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    // Step 1: Get basic search results from existing system (no changes to existing functionality)
    const basicResults = searchDocumentation(query)
    
    // If no basic results, we'll let AI process ALL documentation to provide intelligent answers
    let documentsToProcess = basicResults
    if (basicResults.length === 0) {
      // Get ALL documentation for AI to process and understand
      const { getDocumentationIndex } = await import('@/lib/docs-parser')
      const allCategories = getDocumentationIndex()
      const allDocs = allCategories.flatMap(cat => cat.docs).slice(0, 10) // Limit to prevent token overflow
      documentsToProcess = allDocs
    }

    // Step 2: Try to enhance with AI (additive layer)
    let aiEnhancedResults: AISearchResult[] = []
    let directAnswer: string | undefined
    let suggestedQueries: string[] = []

    try {
      const aiFactory = AIProviderFactory.getInstance()
      const provider = await aiFactory.getProviderByName('openai')
      
      if (provider) {
        // Process query with AI to understand intent
        const enhancementResult = await enhanceSearchWithAI(
          query, 
          documentsToProcess.slice(0, maxResults), 
          provider,
          includeContent
        )
        
        aiEnhancedResults = enhancementResult.results
        directAnswer = enhancementResult.directAnswer
        suggestedQueries = enhancementResult.suggestedQueries
      } else {
        // No AI provider available, trigger fallback
        throw new Error('No AI provider available')
      }
    } catch (aiError) {
      console.log('AI enhancement failed, creating intelligent fallback:', aiError.message)
      
      // Create intelligent fallback answer by synthesizing document content
      if (documentsToProcess.length > 0) {
        directAnswer = generateIntelligentFallback(query, documentsToProcess)
        
        // Minimal document results - focus on the intelligent answer
        aiEnhancedResults = documentsToProcess.slice(0, 2).map(doc => ({
          document: doc,
          aiSummary: `Related: ${doc.title}`,
          relevanceScore: 0.3, // Lower since this is fallback
          keyPoints: extractBasicKeyPoints(doc.title, doc.description),
          directAnswer: undefined
        }))
      } else {
        directAnswer = "I don't have enough documentation to provide a comprehensive answer to your question. Please try different keywords or check if there's documentation available for this topic."
      }
    }

    const processingTime = Date.now() - startTime

    return NextResponse.json({
      results: aiEnhancedResults,
      directAnswer,
      suggestedQueries: suggestedQueries.length > 0 ? suggestedQueries : generateFallbackSuggestions(),
      processingTime,
      query,
      aiProcessed: aiEnhancedResults.length > 0
    })

  } catch (error) {
    console.error('AI search error:', error)
    return NextResponse.json(
      { error: 'AI search failed. Please try the regular search.' },
      { status: 500 }
    )
  }
}

async function enhanceSearchWithAI(
  query: string, 
  basicResults: any[], 
  provider: any,
  includeContent: boolean
): Promise<{
  results: AISearchResult[]
  directAnswer?: string
  suggestedQueries: string[]
}> {
  
  // Prepare context from search results
  const documentsContext = await Promise.all(
    basicResults.map(async (doc) => {
      let content = doc.description || ''
      
      if (includeContent && doc.filePath) {
        try {
          const fullDoc = parseMarkdownFile(doc.filePath)
          if (fullDoc) {
            // Limit content to prevent token overflow
            content = fullDoc.content.substring(0, 2000)
          }
        } catch (error) {
          console.log('Could not load full content for', doc.filePath)
        }
      }
      
      return {
        title: doc.title,
        category: doc.category,
        description: doc.description,
        tags: doc.tags,
        content: content
      }
    })
  )

  const prompt = `You are an intelligent documentation assistant for a Supabase Store inventory management system. Your job is to understand user questions and provide helpful answers by synthesizing information from the available documentation.

User Query: "${query}"

Available Documentation:
${documentsContext.map((doc, index) => `
Document ${index + 1}:
Title: ${doc.title}
Category: ${doc.category}
Tags: ${doc.tags.join(', ')}
Content: ${doc.content}
---
`).join('\n')}

IMPORTANT INSTRUCTIONS:
1. UNDERSTAND the user's intent, not just exact keywords
2. SYNTHESIZE information across documents to provide intelligent answers
3. If the user asks "how to set up" - look for setup, installation, configuration docs and explain the process
4. If the user asks about features - explain what the system does based on documentation
5. Provide ACTIONABLE guidance when possible
6. Even if no exact match, find the MOST RELEVANT documents and explain how they help

Please provide:
1. A direct, intelligent answer that addresses the user's actual question (max 250 words)
2. For each relevant document, provide:
   - How it specifically helps answer the user's question
   - A relevance score (0-1) based on usefulness to the query
   - Key actionable points from the document
3. Suggest 3 related queries

Format as JSON:
{
  "directAnswer": "Intelligent answer that synthesizes information to help the user",
  "results": [
    {
      "documentIndex": 0,
      "aiSummary": "How this document helps answer the user's question",
      "relevanceScore": 0.95,
      "keyPoints": ["Actionable point 1", "Actionable point 2", "Actionable point 3"]
    }
  ],
  "suggestedQueries": ["Related question 1", "Related question 2", "Related question 3"]
}`

  try {
    const response = await provider.sendMessage([
      { role: 'system', content: 'You are a documentation assistant. Always respond with valid JSON only.' },
      { role: 'user', content: prompt }
    ], {
      temperature: 0.3,
      maxTokens: 2000
    })

    console.log('AI provider response:', { success: response.success, contentLength: response.content?.length, hasResponse: !!response.response })
    
    if (!response.success) {
      throw new Error(`AI provider failed: ${response.error || 'Unknown error'}`)
    }
    
    // Check for content in different possible fields
    const content = response.content || response.response
    if (!content) {
      throw new Error('AI provider returned no content')
    }

    const aiResult = JSON.parse(content)
    
    // Map AI results back to original documents
    const enhancedResults: AISearchResult[] = aiResult.results.map((result: any) => {
      const originalDoc = basicResults[result.documentIndex]
      return {
        document: originalDoc,
        aiSummary: result.aiSummary,
        relevanceScore: result.relevanceScore,
        keyPoints: result.keyPoints,
        directAnswer: aiResult.directAnswer
      }
    })

    // Sort by AI relevance score
    enhancedResults.sort((a, b) => b.relevanceScore - a.relevanceScore)

    return {
      results: enhancedResults,
      directAnswer: aiResult.directAnswer,
      suggestedQueries: aiResult.suggestedQueries || []
    }

  } catch (error) {
    console.error('AI processing failed:', error)
    throw error
  }
}

function extractBasicKeyPoints(title: string, description?: string): string[] {
  // Simple fallback for when AI is not available
  const titleWords = title.toLowerCase().split(/[\s-_]+/)
  const keyWords = titleWords.filter(word => word.length > 3)
  
  // Add important words from description if available
  if (description) {
    const descWords = description.toLowerCase().split(/[\s-_,.!?;]+/)
    const importantDescWords = descWords.filter(word => 
      word.length > 4 && 
      !['this', 'that', 'with', 'from', 'they', 'will', 'have', 'been', 'were'].includes(word)
    )
    keyWords.push(...importantDescWords.slice(0, 2))
  }
  
  return [...new Set(keyWords)].slice(0, 4).map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  )
}

function generateIntelligentFallback(query: string, documents: any[]): string {
  const queryLower = query.toLowerCase()
  
  // Read actual documentation content for intelligent synthesis
  const docContent = readDocumentationContent()
  
  // Analyze query intent and provide intelligent responses based on actual content
  if (queryLower.includes('setup') || queryLower.includes('set up') || queryLower.includes('install') || queryLower.includes('getting started') || queryLower.includes('start')) {
    return synthesizeSetupInformation(docContent, query)
  }
  
  if (queryLower.includes('feature') || queryLower.includes('what') || queryLower.includes('capability') || queryLower.includes('does') || queryLower.includes('can')) {
    return synthesizeFeatureInformation(docContent, query)
  }
  
  if (queryLower.includes('troubleshoot') || queryLower.includes('problem') || queryLower.includes('error') || queryLower.includes('fix') || queryLower.includes('issue')) {
    return synthesizeTroubleshootingInformation(docContent, query)
  }
  
  if (queryLower.includes('api') || queryLower.includes('endpoint') || queryLower.includes('request') || queryLower.includes('response')) {
    return synthesizeAPIInformation(docContent, query)
  }

  if (queryLower.includes('mobile') || queryLower.includes('network') || queryLower.includes('access') || queryLower.includes('wan') || queryLower.includes('device')) {
    return synthesizeMobileAccessInformation(docContent, query)
  }
  
  // General intelligent synthesis using actual documentation
  return synthesizeGeneralInformation(docContent, query, documents)
}

function readDocumentationContent(): {[key: string]: string} {
  const docFiles = {
    readme: '',
    vectorSearch: '',
    ocrSetup: '',
    mobileAccess: '',
    firewallFix: '',
    claudeMd: ''
  }
  
  const projectRoot = process.cwd()
  
  try {
    // Read main README
    docFiles.readme = readFileSync(join(projectRoot, 'README.md'), 'utf-8')
  } catch (error) {
    console.log('Could not read README.md')
  }
  
  try {
    // Read Vector Search documentation
    docFiles.vectorSearch = readFileSync(join(projectRoot, 'README-VECTOR-SEARCH.md'), 'utf-8')
  } catch (error) {
    console.log('Could not read README-VECTOR-SEARCH.md')
  }
  
  try {
    // Read OCR setup
    docFiles.ocrSetup = readFileSync(join(projectRoot, 'OCR-SETUP.md'), 'utf-8')
  } catch (error) {
    console.log('Could not read OCR-SETUP.md')
  }
  
  try {
    // Read mobile access troubleshooting
    docFiles.mobileAccess = readFileSync(join(projectRoot, 'MOBILE-ACCESS-TROUBLESHOOTING.md'), 'utf-8')
  } catch (error) {
    console.log('Could not read MOBILE-ACCESS-TROUBLESHOOTING.md')
  }
  
  try {
    // Read firewall fix
    docFiles.firewallFix = readFileSync(join(projectRoot, 'FIREWALL-FIX.md'), 'utf-8')
  } catch (error) {
    console.log('Could not read FIREWALL-FIX.md')
  }
  
  try {
    // Read Claude project documentation
    docFiles.claudeMd = readFileSync(join(projectRoot, 'CLAUDE.md'), 'utf-8')
  } catch (error) {
    console.log('Could not read CLAUDE.md')
  }
  
  return docFiles
}

function synthesizeSetupInformation(docContent: {[key: string]: string}, query: string): string {
  const readme = docContent.readme
  
  // Extract actual setup information from README
  let requirements = []
  let setupSteps = []
  let envInfo = ''
  
  if (readme) {
    // Extract prerequisites section (exact match)
    const prereqMatch = readme.match(/## 📋 Prerequisites[\s\S]*?(?=##|$)/)
    if (prereqMatch) {
      const prereqText = prereqMatch[0]
      // Extract actual bullet points from README
      const bulletMatches = prereqText.match(/- (.+)/g)
      if (bulletMatches) {
        requirements = bulletMatches.map(bullet => bullet.replace('- ', ''))
      }
    }
    
    // Extract numbered setup steps from Quick Start section
    const quickStartMatch = readme.match(/## 🚀 Quick Start[\s\S]*?(?=\n## |\n$|$)/)
    if (quickStartMatch) {
      const quickStartText = quickStartMatch[0]
      
      // Extract each numbered step (### 1., ### 2., etc.) using a simpler approach
      const stepTitles = quickStartText.match(/### \d+\. .+/g)
      
      if (stepTitles) {
        stepTitles.forEach((title, index) => {
          // Find the content between this step and the next
          const stepNumber = index + 1
          const nextStepNumber = index + 2
          
          let stepContent = title.replace('### ', '')
          
          // Extract content between this step and next step
          const stepStart = quickStartText.indexOf(title)
          const nextStepTitle = `### ${nextStepNumber}.`
          const nextStepStart = quickStartText.indexOf(nextStepTitle, stepStart)
          
          if (stepStart !== -1) {
            const stepEndIndex = nextStepStart !== -1 ? nextStepStart : quickStartText.length
            const stepSection = quickStartText.substring(stepStart, stepEndIndex)
            
            // Extract code blocks from this step section
            const codeBlocks = stepSection.match(/```[\s\S]*?```/g)
            if (codeBlocks) {
              stepContent += '\n' + codeBlocks.join('\n')
            }
            
            setupSteps.push(stepContent)
          }
        })
      }
    }
    
    // Extract environment setup details
    const envMatch = readme.match(/### 3\. Environment Setup[\s\S]*?(?=###|##|$)/)
    if (envMatch) {
      const envText = envMatch[0]
      const envCodeBlock = envText.match(/```env[\s\S]*?```/)
      if (envCodeBlock) {
        envInfo = `Create \`.env.local\` file with your API keys:\n${envCodeBlock[0]}`
      }
    }
  }
  
  // Provide intelligent response based on extracted content
  if (requirements.length === 0 && setupSteps.length === 0) {
    // Fallback if README parsing failed
    return `I found the documentation but couldn't parse the setup details. Based on the project structure, this appears to be a Supabase Store inventory management system. Please check the README.md file directly for detailed setup instructions.`
  }

  let response = `Here's how to get started with the Supabase Store application:\n\n`
  
  // Add prerequisites if found
  if (requirements.length > 0) {
    response += `## Prerequisites\n${requirements.map(req => `• ${req}`).join('\n')}\n\n`
  }
  
  // Add detailed setup steps if found
  if (setupSteps.length > 0) {
    response += `## Setup Steps\n\n${setupSteps.map(step => step).join('\n\n')}\n\n`
  }
  
  // Add environment info if found
  if (envInfo) {
    response += `## Environment Configuration\n${envInfo}\n\n`
  }
  
  // Add access information
  response += `## Access the Application\nVisit \`http://localhost:3000\` to access the application.\n\n`
  response += `**Development Server Options:**\n`
  response += `• \`npm run dev\` - Local development\n`
  response += `• \`npm run dev:network\` - Network access for mobile testing\n`
  response += `• \`npm run dev:wan_dev\` - WAN access for external devices\n\n`
  response += `The application includes inventory management, AI features, dynamic categories, and comprehensive reporting capabilities.`
  
  return response
}

function synthesizeFeatureInformation(docContent: {[key: string]: string}, query: string): string {
  const readme = docContent.readme
  
  let features = []
  
  if (readme) {
    // Extract features section
    const featuresMatch = readme.match(/## 🚀 Features[\s\S]*?(?=## 🛠️|##|$)/)
    if (featuresMatch) {
      const featuresText = featuresMatch[0]
      
      // Extract core features
      if (featuresText.includes('Core Inventory Management')) {
        features.push('**📦 Core Inventory Management**: CRUD operations, real-time stock tracking, transaction history, barcode support')
      }
      
      if (featuresText.includes('Dynamic Category Management')) {
        features.push('**🏷️ Dynamic Category Management**: Unlimited custom categories, real-time updates, + button interface')
      }
      
      if (featuresText.includes('AI-Powered Features')) {
        features.push('**🤖 AI-Powered Features**: Smart assistant with natural language queries, image analysis with OCR, vector search, inventory insights')
      }
      
      if (featuresText.includes('Image Management')) {
        features.push('**📸 Image Management**: Multi-image support, camera integration, AI-powered cataloging, quality validation')
      }
      
      if (featuresText.includes('Reports & Analytics')) {
        features.push('**📊 Reports & Analytics**: Stock reports, category analytics, trend analysis, custom dashboards')
      }
      
      if (featuresText.includes('Data Management')) {
        features.push('**🔄 Data Management**: CSV import/export, automated backups, network sync, mobile optimization')
      }
      
      if (featuresText.includes('Documentation System')) {
        features.push('**📚 In-App Documentation**: Integrated wiki, smart search, auto-categorization, mobile-friendly design')
      }
    }
  }
  
  // Add technology stack info
  let techStack = 'Built with Next.js 15, TypeScript, React, Supabase, SQLite, and AI integrations (OpenAI, Anthropic).'
  
  return `The Supabase Store is a comprehensive inventory management system with the following capabilities:

${features.length > 0 ? features.join('\n\n') : 'Complete inventory management with AI-powered features and real-time analytics.'}

## Technology Foundation
${techStack}

## Key Capabilities
• Real-time inventory tracking with automatic alerts
• AI assistant for natural language database queries
• Dynamic category creation and management
• Mobile-first design with network access options
• Comprehensive reporting and analytics
• Image processing with OCR capabilities
• CSV import/export for bulk operations
• Integrated documentation system

This system is designed for businesses needing intelligent inventory management with modern AI capabilities.`
}

function synthesizeTroubleshootingInformation(docContent: {[key: string]: string}, query: string): string {
  const mobileAccess = docContent.mobileAccess
  const firewallFix = docContent.firewallFix
  const readme = docContent.readme
  
  let troubleshootingSteps = []
  let specificSolutions = []
  
  if (mobileAccess) {
    // Extract specific network troubleshooting
    if (mobileAccess.includes('WSL2')) {
      troubleshootingSteps.push('**Network Access Issues**: Check WSL2 port forwarding and firewall settings')
    }
    if (mobileAccess.includes('172.24.156.119')) {
      specificSolutions.push('For mobile access, ensure your device can reach the server IP address')
    }
  }
  
  if (firewallFix) {
    // Extract firewall configuration
    if (firewallFix.includes('PowerShell')) {
      troubleshootingSteps.push('**Windows Firewall**: Use PowerShell commands to configure firewall rules for development server')
    }
    if (firewallFix.includes('netsh')) {
      specificSolutions.push('Use `netsh` commands to set up port forwarding for external access')
    }
  }
  
  // Add common development issues
  const commonIssues = [
    '**Database Connection**: Ensure SQLite database file exists in `data/inventory.db`',
    '**AI Services**: Check OpenAI API key configuration and quota limits',
    '**Dependencies**: Run `npm install` to ensure all packages are installed',
    '**Environment Variables**: Verify `.env.local` file has required API keys',
    '**Port Conflicts**: Default port 3000 - use different port if occupied'
  ]
  
  return `Here are specific troubleshooting steps for the Supabase Store application:

## Common Issues & Solutions

${troubleshootingSteps.concat(commonIssues).join('\n\n')}

## Diagnostic Commands
\`\`\`bash
# Check database
sqlite3 data/inventory.db "SELECT COUNT(*) FROM products;"

# Verify dependencies
npm list

# Check server logs
npm run dev
\`\`\`

## Network Access Troubleshooting
${specificSolutions.length > 0 ? specificSolutions.join('\n') : 'Use `npm run dev:network` for local network access or `npm run dev:wan_dev` for external access.'}

For WSL2 environments, ensure proper port forwarding and Windows firewall configuration for external device access.`
}

function synthesizeAPIInformation(docContent: {[key: string]: string}, query: string): string {
  const readme = docContent.readme
  
  let apiEndpoints = []
  
  if (readme) {
    const apiMatch = readme.match(/### API Endpoints[\s\S]*?(?=###|##|$)/)
    if (apiMatch) {
      const apiText = apiMatch[0]
      
      // Extract specific endpoints
      if (apiText.includes('/api/products')) {
        apiEndpoints.push('**Products API**: `/api/products` - CRUD operations for inventory items')
      }
      if (apiText.includes('/api/categories')) {
        apiEndpoints.push('**Categories API**: `/api/categories` - Dynamic category management')
      }
      if (apiText.includes('/api/ai')) {
        apiEndpoints.push('**AI API**: `/api/ai/*` - AI assistant and processing endpoints')
      }
      if (apiText.includes('/api/upload')) {
        apiEndpoints.push('**Upload API**: `/api/upload` - Image and file upload handling')
      }
    }
  }
  
  return `The Supabase Store provides RESTful API endpoints for programmatic access:

## Available Endpoints

${apiEndpoints.length > 0 ? apiEndpoints.join('\n\n') : 'Complete REST API for products, categories, AI features, and file uploads.'}

## API Features
• **RESTful Design**: Standard HTTP methods (GET, POST, PUT, DELETE)
• **JSON Responses**: Consistent JSON format for all endpoints
• **Error Handling**: Structured error responses with status codes
• **File Upload**: Support for images and documents
• **AI Integration**: Natural language processing endpoints

## Usage Examples
\`\`\`javascript
// Fetch products
fetch('/api/products')
  .then(res => res.json())
  .then(data => console.log(data))

// Create category
fetch('/api/categories', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'New Category' })
})
\`\`\`

All endpoints support standard HTTP status codes and provide detailed error messages for debugging.`
}

function synthesizeMobileAccessInformation(docContent: {[key: string]: string}, query: string): string {
  const mobileAccess = docContent.mobileAccess
  const firewallFix = docContent.firewallFix
  
  let accessMethods = []
  let networkCommands = []
  
  if (mobileAccess && firewallFix) {
    // Extract specific network configuration
    accessMethods.push('**Local Network Access**: Use `npm run dev:network` to enable access from mobile devices on the same network')
    accessMethods.push('**WAN Access**: Use `npm run dev:wan_dev` for external device access with proper firewall configuration')
    
    if (mobileAccess.includes('PowerShell')) {
      networkCommands.push('Configure Windows firewall using PowerShell scripts')
    }
    if (mobileAccess.includes('WSL2')) {
      networkCommands.push('Set up WSL2 port forwarding for Windows/Linux hybrid environments')
    }
  }
  
  return `The Supabase Store supports comprehensive mobile and network access:

## Access Methods

${accessMethods.length > 0 ? accessMethods.join('\n\n') : '• Local network access via `npm run dev:network`\n• External access via `npm run dev:wan_dev`'}

## Network Configuration

${networkCommands.length > 0 ? networkCommands.map(cmd => `• ${cmd}`).join('\n') : '• Automatic network detection\n• Firewall configuration scripts\n• WSL2 port forwarding support'}

## Mobile Optimization
• **Responsive Design**: Optimized for mobile devices and tablets
• **Touch Interface**: Mobile-friendly navigation and controls
• **Camera Integration**: Direct photo capture from mobile browsers
• **Offline Capability**: Local data storage for offline functionality

## Development Commands
\`\`\`bash
# Local development
npm run dev

# Network access (mobile testing)
npm run dev:network

# WAN access (external devices)
npm run dev:wan_dev
\`\`\`

The system automatically detects your network configuration and provides the appropriate access URLs for mobile devices.`
}

function synthesizeGeneralInformation(docContent: {[key: string]: string}, query: string, documents: any[]): string {
  const readme = docContent.readme
  const claudeMd = docContent.claudeMd
  
  // Extract project overview
  let projectDesc = 'Supabase Store - A comprehensive inventory management application'
  if (readme) {
    const titleMatch = readme.match(/# ([^\n]+)/)
    if (titleMatch) {
      projectDesc = titleMatch[1]
    }
  }
  
  // Get relevant document titles
  const relevantDocs = documents.slice(0, 3)
  const categories = [...new Set(relevantDocs.map(doc => doc.category))]
  
  return `## ${projectDesc}

Based on your question "${query}", here's what the documentation covers:

${claudeMd ? '**Project Status**: This is an active Supabase-based inventory management system with AI integration features.' : 'This is a comprehensive inventory management system with modern AI capabilities.'}

## Key Areas
${categories.length > 0 ? categories.map(cat => `• ${cat.charAt(0).toUpperCase() + cat.slice(1)}`).join('\n') : '• Inventory Management\n• AI Integration\n• Mobile Access'}

## Available Documentation
${relevantDocs.length > 0 ? relevantDocs.map(doc => `• **${doc.title}**: ${doc.description || 'Comprehensive guide'}`).join('\n') : 'Complete setup, feature, and troubleshooting guides available.'}

## Quick Actions
• **Get Started**: Ask "How do I set up the application?"
• **Learn Features**: Ask "What features does this system have?"
• **Troubleshoot**: Ask "How do I fix [specific issue]?"
• **API Usage**: Ask "How do I use the API endpoints?"
• **Mobile Access**: Ask "How do I access from mobile devices?"

The system provides intelligent answers based on comprehensive project documentation, including setup guides, feature explanations, and troubleshooting solutions.`
}

function generateFallbackSuggestions(): string[] {
  return [
    "How do I set up the application?",
    "What are the main features?",
    "How do I troubleshoot issues?",
    "Where can I find API documentation?",
    "How do I add new categories?"
  ]
}