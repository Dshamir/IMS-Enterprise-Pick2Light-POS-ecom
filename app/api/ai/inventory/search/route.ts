import { NextResponse } from "next/server"
import { sqliteHelpers } from "@/lib/database/sqlite"
import { aiProviderFactory } from "@/lib/ai/ai-provider-factory"
import { getDatabase } from "@/lib/database/sqlite"

// POST /api/ai/inventory/search - Natural language inventory search
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { query } = body

    if (!query || !query.trim()) {
      return NextResponse.json({
        success: false,
        error: "Search query is required"
      }, { status: 400 })
    }

    // Get all products for context
    const allProducts = sqliteHelpers.getAllProducts()
    
    if (!allProducts || allProducts.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No inventory data available"
      })
    }

    // Get Search Assistant agent
    const db = getDatabase()
    const searchAgent = db.prepare(`
      SELECT * FROM ai_agents 
      WHERE name = 'Search Assistant' AND is_active = 1
      LIMIT 1
    `).get() as any

    // Perform basic text search first
    const basicResults = performBasicSearch(allProducts, query)
    
    // If we have an AI agent, enhance the search
    let enhancedResults = basicResults
    let aiInsights = null
    
    if (searchAgent) {
      try {
        const aiSearchResult = await performAISearch(searchAgent.id, query, allProducts, basicResults)
        if (aiSearchResult.success) {
          enhancedResults = aiSearchResult.results || basicResults
          aiInsights = aiSearchResult.insights
        }
      } catch (error) {
        console.warn('AI search enhancement failed, using basic results:', error)
      }
    }

    // Add relevance scoring and sorting
    const scoredResults = addRelevanceScoring(enhancedResults, query)
    
    // Generate search suggestions
    const suggestions = generateSearchSuggestions(query, allProducts)

    return NextResponse.json({
      success: true,
      query: query.trim(),
      results: scoredResults.slice(0, 20), // Limit to top 20 results
      result_count: scoredResults.length,
      ai_insights: aiInsights,
      search_suggestions: suggestions,
      metadata: {
        search_type: searchAgent ? 'ai_enhanced' : 'basic',
        processing_time: Date.now(),
        total_inventory_items: allProducts.length
      }
    })
  } catch (error) {
    console.error("Error in AI inventory search:", error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Search failed" 
      },
      { status: 500 }
    )
  }
}

function performBasicSearch(products: any[], query: string) {
  const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0)
  
  return products.filter(product => {
    const searchableText = [
      product.name,
      product.description,
      product.category,
      product.barcode,
      product.mfgname,
      product.mfgnum,
      product.Location,
      product.distributor
    ].join(' ').toLowerCase()

    return searchTerms.some(term => searchableText.includes(term))
  })
}

