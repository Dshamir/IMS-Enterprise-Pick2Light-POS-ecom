// AI Provider Factory - Creates appropriate provider instances
// This is a new factory that doesn't affect existing functionality

import OpenAIProvider from './providers/openai-provider'
import AnthropicProvider from './providers/anthropic-provider'
import { getDatabase } from '@/lib/database/sqlite'
import { databaseQueryExecutor } from './database-query-executor'
import { decryptApiKey } from '@/lib/crypto/encryption'

export interface ProviderInstance {
  testConnection(): Promise<{ success: boolean; error?: string; details?: any }>
  sendMessage(messages: any[], options?: any): Promise<any>
  getAvailableModels?(): Promise<{ success: boolean; models?: string[]; error?: string }>
  analyzeInventoryData?(inventoryData: any[], analysisType: string): Promise<any>
}

export class AIProviderFactory {
  private static instance: AIProviderFactory
  private providerCache: Map<string, ProviderInstance> = new Map()

  public static getInstance(): AIProviderFactory {
    if (!AIProviderFactory.instance) {
      AIProviderFactory.instance = new AIProviderFactory()
    }
    return AIProviderFactory.instance
  }

  async getProvider(providerId: string): Promise<ProviderInstance | null> {
    console.log('🏭 [Provider Factory] getProvider called for ID:', providerId)
    
    // Check cache first
    if (this.providerCache.has(providerId)) {
      console.log('✅ [Provider Factory] Returning cached provider for:', providerId)
      return this.providerCache.get(providerId) || null
    }
    
    console.log('🔨 [Provider Factory] Creating new provider instance for:', providerId)

    try {
      const db = getDatabase()
      
      // Enhanced provider lookup with validation
      const provider = db.prepare(`
        SELECT * FROM ai_providers 
        WHERE id = ? AND is_active = 1
      `).get(providerId) as any

      if (!provider) {
        console.log('Active provider not found, searching for any provider with this ID:', { providerId })
        
        // Check if provider exists but is inactive
        const inactiveProvider = db.prepare(`
          SELECT * FROM ai_providers WHERE id = ?
        `).get(providerId) as any
        
        if (inactiveProvider) {
          console.log('Found inactive provider, attempting to activate:', {
            providerId,
            name: inactiveProvider.name,
            display_name: inactiveProvider.display_name
          })
          
          // If it has an API key, try to activate it
          if (inactiveProvider.api_key_encrypted || 
              (inactiveProvider.name === 'openai' && process.env.OPENAI_API_KEY)) {
            
            db.prepare('UPDATE ai_providers SET is_active = 1 WHERE id = ?').run(providerId)
            console.log('Successfully activated provider:', providerId)
            
            // Retry with activated provider
            return this.getProvider(providerId)
          }
        }
        
        console.log('Provider not found or cannot be activated:', { providerId })
        return null
      }

      console.log('Found active provider:', {
        id: provider.id,
        name: provider.name,
        display_name: provider.display_name,
        has_api_key: !!provider.api_key_encrypted,
        is_active: provider.is_active
      })

      // Enhanced API key resolution with multiple fallback strategies
      let apiKey: string
      let apiKeySource = 'unknown'
      
      if (!provider.api_key_encrypted) {
        // No encrypted key in database, try environment variables
        if (provider.name === 'openai' && process.env.OPENAI_API_KEY) {
          console.log('Using OPENAI_API_KEY env variable as primary source for provider:', providerId)
          apiKey = process.env.OPENAI_API_KEY
          apiKeySource = 'environment'
        } else if (provider.name === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
          console.log('Using ANTHROPIC_API_KEY env variable as primary source for provider:', providerId)
          apiKey = process.env.ANTHROPIC_API_KEY
          apiKeySource = 'environment'
        } else {
          console.log('Provider has no API key and no env fallback:', { 
            providerId, 
            providerName: provider.name, 
            hasOpenAIEnv: !!process.env.OPENAI_API_KEY,
            hasAnthropicEnv: !!process.env.ANTHROPIC_API_KEY
          })
          return null
        }
      } else {
        // Try to decrypt database-stored key
        try {
          apiKey = decryptApiKey(provider.api_key_encrypted)
          apiKeySource = 'database'
          
          // Validate decrypted key format
          if (!apiKey || apiKey.length < 10) {
            throw new Error('Decrypted API key appears invalid (too short)')
          }
          
          // Basic format validation for known providers
          if (provider.name === 'openai' && !apiKey.startsWith('sk-')) {
            throw new Error('OpenAI API key should start with "sk-"')
          }
          if (provider.name === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
            throw new Error('Anthropic API key should start with "sk-ant-"')
          }
          
          console.log('Successfully decrypted API key from database:', {
            providerId,
            providerName: provider.name,
            keyLength: apiKey.length,
            keyPrefix: apiKey.substring(0, 7) + '...'
          })
          
        } catch (decryptError) {
          console.error('Failed to decrypt API key for provider:', {
            providerId,
            providerName: provider.name,
            error: decryptError.message,
            encryptedKeyPreview: provider.api_key_encrypted.substring(0, 20) + '...'
          })
          
          // Enhanced fallback to environment variables
          if (provider.name === 'openai' && process.env.OPENAI_API_KEY) {
            console.log('Using OPENAI_API_KEY env variable due to decryption failure')
            apiKey = process.env.OPENAI_API_KEY
            apiKeySource = 'environment_fallback'
          } else if (provider.name === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
            console.log('Using ANTHROPIC_API_KEY env variable due to decryption failure')
            apiKey = process.env.ANTHROPIC_API_KEY
            apiKeySource = 'environment_fallback'
          } else {
            console.error('No environment variable fallback available for provider:', {
              providerId,
              providerName: provider.name
            })
            return null
          }
        }
      }
      
      console.log('API key resolved successfully:', {
        providerId,
        providerName: provider.name,
        source: apiKeySource,
        keyLength: apiKey?.length || 0
      })
      
      let providerInstance: ProviderInstance | null = null

      switch (provider.name) {
        case 'openai':
          // Ensure correct OpenAI endpoint
          let baseURL = 'https://api.openai.com/v1'
          if (provider.api_endpoint) {
            // Validate that custom endpoint looks like OpenAI
            if (provider.api_endpoint.includes('openai.com') || provider.api_endpoint.includes('v1')) {
              baseURL = provider.api_endpoint
            } else {
              console.warn(`Invalid OpenAI endpoint detected: ${provider.api_endpoint}, using default`)
            }
          }
          
          const openaiConfig: any = {
            apiKey,
            model: provider.default_model || 'gpt-3.5-turbo',
            temperature: provider.default_temperature || 0.7,
            maxTokens: provider.default_max_tokens || 1000,
            baseURL
          }
          
          console.log('Creating OpenAI provider with config:', { 
            model: openaiConfig.model,
            baseURL: openaiConfig.baseURL,
            hasApiKey: !!openaiConfig.apiKey,
            apiKeyLength: openaiConfig.apiKey?.length,
            apiKeyPrefix: openaiConfig.apiKey?.substring(0, 7) + '...'
          })
          
          providerInstance = new OpenAIProvider(openaiConfig)
          break

        case 'anthropic':
          const anthropicConfig: any = {
            apiKey,
            model: provider.default_model,
            maxTokens: provider.default_max_tokens
          }
          if (provider.api_endpoint) {
            anthropicConfig.baseURL = provider.api_endpoint
          }
          providerInstance = new AnthropicProvider(anthropicConfig)
          break

        case 'gemini':
          // TODO: Implement Google Gemini provider
          console.warn('Gemini provider not yet implemented')
          break

        default:
          console.warn(`Unknown provider type: ${provider.name}`)
      }

      if (providerInstance) {
        this.providerCache.set(providerId, providerInstance)
      }

      return providerInstance
    } catch (error) {
      console.error('Error creating provider instance:', error)
      return null
    }
  }

