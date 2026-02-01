// Query Intent Detection and Routing System for AI Agents
// Analyzes user queries to determine intent and suggest appropriate database functions

export interface QueryIntent {
  type: string
  confidence: number
  suggestedFunction: string
  parameters?: Record<string, any>
  suggestedAgent?: string
  fallbackFunctions?: string[]
}

export interface IntentPattern {
  patterns: RegExp[]
  type: string
  function: string
  agent: string
  confidence: number
  extractParams?: (match: RegExpMatchArray, query: string) => Record<string, any>
}

export class QueryIntentDetector {
  private intentPatterns: IntentPattern[] = []

  constructor() {
    this.initializePatterns()
  }

  private initializePatterns() {
    this.intentPatterns = [
      // Unused Items Queries (HIGH PRIORITY)
      {
        patterns: [
          /(?:what(?:'s| is)?|show me|calculate|get|find)\s+(?:the\s+)?(?:total\s+)?value\s+(?:of\s+)?unused\s+items?/i,
          /(?:how much|what(?:'s| is)?)\s+(?:are\s+)?(?:the\s+)?unused\s+(?:items?|inventory)\s+worth/i,
          /unused\s+(?:items?|inventory)\s+value/i,
          /value.*unused.*items?/i,
          /unused.*value/i
        ],
        type: 'unused_value_calculation',
        function: 'getTotalUnusedValue',
        agent: 'Inventory Analyst',
        confidence: 0.95
      },
      {
        patterns: [
          /(?:list|show me|get|find)\s+(?:all\s+)?unused\s+items?/i,
          /(?:what|which)\s+items?\s+are\s+unused/i,
          /show.*unused.*(?:products?|items?)/i,
          /list.*unused/i,
          /unused\s+(?:products?|items?)\s+list/i
        ],
        type: 'unused_items_list',
        function: 'getUnusedItemsList',
        agent: 'Inventory Analyst',
        confidence: 0.9
      },

      // Low Stock and Critical Alerts
      {
        patterns: [
          /(?:show me|get|find|what(?:'s| is)?)\s+(?:all\s+)?low\s+stock\s+(?:items?|products?|alerts?)/i,
          /(?:which|what)\s+(?:items?|products?)\s+(?:are\s+)?(?:low|running low)/i,
          /low\s+stock\s+(?:alerts?|items?|products?)/i,
          /(?:items?|products?)\s+below\s+(?:minimum|min)/i,
          /stock\s+alerts?/i
        ],
        type: 'low_stock_query',
        function: 'getLowStockProducts',
        agent: 'Stock Monitor',
        confidence: 0.9
      },
      {
        patterns: [
          /(?:critical|urgent|immediate)\s+(?:stock|items?|alerts?)/i,
          /(?:what|which)\s+(?:items?|products?)\s+need\s+(?:immediate|urgent)\s+(?:attention|reorder)/i,
          /critical\s+(?:inventory|stock)/i,
          /out\s+of\s+stock/i,
          /emergency\s+(?:reorder|stock)/i
        ],
        type: 'critical_stock_query',
        function: 'getCriticalStockItems',
        agent: 'Stock Monitor',
        confidence: 0.95
      },

      // Reorder and Purchase Planning
      {
        patterns: [
          /(?:what|which)\s+(?:should I|to)\s+reorder/i,
          /reorder\s+(?:recommendations?|suggestions?|list)/i,
          /(?:what|which)\s+(?:items?|products?)\s+(?:need|require)\s+reorder/i,
          /purchase\s+(?:recommendations?|planning)/i,
          /reorder\s+(?:analysis|plan)/i
        ],
        type: 'reorder_recommendations',
        function: 'getReorderRecommendations',
        agent: 'Reorder Assistant',
        confidence: 0.9
      },

      // Product Search Queries
      {
        patterns: [
          /(?:find|search for|look for|show me)\s+(.+)/i,
          /(?:do we have|is there)\s+(.+)/i,
          /search\s+(.+)/i
        ],
        type: 'product_search',
        function: 'searchProducts',
        agent: 'Search Assistant',
        confidence: 0.7,
        extractParams: (match, query) => ({
          query: match[1]?.trim() || query.replace(/^(?:find|search for|look for|show me|do we have|is there)\s+/i, '').trim()
        })
      },

      // Barcode Lookups
      {
        patterns: [
          /(?:barcode|scan|lookup?)\s+([0-9]{8,})/i,
          /(?:product|item)\s+(?:with\s+)?barcode\s+([0-9]{8,})/i,
          /([0-9]{8,})\s+barcode/i
        ],
        type: 'barcode_lookup',
        function: 'getProductByBarcode',
        agent: 'Search Assistant',
        confidence: 0.95,
        extractParams: (match) => ({
          barcode: match[1]
        })
      },

      // Category Queries
      {
        patterns: [
          /(?:show me|get|list)\s+(?:all\s+)?(parts?|consumables?|equipment|tools?|safety|maintenance|other)/i,
          /(parts?|consumables?|equipment|tools?|safety|maintenance|other)\s+(?:list|inventory|products?)/i,
          /(?:what|which)\s+(?:items?|products?)\s+(?:are\s+)?(?:in\s+)?(?:the\s+)?(parts?|consumables?|equipment|tools?|safety|maintenance|other)\s+category/i,
          /(?:show me|get|list)\s+(?:all\s+)?(?:items?|products?)\s+in\s+(?:the\s+)?([a-zA-Z0-9\-_]+)\s+category/i,
          /category\s+([a-zA-Z0-9\-_]+)\s+(?:items?|products?|list)/i
        ],
        type: 'category_filter',
        function: 'getProductsByCategory',
        agent: 'Search Assistant',
        confidence: 0.85,
        extractParams: (match) => ({
          category: match[1]?.toLowerCase().replace(/s$/, '') // Remove plural 's'
        })
      },

      // Location Queries
      {
        patterns: [
          /(?:what(?:'s| is)?|show me)\s+(?:in|at|stored in)\s+(.+)/i,
          /(?:items?|products?)\s+(?:in|at)\s+(?:location\s+)?(.+)/i,
          /(?:storage\s+)?location\s+(.+)/i,
          /warehouse\s+(.+)/i
        ],
        type: 'location_search',
        function: 'getProductsByLocation',
        agent: 'Search Assistant',
        confidence: 0.8,
        extractParams: (match) => ({
          location: match[1]?.trim()
        })
      },

      // Manufacturer Queries
      {
        patterns: [
          /(?:products?|items?)\s+(?:from|by|made by)\s+(.+)/i,
          /manufacturer\s+(.+)/i,
          /(.+)\s+(?:brand|manufacturer)\s+(?:products?|items?)/i,
          /(?:show me|find)\s+(.+)\s+(?:products?|items?)/i
        ],
        type: 'manufacturer_search',
        function: 'getInventoryByManufacturer',
        agent: 'Search Assistant',
        confidence: 0.75,
        extractParams: (match) => ({
          manufacturer: match[1]?.trim()
        })
      },

      // Inventory Analytics
      {
        patterns: [
          /(?:total|overall)\s+inventory\s+value/i,
          /(?:what(?:'s| is)?|how much)\s+(?:my|our|the)\s+(?:total\s+)?inventory\s+worth/i,
          /inventory\s+(?:total|value|worth)/i,
          /(?:calculate|show)\s+(?:total\s+)?(?:inventory\s+)?value/i
        ],
        type: 'total_inventory_value',
        function: 'getInventoryTotalValue',
        agent: 'Inventory Analyst',
        confidence: 0.9
      },
      {
        patterns: [
          /(?:inventory|category)\s+(?:stats|statistics|breakdown|analysis)/i,
          /(?:breakdown|analysis)\s+by\s+category/i,
          /category\s+(?:breakdown|stats|analysis)/i,
          /(?:show me|get)\s+(?:inventory\s+)?(?:stats|statistics)/i
        ],
        type: 'category_statistics',
        function: 'getInventoryStatsByCategory',
        agent: 'Inventory Analyst',
        confidence: 0.85
      },

      // High Value Items
      {
        patterns: [
          /(?:high|expensive|valuable)\s+(?:value\s+)?(?:items?|products?)/i,
          /(?:items?|products?)\s+(?:worth\s+)?(?:over|above)\s+\$?([0-9]+)/i,
          /(?:most\s+)?(?:expensive|valuable)\s+(?:items?|products?)/i,
          /high\s+value\s+inventory/i
        ],
        type: 'high_value_items',
        function: 'getHighValueItems',
        agent: 'Inventory Analyst',
        confidence: 0.8,
        extractParams: (match, query) => {
          const thresholdMatch = query.match(/\$?([0-9]+)/);
          return {
            threshold: thresholdMatch ? parseInt(thresholdMatch[1]) : 100
          }
        }
      },

      // Recent Activity
      {
        patterns: [
          /recent\s+(?:transactions?|activity|changes?|movements?)/i,
          /(?:latest|last)\s+(?:inventory\s+)?(?:transactions?|activity|changes?)/i,
          /(?:what(?:'s| is)?|show me)\s+(?:happened|changed)\s+recently/i,
          /inventory\s+history/i
        ],
        type: 'recent_activity',
        function: 'getRecentTransactions',
        agent: 'Stock Monitor',
        confidence: 0.8,
        extractParams: (match, query) => {
          const limitMatch = query.match(/(?:last|recent)\s+([0-9]+)/i);
          return {
            limit: limitMatch ? parseInt(limitMatch[1]) : 10
          }
        }
      },

      // Price Range Queries
      {
        patterns: [
          /(?:items?|products?)\s+(?:between|from)\s+\$?([0-9]+)\s+(?:to|and)\s+\$?([0-9]+)/i,
          /(?:price\s+range|cost)\s+\$?([0-9]+)\s*-\s*\$?([0-9]+)/i,
          /(?:under|below)\s+\$?([0-9]+)/i,
          /(?:over|above)\s+\$?([0-9]+)/i
        ],
        type: 'price_range_search',
        function: 'getProductsByPriceRange',
        agent: 'Search Assistant',
        confidence: 0.85,
        extractParams: (match, query) => {
          if (match[2]) {
            // Range query: between X and Y
            return {
              minPrice: parseInt(match[1]),
              maxPrice: parseInt(match[2])
            }
          } else if (query.includes('under') || query.includes('below')) {
            return {
              minPrice: 0,
              maxPrice: parseInt(match[1])
            }
          } else if (query.includes('over') || query.includes('above')) {
            return {
              minPrice: parseInt(match[1]),
              maxPrice: 999999
            }
          }
          return { minPrice: 0, maxPrice: parseInt(match[1]) }
        }
      }
    ]
  }

  // Main intent detection method
  public detectIntent(query: string): QueryIntent {
    const normalizedQuery = query.trim().toLowerCase()
    
    // Check each pattern for matches
    for (const pattern of this.intentPatterns) {
      for (const regex of pattern.patterns) {
        const match = normalizedQuery.match(regex)
        if (match) {
          const intent: QueryIntent = {
            type: pattern.type,
            confidence: pattern.confidence,
            suggestedFunction: pattern.function,
            suggestedAgent: pattern.agent
          }
          
          // Extract parameters if available
          if (pattern.extractParams && match) {
            intent.parameters = pattern.extractParams(match, normalizedQuery)
          }
          
          // Add fallback functions for better coverage
          intent.fallbackFunctions = this.getFallbackFunctions(pattern.type)
          
          return intent
        }
      }
    }
    
    // Fallback for unmatched queries
    return {
      type: 'general_query',
      confidence: 0.3,
      suggestedFunction: 'searchProducts',
      suggestedAgent: 'Search Assistant',
      parameters: { query: query.trim() },
      fallbackFunctions: ['getAllProducts', 'getInventoryTotalValue']
    }
  }

  // Get fallback functions for each intent type
  private getFallbackFunctions(intentType: string): string[] {
    const fallbackMap: Record<string, string[]> = {
      'unused_value_calculation': ['getUnusedItemsList', 'getInventoryTotalValue'],
      'unused_items_list': ['getTotalUnusedValue', 'searchProducts'],
      'low_stock_query': ['getCriticalStockItems', 'getReorderRecommendations'],
      'critical_stock_query': ['getLowStockProducts', 'getReorderRecommendations'],
      'reorder_recommendations': ['getLowStockProducts', 'getCriticalStockItems'],
      'product_search': ['getAllProducts', 'getProductsByCategory'],
      'category_filter': ['searchProducts', 'getInventoryStatsByCategory'],
      'location_search': ['searchProducts', 'getAllProducts'],
      'manufacturer_search': ['searchProducts', 'getAllProducts'],
      'total_inventory_value': ['getInventoryStatsByCategory', 'getAllProducts'],
      'category_statistics': ['getInventoryTotalValue', 'getAllProducts'],
      'high_value_items': ['getInventoryTotalValue', 'getAllProducts'],
      'recent_activity': ['getLowStockProducts', 'getAllProducts'],
      'price_range_search': ['searchProducts', 'getHighValueItems'],
      'barcode_lookup': ['searchProducts', 'getAllProducts']
    }
    
    return fallbackMap[intentType] || ['searchProducts', 'getAllProducts']
  }

  // Suggest alternative queries based on intent confidence
  public suggestAlternatives(query: string, intent: QueryIntent): string[] {
    const suggestions: string[] = []
    
    if (intent.confidence < 0.7) {
      // Low confidence - suggest more specific queries
      if (query.includes('find') || query.includes('search')) {
        suggestions.push('Try: "Find [specific product name]"')
        suggestions.push('Try: "Show me products in [category]"')
        suggestions.push('Try: "List items by manufacturer [name]"')
      }
      
      if (query.includes('value') || query.includes('worth')) {
        suggestions.push('Try: "What is the value of unused items?"')
        suggestions.push('Try: "Show me total inventory value"')
        suggestions.push('Try: "List high value items"')
      }
      
      if (query.includes('stock') || query.includes('low')) {
        suggestions.push('Try: "Show me low stock alerts"')
        suggestions.push('Try: "Which items need reordering?"')
        suggestions.push('Try: "List critical stock items"')
      }
    }
    
    // Add intent-specific suggestions
    switch (intent.type) {
      case 'product_search':
        suggestions.push('Be more specific: "Find blue pens" vs "Find pens"')
        suggestions.push('Try category search: "Show me parts category"')
        break
      case 'general_query':
        suggestions.push('Try: "Show me low stock items"')
        suggestions.push('Try: "What is our total inventory value?"')
        suggestions.push('Try: "List unused items"')
        break
    }
    
    return suggestions.slice(0, 3) // Limit to 3 suggestions
  }

  // Get all available intent types for documentation
  public getAvailableIntents(): string[] {
    return [...new Set(this.intentPatterns.map(p => p.type))]
  }

  // Check if query is likely to be a data request
  public isDataRequest(query: string): boolean {
    const dataKeywords = [
      'show', 'list', 'get', 'find', 'what', 'which', 'how many', 'how much',
      'value', 'total', 'count', 'calculate', 'analysis', 'breakdown'
    ]
    
    const normalizedQuery = query.toLowerCase()
    return dataKeywords.some(keyword => normalizedQuery.includes(keyword))
  }

  // Generate function call suggestion
  public generateFunctionCall(intent: QueryIntent): string {
    const functionName = intent.suggestedFunction
    
    if (intent.parameters && Object.keys(intent.parameters).length > 0) {
      const paramValues = Object.values(intent.parameters).map(v => 
        typeof v === 'string' ? `"${v}"` : v
      ).join(', ')
      return `EXECUTE_FUNCTION: ${functionName}(${paramValues})`
    }
    
    return `EXECUTE_FUNCTION: ${functionName}()`
  }
}

// Export singleton instance
export const queryIntentDetector = new QueryIntentDetector()