async function performAISearch(agentId: string, query: string, allProducts: any[], basicResults: any[]) {
  try {
    // Create a focused dataset for AI analysis
    const contextProducts = basicResults.length > 0 ? basicResults : allProducts.slice(0, 50)
    
    // Format the search request for AI
    const searchPrompt = formatSearchPromptForAI(query, contextProducts)
    
    // Send to AI agent
    const aiResponse = await aiProviderFactory.sendMessageToAgent(
      agentId,
      searchPrompt,
      []
    )

    if (!aiResponse.success) {
      throw new Error(aiResponse.error || 'AI search failed')
    }

    // Parse AI response and extract insights
    const insights = extractSearchInsights(aiResponse.response || '')
    
    // AI might suggest additional products or filters
    const enhancedResults = enhanceSearchResults(basicResults, insights, allProducts)
    
    return {
      success: true,
      results: enhancedResults,
      insights: insights
    }
  } catch (error) {
    console.error('AI search error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'AI search failed' }
  }
}

function formatSearchPromptForAI(query: string, products: any[]) {
  const productSummary = products.slice(0, 10).map(p => 
    `- ${p.name} (${p.category}) - Stock: ${p.stock_quantity} - Location: ${p.Location || 'Unknown'} - Barcode: ${p.barcode || 'None'}`
  ).join('\n')

  return `INVENTORY SEARCH REQUEST

User Query: "${query}"

Available Products (sample):
${productSummary}

Please help analyze this search query and provide insights about:
1. What the user is likely looking for
2. Alternative product names or descriptions they might mean
3. Relevant categories or locations to search
4. Any specific attributes mentioned (color, size, brand, etc.)
5. Suggestions for related items they might also need

Respond with structured insights that will help improve the search results.`
}

function extractSearchInsights(aiResponse: string) {
  // Simple parsing - in production, you might use more sophisticated NLP
  return {
    interpretation: extractSection(aiResponse, 'interpretation') || 'Standard product search',
    suggested_categories: extractCategories(aiResponse),
    related_terms: extractRelatedTerms(aiResponse),
    user_intent: analyzeUserIntent(aiResponse),
    recommendations: extractRecommendations(aiResponse)
  }
}

function extractSection(text: string, section: string): string | null {
  const regex = new RegExp(`${section}[:\\s]([^\\n]+)`, 'i')
  const match = text.match(regex)
  return match ? match[1].trim() : null
}

function extractCategories(text: string): string[] {
  const categories = ['parts', 'consumables', 'equipment']
  return categories.filter(cat => 
    text.toLowerCase().includes(cat.toLowerCase())
  )
}

function extractRelatedTerms(text: string): string[] {
  // Extract quoted terms or terms after "related", "similar", etc.
  const relatedMatches = text.match(/(?:related|similar|alternative)[^:]*[:]\s*([^.]+)/i)
  if (relatedMatches) {
    return relatedMatches[1].split(',').map(term => term.trim()).filter(term => term.length > 0)
  }
  return []
}

function analyzeUserIntent(text: string): string {
  if (text.toLowerCase().includes('low stock') || text.toLowerCase().includes('running out')) {
    return 'inventory_check'
  }
  if (text.toLowerCase().includes('location') || text.toLowerCase().includes('where')) {
    return 'location_search'
  }
  if (text.toLowerCase().includes('price') || text.toLowerCase().includes('cost')) {
    return 'price_inquiry'
  }
  return 'product_search'
}

function extractRecommendations(text: string): string[] {
  const recommendations: string[] = []
  
  if (text.toLowerCase().includes('also need') || text.toLowerCase().includes('consider')) {
    const recMatch = text.match(/(?:also need|consider)[^:]*[:]\s*([^.]+)/i)
    if (recMatch) {
      recommendations.push(...recMatch[1].split(',').map(r => r.trim()))
    }
  }
  
  return recommendations.filter(rec => rec.length > 0)
}

function enhanceSearchResults(basicResults: any[], insights: any, allProducts: any[]) {
  let enhanced = [...basicResults]
  
  // Add products from suggested categories
  if (insights.suggested_categories.length > 0) {
    const categoryMatches = allProducts.filter(product =>
      insights.suggested_categories.includes(product.category.toLowerCase()) &&
      !enhanced.find(existing => existing.id === product.id)
    )
    enhanced.push(...categoryMatches.slice(0, 5))
  }
  
  // Add products with related terms
  if (insights.related_terms.length > 0) {
    const relatedMatches = allProducts.filter(product => {
      const productText = [product.name, product.description].join(' ').toLowerCase()
      return insights.related_terms.some(term => 
        productText.includes(term.toLowerCase())
      ) && !enhanced.find(existing => existing.id === product.id)
    })
    enhanced.push(...relatedMatches.slice(0, 3))
  }
  
  return enhanced
}

function addRelevanceScoring(results: any[], query: string) {
  const queryTerms = query.toLowerCase().split(' ')
  
  return results.map(product => {
    let score = 0
    const productText = [
      product.name,
      product.description,
      product.category,
      product.mfgname
    ].join(' ').toLowerCase()

    // Exact name match gets highest score
    if (product.name.toLowerCase().includes(query.toLowerCase())) {
      score += 100
    }

    // Category match
    if (product.category.toLowerCase().includes(query.toLowerCase())) {
      score += 50
    }

    // Term frequency scoring
    queryTerms.forEach(term => {
      const termCount = (productText.match(new RegExp(term, 'g')) || []).length
      score += termCount * 10
    })

    // Boost for items in stock
    if (product.stock_quantity > 0) {
      score += 5
    }

    return { ...product, relevance_score: score }
  }).sort((a, b) => b.relevance_score - a.relevance_score)
}

function generateSearchSuggestions(query: string, products: any[]) {
  const suggestions = []
  
  // Category suggestions
  const categories = [...new Set(products.map(p => p.category))]
  categories.forEach(category => {
    if (category.toLowerCase().includes(query.toLowerCase().substring(0, 3))) {
      suggestions.push(`Search in ${category}`)
    }
  })
  
  // Location suggestions
  const locations = [...new Set(products.map(p => p.Location).filter(l => l))]
  locations.slice(0, 3).forEach(location => {
    suggestions.push(`Items in ${location}`)
  })
  
  // Common search patterns
  if (query.toLowerCase().includes('low')) {
    suggestions.push('Show low stock items')
  }
  if (query.toLowerCase().includes('blue') || query.toLowerCase().includes('red')) {
    suggestions.push('Search by color in product names')
  }
  
  return suggestions.slice(0, 5)
}