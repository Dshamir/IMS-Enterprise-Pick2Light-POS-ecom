"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Loader2, Edit, ArrowLeft, Package, Plus, Minus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProductImageGallery } from "./product-image-gallery"
import { StockLevelManager } from "./stock-level-manager"
import { StockAdjustmentForm } from "./stock-adjustment-form"
import { TransactionHistory } from "./transaction-history"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import type { ProductImage } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"

interface ProductPageProps {
  productId: string
}

export function ClientProductPage({ productId }: ProductPageProps) {
  const router = useRouter()
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("details")
  const [productImages, setProductImages] = useState<ProductImage[]>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refreshData = () => {
    setRefreshKey((prev) => prev + 1)
  }

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true)
      setError(null)

      try {
        // Validate UUID format to prevent errors
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(productId)) {
          throw new Error("Invalid product ID format")
        }

        const supabase = createClientSupabaseClient()
        const { data, error } = await supabase.from("products").select("*").eq("id", productId).single()

        if (error) {
          throw error
        }

        if (!data) {
          throw new Error("Product not found")
        }

        setProduct(data)
        setSelectedImage(data.image_url)

        // Try to fetch product images
        try {
          const { data: imageData, error: imageError } = await supabase
            .from("product_images")
            .select("*")
            .eq("product_id", productId)
            .order("display_order", { ascending: true })

          if (!imageError && imageData) {
            setProductImages(imageData)
          }
        } catch (imageError) {
          // Silently handle image fetch errors
          console.log("Could not fetch product images")
        }
      } catch (err: any) {
        console.error("Error fetching product:", err)
        setError(err.message || "Failed to load product")
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [productId])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">{error}</p>
        <Button variant="outline" onClick={() => router.push("/products")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">Product not found</p>
        <Button variant="outline" onClick={() => router.push("/products")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" onClick={() => router.push("/products")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>
        <Button onClick={() => router.push(`/products/${productId}/edit`)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Product
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div className="space-y-4">
          {productImages.length > 0 ? (
            <>
              <div className="aspect-square relative rounded-lg overflow-hidden border">
                <Image
                  src={selectedImage || product.image_url || "/placeholder.svg?height=400&width=400"}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                  priority
                />
              </div>

              {productImages.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                  {productImages.map((image) => (
                    <div
                      key={image.id}
                      className={`aspect-square relative rounded-md overflow-hidden border cursor-pointer ${
                        selectedImage === image.image_url ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => setSelectedImage(image.image_url)}
                    >
                      <Image
                        src={image.image_url || "/placeholder.svg"}
                        alt={product.name}
                        fill
                        sizes="20vw"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="aspect-square relative rounded-lg overflow-hidden border">
              <Image
                src={product.image_url || "/placeholder.svg?height=400&width=400"}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            </div>
          )}
        </div>

        <div>
          <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
          <p className="text-2xl font-semibold text-primary mb-4">{formatCurrency(product.price)}</p>

          <div className="flex items-center mb-4">
            <Package className="mr-2 h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Stock: {product.stock_quantity} units</span>
          </div>

          {product.description && (
            <div className="mb-6">
              <h2 className="text-lg font-medium mb-2">Description</h2>
              <p className="text-muted-foreground">{product.description}</p>
            </div>
          )}

          <div className="mb-4">
            <h2 className="text-lg font-medium mb-2">Category</h2>
            <div className="inline-block bg-muted px-3 py-1 rounded-full text-sm">{product.category}</div>
          </div>

          <div className="flex space-x-2 mt-6">
            <Button variant="outline" className="flex-1" onClick={() => setActiveTab("stock")}>
              <Minus className="mr-2 h-4 w-4" />
              Reduce Stock
            </Button>
            <Button className="flex-1" onClick={() => setActiveTab("stock")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Stock
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
        <TabsList className="mb-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="stock">Inventory</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Product Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">ID</p>
                      <p className="font-mono text-xs">{product.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p>{new Date(product.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Updated</p>
                      <p>{new Date(product.updated_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Category</p>
                      <p>{product.category}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6">
                <StockLevelManager productId={productId} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <StockAdjustmentForm productId={productId} currentStock={product?.stock_quantity || 0} onComplete={refreshData} />
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardContent className="pt-6">
              <TransactionHistory key={refreshKey} productId={productId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images">
          <Card>
            <CardContent className="pt-6">
              <ProductImageGallery productId={productId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

