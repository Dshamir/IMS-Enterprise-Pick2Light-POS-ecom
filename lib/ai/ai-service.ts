// AI Service Layer - Handles communication with AI providers
// This is a completely new service that doesn't affect existing functionality

export interface AIProvider {
  id: string
  name: string
  display_name: string
  api_key_encrypted?: string
  api_endpoint?: string
  default_model: string
  default_temperature: number
  default_max_tokens: number
  is_active: boolean
  settings?: any
}

export interface AIAgent {
  id: string
  name: string
  role: string
  description: string
  provider_id?: string
  model?: string
  temperature?: number
  max_tokens?: number
  system_prompt?: string
  capabilities: string[]
  is_active: boolean
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  agent_id?: string
}

export interface AITask {
  id: string
  agent_id: string
  task_type: string
  input_data: any
  output_data?: any
  status: 'pending' | 'running' | 'completed' | 'failed'
  priority: number
  created_at: string
  completed_at?: string
}

export class AIService {
  private static instance: AIService
  
  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService()
    }
    return AIService.instance
  }

  // Provider Management
  async getProviders(): Promise<AIProvider[]> {
    try {
      const response = await fetch('/api/ai/providers')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      return data.providers || []
    } catch (error) {
      console.error('Error fetching AI providers:', error)
      return []
    }
  }

  async saveProvider(provider: Partial<AIProvider>): Promise<{ success: boolean; error?: string; id?: string }> {
    try {
      const response = await fetch('/api/ai/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(provider)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `HTTP ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error saving AI provider:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  async updateProvider(id: string, updates: Partial<AIProvider>): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`/api/ai/providers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `HTTP ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error updating AI provider:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  async testProviderConnection(providerId: string): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      const response = await fetch(`/api/ai/providers/${providerId}/test`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `HTTP ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error testing provider connection:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection test failed' 
      }
    }
  }

  // Agent Management
  async getAgents(): Promise<AIAgent[]> {
    try {
      const response = await fetch('/api/ai/agents')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      return data.agents || []
    } catch (error) {
      console.error('Error fetching AI agents:', error)
      return []
    }
  }

  async updateAgent(id: string, updates: Partial<AIAgent>): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`/api/ai/agents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `HTTP ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error updating AI agent:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  async toggleAgent(id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
    return this.updateAgent(id, { is_active: isActive })
  }

  // Chat and Conversations
  async sendMessage(
    message: string, 
    agentId: string, 
    sessionId?: string
  ): Promise<{ success: boolean; response?: string; sessionId?: string; error?: string }> {
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          agent_id: agentId,
          session_id: sessionId
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `HTTP ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error sending message to AI:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send message' 
      }
    }
  }

  async getConversation(sessionId: string): Promise<ChatMessage[]> {
    try {
      const response = await fetch(`/api/ai/conversations/${sessionId}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      return data.messages || []
    } catch (error) {
      console.error('Error fetching conversation:', error)
      return []
    }
  }

  // Task Management
  async createTask(
    agentId: string, 
    taskType: string, 
    inputData: any, 
    priority: number = 0
  ): Promise<{ success: boolean; taskId?: string; error?: string }> {
    try {
      const response = await fetch('/api/ai/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          task_type: taskType,
          input_data: inputData,
          priority
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `HTTP ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error creating AI task:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create task' 
      }
    }
  }

  async getTasks(agentId?: string): Promise<AITask[]> {
    try {
      const url = agentId ? `/api/ai/tasks?agent_id=${agentId}` : '/api/ai/tasks'
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      return data.tasks || []
    } catch (error) {
      console.error('Error fetching AI tasks:', error)
      return []
    }
  }

  async cancelTask(taskId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`/api/ai/tasks/${taskId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `HTTP ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error canceling AI task:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to cancel task' 
      }
    }
  }

  // System Health and Status
  async getSystemHealth(): Promise<{
    status: string
    providers: any
    agents: any
    activity: any
    recommendations: string[]
  }> {
    try {
      const response = await fetch('/api/ai/health')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (error) {
      console.error('Error fetching AI system health:', error)
      return {
        status: 'error',
        providers: { total: 0, active: 0, configured: 0 },
        agents: { total: 0, active: 0 },
        activity: { tasks_24h: 0, conversations_7d: 0 },
        recommendations: ['Unable to check system status']
      }
    }
  }

  // Inventory-Specific AI Functions (additive, don't modify existing inventory system)
  async getReorderSuggestions(): Promise<{ success: boolean; suggestions?: any[]; error?: string }> {
    try {
      const response = await fetch('/api/ai/inventory/suggestions')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (error) {
      console.error('Error getting reorder suggestions:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get suggestions' 
      }
    }
  }

  async analyzeLowStock(): Promise<{ success: boolean; analysis?: any; error?: string }> {
    try {
      const response = await fetch('/api/ai/inventory/low-stock')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (error) {
      console.error('Error analyzing low stock:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to analyze stock' 
      }
    }
  }

  async searchInventoryNL(query: string): Promise<{ success: boolean; results?: any[]; error?: string }> {
    try {
      const response = await fetch('/api/ai/inventory/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (error) {
      console.error('Error in natural language search:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Search failed' 
      }
    }
  }

  // Utility functions
  generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  formatCapability(capability: string): string {
    return capability
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Note: Encryption utilities moved to separate crypto module
  // See @/lib/crypto/encryption for proper encryption implementation
}

// Export singleton instance
export const aiService = AIService.getInstance()