"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Edit, Trash, Loader2, Package, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import ProductImageGallery from "@/components/product-image-gallery"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Add an ID validation function for SQLite hex IDs
function isValidProductId(id: string) {
  // SQLite generates 32-character hex strings
  const hexRegex = /^[0-9a-f]{32}$/i
  return hexRegex.test(id)
}

interface ClientProductPageProps {
  id: string
}

export default function ClientProductPage({ id }: ClientProductPageProps) {
  const [product, setProduct] = useState<any>(null)
  const [images, setImages] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Modify the useEffect hook to check for valid UUID before fetching
  useEffect(() => {
    async function fetchProduct() {
      setIsLoading(true)
      setError(null)

      // Check if the ID is a valid product ID
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
        
        const productData = await response.json()
        
        if (productData.error) {
          throw new Error(productData.error)
        }

        setProduct(productData)

        // Prepare images array from the response
        const imageUrls: string[] = []

        // Add images from the API response
        if (productData.images && productData.images.length > 0) {
          productData.images.forEach((img: any) => {
            if (img.image_url) {
              imageUrls.push(img.image_url)
            }
          })
        }

        // If no images in the images array but there's an image_url, use that
        if (imageUrls.length === 0 && productData.image_url) {
          imageUrls.push(productData.image_url)
        }

        setImages(imageUrls)
      } catch (err) {
        console.error("Error fetching product:", err)
        setError("Failed to load product details. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProduct()
  }, [id, router])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete product')
      }

      // Redirect to products page after successful deletion
      router.push('/products')
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Failed to delete product. Please try again.')
    }
  }

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

  const isLowStock = product.min_stock_level > 0 && product.stock_quantity < product.min_stock_level

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Image Gallery */}
      <div>
        <ProductImageGallery images={images} />
      </div>

      {/* Product Details */}
      <div>
        <div className="flex items-start justify-between mb-4">
          <div>
            <Badge className="mb-2 capitalize">{product.category}</Badge>
            <h1 className="text-3xl font-bold">{product.name}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" asChild>
              <Link href={`/products/${id}/edit`}>
                <Edit className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="icon" className="text-red-500" onClick={handleDelete}>
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="text-3xl font-bold mb-4">${product.price.toFixed(2)}</div>

        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Inventory Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Current Stock:</span>
                <Badge variant={isLowStock ? "destructive" : product.stock_quantity > 0 ? "default" : "destructive"}>
                  {product.stock_quantity > 0 ? product.stock_quantity : "Out of Stock"}
                </Badge>
              </div>

              {product.min_stock_level > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Minimum Level:</span>
                  <span>{product.min_stock_level}</span>
                </div>
              )}

              {product.max_stock_level > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Maximum Level:</span>
                  <span>{product.max_stock_level}</span>
                </div>
              )}

              {isLowStock && (
                <div className="flex items-center text-red-500 text-sm mt-2">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  <span>Low stock alert</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Button asChild>
            <Link href={`/products/${id}/adjust`}>
              <Package className="h-4 w-4 mr-2" />
              Manage Stock
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/products/${id}/adjust?tab=history`}>View History</Link>
          </Button>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Description</h2>
          <p className="text-gray-700">{product.description || "No description available."}</p>
        </div>

        <div className="border-t pt-4 text-sm text-muted-foreground">
          <p>Added on {new Date(product.created_at).toLocaleDateString()}</p>
          <p>Last updated: {new Date(product.updated_at).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  )
}

