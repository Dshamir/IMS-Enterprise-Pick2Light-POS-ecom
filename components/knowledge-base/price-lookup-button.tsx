"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import {
  Sparkles,
  Loader2,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react"

interface ProductData {
  name: string
  description?: string
  manufacturer?: string
  partNumber?: string
  category?: string
}

interface KBMatch {
  id: string
  item_name: string
  manufacturer: string | null
  manufacturer_part_number: string | null
  category: string | null
  price_low: number | null
  price_high: number | null
  similarity_percent: number
}

interface PriceLookupResult {
  suggestedPrice: number | null
  priceRange: { low: number; high: number } | null
  confidence: "high" | "medium" | "low" | "none"
  source: "kb_match" | "ai_estimate" | "combined" | "none"
  explanation: string
  kbMatches: KBMatch[]
}

interface PriceLookupButtonProps {
  productData: ProductData
  onPriceAccept: (price: number) => void
  currentPrice?: number
  disabled?: boolean
}

export function PriceLookupButton({
  productData,
  onPriceAccept,
  currentPrice,
  disabled = false,
}: PriceLookupButtonProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<PriceLookupResult | null>(null)

  const handleLookup = async () => {
    if (!productData.name) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter a product name first",
      })
      return
    }

    setIsOpen(true)
    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/knowledge-base/price-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: productData.name,
          description: productData.description,
          manufacturer: productData.manufacturer,
          partNumber: productData.partNumber,
          category: productData.category,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setResult(data)
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Lookup Failed",
          description: error.error || "Failed to look up price",
        })
        setIsOpen(false)
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to connect to price lookup service",
      })
      setIsOpen(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcceptPrice = (price: number) => {
    onPriceAccept(price)
    setIsOpen(false)
    toast({
      title: "Price Applied",
      description: `Price set to $${price.toFixed(2)}`,
    })
  }

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case "high":
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            High Confidence
          </Badge>
        )
      case "medium":
        return (
          <Badge variant="default" className="bg-yellow-600">
            <Info className="h-3 w-3 mr-1" />
            Medium Confidence
          </Badge>
        )
      case "low":
        return (
          <Badge variant="secondary">
            <AlertCircle className="h-3 w-3 mr-1" />
            Low Confidence
          </Badge>
        )
      default:
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            No Estimate
          </Badge>
        )
    }
  }

  const formatPrice = (price: number | null) => {
    if (price === null) return "—"
    return `$${price.toFixed(2)}`
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleLookup}
        disabled={disabled || !productData.name}
        className="text-orange-600 border-orange-300 hover:bg-orange-50 hover:text-orange-700"
      >
        <Sparkles className="h-4 w-4 mr-1" />
        AI Price Lookup
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-500" />
              AI Price Lookup
            </DialogTitle>
            <DialogDescription className="text-sm">
              Finding price suggestions for "{productData.name?.substring(0, 50)}..."
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 flex-shrink-0">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500 mb-4" />
              <p className="text-muted-foreground">Searching knowledge base...</p>
            </div>
          ) : result ? (
            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Suggested Price */}
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Suggested Price</p>
                <div className="text-3xl font-bold text-primary">
                  {result.suggestedPrice != null ? (
                    formatPrice(result.suggestedPrice)
                  ) : (
                    <span className="text-muted-foreground text-xl">No estimate available</span>
                  )}
                </div>
                {result.priceRange && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Range: {formatPrice(result.priceRange.low)} - {formatPrice(result.priceRange.high)}
                  </p>
                )}
                <div className="flex items-center justify-center gap-2 mt-3">
                  {getConfidenceBadge(result.confidence)}
                </div>
              </div>

              {/* Explanation */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {result.explanation}
                </p>
              </div>

              {/* KB Matches */}
              {result.kbMatches && result.kbMatches.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Similar Items in Knowledge Base</p>
                  <p className="text-xs text-muted-foreground mb-2">Click an item to use its price</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {result.kbMatches.slice(0, 5).map((match) => {
                      const hasPrice = match.price_low !== null || match.price_high !== null
                      const matchPrice = match.price_low ?? match.price_high
                      return (
                        <div
                          key={match.id}
                          onClick={() => hasPrice && matchPrice && handleAcceptPrice(matchPrice)}
                          className={`p-3 border rounded-lg text-sm transition-colors ${
                            hasPrice
                              ? "cursor-pointer hover:bg-orange-50 hover:border-orange-300"
                              : "opacity-60"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium leading-tight mb-1">{match.item_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {match.manufacturer || "Unknown manufacturer"}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <Badge variant="outline" className="text-xs">
                                {match.similarity_percent}%
                              </Badge>
                              {hasPrice ? (
                                <span className="text-sm font-semibold text-green-600">
                                  ${matchPrice?.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">No price</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Current Price Comparison */}
              {currentPrice != null && currentPrice > 0 && result.suggestedPrice != null && (
                <div className="flex items-center justify-between p-3 border rounded-lg text-sm">
                  <span className="text-muted-foreground">Current price:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">${currentPrice.toFixed(2)}</span>
                    {result.suggestedPrice !== currentPrice && (
                      <Badge
                        variant={result.suggestedPrice > currentPrice ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {result.suggestedPrice > currentPrice ? "+" : ""}
                        {((result.suggestedPrice - currentPrice) / currentPrice * 100).toFixed(0)}%
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t mt-4 sticky bottom-0 bg-background pb-1">
                <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
                  Cancel
                </Button>
                {result.suggestedPrice != null && (
                  <Button
                    onClick={() => handleAcceptPrice(result.suggestedPrice!)}
                    className="flex-1 bg-orange-500 hover:bg-orange-600"
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    Accept ${result.suggestedPrice.toFixed(2)}
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
