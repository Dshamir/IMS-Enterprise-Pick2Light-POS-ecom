"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Loader2, RefreshCw, Upload, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface ForSaleCategory {
  id: string
  name: string
  slug: string
}

interface ForSaleSubcategory {
  id: string
  parent_category_id: string
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
  primary_image_url?: string | null
}

interface ForSaleItemsListViewProps {
  categorySlug: string
  subcategorySlug: string
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending Optimization" },
  { value: "optimized", label: "Ready to Export" },
  { value: "exported", label: "Exported" },
]

const SORT_OPTIONS = [
  { value: "recent", label: "Recently Added" },
  { value: "price_high", label: "Price High to Low" },
  { value: "price_low", label: "Price Low to High" },
]

const CONDITION_LABELS: Record<string, { label: string; color: string }> = {
  like_new: { label: "Like New", color: "bg-blue-500" },
  good: { label: "Good", color: "bg-emerald-500" },
  fair: { label: "Fair", color: "bg-yellow-500" },
  for_parts: { label: "For Parts", color: "bg-red-500" },
}

const STATUS_BADGES: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: "Pending", color: "bg-yellow-500", icon: "⏳" },
  optimized: { label: "Ready", color: "bg-green-500", icon: "✓" },
  exported: { label: "Exported", color: "bg-blue-500", icon: "📤" },
}

