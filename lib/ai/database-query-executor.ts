// Database Query Executor - Handles AI function calls to database
import { sqliteHelpers } from '@/lib/database/sqlite'
import { queryCache } from './query-cache'
import { queryPerformanceLogger } from './query-performance-logger'

export interface DatabaseFunction {
  name: string
  description: string
  parameters: {
    [key: string]: {
      type: string
      description: string
      required?: boolean
      default?: any
    }
  }
  execute: (...args: any[]) => any
}

export class DatabaseQueryExecutor {
  private availableFunctions: Map<string, DatabaseFunction> = new Map()

  constructor() {
    this.initializeFunctions()
  }

  private initializeFunctions() {
    const functions: DatabaseFunction[] = [
      {
        name: 'getTotalUnusedValue',
        description: 'Calculate total value of items with "UNUSED" in name or description',
        parameters: {},
        execute: () => sqliteHelpers.getTotalUnusedValue()
      },
      {
        name: 'getUnusedItemsList',
        description: 'Get list of all items with "UNUSED" in name or description',
        parameters: {},
        execute: () => sqliteHelpers.getUnusedItemsList()
      },
      {
        name: 'getLowStockProducts',
        description: 'Get all products below minimum stock level',
        parameters: {},
        execute: () => sqliteHelpers.getLowStockProducts()
      },
      {
        name: 'getAllProducts',
        description: 'Get all products in inventory',
        parameters: {},
        execute: () => sqliteHelpers.getAllProducts()
      },
      {
        name: 'getProductsByCategory',
        description: 'Get products filtered by category',
        parameters: {
          category: {
            type: 'string',
            description: 'Category to filter by. Available categories: equipment, parts, consumables, tools, safety, maintenance, other, plus any custom categories',
            required: true
          }
        },
        execute: (category: string) => sqliteHelpers.getProductsByCategory(category)
      },
      {
        name: 'getProductsByLocation',
        description: 'Get products filtered by storage location',
        parameters: {
          location: {
            type: 'string',
            description: 'Location to search for',
            required: true
          }
        },
        execute: (location: string) => sqliteHelpers.getProductsByLocation(location)
      },
      {
        name: 'getInventoryByManufacturer',
        description: 'Get products filtered by manufacturer',
        parameters: {
          manufacturer: {
            type: 'string',
            description: 'Manufacturer name to search for',
            required: true
          }
        },
        execute: (manufacturer: string) => sqliteHelpers.getInventoryByManufacturer(manufacturer)
      },
      {
        name: 'searchProducts',
        description: 'Search products by name, description, or other fields',
        parameters: {
          query: {
            type: 'string',
            description: 'Search query string',
            required: true
          }
        },
        execute: (query: string) => sqliteHelpers.searchProducts(query)
      },
      {
        name: 'getRecentTransactions',
        description: 'Get recent inventory transactions',
        parameters: {
          limit: {
            type: 'number',
            description: 'Number of transactions to return',
            required: false,
            default: 10
          },
          productId: {
            type: 'string',
            description: 'Product ID to filter transactions',
            required: false
          }
        },
        execute: (limit?: number, productId?: string) => sqliteHelpers.getRecentTransactions(limit, productId)
      },
      {
        name: 'getInventoryStatsByCategory',
        description: 'Get inventory statistics grouped by category',
        parameters: {},
        execute: () => sqliteHelpers.getInventoryStatsByCategory()
      },
      {
        name: 'getCriticalStockItems',
        description: 'Get items below 50% of minimum stock level',
        parameters: {},
        execute: () => sqliteHelpers.getCriticalStockItems()
      },
      {
        name: 'getHighValueItems',
        description: 'Get items with total value above threshold',
        parameters: {
          threshold: {
            type: 'number',
            description: 'Minimum total value threshold',
            required: false,
            default: 100
          }
        },
        execute: (threshold?: number) => sqliteHelpers.getHighValueItems(threshold)
      },
      {
        name: 'getProductsByPriceRange',
        description: 'Get products within price range',
        parameters: {
          minPrice: {
            type: 'number',
            description: 'Minimum price',
            required: true
          },
          maxPrice: {
            type: 'number',
            description: 'Maximum price',
            required: true
          }
        },
        execute: (minPrice: number, maxPrice: number) => sqliteHelpers.getProductsByPriceRange(minPrice, maxPrice)
      },
      {
        name: 'getReorderRecommendations',
        description: 'Get reorder recommendations for low stock items',
        parameters: {},
        execute: () => sqliteHelpers.getReorderRecommendations()
      },
      {
        name: 'getInventoryTotalValue',
        description: 'Get total value of entire inventory',
        parameters: {},
        execute: () => sqliteHelpers.getInventoryTotalValue()
      },
      {
        name: 'getProductById',
        description: 'Get specific product by ID',
        parameters: {
          id: {
            type: 'string',
            description: 'Product ID',
            required: true
          }
        },
        execute: (id: string) => sqliteHelpers.getProductById(id)
      },
      {
        name: 'getProductByBarcode',
        description: 'Get product by barcode',
        parameters: {
          barcode: {
            type: 'string',
            description: 'Product barcode',
            required: true
          }
        },
        execute: (barcode: string) => sqliteHelpers.getProductByBarcode(barcode)
      },
      {
        name: 'getAllCategories',
        description: 'Get all available product categories in the system',
        parameters: {},
        execute: () => sqliteHelpers.getAllCategories()
      }
    ]

    // Register all functions
    functions.forEach(func => {
      this.availableFunctions.set(func.name, func)
    })
  }

