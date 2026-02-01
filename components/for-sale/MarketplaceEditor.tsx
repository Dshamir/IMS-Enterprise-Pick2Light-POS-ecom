"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Loader2, Eye, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

import { ImageManager } from "./ImageManager"
import { TitleOptimizer } from "./TitleOptimizer"
import { DescriptionGenerator } from "./DescriptionGenerator"
import { SpecificationsTable } from "./SpecificationsTable"
import { PriceRecommendation } from "./PriceRecommendation"
import { MarketComparison } from "./MarketComparison"
import { ExportPanel } from "./ExportPanel"

interface ForSaleCategory {
  id: string
  name: string
  slug: string
}

interface ForSaleSubcategory {
  id: string
  name: string
  slug: string
  icon: string | null
}

interface ProductForSale {
  id: string
  product_id: string
  enabled: boolean
  sale_category_id: string | null
  sub_category_id: string | null
  condition: "like_new" | "good" | "fair" | "for_parts" | null
  marketplace_title: string | null
  marketplace_description: string | null
  suggested_price: number | null
  final_price: number | null
  status: "pending" | "optimized" | "exported"
  product_name?: string
  product_description?: string
  product_barcode?: string
  product_price?: number
}

interface Specification {
  id: string
  spec_key: string
  spec_value: string
  confidence: number
  sort_order: number
}

interface MarketplaceEditorProps {
  productId: string
}

const STATUS_BADGES: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: "Pending Optimization", color: "bg-yellow-500", icon: "⏳" },
  optimized: { label: "Ready to Export", color: "bg-green-500", icon: "✓" },
  exported: { label: "Exported", color: "bg-blue-500", icon: "📤" },
}

const CONDITION_OPTIONS = [
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "for_parts", label: "For Parts" },
]

