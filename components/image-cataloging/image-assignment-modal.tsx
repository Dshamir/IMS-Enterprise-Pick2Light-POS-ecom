"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Search, 
  Package, 
  Barcode as BarcodeIcon, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Eye
} from "lucide-react"

interface ProcessedImage {
  id: string
  filename: string
  url: string
  size: number
  uploadedAt: string
  status: 'processing' | 'processed' | 'assigned' | 'error'
  aiResults?: {
    objects: string[]
    extractedText: string
    description: string
    confidence: number
  }
  assignedProduct?: {
    id: string
    name: string
    barcode: string
  }
}

interface Product {
  id: string
  name: string
  barcode: string
  category: string
  description?: string
  image_url?: string
  stock_quantity: number
}

interface ImageAssignmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedImages: ProcessedImage[]
  onAssignmentComplete: (barcode: string) => void
}

export function ImageAssignmentModal({
  open,
  onOpenChange,
  selectedImages,
  onAssignmentComplete
}: ImageAssignmentModalProps) {
  const [barcode, setBarcode] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [foundProduct, setFoundProduct] = useState<Product | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<Product[]>([])

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setBarcode('')
      setSearchQuery('')
      setFoundProduct(null)
      setError(null)
      setSearchResults([])
    }
  }, [open])

  const searchProductByBarcode = async (barcodeValue: string) => {
    if (!barcodeValue.trim()) {
      setFoundProduct(null)
      setError(null)
      return
    }

    setIsSearching(true)
    setError(null)

    try {
      const response = await fetch(`/api/products?barcode=${encodeURIComponent(barcodeValue)}`)
      
      if (!response.ok) {
        throw new Error('Failed to search for product')
      }

      const data = await response.json()
      
      if (data.length > 0) {
        const product = data[0] // Take first match
        setFoundProduct({
          id: product.id,
          name: product.name,
          barcode: product.barcode,
          category: product.category,
          description: product.description,
          image_url: product.image_url,
          stock_quantity: product.stock_quantity
        })
        setError(null)
      } else {
        setFoundProduct(null)
        setError(`No product found with barcode: ${barcodeValue}`)
      }
    } catch (error) {
      console.error('Error searching for product:', error)
      setError('Failed to search for product. Please try again.')
      setFoundProduct(null)
    } finally {
      setIsSearching(false)
    }
  }

  const searchProductsByName = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)

    try {
      const response = await fetch(`/api/products?search=${encodeURIComponent(query)}`)
      
      if (!response.ok) {
        throw new Error('Failed to search products')
      }

      const data = await response.json()
      
      const results = data.map((product: any) => ({
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        category: product.category,
        description: product.description,
        image_url: product.image_url,
        stock_quantity: product.stock_quantity
      }))

      setSearchResults(results)
    } catch (error) {
      console.error('Error searching products:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleBarcodeChange = (value: string) => {
    setBarcode(value)
    searchProductByBarcode(value)
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    searchProductsByName(value)
  }

  const selectProduct = (product: Product) => {
    setFoundProduct(product)
    setBarcode(product.barcode)
    setSearchQuery('')
    setSearchResults([])
    setError(null)
  }

  const handleAssign = () => {
    if (!foundProduct) return
    onAssignmentComplete(foundProduct.barcode)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Images to Product</DialogTitle>
          <DialogDescription>
            Select a product to assign {selectedImages.length} selected image(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selected Images Preview */}
          <div>
            <h4 className="font-medium mb-3">Selected Images ({selectedImages.length})</h4>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {selectedImages.map(image => (
                <div key={image.id} className="space-y-1">
                  <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                    <img
                      src={image.url}
                      alt={image.filename}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-xs truncate" title={image.filename}>
                    {image.filename}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(image.size)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Product Search */}
          <div className="space-y-4">
            <h4 className="font-medium">Find Product</h4>
            
            {/* Barcode Search */}
            <div className="space-y-2">
              <Label htmlFor="barcode">Search by Barcode</Label>
              <div className="relative">
                <BarcodeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="barcode"
                  value={barcode}
                  onChange={(e) => handleBarcodeChange(e.target.value)}
                  placeholder="Enter product barcode..."
                  className="pl-10"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
                )}
              </div>
            </div>

            {/* Name Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Or Search by Name</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search products by name or category..."
                  className="pl-10"
                />
              </div>
              
              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="max-h-32 overflow-y-auto border rounded-lg">
                  {searchResults.map(product => (
                    <div
                      key={product.id}
                      className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                      onClick={() => selectProduct(product)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium">{product.name}</h5>
                          <p className="text-sm text-muted-foreground">
                            {product.category} • Stock: {product.stock_quantity}
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {product.barcode}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Found Product Display */}
          {foundProduct && (
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Product Found
              </h4>
              <div className="p-4 border rounded-lg bg-green-50">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                    {foundProduct.image_url ? (
                      <img
                        src={foundProduct.image_url}
                        alt={foundProduct.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-green-900">{foundProduct.name}</h3>
                    <div className="text-sm text-green-700 space-y-1">
                      <p>Barcode: {foundProduct.barcode}</p>
                      <p>Category: {foundProduct.category}</p>
                      <p>Stock: {foundProduct.stock_quantity} units</p>
                      {foundProduct.description && (
                        <p>Description: {foundProduct.description}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Confirmed
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={!foundProduct || isSearching}
          >
            <Package className="h-4 w-4 mr-2" />
            Assign {selectedImages.length} Image(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}