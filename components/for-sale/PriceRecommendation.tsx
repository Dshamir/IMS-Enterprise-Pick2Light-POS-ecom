"use client"

import { useState, useEffect, useMemo } from "react"
import { RefreshCw, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface MarketDataItem {
  platform: string
  average_price: number
  min_price: number
  max_price: number
  listing_count: number
}

interface PriceRecommendationProps {
  suggestedPrice: number | null
  currentPrice: number | null
  productName?: string
  productDescription?: string
  condition?: string
  marketData?: MarketDataItem[]
  onPriceChange?: (price: number) => void
}

export function PriceRecommendation({
  suggestedPrice,
  currentPrice,
  productName,
  productDescription,
  condition,
  marketData,
  onPriceChange,
}: PriceRecommendationProps) {
  const { toast } = useToast()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [aiPrices, setAiPrices] = useState<{
    quickSale: number
    optimal: number
    premium: number
    confidence: number
    reasoning: string
  } | null>(null)

  // Calculate prices from market data if available
  const marketBasedPrices = useMemo(() => {
    if (!marketData || marketData.length === 0) return null

    // Get eBay data as primary source (most reliable for pricing)
    const ebayData = marketData.find((d) => d.platform === "ebay")
    const totalListings = marketData.reduce((sum, d) => sum + d.listing_count, 0)

    if (totalListings === 0 && !ebayData?.average_price) return null

    // Calculate weighted average across platforms (eBay weighted higher)
    let weightedSum = 0
    let totalWeight = 0

    for (const data of marketData) {
      if (data.average_price > 0) {
        const weight = data.platform === "ebay" ? 3 : 1
        weightedSum += data.average_price * weight
        totalWeight += weight
      }
    }

    const avgPrice = totalWeight > 0 ? weightedSum / totalWeight : suggestedPrice || currentPrice || 100

    // Calculate confidence based on listing count and data quality
    let confidence = 0.3 // Base confidence
    if (totalListings >= 20) confidence = 0.9
    else if (totalListings >= 10) confidence = 0.75
    else if (totalListings >= 5) confidence = 0.6
    else if (totalListings > 0) confidence = 0.45

    return {
      average: Math.round(avgPrice),
      min: Math.min(...marketData.filter((d) => d.min_price > 0).map((d) => d.min_price)) || Math.round(avgPrice * 0.7),
      max: Math.max(...marketData.filter((d) => d.max_price > 0).map((d) => d.max_price)) || Math.round(avgPrice * 1.3),
      totalListings,
      confidence,
    }
  }, [marketData, suggestedPrice, currentPrice])

  // Calculate price tiers
  const basePrice = aiPrices?.optimal || marketBasedPrices?.average || suggestedPrice || currentPrice || 100
  const quickSalePrice = aiPrices?.quickSale || Math.round(basePrice * 0.77)
  const optimalPrice = aiPrices?.optimal || Math.round(basePrice)
  const premiumPrice = aiPrices?.premium || Math.round(basePrice * 1.22)

  // Calculate confidence
  const confidence = aiPrices?.confidence ?? marketBasedPrices?.confidence ?? 0.3

  async function handleRefresh() {
    if (!productName) {
      toast({
        title: "No product name",
        description: "Product name is required for price recommendation.",
        type: "error",
        duration: 5000,
      })
      return
    }

    setIsRefreshing(true)
    try {
      const response = await fetch("/api/for-sale/price-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          productDescription,
          condition,
          originalPrice: currentPrice,
          marketData,
        }),
      })

      const result = await response.json()

      if (result.success !== false) {
        setAiPrices({
          quickSale: result.quickSalePrice,
          optimal: result.optimalPrice,
          premium: result.premiumPrice,
          confidence: result.confidence,
          reasoning: result.reasoning,
        })

        if (onPriceChange) {
          onPriceChange(result.optimalPrice)
        }

        toast({
          title: "Prices updated",
          description: `Confidence: ${Math.round(result.confidence * 100)}% - ${result.reasoning}`,
          type: "success",
          duration: 3000,
        })
      } else {
        throw new Error(result.error || "Failed to get price recommendation")
      }
    } catch (error) {
      toast({
        title: "Price refresh failed",
        description: error instanceof Error ? error.message : "Please try again.",
        type: "error",
        duration: 5000,
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  function formatPrice(price: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  function getConfidenceColor(conf: number): string {
    if (conf >= 0.7) return "text-emerald-600"
    if (conf >= 0.5) return "text-yellow-600"
    return "text-red-500"
  }

  function getConfidenceLabel(conf: number): string {
    if (conf >= 0.8) return "High"
    if (conf >= 0.6) return "Medium"
    if (conf >= 0.4) return "Low"
    return "Very Low"
  }

  // Calculate price trend indicator
  const priceTrend = useMemo(() => {
    if (!suggestedPrice || !marketBasedPrices?.average) return null
    const diff = ((marketBasedPrices.average - suggestedPrice) / suggestedPrice) * 100
    if (diff > 5) return { direction: "up", percent: Math.round(diff) }
    if (diff < -5) return { direction: "down", percent: Math.round(Math.abs(diff)) }
    return { direction: "stable", percent: 0 }
  }, [suggestedPrice, marketBasedPrices])

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-4">
      <h3 className="font-semibold text-emerald-800 mb-3 flex items-center justify-between">
        <span className="flex items-center">
          <span className="mr-2">💰</span> AI Price Recommendation
        </span>
        {/* Confidence Badge */}
        <span
          className={cn(
            "text-xs px-2 py-0.5 rounded-full",
            confidence >= 0.7
              ? "bg-emerald-100 text-emerald-700"
              : confidence >= 0.5
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-600"
          )}
        >
          {getConfidenceLabel(confidence)} Confidence
        </span>
      </h3>

      {/* Main Recommended Price */}
      <div className="text-center py-4">
        <div className="text-4xl font-bold text-emerald-600">
          {formatPrice(optimalPrice)}
        </div>
        <div className="text-sm text-emerald-700 mt-1 flex items-center justify-center gap-2">
          Recommended Selling Price
          {priceTrend && priceTrend.direction !== "stable" && (
            <span
              className={cn(
                "flex items-center text-xs",
                priceTrend.direction === "up" ? "text-green-600" : "text-red-500"
              )}
            >
              {priceTrend.direction === "up" ? (
                <TrendingUp className="h-3 w-3 mr-0.5" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-0.5" />
              )}
              {priceTrend.percent}%
            </span>
          )}
        </div>
      </div>

      {/* Market Data Summary */}
      {marketBasedPrices && marketBasedPrices.totalListings > 0 && (
        <div className="mb-3 p-2 bg-white/50 rounded-lg text-xs text-emerald-700">
          <div className="flex justify-between">
            <span>Based on {marketBasedPrices.totalListings} listings</span>
            <span>
              Range: {formatPrice(marketBasedPrices.min)} - {formatPrice(marketBasedPrices.max)}
            </span>
          </div>
        </div>
      )}

      {/* Price Tiers */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        <button
          onClick={() => onPriceChange?.(quickSalePrice)}
          className="text-center p-2 bg-white rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <div className="text-sm font-bold text-gray-800">
            {formatPrice(quickSalePrice)}
          </div>
          <div className="text-xs text-gray-500">Quick Sale</div>
        </button>

        <button
          onClick={() => onPriceChange?.(optimalPrice)}
          className="text-center p-2 bg-emerald-100 rounded-lg border-2 border-emerald-400 hover:bg-emerald-200 transition-colors cursor-pointer"
        >
          <div className="text-sm font-bold text-emerald-700">
            {formatPrice(optimalPrice)}
          </div>
          <div className="text-xs text-emerald-600">Optimal</div>
        </button>

        <button
          onClick={() => onPriceChange?.(premiumPrice)}
          className="text-center p-2 bg-white rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <div className="text-sm font-bold text-gray-800">
            {formatPrice(premiumPrice)}
          </div>
          <div className="text-xs text-gray-500">Premium</div>
        </button>
      </div>

      {/* Refresh Button */}
      <Button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="w-full mt-4 bg-emerald-500 text-white hover:bg-emerald-600"
      >
        {isRefreshing ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4 mr-2" />
        )}
        Get AI Recommendation
      </Button>

      {/* AI Reasoning */}
      {aiPrices?.reasoning && (
        <p className="text-xs text-emerald-700 text-center mt-2 italic">
          "{aiPrices.reasoning}"
        </p>
      )}

      {/* Confidence Details */}
      <p className="text-xs text-emerald-600 text-center mt-2">
        {marketBasedPrices && marketBasedPrices.totalListings > 0
          ? `Based on ${marketBasedPrices.totalListings} similar listings`
          : "Click refresh for AI-powered pricing analysis"}
      </p>
    </div>
  )
}