export function MarketplaceEditor({ productId }: MarketplaceEditorProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Data state
  const [forSaleData, setForSaleData] = useState<ProductForSale | null>(null)
  const [category, setCategory] = useState<ForSaleCategory | null>(null)
  const [subcategory, setSubcategory] = useState<ForSaleSubcategory | null>(null)
  const [specifications, setSpecifications] = useState<Specification[]>([])
  const [marketData, setMarketData] = useState<Record<string, any> | null>(null)
  const [imageUrls, setImageUrls] = useState<string[]>([])

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [condition, setCondition] = useState<string>("good")
  const [finalPrice, setFinalPrice] = useState<number | null>(null)

  useEffect(() => {
    loadData()
  }, [productId])

  async function loadData() {
    setLoading(true)
    setError(null)

    try {
      // Load for-sale data
      const forSaleRes = await fetch(`/api/for-sale/items/${productId}`)
      if (!forSaleRes.ok) {
        throw new Error("Failed to load item data")
      }

      const forSaleJson = await forSaleRes.json()
      const item = forSaleJson.item as ProductForSale | null

      if (!item) {
        throw new Error("Item not found. Please enable For Sale on this product first.")
      }

      setForSaleData(item)
      setTitle(item.marketplace_title || item.product_name || "")
      setDescription(item.marketplace_description || item.product_description || "")
      setCondition(item.condition || "good")
      setFinalPrice(item.final_price || item.suggested_price)

      // Load category and subcategory info
      if (item.sale_category_id) {
        const categoriesRes = await fetch("/api/for-sale/categories")
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json()
          const foundCat = categoriesData.categories?.find(
            (c: ForSaleCategory) => c.id === item.sale_category_id
          )
          setCategory(foundCat || null)
        }
      }

      if (item.sub_category_id && item.sale_category_id) {
        const subcatsRes = await fetch(
          `/api/for-sale/subcategories?categoryId=${item.sale_category_id}`
        )
        if (subcatsRes.ok) {
          const subcatsData = await subcatsRes.json()
          const foundSubcat = subcatsData.subcategories?.find(
            (s: ForSaleSubcategory) => s.id === item.sub_category_id
          )
          setSubcategory(foundSubcat || null)
        }
      }

      // Load specifications
      const specsRes = await fetch(`/api/for-sale/items/${productId}/specifications`)
      if (specsRes.ok) {
        const specsData = await specsRes.json()
        setSpecifications(specsData.specifications || [])
      }

      // Load product images for AI vision
      const productRes = await fetch(`/api/products/${productId}`)
      if (productRes.ok) {
        const productData = await productRes.json()
        const product = productData.product || productData
        if (product?.images && Array.isArray(product.images)) {
          const urls = product.images.map((img: any) => img.image_url).filter(Boolean)
          setImageUrls(urls)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    console.log("[MarketplaceEditor] handleSave called")
    console.log("[MarketplaceEditor] Current state:", { title, description, condition, finalPrice })

    setSaving(true)
    try {
      // Save main for-sale data
      const payload = {
        marketplace_title: title,
        marketplace_description: description,
        condition,
        final_price: finalPrice,
        status: "optimized",
      }
      console.log("[MarketplaceEditor] Sending PATCH to:", `/api/for-sale/items/${productId}`)
      console.log("[MarketplaceEditor] Payload:", payload)

      const res = await fetch(`/api/for-sale/items/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      console.log("[MarketplaceEditor] Response status:", res.status, res.ok)

      if (!res.ok) {
        const errorText = await res.text()
        console.error("[MarketplaceEditor] Error response:", errorText)
        throw new Error("Failed to save changes")
      }

      // Save specifications
      if (specifications.length > 0) {
        console.log("[MarketplaceEditor] Saving specifications:", specifications.length)
        const specRes = await fetch(`/api/for-sale/items/${productId}/specifications`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ specifications }),
        })
        console.log("[MarketplaceEditor] Specs response:", specRes.status)
      }

      const updated = await res.json()
      console.log("[MarketplaceEditor] Updated data:", updated)

      if (!updated.item) {
        console.warn("[MarketplaceEditor] No item in response!")
      }

      setForSaleData(updated.item)

      toast({
        title: "Changes saved",
        description: "Your marketplace listing has been updated.",
        type: "success",
        duration: 3000,
      })
    } catch (err) {
      console.error("[MarketplaceEditor] Save error:", err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save",
        type: "error",
        duration: 5000,
      })
    } finally {
      setSaving(false)
      console.log("[MarketplaceEditor] Save complete")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading editor...</span>
      </div>
    )
  }

  if (error || !forSaleData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 mb-4">{error || "Item not found"}</p>
        <Button asChild variant="outline">
          <Link href="/for-sale">Back to For Sale</Link>
        </Button>
      </div>
    )
  }

  const statusBadge = STATUS_BADGES[forSaleData.status] || STATUS_BADGES.pending
  const displayTitle = title || forSaleData.product_name || "Untitled"

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            {category && (
              <span
                className={cn(
                  "text-white px-3 py-1 rounded-full text-sm",
                  category.name.toLowerCase() === "new"
                    ? "bg-blue-500"
                    : "bg-emerald-500"
                )}
              >
                {category.name}
              </span>
            )}
            {subcategory && (
              <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm">
                {subcategory.icon} {subcategory.name}
              </span>
            )}
            <span
              className={cn(
                "text-white px-2 py-0.5 rounded-full text-xs",
                statusBadge.color
              )}
            >
              {statusBadge.icon} {statusBadge.label}
            </span>
          </div>
          <h2 className="text-2xl font-bold">{displayTitle}</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button
            type="button"
            onClick={() => {
              console.log("[MarketplaceEditor] Save button clicked!")
              handleSave()
            }}
            disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Three Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Images & Basic Info */}
        <div className="space-y-4">
          <ImageManager productId={productId} />

          {/* Item Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-700 mb-3">📋 Item Details</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-500">Condition</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1"
                >
                  {CONDITION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-500">SKU/Internal ID</label>
                <input
                  type="text"
                  value={productId}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 text-sm bg-gray-50"
                  readOnly
                />
              </div>
              <div>
                <label className="text-sm text-gray-500">Barcode</label>
                <input
                  type="text"
                  value={forSaleData.product_barcode || "N/A"}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 text-sm bg-gray-50"
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Link to Original Product */}
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔗</span>
              <div>
                <div className="text-sm font-medium text-blue-800">
                  Linked to Inventory
                </div>
                <Link
                  href={`/products/${productId}/edit`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  View Original Product →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column - Title & Description */}
        <div className="space-y-4">
          <TitleOptimizer
            title={title}
            onTitleChange={setTitle}
            productName={forSaleData.product_name}
            productDescription={forSaleData.product_description}
            category={category?.name}
            imageUrls={imageUrls}
          />

          <DescriptionGenerator
            description={description}
            onDescriptionChange={setDescription}
            productName={forSaleData.product_name}
            productDescription={forSaleData.product_description}
            specifications={specifications.map((s) => ({
              key: s.spec_key,
              value: s.spec_value,
            }))}
            condition={condition}
            imageUrls={imageUrls}
          />

          <SpecificationsTable
            specifications={specifications}
            onSpecificationsChange={setSpecifications}
            productName={forSaleData.product_name}
            productDescription={forSaleData.product_description}
            category={category?.name}
            imageUrls={imageUrls}
          />
        </div>

        {/* Right Column - Pricing & Market Data */}
        <div className="space-y-4">
          <PriceRecommendation
            suggestedPrice={forSaleData.suggested_price}
            currentPrice={finalPrice}
            productName={forSaleData.product_name}
            productDescription={forSaleData.product_description}
            condition={condition}
            marketData={marketData ? Object.values(marketData).map((d: any) => ({
              platform: d.platform,
              average_price: d.average_price,
              min_price: d.min_price,
              max_price: d.max_price,
              listing_count: d.listing_count,
            })) : undefined}
            onPriceChange={setFinalPrice}
          />

          <MarketComparison
            productForSaleId={forSaleData.id}
            productId={productId}
            productName={forSaleData.marketplace_title || forSaleData.product_name}
            onMarketDataLoaded={setMarketData}
          />

          {/* Your Price Input */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-700 mb-3">💵 Your Listing Price</h3>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xl">
                $
              </span>
              <input
                type="number"
                value={finalPrice || ""}
                onChange={(e) =>
                  setFinalPrice(e.target.value ? parseFloat(e.target.value) : null)
                }
                className="w-full border-2 border-emerald-300 rounded-lg pl-8 pr-3 py-3 text-2xl font-bold text-center focus:border-emerald-500 focus:outline-none"
                placeholder="0.00"
              />
            </div>
            {forSaleData.suggested_price && finalPrice && (
              <div className="mt-2 text-sm text-gray-500 text-center">
                {finalPrice < forSaleData.suggested_price ? (
                  <span className="text-emerald-600 font-medium">
                    {Math.round(
                      ((forSaleData.suggested_price - finalPrice) /
                        forSaleData.suggested_price) *
                        100
                    )}
                    % below
                  </span>
                ) : (
                  <span className="text-orange-600 font-medium">
                    {Math.round(
                      ((finalPrice - forSaleData.suggested_price) /
                        forSaleData.suggested_price) *
                        100
                    )}
                    % above
                  </span>
                )}{" "}
                suggested price
              </div>
            )}
          </div>

          <ExportPanel
            productForSaleId={forSaleData.id}
            productId={productId}
            status={forSaleData.status}
          />
        </div>
      </div>
    </div>
  )
}