export function ForSaleItemsListView({
  categorySlug,
  subcategorySlug,
}: ForSaleItemsListViewProps) {
  const { toast } = useToast()
  const [category, setCategory] = useState<ForSaleCategory | null>(null)
  const [subcategory, setSubcategory] = useState<ForSaleSubcategory | null>(null)
  const [items, setItems] = useState<ProductForSale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("recent")
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    loadData()
  }, [categorySlug, subcategorySlug, statusFilter])

  async function loadData() {
    setLoading(true)
    setError(null)

    try {
      // Load category, subcategory, and items
      const [categoryRes, subcategoriesRes] = await Promise.all([
        fetch(`/api/for-sale/categories/${categorySlug}`),
        fetch(`/api/for-sale/subcategories?categorySlug=${categorySlug}`),
      ])

      if (!categoryRes.ok) {
        throw new Error("Category not found")
      }

      const categoryData = await categoryRes.json()
      setCategory(categoryData.category)

      if (subcategoriesRes.ok) {
        const subcategoriesData = await subcategoriesRes.json()
        const foundSubcategory = subcategoriesData.subcategories?.find(
          (s: ForSaleSubcategory) => s.slug === subcategorySlug
        )
        setSubcategory(foundSubcategory || null)

        // Load items for this subcategory
        if (foundSubcategory) {
          const params = new URLSearchParams({
            subcategoryId: foundSubcategory.id,
          })
          if (statusFilter !== "all") {
            params.set("status", statusFilter)
          }

          const itemsRes = await fetch(`/api/for-sale/items?${params}`)
          if (itemsRes.ok) {
            const itemsData = await itemsRes.json()
            setItems(itemsData.items || [])
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  function formatCurrency(value: number | null): string {
    if (value === null) return "No price"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value)
  }

  function sortItems(items: ProductForSale[]): ProductForSale[] {
    return [...items].sort((a, b) => {
      switch (sortBy) {
        case "price_high":
          return (b.final_price || b.suggested_price || 0) - (a.final_price || a.suggested_price || 0)
        case "price_low":
          return (a.final_price || a.suggested_price || 0) - (b.final_price || b.suggested_price || 0)
        default:
          return 0 // Keep original order (recent)
      }
    })
  }

  function toggleItemSelection(itemId: string) {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    setSelectedItems(newSelected)
  }

  async function handleBulkExport() {
    if (selectedItems.size === 0) return

    // Get the product IDs from the selected for-sale items
    const productIds = items
      .filter((item) => selectedItems.has(item.id))
      .map((item) => item.product_id)

    // Check if all selected items are ready for export
    const selectedItemsData = items.filter((item) => selectedItems.has(item.id))
    const pendingItems = selectedItemsData.filter((item) => item.status === "pending")

    if (pendingItems.length > 0) {
      toast({
        title: "Not Ready",
        description: `${pendingItems.length} item(s) need optimization before export.`,
        type: "error",
        duration: 5000,
      })
      return
    }

    setExporting(true)

    try {
      const response = await fetch("/api/for-sale/export/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Bulk export failed")
      }

      // Download the archive
      const blob = await response.blob()
      const filename = `marketplace-export-${Date.now()}.json`
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Export Complete",
        description: `Exported ${productIds.length} item(s) to all marketplace formats.`,
        type: "success",
        duration: 3000,
      })

      // Clear selection and refresh to show updated status
      setSelectedItems(new Set())
      loadData()
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Please try again.",
        type: "error",
        duration: 5000,
      })
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading items...</span>
      </div>
    )
  }

  if (error || !category) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 mb-4">{error || "Category not found"}</p>
        <Button asChild variant="outline">
          <Link href="/for-sale">Back to Categories</Link>
        </Button>
      </div>
    )
  }

  const sortedItems = sortItems(items)
  const categoryBadgeColor =
    category.name.toLowerCase() === "new" ? "bg-blue-500" : "bg-emerald-500"

  return (
    <div>
      {/* Header with Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <span
          className={cn(
            "text-white px-3 py-1 rounded-full text-sm",
            categoryBadgeColor
          )}
        >
          {category.name}
        </span>
        <span className="text-gray-400">›</span>
        <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm">
          {subcategory?.icon} {subcategory?.name || subcategorySlug}
        </span>
      </div>

      {/* Filter/Actions Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  Sort: {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Batch Price Check
          </Button>
          <Button
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-600"
            disabled={selectedItems.size === 0 || exporting}
            onClick={handleBulkExport}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1" />
            )}
            {exporting ? "Exporting..." : `Export Selected (${selectedItems.size})`}
          </Button>
        </div>
      </div>

      {/* Items Grid */}
      {sortedItems.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-gray-500 mb-4">No items found in this subcategory</p>
          <p className="text-sm text-gray-400">
            Mark products for sale from the Product Edit page to see them here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sortedItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              categorySlug={categorySlug}
              subcategorySlug={subcategorySlug}
              selected={selectedItems.has(item.id)}
              onToggleSelect={() => toggleItemSelection(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface ItemCardProps {
  item: ProductForSale
  categorySlug: string
  subcategorySlug: string
  selected: boolean
  onToggleSelect: () => void
}

function ItemCard({
  item,
  categorySlug,
  subcategorySlug,
  selected,
  onToggleSelect,
}: ItemCardProps) {
  const statusBadge = STATUS_BADGES[item.status] || STATUS_BADGES.pending
  const conditionBadge = item.condition
    ? CONDITION_LABELS[item.condition]
    : null

  const displayPrice = item.final_price || item.suggested_price
  const displayTitle = item.marketplace_title || item.product_name || "Untitled"
  const displayDescription =
    item.marketplace_description || item.product_description || ""

  return (
    <div
      className={cn(
        "bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-shadow cursor-pointer",
        selected ? "border-emerald-500 ring-2 ring-emerald-200" : "border-gray-200"
      )}
    >
      {/* Image Area */}
      <div className="relative">
        <div className="h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
          {item.primary_image_url ? (
            <img
              src={item.primary_image_url}
              alt={displayTitle}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-6xl">📦</span>
          )}
        </div>

        {/* Status Badge */}
        <span
          className={cn(
            "absolute top-2 left-2 text-white text-xs px-2 py-1 rounded-full",
            statusBadge.color
          )}
        >
          {statusBadge.icon} {statusBadge.label}
        </span>

        {/* Condition Badge */}
        {conditionBadge && (
          <span
            className={cn(
              "absolute top-2 right-2 text-white text-xs px-2 py-1 rounded-full",
              conditionBadge.color
            )}
          >
            {conditionBadge.label}
          </span>
        )}

        {/* Selection Checkbox */}
        <div className="absolute bottom-2 right-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => {
              e.stopPropagation()
              onToggleSelect()
            }}
            className="w-5 h-5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Content */}
      <Link href={`/for-sale/editor/${item.product_id}`}>
        <div className="p-4">
          <h3 className="font-semibold text-gray-800 truncate">{displayTitle}</h3>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
            {displayDescription || "No description"}
          </p>

          <div className="mt-3 flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-emerald-600">
                {displayPrice ? `$${displayPrice.toFixed(2)}` : "No price"}
              </div>
              <div className="text-xs text-gray-400">
                {item.final_price ? "Final Price" : "Suggested Price"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-600">
                {item.product_barcode || "No barcode"}
              </div>
            </div>
          </div>

          {/* Platform Tags */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex gap-1">
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded",
                item.status === "exported"
                  ? "bg-green-100 text-green-700"
                  : "bg-blue-100 text-blue-700"
              )}
            >
              eBay{item.status === "exported" ? " ✓" : ""}
            </span>
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded",
                item.status === "exported"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-400"
              )}
            >
              FB{item.status === "exported" ? " ✓" : ""}
            </span>
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded",
                item.status === "exported"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-400"
              )}
            >
              CL{item.status === "exported" ? " ✓" : ""}
            </span>
          </div>
        </div>
      </Link>
    </div>
  )
}
