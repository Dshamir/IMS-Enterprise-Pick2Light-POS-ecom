"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { DollarSign, Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ForSaleCategory {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  sort_order: number
  item_count: number
  total_value: number
}

interface ForSaleStats {
  total_listed: number
  pending_count: number
  ready_count: number
  exported_today: number
  total_value: number
}

export function ForSaleCategoriesView() {
  const [categories, setCategories] = useState<ForSaleCategory[]>([])
  const [stats, setStats] = useState<ForSaleStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)

    try {
      const [categoriesRes, statsRes] = await Promise.all([
        fetch("/api/for-sale/categories"),
        fetch("/api/for-sale/stats"),
      ])

      if (!categoriesRes.ok) {
        throw new Error("Failed to load categories")
      }

      const categoriesData = await categoriesRes.json()
      setCategories(categoriesData.categories || [])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
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

  // Get background color class based on category
  function getCategoryBgColor(name: string): string {
    if (name.toLowerCase() === "new") return "bg-blue-100"
    if (name.toLowerCase() === "pre-owned") return "bg-emerald-100"
    return "bg-gray-100"
  }

  // Get badge color class based on category
  function getCategoryBadgeColor(name: string): string {
    if (name.toLowerCase() === "new") return "bg-blue-500"
    if (name.toLowerCase() === "pre-owned") return "bg-emerald-500"
    return "bg-gray-500"
  }

  // Get value text color based on category
  function getCategoryValueColor(name: string): string {
    if (name.toLowerCase() === "new") return "text-blue-600"
    if (name.toLowerCase() === "pre-owned") return "text-emerald-600"
    return "text-gray-600"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading For Sale data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={loadData} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">For Sale</h1>
            <p className="text-sm text-gray-500">
              Manage items listed for marketplace sale
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Category
        </Button>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {categories.length === 0 ? (
          <div className="col-span-2 bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-gray-500 mb-4">No categories found</p>
            <p className="text-sm text-gray-400">
              Categories will be created automatically when you mark products
              for sale
            </p>
          </div>
        ) : (
          categories.map((category) => (
            <Link
              key={category.id}
              href={`/for-sale/${category.slug}`}
              className="block"
            >
              <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={cn(
                      "w-16 h-16 rounded-xl flex items-center justify-center",
                      getCategoryBgColor(category.name)
                    )}
                  >
                    <span className="text-3xl">{category.icon || "📦"}</span>
                  </div>
                  <span
                    className={cn(
                      "text-white text-sm px-3 py-1 rounded-full",
                      getCategoryBadgeColor(category.name)
                    )}
                  >
                    {category.item_count} items
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-800">
                  {category.name}
                </h3>
                <p className="text-gray-500 text-sm mt-1">
                  {category.description || "No description"}
                </p>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div
                    className={cn(
                      "text-2xl font-bold",
                      getCategoryValueColor(category.name)
                    )}
                  >
                    {formatCurrency(category.total_value || 0)}
                  </div>
                  <div className="text-sm text-gray-500">Est. Total Value</div>
                </div>
                <button className="mt-4 w-full bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800">
                  Browse {category.name} Items
                </button>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-700 mb-4">
            Marketplace Status Overview
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-800">
                {stats.total_listed}
              </div>
              <div className="text-sm text-gray-500">Total Listed</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {stats.pending_count}
              </div>
              <div className="text-sm text-gray-500">Pending Optimization</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {stats.ready_count}
              </div>
              <div className="text-sm text-gray-500">Ready to Export</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {stats.exported_today}
              </div>
              <div className="text-sm text-gray-500">Exported Today</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
