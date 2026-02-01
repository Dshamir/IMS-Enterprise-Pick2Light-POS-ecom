// Response Enhancement System - Improves AI response formatting and quality

export interface EnhancedResponse {
  content: string
  formattedContent?: string
  dataType?: 'currency' | 'list' | 'count' | 'table' | 'text'
  summary?: string
  actionItems?: string[]
  metadata?: Record<string, any>
}

export class ResponseEnhancer {
  // Enhance database query responses with better formatting
  static enhanceResponse(
    originalResponse: string, 
    executionMethod?: string,
    queryIntent?: any,
    rawData?: any
  ): EnhancedResponse {
    
    // Detect response type and format accordingly
    const dataType = this.detectDataType(originalResponse, rawData)
    let formattedContent = originalResponse
    let summary = ''
    let actionItems: string[] = []
    
    // Apply formatting based on data type
    switch (dataType) {
      case 'currency':
        formattedContent = this.formatCurrencyResponse(originalResponse)
        summary = this.extractCurrencySummary(originalResponse)
        break
        
      case 'list':
        formattedContent = this.formatListResponse(originalResponse)
        summary = this.extractListSummary(originalResponse)
        actionItems = this.extractActionItems(originalResponse, queryIntent)
        break
        
      case 'count':
        formattedContent = this.formatCountResponse(originalResponse)
        break
        
      case 'table':
        formattedContent = this.formatTableResponse(originalResponse, rawData)
        break
        
      default:
        formattedContent = this.formatTextResponse(originalResponse)
    }
    
    // Add execution method indicator
    if (executionMethod === 'direct_database_query') {
      formattedContent = `⚡ **Live Database Query Result**\n\n${formattedContent}`
    }
    
    // Add query optimization suggestions
    if (queryIntent && queryIntent.confidence < 0.8) {
      actionItems.push('Try being more specific in your query for better results')
    }
    
    return {
      content: originalResponse,
      formattedContent,
      dataType,
      summary,
      actionItems,
      metadata: {
        executionMethod,
        queryIntent,
        hasRawData: !!rawData
      }
    }
  }
  
  private static detectDataType(response: string, rawData?: any): 'currency' | 'list' | 'count' | 'table' | 'text' {
    // Currency responses
    if (response.includes('$') && (response.includes('value') || response.includes('worth') || response.includes('cost'))) {
      return 'currency'
    }
    
    // List responses
    if (response.includes('\n') && (response.match(/^\d+\./m) || response.match(/^[-•]/m))) {
      return 'list'
    }
    
    // Count responses
    if (response.match(/\b\d+\s+(items?|products?|entries)\b/i)) {
      return 'count'
    }
    
    // Table data (from rawData)
    if (rawData && Array.isArray(rawData) && rawData.length > 3) {
      return 'table'
    }
    
    return 'text'
  }
  
  private static formatCurrencyResponse(response: string): string {
    // Enhance currency formatting
    return response
      .replace(/\$(\d+)\.(\d{2})/g, '**$$$1.$2**') // Bold currency values
      .replace(/(\d+)\s+(items?|products?)/g, '**$1** $2') // Bold counts
      .replace(/^(.+)$/gm, (line) => {
        if (line.includes('$')) {
          return `💰 ${line}`
        }
        return line
      })
  }
  
  private static formatListResponse(response: string): string {
    // Enhance list formatting with better bullets and spacing
    let formatted = response
      .replace(/^\d+\.\s*/gm, '• ') // Replace numbers with bullets
      .replace(/^- /gm, '• ') // Standardize bullets
      .replace(/^\* /gm, '• ') // Standardize bullets
    
    // Add spacing between items
    formatted = formatted.replace(/^• (.+)$/gm, '• **$1**')
    
    return formatted
  }
  
  private static formatCountResponse(response: string): string {
    return response.replace(/(\d+)\s+(items?|products?)/g, '**$1** $2')
  }
  
  private static formatTableResponse(response: string, rawData?: any): string {
    if (!rawData || !Array.isArray(rawData)) return response
    
    // Create a simple markdown table if we have structured data
    if (rawData.length > 0 && typeof rawData[0] === 'object') {
      const headers = Object.keys(rawData[0]).slice(0, 4) // Limit columns
      const rows = rawData.slice(0, 10) // Limit rows
      
      let table = `| ${headers.join(' | ')} |\n`
      table += `| ${headers.map(() => '---').join(' | ')} |\n`
      
      rows.forEach(row => {
        const values = headers.map(header => String(row[header] || '').slice(0, 20))
        table += `| ${values.join(' | ')} |\n`
      })
      
      return `${response}\n\n**Data Table:**\n${table}`
    }
    
    return response
  }
  
  private static formatTextResponse(response: string): string {
    // Basic text enhancement
    return response
      .replace(/\b(CRITICAL|URGENT|IMMEDIATE|ERROR)\b/gi, '🚨 **$1**')
      .replace(/\b(SUCCESS|COMPLETE|DONE)\b/gi, '✅ **$1**')
      .replace(/\b(WARNING|CAUTION)\b/gi, '⚠️ **$1**')
  }
  
  private static extractCurrencySummary(response: string): string {
    const valueMatch = response.match(/\$(\d+(?:\.\d{2})?)/);
    const countMatch = response.match(/(\d+)\s+items?/);
    
    if (valueMatch && countMatch) {
      return `Total: ${valueMatch[0]} across ${countMatch[1]} items`
    } else if (valueMatch) {
      return `Value: ${valueMatch[0]}`
    }
    
    return ''
  }
  
  private static extractListSummary(response: string): string {
    const lines = response.split('\n').filter(line => line.trim().match(/^[\d•\-\*]/))
    return `Found ${lines.length} items`
  }
  
  private static extractActionItems(response: string, queryIntent?: any): string[] {
    const actionItems: string[] = []
    
    // Based on query intent, suggest follow-up actions
    if (queryIntent) {
      switch (queryIntent.type) {
        case 'low_stock_query':
          actionItems.push('Review reorder recommendations')
          actionItems.push('Check critical stock items')
          break
        case 'unused_value_calculation':
          actionItems.push('Consider liquidating unused inventory')
          actionItems.push('Review usage patterns')
          break
        case 'reorder_recommendations':
          actionItems.push('Approve purchase orders')
          actionItems.push('Check supplier availability')
          break
      }
    }
    
    // Extract action words from response
    const actionWords = response.match(/(?:should|need to|must|consider|recommend)/gi)
    if (actionWords && actionWords.length > 0) {
      actionItems.push('Review recommended actions in the response')
    }
    
    return actionItems
  }
  
  // Helper method to format numbers with commas
  static formatNumber(num: number): string {
    return num.toLocaleString()
  }
  
  // Helper method to format currency
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }
  
  // Helper method to format percentages
  static formatPercentage(value: number): string {
    return `${(value * 100).toFixed(1)}%`
  }
}