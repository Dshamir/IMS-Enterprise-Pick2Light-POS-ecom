// OpenAI Usage API Service - Real-time usage monitoring and quota tracking
// Integrates with OpenAI's Usage API and Costs API for telemetry

interface OpenAIUsageRequest {
  start_time: number // Unix timestamp
  end_time?: number // Unix timestamp
  bucket_width?: '1m' | '1h' | '1d'
  project_ids?: string[]
  user_ids?: string[]
  api_key_ids?: string[]
  models?: string[]
  group_by?: string[]
  limit?: number
}

interface OpenAICostsRequest {
  start_time: number // Unix timestamp
  end_time?: number // Unix timestamp
  bucket_width?: '1d' // Only '1d' supported currently
  limit?: number
}

interface UsageDataPoint {
  aggregation_timestamp: number
  n_requests: number
  operation: string
  snap_to_bucket: string
  n_context_tokens_total: number
  n_generated_tokens_total: number
  model?: string
  project_id?: string
}

interface CostDataPoint {
  aggregation_timestamp: number
  amount: number
  currency: string
  organization_id: string
}

interface QuotaInfo {
  has_payment_method: boolean
  hard_limit_usd: number
  soft_limit_usd: number
  access_until: number
  billing_max_amount?: number
  current_usage_usd: number
  remaining_credits: number
}

export class OpenAIUsageService {
  private adminApiKey: string
  private organizationId?: string
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map()
  
  constructor(adminApiKey?: string) {
    // Use provided admin key or fallback to regular API key
    this.adminApiKey = adminApiKey || process.env.OPENAI_API_KEY || ''
    if (!this.adminApiKey) {
      console.warn('⚠️ [OpenAI Usage] No admin API key provided - usage monitoring will be limited')
    }
  }

  // Get usage data from OpenAI Usage API
  async getUsageData(request: OpenAIUsageRequest): Promise<{
    success: boolean
    data?: UsageDataPoint[]
    error?: string
  }> {
    try {
      if (!this.adminApiKey) {
        return {
          success: false,
          error: 'Admin API key required for usage data access'
        }
      }

      const cacheKey = `usage_${JSON.stringify(request)}`
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        return { success: true, data: cached }
      }

      const url = new URL('https://api.openai.com/v1/organization/usage/completions')
      
      // Add query parameters
      url.searchParams.append('start_time', request.start_time.toString())
      if (request.end_time) url.searchParams.append('end_time', request.end_time.toString())
      if (request.bucket_width) url.searchParams.append('bucket_width', request.bucket_width)
      if (request.project_ids) url.searchParams.append('project_ids', request.project_ids.join(','))
      if (request.user_ids) url.searchParams.append('user_ids', request.user_ids.join(','))
      if (request.api_key_ids) url.searchParams.append('api_key_ids', request.api_key_ids.join(','))
      if (request.models) url.searchParams.append('models', request.models.join(','))
      if (request.group_by) url.searchParams.append('group_by', request.group_by.join(','))
      if (request.limit) url.searchParams.append('limit', request.limit.toString())

      console.log('📊 [OpenAI Usage] Fetching usage data:', { url: url.toString() })

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.adminApiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        return {
          success: false,
          error: error.error?.message || `HTTP ${response.status}: ${response.statusText}`
        }
      }

      const result = await response.json()
      const usageData = result.data || []

      // Cache for 5 minutes (usage data doesn't change frequently)
      this.setCache(cacheKey, usageData, 5 * 60 * 1000)

