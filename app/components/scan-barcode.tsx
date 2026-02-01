"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { toast } from "sonner"
import { Camera, Loader2, Search, ArrowRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { BarcodeScanner } from "./barcode-scanner"
import { getProductByBarcode } from "../actions/products"
import { formatCurrency } from "@/lib/utils"
import { StockAdjustmentForm } from "./stock-adjustment-form"

export function ScanBarcode() {
  const router = useRouter()
  const [isScanning, setIsScanning] = useState(false)
  const [manualBarcode, setManualBarcode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [product, setProduct] = useState<any>(null)
  const [similarProducts, setSimilarProducts] = useState<any[]>([])
  const [showAdjustment, setShowAdjustment] = useState(false)

  const handleBarcodeDetected = async (barcode: string) => {
    setIsScanning(false)
    await lookupBarcode(barcode)
  }

  const handleSimilarProductsFound = (products: any[]) => {
    setIsScanning(false)
    setSimilarProducts(products)
    setProduct(null)
    toast.success(`Found ${products.length} similar products`)
  }

  const handleManualLookup = async () => {
    if (!manualBarcode.trim()) {
      toast.error("Please enter a barcode")
      return
    }

    await lookupBarcode(manualBarcode)
  }

  const lookupBarcode = async (barcode: string) => {
    const trimmedBarcode = barcode.trim()
    console.log('Looking up barcode:', trimmedBarcode)
    
    setIsLoading(true)
    setProduct(null)
    setSimilarProducts([])

    try {
      const result = await getProductByBarcode(trimmedBarcode)
      console.log('Barcode lookup result:', result)

      if (result.error) {
        console.error('Barcode lookup error:', result.error)
        toast.error(`Error: ${result.error}`)
        return
      }

      if (!result.product) {
        console.log('No product found for barcode:', trimmedBarcode)
        toast.error(`No product found with barcode: ${trimmedBarcode}`)
        return
      }

      console.log('Product found:', result.product)
      setProduct(result.product)
      toast.success(`Found: ${result.product.name}`)
    } catch (error: any) {
      console.error('Barcode lookup exception:', error)
      toast.error(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewProduct = () => {
    if (product) {
      router.push(`/products/${product.id}`)
    }
  }

  const handleAdjustStock = () => {
    setShowAdjustment(true)
  }

  const handleAdjustmentComplete = () => {
    setShowAdjustment(false)
    // Refresh product data
    if (product?.barcode) {
      lookupBarcode(product.barcode)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      {isScanning ? (
        <Card>
          <CardContent className="p-4">
            <BarcodeScanner 
              onDetected={handleBarcodeDetected} 
              onProductsFound={handleSimilarProductsFound}
              onClose={() => setIsScanning(false)} 
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Find Products</CardTitle>
              <CardDescription>Scan barcodes, upload images, or search by similarity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => setIsScanning(true)} className="w-full" size="lg">
                <Camera className="mr-2 h-5 w-5" />
                Start Camera Scanner
              </Button>

              <div className="relative mt-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or enter manually</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Enter barcode"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                  />
                </div>
                <Button onClick={handleManualLookup} disabled={isLoading} size="icon">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {isLoading && (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {product && !showAdjustment && (
            <Card>
              <CardHeader>
                <CardTitle>Product Found</CardTitle>
                <CardDescription>Barcode: {product.barcode}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-start space-x-4">
                  <div className="h-20 w-20 relative rounded overflow-hidden flex-shrink-0">
                    <Image
                      src={product.image_url || "/placeholder.svg?height=80&width=80"}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-medium">{product.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{product.category}</p>
                    <div className="flex items-center mt-1">
                      <span className="font-medium text-primary">{formatCurrency(product.price)}</span>
                      <span className="mx-2 text-muted-foreground">•</span>
                      <span className="text-sm">Stock: {product.stock_quantity}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-2">
                <div className="grid grid-cols-2 gap-2 w-full">
                  <Button variant="outline" onClick={handleViewProduct} className="w-full">
                    <ArrowRight className="mr-2 h-4 w-4" />
                    View Details
                  </Button>
                  <Button onClick={handleAdjustStock} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Adjust Stock
                  </Button>
                </div>
              </CardFooter>
            </Card>
          )}

          {product && showAdjustment && (
            <Card>
              <CardHeader>
                <CardTitle>Adjust Stock</CardTitle>
                <CardDescription>
                  {product.name} - Current stock: {product.stock_quantity}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StockAdjustmentForm productId={product.id} onComplete={handleAdjustmentComplete} compact={true} />
              </CardContent>
            </Card>
          )}

          {similarProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Similar Products Found</CardTitle>
                <CardDescription>
                  Found {similarProducts.length} products matching your image
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {similarProducts.map((similarProduct, index) => (
                    <div 
                      key={similarProduct.id} 
                      className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                      onClick={() => router.push(`/products/${similarProduct.id}`)}
                    >
                      <div className="h-12 w-12 relative rounded overflow-hidden flex-shrink-0">
                        <Image
                          src={similarProduct.image_url || "/placeholder.svg?height=48&width=48"}
                          alt={similarProduct.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{similarProduct.name}</h4>
                        <p className="text-xs text-muted-foreground">{similarProduct.category}</p>
                        <div className="flex items-center mt-1">
                          <span className="text-sm font-medium text-primary">{formatCurrency(similarProduct.price)}</span>
                          {similarProduct.similarity && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {Math.round(similarProduct.similarity * 100)}% match
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setSimilarProducts([])} 
                  className="w-full"
                >
                  Clear Results
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

