"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Loader2, RefreshCw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

interface MarketData {
  platform: string
  platformName: string
  color: string
  avgPrice: number
  minPrice: number
  maxPrice: number
  listingCount: number
}

interface MarketComparisonProps {
  productForSaleId: string
  productId?: string
  productName?: string
  onMarketDataLoaded?: (data: Record<string, any>) => void
}

const PLATFORM_CONFIG: Record<string, { name: string; color: string }> = {
  ebay: { name: "eBay", color: "bg-blue-500" },
  facebook: { name: "Facebook Marketplace", color: "bg-blue-600" },
  craigslist: { name: "Craigslist", color: "bg-purple-500" },
  amazon_keepa: { name: "Amazon (Keepa)", color: "bg-yellow-500" },
  amazon_paapi: { name: "Amazon", color: "bg-orange-400" },
  serpapi: { name: "Google Shopping", color: "bg-green-500" },
  openai_pricing: { name: "AI Estimate", color: "bg-orange-500" },
}

export function MarketComparison({
  productForSaleId,
  productId,
  productName,
  onMarketDataLoaded,
}: MarketComparisonProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [marketData, setMarketData] = useState<MarketData[]>([])
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [usingFallback, setUsingFallback] = useState(false)
  const [serpApiAvailable, setSerpApiAvailable] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [providerErrors, setProviderErrors] = useState<{provider: string; error: string}[]>([])

  // Use ref for callback to avoid re-render loops
  const onMarketDataLoadedRef = useRef(onMarketDataLoaded)
  onMarketDataLoadedRef.current = onMarketDataLoaded

  const loadMarketData = useCallback(async (forceRefresh: boolean = false) => {
    if (forceRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const response = await fetch("/api/for-sale/market-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          query: productName,
          forceRefresh,
          searchAll: true, // Search all providers to get multi-platform data
        }),
      })

      const result = await response.json()

      // Handle both success and failure gracefully
      setHasLoaded(true)

      if (result.success && result.searchAll && result.results) {
        // Handle searchAll response format
        const displayData: MarketData[] = []
        const errors: {provider: string; error: string}[] = []
        let hasAnyData = false
        let usingAIEstimate = false

        // Log provider results for debugging
        console.log("[MarketComparison] Provider results:", result.results)

        for (const providerResult of result.results) {
          const config = PLATFORM_CONFIG[providerResult.provider]

          // Collect failed provider errors
          if (!providerResult.success) {
            console.warn(`[MarketComparison] ${providerResult.provider} failed:`, providerResult.error)
            errors.push({
              provider: config?.name || providerResult.provider,
              error: providerResult.error || 'Unknown error'
            })
            continue
          }

          // Check if this is AI estimate (OpenAI fallback)
          if (providerResult.provider === 'openai_pricing') {
            usingAIEstimate = true
          }

          // Use provider data or skip if no data
          const data = providerResult
          if (data.avgPrice > 0 || data.listingCount > 0) {
            hasAnyData = true

            // Map provider key to display name
            const displayName = config?.name ||
              (providerResult.provider === 'openai_pricing' ? 'AI Estimate' : providerResult.provider)
            const displayColor = config?.color ||
              (providerResult.provider === 'openai_pricing' ? 'bg-orange-500' : 'bg-gray-500')

            displayData.push({
              platform: providerResult.provider,
              platformName: displayName,
              color: displayColor,
              avgPrice: data.avgPrice || 0,
              minPrice: data.minPrice || 0,
              maxPrice: data.maxPrice || 0,
              listingCount: data.listingCount || 0,
            })
          }
        }

        // If we have combined data from the API, use that as fallback
        if (!hasAnyData && result.combined) {
          displayData.push({
            platform: 'combined',
            platformName: 'Market Average',
            color: 'bg-emerald-500',
            avgPrice: result.combined.avgPrice || 0,
            minPrice: result.combined.minPrice || 0,
            maxPrice: result.combined.maxPrice || 0,
            listingCount: result.combined.listingCount || 0,
          })
          hasAnyData = true
        }

        setUsingFallback(usingAIEstimate)
        setSerpApiAvailable(!usingAIEstimate && hasAnyData)
        setMarketData(displayData)
        setProviderErrors(errors)
        setLastUpdated(formatRelativeTime(new Date()))

        // Notify parent component via ref to avoid re-render loop
        if (onMarketDataLoadedRef.current && result.combined) {
          onMarketDataLoadedRef.current(result.combined)
        }

        if (forceRefresh) {
          toast({
            title: hasAnyData ? "Market data refreshed" : "No market data found",
            description: hasAnyData
              ? `Found data from ${displayData.length} source(s)`
              : "No listings found for this product",
            type: hasAnyData ? "success" : "info",
            duration: 3000,
          })
        }
      } else if (result.success && result.data) {
        // Handle single provider response format (fallback)
        const displayData: MarketData[] = [{
          platform: result.provider || 'unknown',
          platformName: result.provider === 'openai_pricing' ? 'AI Estimate' : (result.provider || 'Market Data'),
          color: result.provider === 'openai_pricing' ? 'bg-orange-500' : 'bg-emerald-500',
          avgPrice: result.data.avgPrice || 0,
          minPrice: result.data.minPrice || 0,
          maxPrice: result.data.maxPrice || 0,
          listingCount: result.data.listingCount || 0,
        }]

        setUsingFallback(result.source === 'ai_estimate')
        setSerpApiAvailable(result.source !== 'ai_estimate')
        setMarketData(displayData)
        setLastUpdated(formatRelativeTime(new Date()))

        if (onMarketDataLoadedRef.current) {
          onMarketDataLoadedRef.current(result.data)
        }

        if (forceRefresh) {
          toast({
            title: "Market data refreshed",
            description: result.source === 'ai_estimate'
              ? "Using AI-estimated pricing"
              : `Data from ${result.provider}`,
            type: "success",
            duration: 3000,
          })
        }
      } else {
        // API returned an error - just log it, don't throw
        console.warn("Market data unavailable:", result.error)
        setMarketData([])
        setUsingFallback(false)
        setSerpApiAvailable(false)

        if (forceRefresh) {
          toast({
            title: "Market data unavailable",
            description: result.error || "Could not fetch current market prices. Try again later.",
            type: "info",
            duration: 3000,
          })
        }
      }
    } catch (error) {
      console.error("Error loading market data:", error)
      toast({
        title: "Failed to load market data",
        description: error instanceof Error ? error.message : "Please try again",
        type: "error",
        duration: 5000,
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [productId, productName, toast])

  useEffect(() => {
    if ((productId || productName) && !hasLoaded) {
      loadMarketData()
    }
  }, [productId, productName, hasLoaded, loadMarketData])

  function formatRelativeTime(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  function formatPrice(price: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-700 mb-3">📊 Market Comparison</h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Loading market data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-700 mb-3 flex items-center justify-between">
        <span>📊 Market Comparison</span>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-gray-400">Updated {lastUpdated}</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadMarketData(true)}
            disabled={refreshing}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </h3>

      {/* Fallback Warning */}
      {usingFallback && (
        <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-yellow-700">
            <p className="font-medium">Using estimated pricing</p>
            <p>Configure SERPAPI_API_KEY for real market data</p>
          </div>
        </div>
      )}

      {/* Platform Data Cards */}
      <div className="space-y-3">
        {marketData.map((data) => (
          <div
            key={data.platform}
            className="p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm flex items-center">
                <span
                  className={`w-2 h-2 ${data.color} rounded-full mr-2`}
                />
                {data.platformName}
              </span>
              <span className="text-xs text-gray-500">
                {data.listingCount > 0
                  ? `${data.listingCount} listings`
                  : usingFallback
                    ? "estimated"
                    : "no data"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Avg Price:</span>
              <span className="font-medium">
                {data.avgPrice > 0 ? formatPrice(data.avgPrice) : "—"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Range:</span>
              <span className="font-medium">
                {data.minPrice > 0 && data.maxPrice > 0
                  ? `${formatPrice(data.minPrice)} - ${formatPrice(data.maxPrice)}`
                  : "—"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Provider Errors */}
      {providerErrors.length > 0 && marketData.length === 0 && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs font-medium text-red-700 mb-1">Provider Issues:</p>
          <ul className="text-xs text-red-600 space-y-0.5">
            {providerErrors.slice(0, 3).map((err, i) => (
              <li key={i}>• {err.provider}: {err.error.slice(0, 50)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* No Data State */}
      {marketData.length === 0 && hasLoaded && (
        <div className="text-center py-6 text-sm text-gray-500">
          <p>No market data available.</p>
          <p className="text-xs mt-1 text-gray-400">
            {providerErrors.length > 0
              ? "All providers failed. Check API keys and network connectivity."
              : "No enabled providers. Configure providers in AI Assistant Settings."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadMarketData(true)}
            className="mt-3"
            disabled={refreshing}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            Try Again
          </Button>
        </div>
      )}

      {/* Disclaimer */}
      {marketData.length > 0 && (
        <p className="text-xs text-gray-400 mt-3 text-center">
          {usingFallback
            ? "AI-estimated prices based on product analysis."
            : "Market data from available providers, cached 24h."}
        </p>
      )}
    </div>
  )
}