  async getProviderByName(providerName: string): Promise<ProviderInstance | null> {
    try {
      const db = getDatabase()
      const provider = db.prepare(`
        SELECT * FROM ai_providers 
        WHERE name = ? AND is_active = 1
        ORDER BY created_at DESC
        LIMIT 1
      `).get(providerName) as any

      if (!provider) {
        // Fallback to environment variable for OpenAI (like AI Documentation Assistant does)
        if (providerName === 'openai' && process.env.OPENAI_API_KEY) {
          console.log('Using global OPENAI_API_KEY fallback for AI agents')
          const OpenAIProvider = (await import('./providers/openai-provider')).default
          return new OpenAIProvider({
            apiKey: process.env.OPENAI_API_KEY,
            model: 'gpt-3.5-turbo',
            temperature: 0.7,
            maxTokens: 1000
          })
        }
        return null
      }

      return this.getProvider(provider.id)
    } catch (error) {
      console.error('Error getting provider by name:', error)
      return null
    }
  }

  async getActiveProvider(): Promise<{ provider: ProviderInstance; config: any } | null> {
    try {
      const db = getDatabase()
      const provider = db.prepare(`
        SELECT * FROM ai_providers 
        WHERE is_active = 1
        ORDER BY created_at DESC
        LIMIT 1
      `).get() as any

      if (!provider) {
        return null
      }

      const instance = await this.getProvider(provider.id)
      if (!instance) {
        return null
      }

      return {
        provider: instance,
        config: provider
      }
    } catch (error) {
      console.error('Error getting active provider:', error)
      return null
    }
  }

