"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getLowStockProducts } from "@/app/actions/inventory-transactions"
import { Loader2, AlertTriangle, Package, ShoppingCart, Wrench } from "lucide-react"
import Link from "next/link"

interface Product {
  id: string
  name: string
  category: string
  stock_quantity: number
  min_stock_level: number
  reorder_quantity: number
  image_url: string | null
}

export default function ClientInventoryAlerts() {
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAlerts() {
      setIsLoading(true)
      setError(null)

      try {
        const result = await getLowStockProducts()

        if (result.error) {
          setError(result.error)
        } else if (result.products) {
          setLowStockProducts(result.products)
        }
      } catch (error: any) {
        setError(error.message || "Failed to load inventory alerts")
      } finally {
        setIsLoading(false)
      }
    }

    fetchAlerts()
  }, [])

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "parts":
        return <Wrench className="h-4 w-4" />
      case "consumables":
        return <ShoppingCart className="h-4 w-4" />
      case "equipment":
        return <Package className="h-4 w-4" />
      default:
        return <Package className="h-4 w-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading inventory alerts...</span>
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

  if (lowStockProducts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
              <Package className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Low Stock Alerts</h3>
            <p className="text-muted-foreground mb-4">All your inventory items are above their minimum stock levels.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Alert className="bg-amber-50 border-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle>Low Stock Alert</AlertTitle>
        <AlertDescription>
          {lowStockProducts.length} {lowStockProducts.length === 1 ? "item" : "items"} below minimum stock level
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lowStockProducts.map((product) => (
          <Card key={product.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between">
                <Badge variant="outline" className="capitalize flex items-center">
                  {getCategoryIcon(product.category)}
                  <span className="ml-1">{product.category}</span>
                </Badge>
                <Badge variant="destructive">Low Stock</Badge>
              </div>
              <CardTitle className="mt-2 text-lg">{product.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current Stock:</span>
                  <span className="font-medium text-red-500">{product.stock_quantity}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Minimum Level:</span>
                  <span>{product.min_stock_level}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reorder Quantity:</span>
                  <span>{product.reorder_quantity}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <div className="w-full grid grid-cols-2 gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/products/${product.id}`}>View Details</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href={`/products/${product.id}/adjust`}>Add Stock</Link>
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}

