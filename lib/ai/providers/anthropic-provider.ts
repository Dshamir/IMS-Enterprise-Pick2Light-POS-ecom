// Anthropic Claude Provider Integration
// This is a new provider that doesn't affect existing functionality

export interface AnthropicConfig {
  apiKey: string
  model?: string
  maxTokens?: number
  baseURL?: string
}

export interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AnthropicResponse {
  success: boolean
  content?: string
  usage?: {
    input_tokens: number
    output_tokens: number
  }
  error?: string
}

export class AnthropicProvider {
  private config: AnthropicConfig

  constructor(config: AnthropicConfig) {
    this.config = {
      model: 'claude-3-haiku-20240307',
      maxTokens: 1000,
      baseURL: 'https://api.anthropic.com/v1',
      ...config
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      // Test with a simple message
      const testResponse = await this.sendMessage(
        [{ role: 'user', content: 'Hello, can you respond with "Connection successful"?' }],
        { maxTokens: 50 }
      )

      if (testResponse.success && testResponse.content?.includes('Connection successful')) {
        return {
          success: true,
          details: {
            model: this.config.model,
            response_received: true
          }
        }
      } else {
        return {
          success: false,
          error: testResponse.error || 'Unexpected response from API',
          details: testResponse
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        details: { error: 'Connection failed' }
      }
    }
  }

  async sendMessage(
    messages: AnthropicMessage[],
    options?: {
      model?: string
      maxTokens?: number
      systemPrompt?: string
    }
  ): Promise<AnthropicResponse> {
    try {
      const requestBody: any = {
        model: options?.model || this.config.model,
        max_tokens: options?.maxTokens || this.config.maxTokens,
        messages: messages
      }

      // Add system prompt if provided
      if (options?.systemPrompt) {
        requestBody.system = options.systemPrompt
      }

      const response = await fetch(`${this.config.baseURL}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const error = await response.json()
        return {
          success: false,
          error: error.error?.message || `HTTP ${response.status}: ${response.statusText}`
        }
      }

      const data = await response.json()
      
      return {
        success: true,
        content: data.content?.[0]?.text || '',
        usage: data.usage ? {
          input_tokens: data.usage.input_tokens,
          output_tokens: data.usage.output_tokens
        } : undefined
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Request failed'
      }
    }
  }

  async getAvailableModels(): Promise<{ success: boolean; models?: string[]; error?: string }> {
    // Anthropic doesn't have a models endpoint, return known models
    return {
      success: true,
      models: [
        'claude-3-haiku-20240307',
        'claude-3-sonnet-20240229',
        'claude-3-opus-20240229',
        'claude-3-5-sonnet-20241022'
      ]
    }
  }

  // Inventory-specific helper methods
  async analyzeInventoryData(inventoryData: any[], analysisType: string): Promise<AnthropicResponse> {
    const systemPrompt = this.getInventorySystemPrompt(analysisType)
    const userMessage = this.formatInventoryForAnalysis(inventoryData, analysisType)

    return this.sendMessage(
      [{ role: 'user', content: userMessage }],
      { systemPrompt }
    )
  }

  private getInventorySystemPrompt(analysisType: string): string {
    switch (analysisType) {
      case 'low_stock':
        return `You are an expert inventory management analyst specializing in stock level optimization. Your role is to analyze inventory data and identify critical stock situations that require immediate action. Provide clear, prioritized recommendations for restocking with specific quantities and urgency levels.`
      
      case 'reorder_suggestions':
        return `You are a supply chain optimization consultant with expertise in demand forecasting and procurement strategy. Analyze inventory patterns and provide data-driven reorder recommendations including optimal quantities, timing, supplier considerations, and cost-benefit analysis.`
      
      case 'general_analysis':
        return `You are a comprehensive inventory analyst with expertise in operational efficiency and strategic planning. Provide thorough analysis covering inventory health, optimization opportunities, risk assessment, and actionable improvement strategies.`
      
      default:
        return `You are a knowledgeable inventory management assistant. Analyze the provided inventory data and offer practical insights and recommendations to help optimize inventory operations.`
    }
  }

  private formatInventoryForAnalysis(inventoryData: any[], analysisType: string): string {
    const summary = {
      total_items: inventoryData.length,
      categories: {} as Record<string, number>,
      low_stock_items: 0,
      total_value: 0,
      out_of_stock: 0,
      overstock_items: 0
    }

    inventoryData.forEach(item => {
      summary.categories[item.category] = (summary.categories[item.category] || 0) + 1
      summary.total_value += (item.price * item.stock_quantity)
      
      if (item.stock_quantity <= item.min_stock_level) {
        summary.low_stock_items++
      }
      if (item.stock_quantity === 0) {
        summary.out_of_stock++
      }
      if (item.stock_quantity > item.max_stock_level) {
        summary.overstock_items++
      }
    })

    let analysis = `INVENTORY ANALYSIS REQUEST\n`
    analysis += `Type: ${analysisType.toUpperCase()}\n\n`
    
    analysis += `CURRENT INVENTORY OVERVIEW:\n`
    analysis += `• Total Items: ${summary.total_items}\n`
    analysis += `• Total Value: $${summary.total_value.toFixed(2)}\n`
    analysis += `• Categories: ${Object.entries(summary.categories).map(([cat, count]) => `${cat} (${count})`).join(', ')}\n\n`
    
    analysis += `STOCK LEVEL ALERTS:\n`
    analysis += `• Critical (Out of Stock): ${summary.out_of_stock} items\n`
    analysis += `• Low Stock: ${summary.low_stock_items} items\n`
    analysis += `• Overstock: ${summary.overstock_items} items\n\n`

    // Add specific item details for critical issues
    if (analysisType === 'low_stock' || summary.low_stock_items > 0) {
      analysis += `ITEMS REQUIRING IMMEDIATE ATTENTION:\n`
      inventoryData
        .filter(item => item.stock_quantity <= item.min_stock_level)
        .sort((a, b) => (a.stock_quantity / a.min_stock_level) - (b.stock_quantity / b.min_stock_level))
        .slice(0, 15) // Limit to prevent token overflow
        .forEach((item, index) => {
          const urgency = item.stock_quantity === 0 ? 'CRITICAL' : 
                         item.stock_quantity < item.min_stock_level * 0.5 ? 'HIGH' : 'MEDIUM'
          analysis += `${index + 1}. [${urgency}] ${item.name}\n`
          analysis += `   • Current Stock: ${item.stock_quantity}\n`
          analysis += `   • Minimum Level: ${item.min_stock_level}\n`
          analysis += `   • Reorder Quantity: ${item.reorder_quantity}\n`
          analysis += `   • Unit Price: $${item.price}\n`
          analysis += `   • Category: ${item.category}\n\n`
        })
    }

    analysis += `Please provide your expert analysis and specific recommendations for inventory optimization.`
    
    return analysis
  }
}

export default AnthropicProvider