  async testProvider(providerId: string): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      console.log('Testing provider with ID:', providerId)
      
      // Clear cache to ensure we get fresh data
      this.clearCache(providerId)
      
      const provider = await this.getProvider(providerId)
      if (!provider) {
        console.log('Provider instance not found for ID:', providerId)
        return {
          success: false,
          error: 'Provider not found or not configured'
        }
      }

      console.log('Provider found, testing connection...')
      const result = await provider.testConnection()
      console.log('Test connection result:', result)
      
      return result
    } catch (error) {
      console.error('Error in testProvider:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Test failed'
      }
    }
  }

  clearCache(providerId?: string): void {
    if (providerId) {
      this.providerCache.delete(providerId)
    } else {
      this.providerCache.clear()
    }
  }

  // Helper methods for common operations
  async sendMessageToAgent(
    agentId: string,
    message: string,
    conversationHistory: any[] = []
  ): Promise<{ success: boolean; response?: string; usage?: any; error?: string }> {
    console.log('🤖 [AI Agent] Starting sendMessageToAgent flow:', {
      agentId,
      messagePreview: message.substring(0, 100) + '...',
      conversationLength: conversationHistory.length
    })
    
    try {
      const db = getDatabase()
      
      // Get agent configuration (prioritize agent status, validate provider separately)
      console.log('🔍 [AI Agent] Looking up agent configuration for ID:', agentId)
      
      const agent = db.prepare(`
        SELECT a.*, p.id as provider_id, p.name as provider_name, p.is_active as provider_is_active
        FROM ai_agents a
        JOIN ai_providers p ON a.provider_id = p.id
        WHERE a.id = ? AND a.is_active = 1
      `).get(agentId) as any

      if (!agent) {
        console.error('❌ [AI Agent] Agent lookup failed:', {
          agentId,
          reason: 'Agent not found or not active'
        })
        
        // Check if agent exists but is inactive or has no provider
        const inactiveAgent = db.prepare(`
          SELECT a.*, a.provider_id 
          FROM ai_agents a 
          WHERE a.id = ?
        `).get(agentId) as any
        
        if (inactiveAgent) {
          console.error('🔍 [AI Agent] Found inactive agent:', {
            agentId,
            agentName: inactiveAgent.name,
            isActive: inactiveAgent.is_active,
            hasProvider: !!inactiveAgent.provider_id
          })
          
          return {
            success: false,
            error: `Agent "${inactiveAgent.name}" is ${!inactiveAgent.is_active ? 'inactive' : 'missing provider assignment'}`
          }
        }
        
        return {
          success: false,
          error: 'Agent not found or not active'
        }
      }

      console.log('✅ [AI Agent] Agent found:', {
        agentId,
        agentName: agent.name,
        agentRole: agent.role,
        providerId: agent.provider_id,
        providerName: agent.provider_name,
        providerActive: agent.provider_is_active,
        hasSystemPrompt: !!agent.system_prompt
      })

      // Check if provider needs activation (but don't block usage)
      if (!agent.provider_is_active) {
        console.warn(`Provider ${agent.provider_name} is not marked as active but attempting to use it for agent ${agent.name}`)
      }

      console.log('🔗 [AI Agent] Attempting to get provider for agent:', { 
        agentId,
        agentName: agent.name,
        providerId: agent.provider_id,
        providerName: agent.provider_name,
        providerActive: agent.provider_is_active 
      })
      
      // Clear cache to ensure fresh provider lookup
      this.clearCache(agent.provider_id)
      
      const provider = await this.getProvider(agent.provider_id)
      if (!provider) {
        console.error('❌ [AI Agent] Provider retrieval failed for agent:', {
          agentId,
          agentName: agent.name,
          providerId: agent.provider_id,
          providerName: agent.provider_name
        })
        
        // Enhanced error messaging with specific guidance
        console.log('🔍 [AI Agent] Running provider failure diagnosis...')
        const errorDetails = await this.diagnoseProviderFailure(agent.provider_id, agent.provider_name, 'Connection failed')
        console.error('🚨 [AI Agent] Provider diagnosis result:', errorDetails)
        
        // Format error message based on severity
        const severityIcon = {
          'critical': '🚨',
          'high': '⚠️',
          'medium': '⚡',
          'low': 'ℹ️'
        }[errorDetails.severity]
        
        return {
          success: false,
          error: `${severityIcon} ${agent.name} agent cannot connect to ${agent.provider_name}. ${errorDetails.reason} ${errorDetails.solution}`
        }
      }
      
      console.log('Provider retrieved successfully for agent:', {
        agentName: agent.name,
        providerName: agent.provider_name
      })

      // Enhance system prompt with current inventory context
      const enhancedSystemPrompt = await this.enhanceSystemPromptWithInventoryContext(agent.system_prompt, message)

      // Prepare messages based on provider type
      let messages: any[] = []
      
      if (agent.provider_name === 'openai') {
        // OpenAI format
        if (enhancedSystemPrompt) {
          messages.push({ role: 'system', content: enhancedSystemPrompt })
        }
        
        // Add conversation history
        conversationHistory.forEach(msg => {
          messages.push({
            role: msg.role,
            content: msg.content
          })
        })
        
        messages.push({ role: 'user', content: message })
        
        console.log('📤 [AI Agent] Sending message to provider:', {
          agentName: agent.name,
          providerName: agent.provider_name,
          model: agent.model || 'default',
          temperature: agent.temperature || 'default',
          maxTokens: agent.max_tokens || 'default',
          messageCount: messages.length
        })
        
        const response = await provider.sendMessage(messages, {
          model: agent.model,
          temperature: agent.temperature,
          maxTokens: agent.max_tokens
        })
        
        console.log('📥 [AI Agent] Provider response received:', {
          agentName: agent.name,
          success: response.success,
          hasContent: !!response.content,
          contentLength: response.content?.length || 0,
          hasUsage: !!response.usage,
          error: response.error
        })
        
        if (!response.success) {
          console.error('❌ [AI Agent] Provider response failed:', {
            agentName: agent.name,
            providerName: agent.provider_name,
            error: response.error
          })
          
          // Enhanced error diagnosis for failed responses
          const errorDetails = await this.diagnoseProviderFailure(agent.provider_id, agent.provider_name, response.error)
          const severityIcon = {
            'critical': '🚨',
            'high': '⚠️',
            'medium': '⚡',
            'low': 'ℹ️'
          }[errorDetails.severity]
          
          return {
            success: response.success,
            response: response.content,
            usage: response.usage,
            error: `${severityIcon} ${errorDetails.reason} ${errorDetails.solution}`
          }
        }

        // Check if AI response contains database function calls
        const functionResult = await databaseQueryExecutor.parseAndExecute(response.content || '')
        
        if (functionResult.hasFunction) {
          if (functionResult.error) {
            return {
              success: false,
              error: functionResult.error,
              usage: response.usage
            }
          }
          
          // Return the formatted database result
          return {
            success: true,
            response: functionResult.formattedResponse,
            usage: response.usage,
            raw_data: functionResult.result
          }
        }
        
        return {
          success: response.success,
          response: response.content,
          usage: response.usage,
          error: response.error
        }
      } else if (agent.provider_name === 'anthropic') {
        // Anthropic format (system prompt separate)
        conversationHistory.forEach(msg => {
          if (msg.role !== 'system') {
            messages.push({
              role: msg.role,
              content: msg.content
            })
          }
        })
        
        messages.push({ role: 'user', content: message })
        
        const response = await provider.sendMessage(messages, {
          model: agent.model,
          maxTokens: agent.max_tokens,
          systemPrompt: enhancedSystemPrompt
        })
        
        if (!response.success) {
          return {
            success: response.success,
            response: response.content,
            usage: response.usage,
            error: response.error
          }
        }

        // Check if AI response contains database function calls
        const functionResult = await databaseQueryExecutor.parseAndExecute(response.content || '')
        
        if (functionResult.hasFunction) {
          if (functionResult.error) {
            return {
              success: false,
              error: functionResult.error,
              usage: response.usage
            }
          }
          
          // Return the formatted database result
          return {
            success: true,
            response: functionResult.formattedResponse,
            usage: response.usage,
            raw_data: functionResult.result
          }
        }
        
        return {
          success: response.success,
          response: response.content,
          usage: response.usage,
          error: response.error
        }
      }

      return {
        success: false,
        error: 'Unsupported provider type'
      }
    } catch (error) {
      console.error('💥 [AI Agent] Critical error in sendMessageToAgent:', {
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Message sending failed'
      }
    }
  }

  async analyzeInventoryWithAgent(
    agentId: string,
    inventoryData: any[],
    analysisType: string
  ): Promise<{ success: boolean; analysis?: string; usage?: any; model?: string; error?: string }> {
    try {
      const db = getDatabase()

      const agent = db.prepare(`
        SELECT a.*, p.id as provider_id, p.name as provider_name
        FROM ai_agents a
        JOIN ai_providers p ON a.provider_id = p.id
        WHERE a.id = ? AND a.is_active = 1
      `).get(agentId) as any

      if (!agent) {
        return {
          success: false,
          error: 'Agent not found or not active'
        }
      }

      const provider = await this.getProvider(agent.provider_id)
      if (!provider || !provider.analyzeInventoryData) {
        return {
          success: false,
          error: 'Provider does not support inventory analysis'
        }
      }

      const response = await provider.analyzeInventoryData(inventoryData, analysisType)

      return {
        success: response.success,
        analysis: response.content,
        usage: response.usage, // Pass through usage data for telemetry
        model: agent.model, // Include model used
        error: response.error
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed'
      }
    }
  }

  // Method to enhance system prompts with current inventory context
  private async enhanceSystemPromptWithInventoryContext(
    originalPrompt: string,
    userMessage: string
  ): Promise<string> {
    try {
      // Import sqliteHelpers here to avoid circular dependency
      const { sqliteHelpers } = await import('@/lib/database/sqlite')
      
      // Get current inventory data
      const allProducts = sqliteHelpers.getAllProducts()
      const lowStockProducts = sqliteHelpers.getLowStockProducts()
      
      // Calculate inventory stats
      const totalProducts = allProducts.length
      const totalValue = allProducts.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0)
      const categoryCounts = allProducts.reduce((acc: Record<string, number>, product) => {
        acc[product.category] = (acc[product.category] || 0) + 1
        return acc
      }, {})

      // Determine if user is asking inventory-specific questions
      const isInventoryQuery = this.isInventoryRelatedQuery(userMessage)
      
      // Get function documentation for AI agents
      const functionDocumentation = databaseQueryExecutor.generateFunctionDocumentation()
      
      // Create enhanced context
      const inventoryContext = `
CURRENT INVENTORY CONTEXT (${new Date().toISOString()}):
- Total Products: ${totalProducts}
- Total Inventory Value: $${totalValue.toFixed(2)}
- Low Stock Alerts: ${lowStockProducts.length} items
- Categories: ${Object.entries(categoryCounts).map(([cat, count]) => `${cat}: ${count}`).join(', ')}

${isInventoryQuery ? this.generateDetailedInventoryContext(allProducts, lowStockProducts, userMessage) : ''}

CRITICAL DATABASE ACCESS INSTRUCTIONS:
You have DIRECT database access via executable functions. When users request inventory data:

1. ALWAYS execute database queries using EXECUTE_FUNCTION format
2. NEVER provide generic responses like "I don't have access to data"
3. NEVER explain what users should do - DO IT FOR THEM
4. Return ACTUAL DATA from live database queries
5. Be direct and task-focused

${functionDocumentation}

RESPONSE FORMAT EXAMPLES:
User: "What is the value of unused items?" 
Response: EXECUTE_FUNCTION: getTotalUnusedValue()

User: "List unused items"
Response: EXECUTE_FUNCTION: getUnusedItemsList()

User: "Show low stock items"
Response: EXECUTE_FUNCTION: getLowStockProducts()

User: "Find blue pens"
Response: EXECUTE_FUNCTION: searchProducts("blue pens")

IMPORTANT: Provide specific, data-driven answers by executing functions, not generic suggestions.
`

      // Combine original prompt with inventory context
      return `${originalPrompt}

${inventoryContext}`
    } catch (error) {
      console.warn('Failed to enhance system prompt with inventory context:', error)
      return originalPrompt
    }
  }

  private isInventoryRelatedQuery(message: string): boolean {
    const inventoryKeywords = [
      'stock', 'inventory', 'product', 'item', 'category', 'low stock', 'reorder',
      'parts', 'consumables', 'equipment', 'location', 'price', 'value',
      'search', 'find', 'show me', 'what', 'how many', 'list'
    ]
    
    const messageLower = message.toLowerCase()
    return inventoryKeywords.some(keyword => messageLower.includes(keyword))
  }

  private generateDetailedInventoryContext(
    allProducts: any[],
    lowStockProducts: any[],
    userMessage: string
  ): string {
    const messageLower = userMessage.toLowerCase()
    
    let context = ''
    
    // Add low stock details if relevant
    if (messageLower.includes('low stock') || messageLower.includes('alert')) {
      context += `\nLOW STOCK DETAILS:\n`
      lowStockProducts.slice(0, 10).forEach(product => {
        context += `- ${product.name} (${product.category}): ${product.stock_quantity}/${product.min_stock_level} min, Location: ${product.Location || 'Unknown'}\n`
      })
    }
    
    // Add category breakdown if relevant
    if (messageLower.includes('category') || messageLower.includes('parts') || messageLower.includes('consumables') || messageLower.includes('equipment')) {
      const categories = ['parts', 'consumables', 'equipment']
      context += `\nCATEGORY BREAKDOWN:\n`
      categories.forEach(category => {
        const categoryProducts = allProducts.filter(p => p.category === category)
        const categoryValue = categoryProducts.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0)
        context += `- ${category.toUpperCase()}: ${categoryProducts.length} items, Value: $${categoryValue.toFixed(2)}\n`
      })
    }
    
    // Add search context if relevant
    if (messageLower.includes('find') || messageLower.includes('search') || messageLower.includes('show')) {
      context += `\nSEARCH CAPABILITIES:\n`
      context += `- Can search across: name, description, category, barcode, manufacturer, location\n`
      context += `- Available locations: ${[...new Set(allProducts.map(p => p.Location).filter(l => l))].slice(0, 5).join(', ')}\n`
      context += `- Available manufacturers: ${[...new Set(allProducts.map(p => p.mfgname).filter(m => m))].slice(0, 5).join(', ')}\n`
    }
    
    return context
  }

  // Enhanced diagnostic method for provider failures with intelligent error detection
  private async diagnoseProviderFailure(
    providerId: string, 
    providerName: string,
    lastError?: string
  ): Promise<{ reason: string; solution: string; errorType: string; severity: 'critical' | 'high' | 'medium' | 'low' }> {
    try {
      const db = getDatabase()
      
      // Advanced error pattern recognition for OpenAI/Anthropic specific issues
      if (lastError) {
        console.log('🔍 [Error Diagnosis] Analyzing error pattern:', { lastError })
        
        // OpenAI Quota and Billing Issues
        if (lastError.includes('exceeded your current quota') || 
            lastError.includes('insufficient_quota') || 
            lastError.includes('billing_hard_limit_reached')) {
          return {
            reason: '💳 OpenAI account has insufficient credits or exceeded quota limits',
            solution: 'Add billing credits at: https://platform.openai.com/settings/organization/billing. Auto-recharge is recommended to prevent interruptions.',
            errorType: 'quota_exceeded',
            severity: 'critical'
          }
        }
        
        // OpenAI API Key Issues
        if (lastError.includes('invalid_api_key') || 
            lastError.includes('Incorrect API key') ||
            lastError.includes('Invalid Authentication')) {
          return {
            reason: '🔑 OpenAI API key is invalid or expired',
            solution: 'Update your API key in Settings → AI Assistant → Provider Configuration. Get a new key from: https://platform.openai.com/api-keys',
            errorType: 'invalid_api_key',
            severity: 'high'
          }
        }
        
        // Rate Limiting Issues
        if (lastError.includes('rate_limit_exceeded') || 
            lastError.includes('Too Many Requests') ||
            lastError.includes('Rate limit reached')) {
          return {
            reason: '⏱️ OpenAI rate limit exceeded - too many requests',
            solution: 'Wait a few minutes before retrying. Consider upgrading your OpenAI plan for higher rate limits.',
            errorType: 'rate_limit',
            severity: 'medium'
          }
        }
        
        // Network and Connectivity Issues
        if (lastError.includes('ECONNREFUSED') || 
            lastError.includes('Network error') ||
            lastError.includes('fetch failed') ||
            lastError.includes('ETIMEDOUT')) {
          return {
            reason: '🌐 Network connectivity issue detected',
            solution: 'Check your internet connection and firewall settings. OpenAI API requires HTTPS access to api.openai.com',
            errorType: 'network_error',
            severity: 'medium'
          }
        }
        
        // Model or Permission Issues
        if (lastError.includes('model_not_found') || 
            lastError.includes('does not exist') ||
            lastError.includes('permission_denied')) {
          return {
            reason: '🤖 Model access or permissions issue',
            solution: 'Verify your OpenAI plan includes access to the requested model. Update model selection in AI Settings.',
            errorType: 'model_access',
            severity: 'high'
          }
        }
        
        // Server Errors
        if (lastError.includes('Internal Server Error') || 
            lastError.includes('Bad Gateway') ||
            lastError.includes('Service Unavailable')) {
          return {
            reason: '🔧 OpenAI service temporarily unavailable',
            solution: 'This is a temporary OpenAI service issue. Try again in a few minutes. Check OpenAI status: https://status.openai.com',
            errorType: 'service_unavailable',
            severity: 'low'
          }
        }
      }
      
      // Check if provider exists
      const provider = db.prepare('SELECT * FROM ai_providers WHERE id = ?').get(providerId) as any
      
      if (!provider) {
        return {
          reason: 'Provider configuration not found in database',
          solution: 'Please reconfigure the AI provider in Settings → AI Assistant → Provider Configuration',
          errorType: 'config_missing',
          severity: 'high'
        }
      }
      
      // Check if provider is active
      if (!provider.is_active) {
        return {
          reason: 'Provider is currently disabled',
          solution: 'Enable the provider in Settings → AI Assistant → Provider Configuration',
          errorType: 'provider_disabled',
          severity: 'medium'
        }
      }
      
      // Check for API key
      if (!provider.api_key_encrypted) {
        const envKeyAvailable = (providerName === 'openai' && process.env.OPENAI_API_KEY) ||
                               (providerName === 'anthropic' && process.env.ANTHROPIC_API_KEY)
        
        if (envKeyAvailable) {
          return {
            reason: 'Database API key missing but environment variable available',
            solution: 'The system will use the environment variable. Consider saving the API key in the provider configuration for better reliability',
            errorType: 'api_key_fallback',
            severity: 'low'
          }
        } else {
          return {
            reason: 'No API key configured',
            solution: 'Add your API key in Settings → AI Assistant → Provider Configuration',
            errorType: 'api_key_missing',
            severity: 'high'
          }
        }
      }
      
      // Test API key decryption and basic connectivity
      try {
        const decryptedKey = decryptApiKey(provider.api_key_encrypted)
        if (!decryptedKey || decryptedKey.length < 10) {
          throw new Error('Decrypted key is invalid')
        }
        
        // Perform a lightweight test to check quota/connectivity
        if (providerName === 'openai') {
          console.log('🔍 [Error Diagnosis] Testing OpenAI connectivity and quota...')
          const testResult = await this.performQuotaCheck(decryptedKey)
          if (!testResult.success) {
            return {
              reason: testResult.reason || 'OpenAI connection test failed',
              solution: testResult.solution || 'Check your OpenAI account status and API key',
              errorType: testResult.errorType || 'connection_failed',
              severity: testResult.severity || 'high'
            }
          }
        }
        
      } catch (decryptError) {
        const envKeyAvailable = (providerName === 'openai' && process.env.OPENAI_API_KEY) ||
                               (providerName === 'anthropic' && process.env.ANTHROPIC_API_KEY)
        
        if (envKeyAvailable) {
          return {
            reason: 'API key decryption failed, using environment variable fallback',
            solution: 'Consider re-entering your API key in the provider configuration to fix encryption issues',
            errorType: 'decryption_failed',
            severity: 'medium'
          }
        } else {
          return {
            reason: 'API key decryption failed and no environment variable fallback available',
            solution: 'Re-enter your API key in Settings → AI Assistant → Provider Configuration',
            errorType: 'decryption_failed',
            severity: 'high'
          }
        }
      }
      
      return {
        reason: 'Unknown configuration issue',
        solution: 'Check the provider configuration and try testing the connection in Settings → AI Assistant',
        errorType: 'unknown',
        severity: 'medium'
      }
      
    } catch (error) {
      return {
        reason: 'System error during provider diagnosis',
        solution: 'Check system logs and restart AI services if needed',
        errorType: 'system_error',
        severity: 'high'
      }
    }
  }

  // Lightweight quota and connectivity check for OpenAI
  private async performQuotaCheck(apiKey: string): Promise<{
    success: boolean
    reason?: string
    solution?: string
    errorType?: string
    severity?: 'critical' | 'high' | 'medium' | 'low'
  }> {
    try {
      // Test with a minimal request to /models endpoint (free, lightweight)
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
        
        // Parse specific error types
        if (response.status === 401) {
          return {
            success: false,
            reason: '🔑 OpenAI API key is invalid or expired',
            solution: 'Update your API key in Settings → AI Assistant → Provider Configuration',
            errorType: 'invalid_api_key',
            severity: 'high'
          }
        } else if (response.status === 429) {
          return {
            success: false,
            reason: '💳 OpenAI quota exceeded or rate limit reached',
            solution: 'Check your OpenAI billing and add credits: https://platform.openai.com/settings/organization/billing',
            errorType: 'quota_exceeded',
            severity: 'critical'
          }
        } else if (response.status >= 500) {
          return {
            success: false,
            reason: '🔧 OpenAI service temporarily unavailable',
            solution: 'This is a temporary issue. Check OpenAI status: https://status.openai.com',
            errorType: 'service_unavailable',
            severity: 'low'
          }
        }
        
        return {
          success: false,
          reason: `OpenAI API error: ${errorMessage}`,
          solution: 'Check your OpenAI account and configuration',
          errorType: 'api_error',
          severity: 'high'
        }
      }
      
      return { success: true }
    } catch (error) {
      return {
        success: false,
        reason: '🌐 Network connectivity issue with OpenAI',
        solution: 'Check your internet connection and firewall settings',
        errorType: 'network_error',
        severity: 'medium'
      }
    }
  }

  // System health monitoring
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    providers: {
      total: number
      active: number
      configured: number
      working: number
    }
    agents: {
      total: number
      active: number
      properly_configured: number
    }
    issues: string[]
    recommendations: string[]
  }> {
    try {
      const db = getDatabase()
      const issues: string[] = []
      const recommendations: string[] = []
      
      // Provider health check
      const allProviders = db.prepare('SELECT * FROM ai_providers').all() as any[]
      const activeProviders = allProviders.filter(p => p.is_active)
      const configuredProviders = allProviders.filter(p => 
        p.api_key_encrypted || 
        (p.name === 'openai' && process.env.OPENAI_API_KEY) ||
        (p.name === 'anthropic' && process.env.ANTHROPIC_API_KEY)
      )
      
      // Test provider connections
      const workingProviders = []
      for (const provider of activeProviders) {
        try {
          const instance = await this.getProvider(provider.id)
          if (instance) {
            const testResult = await instance.testConnection()
            if (testResult.success) {
              workingProviders.push(provider)
            } else {
              issues.push(`${provider.display_name} connection test failed: ${testResult.error}`)
            }
          }
        } catch (error) {
          issues.push(`${provider.display_name} provider creation failed`)
        }
      }
      
      // Agent health check
      const allAgents = db.prepare('SELECT * FROM ai_agents').all() as any[]
      const activeAgents = allAgents.filter(a => a.is_active)
      
      let properlyConfiguredAgents = 0
      for (const agent of activeAgents) {
        const agentProvider = allProviders.find(p => p.id === agent.provider_id)
        if (agentProvider && agentProvider.is_active) {
          const isConfigured = agentProvider.api_key_encrypted ||
            (agentProvider.name === 'openai' && process.env.OPENAI_API_KEY) ||
            (agentProvider.name === 'anthropic' && process.env.ANTHROPIC_API_KEY)
          
          if (isConfigured) {
            properlyConfiguredAgents++
          } else {
            issues.push(`Agent "${agent.name}" assigned to unconfigured provider`)
          }
        } else {
          issues.push(`Agent "${agent.name}" assigned to inactive or missing provider`)
        }
      }
      
      // Generate recommendations
      if (activeProviders.length === 0) {
        recommendations.push('No active AI providers found. Please configure at least one provider.')
      }
      
      if (workingProviders.length === 0 && activeProviders.length > 0) {
        recommendations.push('AI providers are configured but not working. Check API keys and network connectivity.')
      }
      
      if (properlyConfiguredAgents < activeAgents.length) {
        recommendations.push(`${activeAgents.length - properlyConfiguredAgents} agents need provider reconfiguration.`)
      }
      
      if (issues.length === 0) {
        recommendations.push('AI system is healthy and ready for use.')
      }
      
      // Determine overall status
      let status: 'healthy' | 'degraded' | 'unhealthy'
      if (workingProviders.length > 0 && properlyConfiguredAgents === activeAgents.length) {
        status = 'healthy'
      } else if (workingProviders.length > 0 || properlyConfiguredAgents > 0) {
        status = 'degraded'
      } else {
        status = 'unhealthy'
      }
      
      return {
        status,
        providers: {
          total: allProviders.length,
          active: activeProviders.length,
          configured: configuredProviders.length,
          working: workingProviders.length
        },
        agents: {
          total: allAgents.length,
          active: activeAgents.length,
          properly_configured: properlyConfiguredAgents
        },
        issues,
        recommendations
      }
      
    } catch (error) {
      return {
        status: 'unhealthy',
        providers: { total: 0, active: 0, configured: 0, working: 0 },
        agents: { total: 0, active: 0, properly_configured: 0 },
        issues: ['System error during health check'],
        recommendations: ['Check system logs and restart AI services']
      }
    }
  }
}

// Export singleton instance
export const aiProviderFactory = AIProviderFactory.getInstance()