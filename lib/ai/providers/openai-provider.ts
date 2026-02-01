// OpenAI Provider Integration
// This is a new provider that doesn't affect existing functionality

export interface OpenAIConfig {
  apiKey: string
  model?: string
  temperature?: number
  maxTokens?: number
  baseURL?: string
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenAIResponse {
  success: boolean
  content?: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  error?: string
}

export class OpenAIProvider {
  private config: OpenAIConfig

  constructor(config: OpenAIConfig) {
    this.config = {
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 1000,
      baseURL: 'https://api.openai.com/v1',
      ...config
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      const response = await fetch(`${this.config.baseURL}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const error = await response.json()
        return {
          success: false,
          error: error.error?.message || `HTTP ${response.status}: ${response.statusText}`,
          details: error
        }
      }

      const data = await response.json()
      return {
        success: true,
        details: {
          models_available: data.data?.length || 0,
          organization: response.headers.get('openai-organization') || 'Unknown'
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
    messages: OpenAIMessage[],
    options?: {
      model?: string
      temperature?: number
      maxTokens?: number
      stream?: boolean
    }
  ): Promise<OpenAIResponse> {
    try {
      const requestBody = {
        model: options?.model || this.config.model,
        messages: messages,
        temperature: options?.temperature || this.config.temperature,
        max_tokens: options?.maxTokens || this.config.maxTokens,
        stream: options?.stream || false
      }

      const response = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
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
        content: data.choices?.[0]?.message?.content || '',
        usage: data.usage ? {
          prompt_tokens: data.usage.prompt_tokens,
          completion_tokens: data.usage.completion_tokens,
          total_tokens: data.usage.total_tokens
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
    try {
      const response = await fetch(`${this.config.baseURL}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const error = await response.json()
        return {
          success: false,
          error: error.error?.message || `HTTP ${response.status}`
        }
      }

      const data = await response.json()
      const chatModels = data.data
        ?.filter((model: any) => model.id.includes('gpt'))
        ?.map((model: any) => model.id)
        ?.sort() || []

      return {
        success: true,
        models: chatModels
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch models'
      }
    }
  }

  // Vision API for image analysis
  async analyzeImage(
    imageUrl: string,
    prompt?: string,
    options?: {
      model?: string
      maxTokens?: number
      detail?: 'low' | 'high' | 'auto'
    }
  ): Promise<OpenAIResponse> {
    try {
      const model = options?.model || 'gpt-4o-mini' // Use vision-capable model
      const detail = options?.detail || 'high'
      const maxTokens = options?.maxTokens || 1000
      
      const messages = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt || 'Analyze this image and describe what you see in detail.'
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: detail
              }
            }
          ]
        }
      ]

      const requestBody = {
        model: model,
        messages: messages,
        max_tokens: maxTokens,
        temperature: this.config.temperature || 0.7
      }

      console.log('🤖 Sending image to OpenAI Vision API:', { model, detail, maxTokens })

      const response = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('❌ OpenAI Vision API error:', error)
        return {
          success: false,
          error: error.error?.message || `HTTP ${response.status}: ${response.statusText}`
        }
      }

      const data = await response.json()
      console.log('✅ OpenAI Vision API success:', { 
        content_length: data.choices?.[0]?.message?.content?.length || 0,
        usage: data.usage 
      })
      
      return {
        success: true,
        content: data.choices?.[0]?.message?.content || '',
        usage: data.usage ? {
          prompt_tokens: data.usage.prompt_tokens,
          completion_tokens: data.usage.completion_tokens,
          total_tokens: data.usage.total_tokens
        } : undefined
      }
    } catch (error) {
      console.error('❌ OpenAI Vision API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Vision API request failed'
      }
    }
  }

  // Inventory-specific helper methods
  async analyzeInventoryData(inventoryData: any[], analysisType: string): Promise<OpenAIResponse> {
    const systemPrompt = this.getInventorySystemPrompt(analysisType)
    const userMessage = this.formatInventoryForAnalysis(inventoryData, analysisType)

    return this.sendMessage([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ])
  }

  private getInventorySystemPrompt(analysisType: string): string {
    switch (analysisType) {
      case 'low_stock':
        return `You are an inventory management expert. Analyze the provided inventory data and identify items that need immediate attention for restocking. Consider current stock levels, minimum thresholds, consumption patterns, and provide actionable recommendations with priorities.`
      
      case 'reorder_suggestions':
        return `You are a supply chain optimization expert. Analyze the inventory data and provide intelligent reorder suggestions including optimal quantities, timing, and cost considerations. Factor in lead times, seasonal patterns, and bulk pricing opportunities.`
      
      case 'general_analysis':
        return `You are an inventory analyst. Provide a comprehensive analysis of the inventory data including trends, issues, opportunities, and strategic recommendations for inventory optimization.`
      
      default:
        return `You are an inventory management assistant. Analyze the provided data and give helpful insights about inventory status and management.`
    }
  }

  private formatInventoryForAnalysis(inventoryData: any[], analysisType: string): string {
    const summary = {
      total_items: inventoryData.length,
      categories: {} as Record<string, number>,
      low_stock_items: 0,
      total_value: 0,
      out_of_stock: 0
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
    })

    let prompt = `Inventory Analysis Request (${analysisType})\n\n`
    prompt += `Summary:\n`
    prompt += `- Total Items: ${summary.total_items}\n`
    prompt += `- Categories: ${Object.entries(summary.categories).map(([cat, count]) => `${cat}: ${count}`).join(', ')}\n`
    prompt += `- Low Stock Items: ${summary.low_stock_items}\n`
    prompt += `- Out of Stock: ${summary.out_of_stock}\n`
    prompt += `- Total Inventory Value: $${summary.total_value.toFixed(2)}\n\n`

    if (analysisType === 'low_stock' || summary.low_stock_items > 0) {
      prompt += `Items Needing Attention:\n`
      inventoryData
        .filter(item => item.stock_quantity <= item.min_stock_level)
        .slice(0, 10) // Limit to first 10 to avoid token limits
        .forEach(item => {
          prompt += `- ${item.name}: Current: ${item.stock_quantity}, Min: ${item.min_stock_level}, Price: $${item.price}\n`
        })
    }

    prompt += `\nPlease provide your analysis and recommendations.`
    return prompt
  }
}

export default OpenAIProvider