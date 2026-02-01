"use client"

import { useState } from "react"
import { Sparkles, BarChart3, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface TitleOptimizerProps {
  title: string
  onTitleChange: (title: string) => void
  productName?: string
  productDescription?: string
  category?: string
  imageUrls?: string[]
}

const MAX_TITLE_LENGTH = 80

export function TitleOptimizer({
  title,
  onTitleChange,
  productName,
  productDescription,
  category,
  imageUrls = [],
}: TitleOptimizerProps) {
  const { toast } = useToast()
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [isCheckingSeo, setIsCheckingSeo] = useState(false)
  const [seoScore, setSeoScore] = useState<number | null>(null)

  const charCount = title.length
  const isGoodLength = charCount >= 40 && charCount <= MAX_TITLE_LENGTH
  const isTooLong = charCount > MAX_TITLE_LENGTH

  async function handleOptimize() {
    if (!productName) {
      toast({
        title: "No product name",
        description: "Product name is required to generate an optimized title.",
        type: "error",
        duration: 5000,
      })
      return
    }

    setIsOptimizing(true)
    try {
      const response = await fetch("/api/for-sale/optimize-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          productDescription,
          category,
          imageUrls,
        }),
      })

      const result = await response.json()

      if (result.success && result.title) {
        onTitleChange(result.title)
        toast({
          title: "Title optimized",
          description: `Generated ${result.charCount} character SEO-optimized title.`,
          type: "success",
          duration: 3000,
        })
      } else {
        throw new Error(result.error || "Failed to optimize title")
      }
    } catch (error) {
      toast({
        title: "Optimization failed",
        description: error instanceof Error ? error.message : "Please try again.",
        type: "error",
        duration: 5000,
      })
    } finally {
      setIsOptimizing(false)
    }
  }

  async function handleCheckSeo() {
    if (!title) {
      toast({
        title: "No title to check",
        description: "Enter a title first to check SEO score.",
        type: "error",
        duration: 5000,
      })
      return
    }

    setIsCheckingSeo(true)
    try {
      // Simple SEO scoring algorithm
      let score = 0

      // Length score (40-80 chars is ideal)
      if (charCount >= 40 && charCount <= 80) {
        score += 30
      } else if (charCount >= 30 && charCount <= 90) {
        score += 15
      }

      // Contains numbers (model numbers, specs)
      if (/\d/.test(title)) {
        score += 15
      }

      // Contains brand keywords
      const brandKeywords = ["antminer", "dell", "hp", "cisco", "apple", "samsung", "nvidia", "intel"]
      if (brandKeywords.some((kw) => title.toLowerCase().includes(kw))) {
        score += 20
      }

      // Contains condition keywords
      const conditionKeywords = ["new", "used", "tested", "working", "refurbished", "mint"]
      if (conditionKeywords.some((kw) => title.toLowerCase().includes(kw))) {
        score += 15
      }

      // No excessive caps
      const capsRatio = (title.match(/[A-Z]/g) || []).length / title.length
      if (capsRatio < 0.5) {
        score += 10
      }

      // No special characters
      if (!/[!@#$%^&*()_+=\[\]{};':"\\|,.<>\/?]/.test(title)) {
        score += 10
      }

      await new Promise((resolve) => setTimeout(resolve, 300))
      setSeoScore(score)

      toast({
        title: `SEO Score: ${score}/100`,
        description:
          score >= 70
            ? "Great title for marketplace listings!"
            : score >= 50
              ? "Good, but could be improved."
              : "Consider adding more detail or keywords.",
        type: score >= 70 ? "success" : score >= 50 ? "info" : "error",
        duration: 3000,
      })
    } finally {
      setIsCheckingSeo(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-700 mb-3">🏷️ Listing Title</h3>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-2">
        <Button
          onClick={handleOptimize}
          disabled={isOptimizing || !productName}
          size="sm"
          className="bg-gradient-to-r from-orange-400 to-pink-500 text-white hover:opacity-90"
        >
          {isOptimizing ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3 mr-1" />
          )}
          AI Optimize Title
        </Button>
        <Button
          onClick={handleCheckSeo}
          disabled={isCheckingSeo || !title}
          variant="outline"
          size="sm"
        >
          {isCheckingSeo ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <BarChart3 className="h-3 w-3 mr-1" />
          )}
          Check SEO
        </Button>
      </div>

      {/* Title Input */}
      <Input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder={productName || "Enter marketplace title..."}
        className={cn(
          "w-full",
          isTooLong && "border-red-300 focus:border-red-500"
        )}
        maxLength={MAX_TITLE_LENGTH + 20}
      />

      {/* Character Counter & Status */}
      <div className="mt-2 flex items-center justify-between text-xs">
        <span
          className={cn(
            "text-gray-500",
            isTooLong && "text-red-500 font-medium"
          )}
        >
          {charCount}/{MAX_TITLE_LENGTH} characters
        </span>
        <div className="flex items-center gap-2">
          {seoScore !== null && (
            <span
              className={cn(
                "font-medium",
                seoScore >= 70
                  ? "text-green-600"
                  : seoScore >= 50
                    ? "text-yellow-600"
                    : "text-red-500"
              )}
            >
              SEO: {seoScore}/100
            </span>
          )}
          {isTooLong ? (
            <span className="text-red-500">✗ Too long for eBay</span>
          ) : isGoodLength ? (
            <span className="text-green-600">✓ Good length</span>
          ) : charCount > 0 ? (
            <span className="text-yellow-600">⚠ Add more detail</span>
          ) : null}
        </div>
      </div>

      {/* Tips */}
      {!title && productName && (
        <p className="text-xs text-gray-400 mt-2">
          Tip: Click "AI Optimize Title" to generate an SEO-friendly title from "
          {productName.substring(0, 40)}..."
        </p>
      )}
    </div>
  )
}
