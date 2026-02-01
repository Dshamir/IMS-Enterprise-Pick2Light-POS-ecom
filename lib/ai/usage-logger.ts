// AI Usage Logger - Centralized telemetry logging for all AI operations
// Tracks tokens, costs, duration, and performance metrics

import { getDatabase } from '@/lib/database/sqlite'
import { v4 as uuidv4 } from 'uuid'

export interface AIUsageData {
  provider_id?: string
  agent_id?: string
  model_used?: string
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  estimated_cost?: number
  request_duration?: number // milliseconds
  operation_type?: string // 'chat', 'vision', 'function_call', 'analysis', 'nl_to_sql'
  user_message_preview?: string // First 100 chars
  success?: boolean
  error_type?: string // 'quota_exceeded', 'invalid_api_key', 'rate_limit', etc.
}

export interface ModelPricingRate {
  prompt_per_1k: number // USD per 1K prompt tokens
  completion_per_1k: number // USD per 1K completion tokens
}

// Pricing rates as of January 2025 (OpenAI)
const MODEL_PRICING: Record<string, ModelPricingRate> = {
  // GPT-4o models
  'gpt-4o': { prompt_per_1k: 0.0025, completion_per_1k: 0.010 },
  'gpt-4o-mini': { prompt_per_1k: 0.00015, completion_per_1k: 0.0006 },
  'gpt-4o-2024-11-20': { prompt_per_1k: 0.0025, completion_per_1k: 0.010 },
  'gpt-4o-2024-08-06': { prompt_per_1k: 0.0025, completion_per_1k: 0.010 },
  'gpt-4o-2024-05-13': { prompt_per_1k: 0.005, completion_per_1k: 0.015 },
  'gpt-4o-mini-2024-07-18': { prompt_per_1k: 0.00015, completion_per_1k: 0.0006 },

  // GPT-4 Turbo
  'gpt-4-turbo': { prompt_per_1k: 0.01, completion_per_1k: 0.03 },
  'gpt-4-turbo-2024-04-09': { prompt_per_1k: 0.01, completion_per_1k: 0.03 },
  'gpt-4-turbo-preview': { prompt_per_1k: 0.01, completion_per_1k: 0.03 },
  'gpt-4-0125-preview': { prompt_per_1k: 0.01, completion_per_1k: 0.03 },
  'gpt-4-1106-preview': { prompt_per_1k: 0.01, completion_per_1k: 0.03 },

  // GPT-4 Standard
  'gpt-4': { prompt_per_1k: 0.03, completion_per_1k: 0.06 },
  'gpt-4-0613': { prompt_per_1k: 0.03, completion_per_1k: 0.06 },
  'gpt-4-0314': { prompt_per_1k: 0.03, completion_per_1k: 0.06 },

  // GPT-3.5 Turbo
  'gpt-3.5-turbo': { prompt_per_1k: 0.0005, completion_per_1k: 0.0015 },
  'gpt-3.5-turbo-0125': { prompt_per_1k: 0.0005, completion_per_1k: 0.0015 },
  'gpt-3.5-turbo-1106': { prompt_per_1k: 0.001, completion_per_1k: 0.002 },
  'gpt-3.5-turbo-16k': { prompt_per_1k: 0.003, completion_per_1k: 0.004 },

  // Anthropic Claude (approximate rates)
  'claude-3-opus': { prompt_per_1k: 0.015, completion_per_1k: 0.075 },
  'claude-3-sonnet': { prompt_per_1k: 0.003, completion_per_1k: 0.015 },
  'claude-3-haiku': { prompt_per_1k: 0.00025, completion_per_1k: 0.00125 },
  'claude-3-5-sonnet': { prompt_per_1k: 0.003, completion_per_1k: 0.015 },

  // Default fallback
  'unknown': { prompt_per_1k: 0.01, completion_per_1k: 0.03 }
}

export class AIUsageLogger {
  /**
   * Calculate estimated cost for AI operation
   */
  static calculateCost(
    model: string | undefined,
    promptTokens: number,
    completionTokens: number
  ): number {
    // Find pricing for model (exact match or prefix match)
    let pricing: ModelPricingRate | undefined

    if (model) {
      // Try exact match first
      pricing = MODEL_PRICING[model]

      // Try prefix match (e.g., 'gpt-4o-2024-11-20' matches 'gpt-4o')
      if (!pricing) {
        const modelKey = Object.keys(MODEL_PRICING).find(key =>
          model.startsWith(key) || key.startsWith(model)
        )
        if (modelKey) {
          pricing = MODEL_PRICING[modelKey]
        }
      }
    }

    // Fallback to unknown model pricing
    if (!pricing) {
      pricing = MODEL_PRICING['unknown']
      console.warn(`⚠️ [Usage Logger] Unknown model pricing: ${model}, using fallback rates`)
    }

    // Calculate cost
    const promptCost = (promptTokens / 1000) * pricing.prompt_per_1k
    const completionCost = (completionTokens / 1000) * pricing.completion_per_1k
    const totalCost = promptCost + completionCost

    return Math.round(totalCost * 1000000) / 1000000 // Round to 6 decimal places
  }

