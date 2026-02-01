"use client"

import { useState } from "react"
import { Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface Specification {
  key: string
  value: string
}

interface DescriptionGeneratorProps {
  description: string
  onDescriptionChange: (description: string) => void
  productName?: string
  productDescription?: string
  specifications?: Specification[]
  condition?: string
  imageUrls?: string[]
}

type PlatformStyle = "ebay" | "facebook" | "craigslist"

export function DescriptionGenerator({
  description,
  onDescriptionChange,
  productName,
  productDescription,
  specifications = [],
  condition,
  imageUrls = [],
}: DescriptionGeneratorProps) {
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeStyle, setActiveStyle] = useState<PlatformStyle | null>(null)

  const charCount = description.length
  const hasKeywords = description.includes("#") || description.toLowerCase().includes("shipping")
  const hasEmojis = /[\u{1F300}-\u{1F9FF}]/u.test(description)

  async function handleGenerate() {
    if (!productName) {
      toast({
        title: "No product name",
        description: "Product name is required to generate a description.",
        type: "error",
        duration: 5000,
      })
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch("/api/for-sale/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          productDescription,
          specifications,
          platform: "ebay", // Default to eBay style
          condition,
          imageUrls,
        }),
      })

      const result = await response.json()

      if (result.success && result.description) {
        onDescriptionChange(result.description)
        toast({
          title: "Description generated",
          description: `Created ${result.charCount} character eBay-optimized description.`,
          type: "success",
          duration: 3000,
        })
      } else {
        throw new Error(result.error || "Failed to generate description")
      }
    } catch (error) {
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Please try again.",
        type: "error",
        duration: 5000,
      })
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleApplyStyle(style: PlatformStyle) {
    if (!productName) {
      toast({
        title: "No product name",
        description: "Product name is required to generate a styled description.",
        type: "error",
        duration: 5000,
      })
      return
    }

    setActiveStyle(style)
    try {
      const response = await fetch("/api/for-sale/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          productDescription,
          specifications,
          platform: style,
          condition,
          imageUrls,
        }),
      })

      const result = await response.json()

      if (result.success && result.description) {
        onDescriptionChange(result.description)
        const platformNames = { ebay: "eBay", facebook: "Facebook", craigslist: "Craigslist" }
        toast({
          title: `${platformNames[style]} style applied`,
          description: `Generated ${result.charCount} character description.`,
          type: "success",
          duration: 3000,
        })
      } else {
        throw new Error(result.error || "Failed to apply style")
      }
    } catch (error) {
      toast({
        title: "Style application failed",
        description: error instanceof Error ? error.message : "Please try again.",
        type: "error",
        duration: 5000,
      })
    } finally {
      setActiveStyle(null)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-700 mb-3">📝 Listing Description</h3>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-2 flex-wrap">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          size="sm"
          className="bg-gradient-to-r from-orange-400 to-pink-500 text-white hover:opacity-90"
        >
          {isGenerating ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3 mr-1" />
          )}
          AI Generate
        </Button>

        <Button
          onClick={() => handleApplyStyle("ebay")}
          disabled={activeStyle === "ebay"}
          variant="outline"
          size="sm"
        >
          {activeStyle === "ebay" ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            "🎯"
          )}{" "}
          eBay Style
        </Button>

        <Button
          onClick={() => handleApplyStyle("facebook")}
          disabled={activeStyle === "facebook"}
          variant="outline"
          size="sm"
        >
          {activeStyle === "facebook" ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            "📱"
          )}{" "}
          FB Style
        </Button>

        <Button
          onClick={() => handleApplyStyle("craigslist")}
          disabled={activeStyle === "craigslist"}
          variant="outline"
          size="sm"
        >
          {activeStyle === "craigslist" ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            "📋"
          )}{" "}
          CL Style
        </Button>
      </div>

      {/* Description Textarea */}
      <Textarea
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        placeholder={
          productDescription ||
          "Enter your marketplace description here...\n\nTip: Use AI Generate to create an optimized description."
        }
        rows={10}
        className="w-full text-sm"
      />

      {/* Character Counter & Status */}
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>{charCount} characters</span>
        <div className="flex gap-2">
          {hasKeywords && (
            <span className="text-green-600">✓ Keywords optimized</span>
          )}
          {hasEmojis && <span className="text-green-600">✓ Emojis added</span>}
        </div>
      </div>

      {/* Platform Style Tips */}
      <div className="mt-3 p-2 bg-gray-50 rounded-lg text-xs text-gray-500">
        <strong>Platform Tips:</strong>
        <ul className="mt-1 space-y-1">
          <li>• <strong>eBay:</strong> Detailed specs, condition notes, shipping info</li>
          <li>• <strong>Facebook:</strong> Casual tone, local pickup emphasis, quick response mention</li>
          <li>• <strong>Craigslist:</strong> Plain text, no emojis, direct pricing</li>
        </ul>
      </div>
    </div>
  )
}
