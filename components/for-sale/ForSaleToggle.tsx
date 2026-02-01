"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2, ExternalLink, CheckCircle2, AlertCircle, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

type AIProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed' | null

interface ForSaleCategory {
  id: string
  name: string
  slug: string
  icon: string | null
}

interface ForSaleSubcategory {
  id: string
  parent_category_id: string
  name: string
  slug: string
  icon: string | null
}

interface ForSaleData {
  id?: string
  product_id: string
  enabled: boolean
  sale_category_id: string | null
  sub_category_id: string | null
  condition: "like_new" | "good" | "fair" | "for_parts" | null
  status: "pending" | "optimized" | "exported"
}

interface ForSaleToggleProps {
  productId: string
  onUpdate?: (data: ForSaleData) => void
}

const CONDITIONS = [
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "for_parts", label: "For Parts" },
] as const

export function ForSaleToggle({ productId, onUpdate }: ForSaleToggleProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null)
  const [condition, setCondition] = useState<string | null>(null)
  const [categories, setCategories] = useState<ForSaleCategory[]>([])
  const [subcategories, setSubcategories] = useState<ForSaleSubcategory[]>([])
  const [forSaleData, setForSaleData] = useState<ForSaleData | null>(null)
  const [aiStatus, setAiStatus] = useState<AIProcessingStatus>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  // Load initial data
  useEffect(() => {
    loadData()
  }, [productId])

  // Load subcategories when category changes
  useEffect(() => {
    if (categoryId) {
      loadSubcategories(categoryId)
    } else {
      setSubcategories([])
      setSubcategoryId(null)
    }
  }, [categoryId])

  // Poll for AI processing status when processing
  useEffect(() => {
    if (aiStatus !== 'processing') return

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/for-sale/items/${productId}/ai-process`)
        if (res.ok) {
          const data = await res.json()
          setAiStatus(data.ai_processing_status)
          setAiError(data.ai_processing_error)

          // Stop polling when completed or failed
          if (data.ai_processing_status === 'completed' || data.ai_processing_status === 'failed') {
            clearInterval(pollInterval)
          }
        }
      } catch (error) {
        console.error("Error polling AI status:", error)
      }
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(pollInterval)
  }, [aiStatus, productId])

  async function loadData() {
    setLoading(true)
    try {
      // Load categories, for-sale data, and AI status in parallel
      const [categoriesRes, forSaleRes, aiStatusRes] = await Promise.all([
        fetch("/api/for-sale/categories"),
        fetch(`/api/for-sale/items/${productId}`),
        fetch(`/api/for-sale/items/${productId}/ai-process`),
      ])

      if (categoriesRes.ok) {
        const data = await categoriesRes.json()
        setCategories(data.categories || [])
      }

      if (forSaleRes.ok) {
        const data = await forSaleRes.json()
        if (data.item) {
          setForSaleData(data.item)
          setEnabled(data.item.enabled)
          setCategoryId(data.item.sale_category_id)
          setSubcategoryId(data.item.sub_category_id)
          setCondition(data.item.condition)
        }
      }

      if (aiStatusRes.ok) {
        const data = await aiStatusRes.json()
        setAiStatus(data.ai_processing_status)
        setAiError(data.ai_processing_error)
      }
    } catch (error) {
      console.error("Error loading for-sale data:", error)
    } finally {
      setLoading(false)
    }
  }

  async function loadSubcategories(catId: string) {
    try {
      const res = await fetch(`/api/for-sale/subcategories?categoryId=${catId}`)
      if (res.ok) {
        const data = await res.json()
        setSubcategories(data.subcategories || [])
      }
    } catch (error) {
      console.error("Error loading subcategories:", error)
    }
  }

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(async (data: Partial<ForSaleData>) => {
      setSaving(true)
      try {
        const res = await fetch(`/api/for-sale/items/${productId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })

        if (res.ok) {
          const result = await res.json()
          setForSaleData(result.item)
          onUpdate?.(result.item)

          // If AI processing was triggered, update status to processing
          if (result.aiProcessingTriggered) {
            setAiStatus('processing')
            setAiError(null)
          }
        }
      } catch (error) {
        console.error("Error saving for-sale data:", error)
      } finally {
        setSaving(false)
      }
    }, 500),
    [productId, onUpdate]
  )

  function handleToggle(checked: boolean) {
    setEnabled(checked)
    debouncedSave({ enabled: checked })
  }

  function handleCategoryChange(value: string) {
    setCategoryId(value)
    setSubcategoryId(null) // Reset subcategory
    debouncedSave({ sale_category_id: value, sub_category_id: null })
  }

  function handleSubcategoryChange(value: string) {
    setSubcategoryId(value)
    debouncedSave({ sub_category_id: value })
  }

  function handleConditionChange(value: string) {
    setCondition(value)
    debouncedSave({ condition: value as ForSaleData["condition"] })
  }

  function handleOpenEditor() {
    // Find the category and subcategory slugs for navigation
    const category = categories.find((c) => c.id === categoryId)
    if (category && subcategoryId) {
      router.push(`/for-sale/editor/${productId}`)
    } else {
      router.push(`/for-sale/editor/${productId}`)
    }
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-center py-2">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
          <span className="ml-2 text-sm text-emerald-600">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-emerald-800 flex items-center">
            <span className="mr-2">💰</span> List for Sale
            {saving && (
              <Loader2 className="ml-2 h-4 w-4 animate-spin text-emerald-500" />
            )}
          </h3>
          <p className="text-sm text-emerald-600 mt-1">
            Enable to make this item available in the For Sale module with
            marketplace optimization tools
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          className={cn(
            "data-[state=checked]:bg-emerald-500",
            "focus-visible:ring-emerald-500"
          )}
        />
      </div>

      {/* Expanded options when toggle is ON */}
      {enabled && (
        <div className="mt-4 pt-4 border-t border-emerald-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="block text-sm font-medium text-emerald-700 mb-1">
                Sale Category
              </Label>
              <Select
                value={categoryId || ""}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger className="w-full border-emerald-300 bg-white">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="block text-sm font-medium text-emerald-700 mb-1">
                Subcategory
              </Label>
              <Select
                value={subcategoryId || ""}
                onValueChange={handleSubcategoryChange}
                disabled={!categoryId || subcategories.length === 0}
              >
                <SelectTrigger className="w-full border-emerald-300 bg-white">
                  <SelectValue placeholder="Select subcategory..." />
                </SelectTrigger>
                <SelectContent>
                  {subcategories.map((subcategory) => (
                    <SelectItem key={subcategory.id} value={subcategory.id}>
                      {subcategory.icon} {subcategory.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4">
            <Label className="block text-sm font-medium text-emerald-700 mb-2">
              Item Condition
            </Label>
            <RadioGroup
              value={condition || ""}
              onValueChange={handleConditionChange}
              className="flex flex-wrap gap-4"
            >
              {CONDITIONS.map((cond) => (
                <div key={cond.value} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={cond.value}
                    id={`condition-${cond.value}`}
                    className="text-emerald-500 border-emerald-400"
                  />
                  <Label
                    htmlFor={`condition-${cond.value}`}
                    className="text-sm text-gray-700 cursor-pointer"
                  >
                    {cond.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* AI Processing Status Indicator */}
          {aiStatus && (
            <div className={cn(
              "mt-4 p-3 rounded-lg flex items-center gap-3",
              aiStatus === 'processing' && "bg-blue-50 border border-blue-200",
              aiStatus === 'completed' && "bg-green-50 border border-green-200",
              aiStatus === 'failed' && "bg-red-50 border border-red-200"
            )}>
              {aiStatus === 'processing' && (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-blue-700">AI preparing your listing...</p>
                    <p className="text-xs text-blue-600">Analyzing images and generating optimized content</p>
                  </div>
                </>
              )}
              {aiStatus === 'completed' && (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-green-700">AI optimization complete!</p>
                    <p className="text-xs text-green-600">Title, descriptions, and specs are ready in the editor</p>
                  </div>
                </>
              )}
              {aiStatus === 'failed' && (
                <>
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-red-700">AI processing failed</p>
                    <p className="text-xs text-red-600">{aiError || 'An error occurred. Try opening the editor manually.'}</p>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 mt-4">
            <Button
              onClick={handleOpenEditor}
              className="bg-emerald-500 text-white hover:bg-emerald-600"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in For Sale Editor
            </Button>

            {/* Show "Optimized" badge when AI has completed */}
            {forSaleData?.status === 'optimized' && (
              <div className="flex items-center gap-1 text-sm text-emerald-600">
                <Sparkles className="h-4 w-4" />
                <span>AI Optimized</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}