  // Parse AI response for function calls
  async parseAndExecute(aiResponse: string): Promise<{ hasFunction: boolean; result?: any; formattedResponse?: string; error?: string }> {
    try {
      // Look for EXECUTE_FUNCTION: pattern
      const functionMatch = aiResponse.match(/EXECUTE_FUNCTION:\s*(\w+)\s*\(([^)]*)\)/i)
      
      if (!functionMatch) {
        return { hasFunction: false }
      }

      const [, functionName, paramsString] = functionMatch
      const func = this.availableFunctions.get(functionName)
      
      if (!func) {
        return {
          hasFunction: true,
          error: `Function "${functionName}" not found. Available functions: ${Array.from(this.availableFunctions.keys()).join(', ')}`
        }
      }

      // Parse parameters
      const params = this.parseParameters(paramsString, func.parameters)
      
      // Execute function with caching and performance logging
      const startTime = Date.now()
      
      // Check cache first
      const cached = queryCache.get(functionName, params)
      const cacheHit = cached !== null
      
      let result: any
      if (cacheHit) {
        result = cached
      } else {
        console.log(`Executing database function: ${functionName}`)
        result = func.execute(...params)
        
        // Cache the result if execution took more than 50ms
        const quickExecutionTime = Date.now() - startTime
        if (quickExecutionTime > 50) {
          queryCache.set(functionName, params, result)
        }
      }
      
      const executionTime = Date.now() - startTime
      
      // Log performance metrics
      queryPerformanceLogger.logQuery({
        functionName,
        parameters: params,
        executionTime,
        cacheHit,
        resultSize: this.calculateResultSize(result),
        success: true
      })
      
      // Format result for user
      const formattedResponse = this.formatResult(functionName, result, params)
      
      return {
        hasFunction: true,
        result,
        formattedResponse
      }
    } catch (error) {
      // Log failed query performance
      queryPerformanceLogger.logQuery({
        functionName: 'unknown',
        parameters: [],
        executionTime: 0,
        cacheHit: false,
        resultSize: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      return {
        hasFunction: true,
        error: `Function execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  // Parse parameter string into array of values
  private parseParameters(paramsString: string, paramDefs: DatabaseFunction['parameters']): any[] {
    if (!paramsString.trim()) {
      return []
    }

    try {
      // Simple parameter parsing - split by comma and trim
      const paramArray = paramsString.split(',').map(p => p.trim().replace(/['"]/g, ''))
      
      // Apply defaults and type conversion
      const paramKeys = Object.keys(paramDefs)
      const result: any[] = []
      
      paramKeys.forEach((key, index) => {
        const def = paramDefs[key]
        let value = paramArray[index]
        
        if (value === undefined || value === '') {
          if (def.required) {
            throw new Error(`Required parameter "${key}" is missing`)
          }
          value = def.default
        }
        
        // Type conversion
        if (def.type === 'number') {
          value = Number(value)
          if (isNaN(value)) {
            throw new Error(`Parameter "${key}" must be a number`)
          }
        }
        
        if (value !== undefined) {
          result.push(value)
        }
      })
      
      return result
    } catch (error) {
      throw new Error(`Parameter parsing failed: ${error instanceof Error ? error.message : 'Invalid parameters'}`)
    }
  }

  // Format query results for user-friendly display
  private formatResult(functionName: string, result: any, params: any[]): string {
    try {
      switch (functionName) {
        case 'getTotalUnusedValue':
          if (result.count === 0) {
            return "No unused items found in current inventory."
          }
          return `Total unused inventory value: $${result.total_value.toFixed(2)} across ${result.count} items.`

        case 'getUnusedItemsList':
          if (!result || result.length === 0) {
            return "No unused items found in current inventory."
          }
          return this.formatProductList(result, 'Unused items in inventory:')

        case 'getLowStockProducts':
          if (!result || result.length === 0) {
            return "No low stock items found. All products are above minimum stock levels."
          }
          return this.formatProductList(result, 'Low stock items requiring attention:')

        case 'getAllProducts':
          if (!result || result.length === 0) {
            return "No products found in inventory."
          }
          return `Found ${result.length} products in inventory. Use more specific search criteria to see details.`

        case 'getProductsByCategory':
          if (!result || result.length === 0) {
            return `No products found in category "${params[0]}".`
          }
          return this.formatProductList(result, `Products in ${params[0]} category:`)

        case 'getProductsByLocation':
          if (!result || result.length === 0) {
            return `No products found at location "${params[0]}".`
          }
          return this.formatProductList(result, `Products at location "${params[0]}":`)

        case 'getInventoryByManufacturer':
          if (!result || result.length === 0) {
            return `No products found from manufacturer "${params[0]}".`
          }
          return this.formatProductList(result, `Products from manufacturer "${params[0]}":`)

        case 'searchProducts':
          if (!result || result.length === 0) {
            return `No products found matching "${params[0]}".`
          }
          return this.formatProductList(result, `Search results for "${params[0]}":`)

        case 'getRecentTransactions':
          if (!result || result.length === 0) {
            return "No recent transactions found."
          }
          return this.formatTransactionList(result)

        case 'getInventoryStatsByCategory':
          if (!result || result.length === 0) {
            return "No inventory statistics available."
          }
          return this.formatCategoryStats(result)

        case 'getCriticalStockItems':
          if (!result || result.length === 0) {
            return "No critical stock items found. All products are above 50% of minimum stock."
          }
          return this.formatCriticalStockList(result)

        case 'getHighValueItems':
          if (!result || result.length === 0) {
            return `No items found with value above $${params[0] || 100}.`
          }
          return this.formatHighValueList(result, params[0] || 100)

        case 'getReorderRecommendations':
          if (!result || result.length === 0) {
            return "No reorder recommendations. All products are above minimum stock levels."
          }
          return this.formatReorderList(result)

        case 'getInventoryTotalValue':
          return `Total inventory value: $${result.total_value.toFixed(2)} across ${result.total_items} items (${result.total_stock_units} units).`

        case 'getProductById':
          if (!result) {
            return `Product with ID "${params[0]}" not found.`
          }
          return this.formatSingleProduct(result)

        case 'getProductByBarcode':
          if (!result) {
            return `Product with barcode "${params[0]}" not found.`
          }
          return this.formatSingleProduct(result)

        case 'getAllCategories':
          if (!result || result.length === 0) {
            return "No categories found in the system."
          }
          return this.formatCategoriesList(result)

        default:
          return JSON.stringify(result, null, 2)
      }
    } catch (error) {
      return `Error formatting results: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  private formatProductList(products: any[], title: string): string {
    const lines = [title]
    products.slice(0, 10).forEach((product, index) => {
      const value = product.item_value || (product.price * product.stock_quantity)
      lines.push(`${index + 1}. ${product.name} - $${product.price} × ${product.stock_quantity} = $${value.toFixed(2)}`)
      if (product.Location) {
        lines[lines.length - 1] += ` (Location: ${product.Location})`
      }
    })
    
    if (products.length > 10) {
      lines.push(`... and ${products.length - 10} more items`)
    }
    
    return lines.join('\n')
  }

  private formatSingleProduct(product: any): string {
    return `${product.name} - $${product.price} (Stock: ${product.stock_quantity}, Category: ${product.category}${product.Location ? `, Location: ${product.Location}` : ''})`
  }

  private formatTransactionList(transactions: any[]): string {
    const lines = ['Recent inventory transactions:']
    transactions.slice(0, 5).forEach((t, index) => {
      const date = new Date(t.created_at).toLocaleDateString()
      lines.push(`${index + 1}. ${t.product_name} - ${t.transaction_type} ${t.quantity} units (${date})`)
    })
    return lines.join('\n')
  }

  private formatCategoryStats(stats: any[]): string {
    const lines = ['Inventory statistics by category:']
    stats.forEach(stat => {
      lines.push(`${stat.category.toUpperCase()}: ${stat.total_items} items, $${stat.total_value.toFixed(2)} value, ${stat.low_stock_count} low stock`)
    })
    return lines.join('\n')
  }

  private formatCriticalStockList(items: any[]): string {
    const lines = ['Critical stock items requiring immediate attention:']
    items.slice(0, 10).forEach((item, index) => {
      lines.push(`${index + 1}. ${item.name} - ${item.stock_quantity}/${item.min_stock_level} (${item.urgency_level})`)
    })
    return lines.join('\n')
  }

  private formatHighValueList(items: any[], threshold: number): string {
    const lines = [`High value items (above $${threshold}):`]
    items.slice(0, 10).forEach((item, index) => {
      lines.push(`${index + 1}. ${item.name} - $${item.total_value.toFixed(2)} total value`)
    })
    return lines.join('\n')
  }

  private formatReorderList(items: any[]): string {
    const lines = ['Reorder recommendations:']
    let totalCost = 0
    items.slice(0, 10).forEach((item, index) => {
      totalCost += item.reorder_cost
      lines.push(`${index + 1}. ${item.name} - Reorder ${item.reorder_quantity} units ($${item.reorder_cost.toFixed(2)})`)
    })
    lines.push(`Total reorder cost for top items: $${totalCost.toFixed(2)}`)
    return lines.join('\n')
  }

  private formatCategoriesList(categories: any[]): string {
    const lines = ['Available product categories:']
    categories.forEach((category, index) => {
      lines.push(`${index + 1}. ${category.name}`)
    })
    return lines.join('\n')
  }

  // Calculate result size for performance metrics
  private calculateResultSize(result: any): number {
    try {
      if (result === null || result === undefined) {
        return 0
      }
      
      if (Array.isArray(result)) {
        return result.length
      }
      
      if (typeof result === 'object') {
        return Object.keys(result).length
      }
      
      if (typeof result === 'string') {
        return result.length
      }
      
      return 1 // Single value
    } catch (error) {
      return 0
    }
  }

  // Get available functions for AI agent configuration
  getAvailableFunctions(): DatabaseFunction[] {
    return Array.from(this.availableFunctions.values())
  }

  // Generate function documentation for AI system prompts
  generateFunctionDocumentation(): string {
    const lines = ['AVAILABLE DATABASE FUNCTIONS:']
    
    this.availableFunctions.forEach(func => {
      lines.push(`- EXECUTE_FUNCTION: ${func.name}() → ${func.description}`)
      
      const paramKeys = Object.keys(func.parameters)
      if (paramKeys.length > 0) {
        const paramList = paramKeys.map(key => {
          const param = func.parameters[key]
          return `${key}${param.required ? '*' : ''}:${param.type}`
        }).join(', ')
        lines[lines.length - 1] = lines[lines.length - 1].replace('()', `(${paramList})`)
      }
    })
    
    lines.push('\n* = required parameter')
    return lines.join('\n')
  }
}

// Export singleton instance
export const databaseQueryExecutor = new DatabaseQueryExecutor()