  /**
   * Log AI usage to database with full telemetry
   */
  static async logUsage(data: AIUsageData): Promise<{ success: boolean; error?: string }> {
    try {
      const db = getDatabase()

      // Calculate cost if not provided
      let estimatedCost = data.estimated_cost
      if (!estimatedCost && data.prompt_tokens && data.completion_tokens) {
        estimatedCost = this.calculateCost(
          data.model_used,
          data.prompt_tokens,
          data.completion_tokens
        )
      }

      // Prepare log entry
      const logId = uuidv4()
      const success = data.success !== undefined ? data.success : true

      // Truncate user message preview to 100 chars
      const messagePreview = data.user_message_preview
        ? data.user_message_preview.substring(0, 100)
        : null

      // Insert usage log
      const stmt = db.prepare(`
        INSERT INTO ai_usage_logs (
          id,
          provider_id,
          agent_id,
          model_used,
          prompt_tokens,
          completion_tokens,
          total_tokens,
          estimated_cost,
          request_duration,
          operation_type,
          user_message_preview,
          success,
          error_type,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `)

      stmt.run(
        logId,
        data.provider_id || null,
        data.agent_id || null,
        data.model_used || null,
        data.prompt_tokens || 0,
        data.completion_tokens || 0,
        data.total_tokens || 0,
        estimatedCost || 0,
        data.request_duration || 0,
        data.operation_type || 'chat',
        messagePreview,
        success ? 1 : 0,
        data.error_type || null
      )

      console.log(`✅ [Usage Logger] Logged AI usage:`, {
        logId,
        operation: data.operation_type,
        model: data.model_used,
        tokens: data.total_tokens,
        cost: estimatedCost?.toFixed(6),
        duration: data.request_duration ? `${data.request_duration}ms` : 'N/A',
        success
      })

      return { success: true }

    } catch (error) {
      console.error('❌ [Usage Logger] Failed to log AI usage:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Logging failed'
      }
    }
  }

  /**
   * Log AI usage from provider response
   * Convenience method for common AI operations
   */
  static async logFromResponse(
    providerId: string | undefined,
    agentId: string | undefined,
    model: string | undefined,
    usage: {
      prompt_tokens?: number
      completion_tokens?: number
      total_tokens?: number
      input_tokens?: number // Anthropic format
      output_tokens?: number // Anthropic format
    } | undefined,
    duration: number,
    operationType: string = 'chat',
    userMessage?: string,
    success: boolean = true,
    errorType?: string
  ): Promise<{ success: boolean; error?: string }> {
    // Normalize usage data (OpenAI vs Anthropic formats)
    const promptTokens = usage?.prompt_tokens || usage?.input_tokens || 0
    const completionTokens = usage?.completion_tokens || usage?.output_tokens || 0
    const totalTokens = usage?.total_tokens || (promptTokens + completionTokens)

    return this.logUsage({
      provider_id: providerId,
      agent_id: agentId,
      model_used: model,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      request_duration: duration,
      operation_type: operationType,
      user_message_preview: userMessage,
      success,
      error_type: errorType
    })
  }

  /**
   * Get pricing rate for a specific model
   */
  static getModelPricing(model: string): ModelPricingRate {
    return MODEL_PRICING[model] || MODEL_PRICING['unknown']
  }

  /**
   * Estimate cost for planned operation
   */
  static estimateOperationCost(
    model: string,
    estimatedPromptTokens: number,
    estimatedCompletionTokens: number
  ): {
    promptCost: number
    completionCost: number
    totalCost: number
    currency: string
  } {
    const pricing = this.getModelPricing(model)

    const promptCost = (estimatedPromptTokens / 1000) * pricing.prompt_per_1k
    const completionCost = (estimatedCompletionTokens / 1000) * pricing.completion_per_1k
    const totalCost = promptCost + completionCost

    return {
      promptCost: Math.round(promptCost * 1000000) / 1000000,
      completionCost: Math.round(completionCost * 1000000) / 1000000,
      totalCost: Math.round(totalCost * 1000000) / 1000000,
      currency: 'USD'
    }
  }
}

// Export singleton instance
export const usageLogger = AIUsageLogger
