"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import StockAdjustmentForm from "@/components/stock-adjustment-form"
import StockLevelForm from "@/components/stock-level-form"
import TransactionHistory from "@/components/transaction-history"

// Add an ID validation function for SQLite hex IDs
function isValidProductId(id: string) {
  // SQLite generates 32-character hex strings
  const hexRegex = /^[0-9a-f]{32}$/i
  return hexRegex.test(id)
}

interface ClientStockAdjustmentPageProps {
  id: string
}

export default function ClientStockAdjustmentPage({ id }: ClientStockAdjustmentPageProps) {
  const [product, setProduct] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refreshData = () => {
    setRefreshKey((prev) => prev + 1)
  }

  useEffect(() => {
    async function fetchProduct() {
      setIsLoading(true)
      setError(null)

      // Validate product ID format
      if (!isValidProductId(id)) {
        setError("Invalid product ID")
        setIsLoading(false)
        return
      }

      try {
        // Use the API route instead of direct Supabase calls
        const response = await fetch(`/api/products/${id}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError("Product not found")
            setIsLoading(false)
            return
          }
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (data.error) {
          throw new Error(data.error)
        }

        setProduct(data)
      } catch (err: any) {
        console.error("Error fetching product:", err)
        setError(err.message || "Failed to load product details")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProduct()
  }, [id, refreshKey])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading product details...</span>
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

  if (!product) {
    return (
      <Alert className="mb-6">
        <AlertDescription>Product not found.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">{product.name}</h2>
        <p className="text-muted-foreground">Current Stock: {product.stock_quantity}</p>
      </div>

      <Tabs defaultValue="adjust" className="space-y-6">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="adjust">Adjust Stock</TabsTrigger>
          <TabsTrigger value="levels">Stock Levels</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="adjust" className="space-y-4">
          <StockAdjustmentForm productId={id} currentStock={product.stock_quantity} onComplete={refreshData} />
        </TabsContent>

        <TabsContent value="levels" className="space-y-4">
          <StockLevelForm
            productId={id}
            initialMinLevel={product.min_stock_level || 0}
            initialMaxLevel={product.max_stock_level || 0}
            initialReorderQuantity={product.reorder_quantity || 0}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <TransactionHistory key={refreshKey} productId={id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