      return {
        success: true,
        data: usageData
      }
    } catch (error) {
      console.error('❌ [OpenAI Usage] Failed to fetch usage data:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch usage data'
      }
    }
  }

  // Get cost data from OpenAI Costs API
  async getCostData(request: OpenAICostsRequest): Promise<{
    success: boolean
    data?: CostDataPoint[]
    error?: string
  }> {
    try {
      if (!this.adminApiKey) {
        return {
          success: false,
          error: 'Admin API key required for cost data access'
        }
      }

      const cacheKey = `costs_${JSON.stringify(request)}`
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        return { success: true, data: cached }
      }

      const url = new URL('https://api.openai.com/v1/organization/costs')
      
      // Add query parameters
      url.searchParams.append('start_time', request.start_time.toString())
      if (request.end_time) url.searchParams.append('end_time', request.end_time.toString())
      if (request.bucket_width) url.searchParams.append('bucket_width', request.bucket_width)
      if (request.limit) url.searchParams.append('limit', request.limit.toString())

      console.log('💰 [OpenAI Usage] Fetching cost data:', { url: url.toString() })

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.adminApiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        return {
          success: false,
          error: error.error?.message || `HTTP ${response.status}: ${response.statusText}`
        }
      }

      const result = await response.json()
      const costData = result.data || []

      // Cache for 10 minutes (cost data changes less frequently)
      this.setCache(cacheKey, costData, 10 * 60 * 1000)

      return {
        success: true,
        data: costData
      }
    } catch (error) {
      console.error('❌ [OpenAI Usage] Failed to fetch cost data:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch cost data'
      }
    }
  }

  // Get current billing and quota information
  async getQuotaInfo(): Promise<{
    success: boolean
    quota?: QuotaInfo
    error?: string
  }> {
    try {
      if (!this.adminApiKey) {
        return {
          success: false,
          error: 'Admin API key required for quota information'
        }
      }

      const cacheKey = 'quota_info'
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        return { success: true, quota: cached }
      }

      console.log('💳 [OpenAI Usage] Fetching quota information...')

      const response = await fetch('https://api.openai.com/v1/organization/billing/subscription', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.adminApiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        // If subscription endpoint fails, try usage endpoint for basic info
        console.log('⚠️ [OpenAI Usage] Subscription endpoint failed, trying usage endpoint...')
        return this.getBasicQuotaInfo()
      }

      const subscription = await response.json()

      const quotaInfo: QuotaInfo = {
        has_payment_method: !!subscription.has_payment_method,
        hard_limit_usd: subscription.hard_limit_usd || 0,
        soft_limit_usd: subscription.soft_limit_usd || 0,
        access_until: subscription.access_until || 0,
        billing_max_amount: subscription.billing_max_amount,
        current_usage_usd: subscription.current_usage_usd || 0,
        remaining_credits: Math.max(0, (subscription.hard_limit_usd || 0) - (subscription.current_usage_usd || 0))
      }

      // Cache for 2 minutes (quota info changes frequently)
      this.setCache(cacheKey, quotaInfo, 2 * 60 * 1000)

      return {
        success: true,
        quota: quotaInfo
      }
    } catch (error) {
      console.error('❌ [OpenAI Usage] Failed to fetch quota info:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch quota information'
      }
    }
  }

  // Fallback method to get basic quota info from usage endpoint
  private async getBasicQuotaInfo(): Promise<{
    success: boolean
    quota?: QuotaInfo
    error?: string
  }> {
    try {
      // Get recent usage to estimate current status
      const endTime = Math.floor(Date.now() / 1000)
      const startTime = endTime - (30 * 24 * 60 * 60) // Last 30 days

      const usageResult = await this.getUsageData({
        start_time: startTime,
        end_time: endTime,
        bucket_width: '1d'
      })

      if (!usageResult.success) {
        return {
          success: false,
          error: 'Unable to fetch quota information'
        }
      }

      // Calculate estimated usage (this is approximate)
      const totalTokens = usageResult.data?.reduce((sum, point) => 
        sum + (point.n_context_tokens_total || 0) + (point.n_generated_tokens_total || 0), 0
      ) || 0

      // Rough estimate: $0.002 per 1K tokens for GPT-3.5, $0.03 per 1K tokens for GPT-4
      const estimatedCost = (totalTokens / 1000) * 0.01 // Conservative estimate

      const basicQuota: QuotaInfo = {
        has_payment_method: true, // Assume true if API is working
        hard_limit_usd: 100, // Default assumption
        soft_limit_usd: 80,
        access_until: Date.now() / 1000 + (30 * 24 * 60 * 60), // 30 days from now
        current_usage_usd: estimatedCost,
        remaining_credits: Math.max(0, 100 - estimatedCost)
      }

      return {
        success: true,
        quota: basicQuota
      }
    } catch (error) {
      return {
        success: false,
        error: 'Unable to determine quota status'
      }
    }
  }

  // Get comprehensive analytics for dashboard
  async getAnalytics(days: number = 7): Promise<{
    success: boolean
    analytics?: {
      totalTokensUsed: number
      totalCost: number
      dailyUsage: Array<{ date: string; tokens: number; cost: number; requests: number }>
      modelBreakdown: Array<{ model: string; tokens: number; cost: number; percentage: number }>
      quotaStatus: QuotaInfo
      trends: {
        tokenTrend: 'increasing' | 'decreasing' | 'stable'
        costTrend: 'increasing' | 'decreasing' | 'stable'
        efficiency: number // tokens per dollar
      }
    }
    error?: string
  }> {
    try {
      const endTime = Math.floor(Date.now() / 1000)
      const startTime = endTime - (days * 24 * 60 * 60)

      console.log(`📈 [OpenAI Usage] Generating ${days}-day analytics...`)

      // Fetch usage and cost data in parallel
      const [usageResult, costResult, quotaResult] = await Promise.all([
        this.getUsageData({
          start_time: startTime,
          end_time: endTime,
          bucket_width: '1d',
          group_by: ['model']
        }),
        this.getCostData({
          start_time: startTime,
          end_time: endTime,
          bucket_width: '1d'
        }),
        this.getQuotaInfo()
      ])

      if (!usageResult.success) {
        return { success: false, error: usageResult.error }
      }

      const usageData = usageResult.data || []
      const costData = costResult.data || []
      const quotaInfo = quotaResult.quota

      // Process daily usage
      const dailyUsage = this.processDailyUsage(usageData, costData)
      
      // Process model breakdown
      const modelBreakdown = this.processModelBreakdown(usageData)

      // Calculate totals
      const totalTokensUsed = usageData.reduce((sum, point) => 
        sum + (point.n_context_tokens_total || 0) + (point.n_generated_tokens_total || 0), 0
      )
      const totalCost = costData.reduce((sum, point) => sum + (point.amount || 0), 0)

      // Calculate trends
      const trends = this.calculateTrends(dailyUsage)

      return {
        success: true,
        analytics: {
          totalTokensUsed,
          totalCost,
          dailyUsage,
          modelBreakdown,
          quotaStatus: quotaInfo || {
            has_payment_method: false,
            hard_limit_usd: 0,
            soft_limit_usd: 0,
            access_until: 0,
            current_usage_usd: 0,
            remaining_credits: 0
          },
          trends
        }
      }
    } catch (error) {
      console.error('❌ [OpenAI Usage] Failed to generate analytics:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate analytics'
      }
    }
  }

  // Process daily usage data
  private processDailyUsage(usageData: UsageDataPoint[], costData: CostDataPoint[]) {
    const dailyMap = new Map<string, { tokens: number; cost: number; requests: number }>()

    // Process usage data
    usageData.forEach(point => {
      const date = new Date(point.aggregation_timestamp * 1000).toISOString().split('T')[0]
      const existing = dailyMap.get(date) || { tokens: 0, cost: 0, requests: 0 }
      
      existing.tokens += (point.n_context_tokens_total || 0) + (point.n_generated_tokens_total || 0)
      existing.requests += point.n_requests || 0
      
      dailyMap.set(date, existing)
    })

    // Process cost data
    costData.forEach(point => {
      const date = new Date(point.aggregation_timestamp * 1000).toISOString().split('T')[0]
      const existing = dailyMap.get(date) || { tokens: 0, cost: 0, requests: 0 }
      
      existing.cost += point.amount || 0
      
      dailyMap.set(date, existing)
    })

    return Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  // Process model breakdown
  private processModelBreakdown(usageData: UsageDataPoint[]) {
    const modelMap = new Map<string, { tokens: number; requests: number }>()
    let totalTokens = 0

    usageData.forEach(point => {
      const model = point.model || 'unknown'
      const tokens = (point.n_context_tokens_total || 0) + (point.n_generated_tokens_total || 0)
      
      const existing = modelMap.get(model) || { tokens: 0, requests: 0 }
      existing.tokens += tokens
      existing.requests += point.n_requests || 0
      
      modelMap.set(model, existing)
      totalTokens += tokens
    })

    return Array.from(modelMap.entries())
      .map(([model, data]) => ({
        model,
        tokens: data.tokens,
        cost: this.estimateCostForModel(model, data.tokens),
        percentage: totalTokens > 0 ? (data.tokens / totalTokens) * 100 : 0
      }))
      .sort((a, b) => b.tokens - a.tokens)
  }

  // Estimate cost for specific model
  private estimateCostForModel(model: string, tokens: number): number {
    const rates = {
      'gpt-4': 0.03, // per 1K tokens
      'gpt-4-turbo': 0.01,
      'gpt-4o': 0.005,
      'gpt-3.5-turbo': 0.002,
      'gpt-3.5': 0.002
    }

    const rate = Object.entries(rates).find(([key]) => model.includes(key))?.[1] || 0.01
    return (tokens / 1000) * rate
  }

  // Calculate usage trends
  private calculateTrends(dailyUsage: Array<{ date: string; tokens: number; cost: number; requests: number }>) {
    if (dailyUsage.length < 2) {
      return {
        tokenTrend: 'stable' as const,
        costTrend: 'stable' as const,
        efficiency: 0
      }
    }

    const recent = dailyUsage.slice(-3) // Last 3 days
    const earlier = dailyUsage.slice(0, -3) // Earlier days

    const recentAvgTokens = recent.reduce((sum, day) => sum + day.tokens, 0) / recent.length
    const earlierAvgTokens = earlier.length > 0 ? earlier.reduce((sum, day) => sum + day.tokens, 0) / earlier.length : recentAvgTokens

    const recentAvgCost = recent.reduce((sum, day) => sum + day.cost, 0) / recent.length
    const earlierAvgCost = earlier.length > 0 ? earlier.reduce((sum, day) => sum + day.cost, 0) / earlier.length : recentAvgCost

    const tokenTrend = recentAvgTokens > earlierAvgTokens * 1.1 ? 'increasing' : 
                     recentAvgTokens < earlierAvgTokens * 0.9 ? 'decreasing' : 'stable'
    
    const costTrend = recentAvgCost > earlierAvgCost * 1.1 ? 'increasing' : 
                     recentAvgCost < earlierAvgCost * 0.9 ? 'decreasing' : 'stable'

    const totalTokens = dailyUsage.reduce((sum, day) => sum + day.tokens, 0)
    const totalCost = dailyUsage.reduce((sum, day) => sum + day.cost, 0)
    const efficiency = totalCost > 0 ? totalTokens / totalCost : 0

    return {
      tokenTrend,
      costTrend,
      efficiency
    }
  }

  // Cache management
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    if (Date.now() > cached.timestamp + cached.ttl) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  // Clear all cached data
  clearCache(): void {
    this.cache.clear()
  }
}

// Export singleton instance
export const openaiUsageService = new OpenAIUsageService()