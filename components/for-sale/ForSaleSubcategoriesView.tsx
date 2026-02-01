"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ForSaleCategory {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
}

interface ForSaleSubcategory {
  id: string
  parent_category_id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  item_count: number
  total_value: number
}

interface ForSaleSubcategoriesViewProps {
  categorySlug: string
}

// Map of icon colors by subcategory slug
const iconColorMap: Record<string, string> = {
  "crypto-mining": "bg-orange-100",
  "server-hardware": "bg-blue-100",
  "power-distribution": "bg-yellow-100",
  networking: "bg-purple-100",
  "test-equipment": "bg-red-100",
  "office-equipment": "bg-indigo-100",
  "consumer-electronics": "bg-pink-100",
  miscellaneous: "bg-gray-100",
}

export function ForSaleSubcategoriesView({
  categorySlug,
}: ForSaleSubcategoriesViewProps) {
  const [category, setCategory] = useState<ForSaleCategory | null>(null)
  const [subcategories, setSubcategories] = useState<ForSaleSubcategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [categorySlug])

  async function loadData() {
    setLoading(true)
    setError(null)

    try {
      // Load category info and subcategories
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
        setSubcategories(subcategoriesData.subcategories || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value)
  }

  function getIconBgColor(slug: string): string {
    return iconColorMap[slug] || "bg-gray-100"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading subcategories...</span>
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

  // Determine category badge color
  const categoryBadgeColor =
    category.name.toLowerCase() === "new"
      ? "bg-blue-500"
      : category.name.toLowerCase() === "pre-owned"
        ? "bg-emerald-500"
        : "bg-gray-500"

  return (
    <div>
      {/* Header with Category Badge */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "text-white px-3 py-1 rounded-full text-sm",
              categoryBadgeColor
            )}
          >
            {category.name}
          </span>
          <h1 className="text-2xl font-bold text-gray-900">Subcategories</h1>
        </div>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Subcategory
        </Button>
      </div>

      {/* Subcategory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {subcategories.length === 0 ? (
          <div className="col-span-3 bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-gray-500 mb-4">No subcategories found</p>
            <p className="text-sm text-gray-400">
              Subcategories will be created automatically when you mark products
              for sale
            </p>
          </div>
        ) : (
          subcategories.map((subcategory) => (
            <Link
              key={subcategory.id}
              href={`/for-sale/${categorySlug}/${subcategory.slug}`}
              className="block"
            >
              <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center",
                      getIconBgColor(subcategory.slug)
                    )}
                  >
                    <span className="text-2xl">{subcategory.icon || "📦"}</span>
                  </div>
                  <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
                    {subcategory.item_count} items
                  </span>
                </div>
                <h3 className="font-semibold text-gray-800">
                  {subcategory.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {subcategory.description || "No description"}
                </p>
                <div className="mt-3 text-lg font-bold text-emerald-600">
                  {formatCurrency(subcategory.total_value || 0)}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
