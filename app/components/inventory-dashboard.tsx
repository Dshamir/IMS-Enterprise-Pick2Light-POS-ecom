"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Package, AlertTriangle, DollarSign, PieChart, Clock, Plus, Minus, RefreshCw, ChevronRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"

interface InventoryDashboardProps {
  totalProducts: number
  totalValue: number
  categories: Record<string, number>
  lowStockProducts: any[]
  recentTransactions: any[]
}

export function InventoryDashboard({
  totalProducts,
  totalValue,
  categories,
  lowStockProducts,
  recentTransactions,
}: InventoryDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview")

  // Format transaction date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(date)
  }

  // Get transaction icon based on type
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "addition":
        return <Plus className="h-4 w-4 text-green-500" />
      case "reduction":
        return <Minus className="h-4 w-4 text-red-500" />
      case "adjustment":
        return <RefreshCw className="h-4 w-4 text-blue-500" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  // Get transaction badge color based on type
  const getTransactionBadge = (type: string) => {
    switch (type) {
      case "addition":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Addition
          </Badge>
        )
      case "reduction":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Reduction
          </Badge>
        )
      case "adjustment":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Adjustment
          </Badge>
        )
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="mb-8 w-full sm:w-auto">
        <TabsTrigger value="overview" className="flex-1 sm:flex-none">Overview</TabsTrigger>
        <TabsTrigger value="alerts" className="flex-1 sm:flex-none">
          Alerts
          {lowStockProducts.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {lowStockProducts.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="transactions" className="flex-1 sm:flex-none">Recent Transactions</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProducts}</div>
              <p className="text-xs text-muted-foreground">items in inventory</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
              <p className="text-xs text-muted-foreground">total value of inventory</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lowStockProducts.length}</div>
              <p className="text-xs text-muted-foreground">items below minimum level</p>
            </CardContent>
            <CardFooter className="pt-2">
              <Link href="/inventory/alerts" className="w-full">
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  View alerts
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(categories).length}</div>
              <p className="text-xs text-muted-foreground">product categories</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Category Distribution</CardTitle>
              <CardDescription>Products by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(categories).map(([category, count]) => (
                  <div key={category} className="flex items-center">
                    <div className="w-full">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">{category}</span>
                        <span className="text-sm text-muted-foreground font-medium">{count} products</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(count / totalProducts) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/products" className="w-full">
                <Button variant="outline" className="w-full">
                  View All Products
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
              <CardDescription>Latest inventory transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {recentTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-4 opacity-50" />
                  <p className="text-sm font-medium">No recent transactions</p>
                  <p className="text-xs">Transactions will appear here once you start managing inventory</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentTransactions.slice(0, 5).map((transaction) => (
                    <div key={transaction.id} className="flex items-start">
                      <div className="mr-3 mt-1">{getTransactionIcon(transaction.transaction_type)}</div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">{transaction.products.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.transaction_type === "addition"
                            ? "Added"
                            : transaction.transaction_type === "reduction"
                              ? "Removed"
                              : "Adjusted"}{" "}
                          {transaction.quantity} units
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(transaction.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" onClick={() => setActiveTab("transactions")}>
                View All Transactions
              </Button>
            </CardFooter>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="alerts">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Low Stock Alerts</CardTitle>
            <CardDescription>Products that need attention</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm font-medium mb-2">No low stock alerts at this time</p>
                <p className="text-xs">All products are adequately stocked</p>
              </div>
            ) : (
              <div className="space-y-4">
                {lowStockProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between border-b pb-4 last:border-b-0">
                    <div className="flex items-center">
                      <div className="h-10 w-10 relative rounded-lg overflow-hidden mr-3 bg-muted">
                        <Image
                          src={product.image_url || "/placeholder.svg?height=40&width=40"}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-1">{product.name}</h4>
                        <p className="text-xs text-muted-foreground">Category: {product.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center mb-1">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mr-2" />
                        <span className="text-sm font-medium text-amber-500">
                          {product.stock_quantity} / {product.min_stock_level}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">Reorder: {product.reorder_quantity} units</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Link href="/inventory/alerts" className="w-full">
              <Button variant="outline" className="w-full">
                View All Alerts
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </TabsContent>

      <TabsContent value="transactions">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent Transactions</CardTitle>
            <CardDescription>Latest inventory movements</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm font-medium mb-2">No transactions yet</p>
                <p className="text-xs">Transaction history will appear here once you start managing inventory</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-start border-b pb-4 last:border-b-0">
                    <div className="h-10 w-10 relative rounded-lg overflow-hidden mr-3 bg-muted">
                      <Image
                        src={transaction.products.image_url || "/placeholder.svg?height=40&width=40"}
                        alt={transaction.products.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-medium">{transaction.products.name}</h4>
                        {getTransactionBadge(transaction.transaction_type)}
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-xs text-muted-foreground">
                          {transaction.reason && (
                            <span className="capitalize">{transaction.reason.replace("_", " ")}</span>
                          )}
                        </p>
                        <p className="text-sm font-medium">
                          {transaction.transaction_type === "addition" ? (
                            <span className="text-green-600">+{transaction.quantity}</span>
                          ) : transaction.transaction_type === "reduction" ? (
                            <span className="text-red-600">-{transaction.quantity}</span>
                          ) : (
                            <span className="text-blue-600">
                              {transaction.new_quantity - transaction.previous_quantity > 0 ? "+" : ""}
                              {transaction.new_quantity - transaction.previous_quantity}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex justify-between">
                        <p className="text-xs text-muted-foreground">{formatDate(transaction.created_at)}</p>
                        <p className="text-xs text-muted-foreground font-medium">
                          {transaction.previous_quantity} → {transaction.new_quantity} units
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

