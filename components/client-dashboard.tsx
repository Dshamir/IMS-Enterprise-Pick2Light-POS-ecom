"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Package, ShoppingCart, Wrench, DollarSign, AlertTriangle, BarChart3 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface InventoryStats {
  totalProducts: number
  totalValue: number
  lowStockCount: number
  categoryBreakdown: {
    parts: number
    consumables: number
    equipment: number
  }
  recentlyAdded: any[]
  lowStockItems: any[]
}

export default function ClientDashboard() {
  const [stats, setStats] = useState<InventoryStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      setIsLoading(true)
      setError(null)

      try {
        const supabase = createClientSupabaseClient()

        // Fetch all products
        const { data: products, error: productsError } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false })

        if (productsError) {
          throw productsError
        }

        if (!products) {
          throw new Error("No products found")
        }

        // Calculate statistics
        const totalProducts = products.length
        const totalValue = products.reduce((sum, product) => sum + product.price * product.stock_quantity, 0)

        // Find low stock items
        const lowStockItems = products.filter(
          (product) => product.min_stock_level > 0 && product.stock_quantity < product.min_stock_level,
        )
        const lowStockCount = lowStockItems.length

        // Count products by category
        const categoryBreakdown = {
          parts: products.filter((product) => product.category === "parts").length,
          consumables: products.filter((product) => product.category === "consumables").length,
          equipment: products.filter((product) => product.category === "equipment").length,
        }

        // Get recently added products (last 5)
        const recentlyAdded = products.slice(0, 5)

        setStats({
          totalProducts,
          totalValue,
          lowStockCount,
          categoryBreakdown,
          recentlyAdded,
          lowStockItems: lowStockItems.slice(0, 3), // Show only top 3 in dashboard
        })
      } catch (err) {
        console.error("Error fetching dashboard stats:", err)
        setError("Failed to load dashboard statistics. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading dashboard statistics...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!stats) {
    return (
      <Alert className="mb-6">
        <AlertDescription>No statistics available.</AlertDescription>
      </Alert>
    )
  }

  const totalCategoryCount =
    stats.categoryBreakdown.parts + stats.categoryBreakdown.consumables + stats.categoryBreakdown.equipment

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 justify-end">
        <Button asChild variant="outline">
          <Link href="/reports">
            <BarChart3 className="h-4 w-4 mr-2" />
            View Reports
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/inventory/alerts">
            <AlertTriangle className="h-4 w-4 mr-2" />
            View Alerts
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Items"
          value={stats.totalProducts.toString()}
          description="Items in inventory"
          icon={<Package className="h-5 w-5" />}
        />

        <StatCard
          title="Total Value"
          value={`$${stats.totalValue.toFixed(2)}`}
          description="Inventory value"
          icon={<DollarSign className="h-5 w-5" />}
        />

        <StatCard
          title="Low Stock"
          value={stats.lowStockCount.toString()}
          description="Items below minimum level"
          icon={<AlertTriangle className="h-5 w-5" />}
          alert={stats.lowStockCount > 0}
          link="/inventory/alerts"
        />

        <StatCard
          title="Categories"
          value={`${totalCategoryCount > 0 ? 3 : 0}`}
          description="Active categories"
          icon={<Package className="h-5 w-5" />}
        />
      </div>

      {/* Low Stock Alerts */}
      {stats.lowStockCount > 0 && (
        <Card className={stats.lowStockCount > 0 ? "border-amber-200" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Low Stock Alerts</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/inventory/alerts">View All</Link>
              </Button>
            </div>
            <CardDescription>Items that need attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.lowStockItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-muted-foreground capitalize">{item.category}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-red-600">{item.stock_quantity} in stock</div>
                    <div className="text-sm text-muted-foreground">Min: {item.min_stock_level}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/inventory/alerts">View All Alerts</Link>
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
          <CardDescription>Distribution of items by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <CategoryBar
              label="Parts"
              count={stats.categoryBreakdown.parts}
              total={totalCategoryCount}
              icon={<Wrench className="h-4 w-4" />}
              href="/parts"
            />

            <CategoryBar
              label="Consumables"
              count={stats.categoryBreakdown.consumables}
              total={totalCategoryCount}
              icon={<ShoppingCart className="h-4 w-4" />}
              href="/consumables"
            />

            <CategoryBar
              label="Equipment"
              count={stats.categoryBreakdown.equipment}
              total={totalCategoryCount}
              icon={<Package className="h-4 w-4" />}
              href="/equipment"
            />
          </div>
        </CardContent>
      </Card>

      {/* Recently Added Items */}
      <Card>
        <CardHeader>
          <CardTitle>Recently Added Items</CardTitle>
          <CardDescription>Latest additions to your inventory</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.recentlyAdded.length > 0 ? (
              <div className="divide-y">
                {stats.recentlyAdded.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="py-2 px-2 -mx-2 flex items-center justify-between hover:bg-muted rounded-md"
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                        {product.category === "parts" && <Wrench className="h-4 w-4 text-primary" />}
                        {product.category === "consumables" && <ShoppingCart className="h-4 w-4 text-primary" />}
                        {product.category === "equipment" && <Package className="h-4 w-4 text-primary" />}
                      </div>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground capitalize">{product.category}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${product.price.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">Stock: {product.stock_quantity}</div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">No items added yet</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string
  description: string
  icon: React.ReactNode
  alert?: boolean
  link?: string
}

function StatCard({ title, value, description, icon, alert = false, link }: StatCardProps) {
  const CardWrapper = link ? Link : "div"

  return (
    <CardWrapper href={link || "#"} className={link ? "block" : ""}>
      <Card className={`${alert ? "border-red-200" : ""} ${link ? "hover:shadow-md transition-shadow" : ""}`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${alert ? "bg-red-100" : "bg-primary/10"}`}
          >
            {icon}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </CardWrapper>
  )
}

interface CategoryBarProps {
  label: string
  count: number
  total: number
  icon: React.ReactNode
  href: string
}

function CategoryBar({ label, count, total, icon, href }: CategoryBarProps) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0

  return (
    <div className="space-y-2">
      <Link href={href} className="flex items-center justify-between hover:underline">
        <div className="flex items-center gap-2">
          {icon}
          <span>{label}</span>
        </div>
        <div className="text-sm font-medium">
          {count} ({percentage}%)
        </div>
      </Link>
      <Progress value={percentage} className="h-2" />
    </div>
  )
}

