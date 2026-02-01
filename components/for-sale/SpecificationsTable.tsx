"use client"

import { useState } from "react"
import { Plus, Trash2, Sparkles, Loader2, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

interface Specification {
  id: string
  spec_key: string
  spec_value: string
  confidence: number
  sort_order: number
}

interface MissingInfo {
  field: string
  priority: 'high' | 'medium' | 'low'
  why_it_matters: string
  how_to_get_it: string
}

interface SpecificationsTableProps {
  specifications: Specification[]
  onSpecificationsChange: (specs: Specification[]) => void
  productName?: string
  productDescription?: string
  category?: string
  imageUrls?: string[]
}

export function SpecificationsTable({
  specifications,
  onSpecificationsChange,
  productName,
  productDescription,
  category,
  imageUrls = [],
}: SpecificationsTableProps) {
  const { toast } = useToast()
  const [isExtracting, setIsExtracting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [missingInfo, setMissingInfo] = useState<MissingInfo[]>([])
  const [buyerWarnings, setBuyerWarnings] = useState<string[]>([])
  const [confidenceSummary, setConfidenceSummary] = useState<string>("")

  async function handleExtract() {
    if (!productName) {
      toast({
        title: "No product name",
        description: "Product name is required to extract specifications.",
        type: "error",
        duration: 5000,
      })
      return
    }

    setIsExtracting(true)
    try {
      console.log("[SpecsTable] Calling Technical AI Agent with", {
        productName,
        category,
        imageCount: imageUrls.length
      })

      const response = await fetch("/api/for-sale/extract-specs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          productDescription,
          category,
          imageUrls, // Pass images for vision-based identification
        }),
      })

      const result = await response.json()

      if (result.success && result.specifications) {
        // Convert API response to internal format with generated IDs
        const extractedSpecs: Specification[] = result.specifications.map(
          (spec: { key: string; value: string; confidence?: number }, index: number) => ({
            id: `ai-${Date.now()}-${index}`,
            spec_key: spec.key,
            spec_value: spec.value,
            confidence: spec.confidence || 0.9,
            sort_order: index,
          })
        )

        // Merge with existing specs (keep user-added, add AI-extracted)
        const existingKeys = specifications.map((s) => s.spec_key.toLowerCase())
        const newSpecs = extractedSpecs.filter(
          (s) => !existingKeys.includes(s.spec_key.toLowerCase())
        )

        onSpecificationsChange([...specifications, ...newSpecs])

        // Store extended SpecScout data
        if (result.missing_info) {
          setMissingInfo(result.missing_info)
        }
        if (result.buyer_warnings) {
          setBuyerWarnings(result.buyer_warnings)
        }
        if (result.confidence_summary) {
          setConfidenceSummary(result.confidence_summary)
        }

        // Count high vs low confidence specs
        const highConfidence = extractedSpecs.filter(s => s.confidence >= 0.8).length
        const lowConfidence = extractedSpecs.filter(s => s.confidence < 0.6).length

        // Build toast message
        let description = imageUrls.length > 0
          ? `SpecScout identified product from ${imageUrls.length} image(s). Found ${newSpecs.length} new specs (${highConfidence} verified).`
          : `Found ${newSpecs.length} new specifications. Add images for better accuracy.`

        if (result.missing_info && result.missing_info.length > 0) {
          const highPriority = result.missing_info.filter((m: MissingInfo) => m.priority === 'high').length
          if (highPriority > 0) {
            description += ` ⚠️ ${highPriority} critical spec(s) need verification.`
          }
        }

        toast({
          title: "SpecScout Extraction Complete",
          description,
          type: "success",
          duration: 5000,
        })

        // Show buyer warnings if any
        if (result.buyer_warnings && result.buyer_warnings.length > 0) {
          setTimeout(() => {
            toast({
              title: "⚠️ Buyer Warnings",
              description: result.buyer_warnings.slice(0, 2).join(" • "),
              type: "warning",
              duration: 8000,
            })
          }, 500)
        }

        if (lowConfidence > 0) {
          console.log(`[SpecScout] Warning: ${lowConfidence} specs have low confidence - review recommended`)
        }
      } else {
        throw new Error(result.error || "Failed to extract specifications")
      }
    } catch (error) {
      toast({
        title: "Extraction failed",
        description: error instanceof Error ? error.message : "Please try again.",
        type: "error",
        duration: 5000,
      })
    } finally {
      setIsExtracting(false)
    }
  }

  function handleAdd() {
    const newSpec: Specification = {
      id: `temp-${Date.now()}`,
      spec_key: "",
      spec_value: "",
      confidence: 1.0,
      sort_order: specifications.length,
    }
    onSpecificationsChange([...specifications, newSpec])
    setEditingId(newSpec.id)
  }

  function handleUpdate(id: string, field: "spec_key" | "spec_value", value: string) {
    const updated = specifications.map((spec) =>
      spec.id === id ? { ...spec, [field]: value } : spec
    )
    onSpecificationsChange(updated)
  }

  function handleDelete(id: string) {
    const filtered = specifications.filter((spec) => spec.id !== id)
    onSpecificationsChange(filtered)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-700 mb-3 flex items-center justify-between">
        <span>⚙️ Specifications</span>
        <button
          onClick={handleExtract}
          disabled={isExtracting}
          className="text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1"
          title="SpecScout: Agent-orchestrated spec extraction with evidence tracking"
        >
          {isExtracting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          {isExtracting ? "Analyzing..." : "SpecScout"}
        </button>
      </h3>

      {/* Specifications List */}
      <div className="space-y-2">
        {specifications.length === 0 ? (
          <div className="text-center py-4 text-sm text-gray-500">
            <p>No specifications yet.</p>
            <p className="text-xs mt-1">
              Click "AI Extract" to auto-detect specs or add manually.
            </p>
          </div>
        ) : (
          specifications.map((spec) => (
            <div
              key={spec.id}
              className="flex items-center gap-2 group"
            >
              <GripVertical className="h-4 w-4 text-gray-300 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />

              {editingId === spec.id ? (
                <>
                  <Input
                    value={spec.spec_key}
                    onChange={(e) => handleUpdate(spec.id, "spec_key", e.target.value)}
                    placeholder="Key (e.g., Brand)"
                    className="flex-1 h-8 text-sm"
                    autoFocus
                  />
                  <Input
                    value={spec.spec_value}
                    onChange={(e) => handleUpdate(spec.id, "spec_value", e.target.value)}
                    placeholder="Value"
                    className="flex-1 h-8 text-sm"
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => e.key === "Enter" && setEditingId(null)}
                  />
                </>
              ) : (
                <div
                  className="flex-1 flex justify-between text-sm cursor-pointer hover:bg-gray-50 rounded px-2 py-1"
                  onClick={() => setEditingId(spec.id)}
                >
                  <span className="text-gray-500">{spec.spec_key || "Click to edit"}</span>
                  <span className="font-medium">{spec.spec_value}</span>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDelete(spec.id)}
              >
                <Trash2 className="h-3 w-3 text-red-500" />
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Add Button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full mt-3"
        onClick={handleAdd}
      >
        <Plus className="h-3 w-3 mr-1" />
        Add Specification
      </Button>

      {/* Confidence Indicator */}
      {specifications.some((s) => s.confidence < 1) && (
        <p className="text-xs text-gray-400 mt-2">
          💡 Some specs were auto-extracted. Click to verify and edit.
        </p>
      )}

      {/* Missing Info / Photo Requests */}
      {missingInfo.length > 0 && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="text-sm font-medium text-amber-800 mb-2">
            📸 Missing Information
          </h4>
          <div className="space-y-2">
            {missingInfo.slice(0, 3).map((info, idx) => (
              <div key={idx} className="text-xs">
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-white text-[10px] ${
                    info.priority === 'high' ? 'bg-red-500' :
                    info.priority === 'medium' ? 'bg-amber-500' : 'bg-gray-400'
                  }`}>
                    {info.priority.toUpperCase()}
                  </span>
                  <span className="font-medium text-amber-900">{info.field}</span>
                </div>
                <p className="text-amber-700 mt-0.5">{info.how_to_get_it}</p>
              </div>
            ))}
          </div>
          {missingInfo.length > 3 && (
            <p className="text-xs text-amber-600 mt-2">
              +{missingInfo.length - 3} more items need verification
            </p>
          )}
        </div>
      )}

      {/* Buyer Warnings */}
      {buyerWarnings.length > 0 && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-sm font-medium text-red-800 mb-2">
            ⚠️ Buyer Warnings
          </h4>
          <ul className="text-xs text-red-700 space-y-1">
            {buyerWarnings.slice(0, 3).map((warning, idx) => (
              <li key={idx}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Confidence Summary */}
      {confidenceSummary && (
        <p className="text-xs text-gray-500 mt-2 italic">
          {confidenceSummary}
        </p>
      )}
    </div>
  )
}
