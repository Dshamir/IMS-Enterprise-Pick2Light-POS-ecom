"use client"

import { useState, useCallback } from "react"
import { SearchBar } from "./components/search-bar"
import { ItemCard } from "./components/item-card"
import { Package, Search as SearchIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface LEDSegment {
  id: string
  wled_device_id: string
  start_led: number
  led_count: number
  location_color: string
  location_behavior: string
  device_name: string
  ip_address: string
  total_leds: number
  status: string
  signal_strength: number | null
  last_seen: string | null
}

interface Product {
  id: string
  name: string
  description: string | null
  part_number: string | null
  barcode: string | null
  price: number
  stock_quantity: number
  min_stock_level: number
  max_stock_level: number
  category_id: string | null
  category_name: string | null
  Location: string | null
  created_at: string
  led_segment_count: number
  led_segments: LEDSegment[]
  image_url?: string | null
}

export default function Pick2LightPage() {
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [completedSearchQuery, setCompletedSearchQuery] = useState("")
  const [searchMode, setSearchMode] = useState<'text' | 'barcode' | 'image'>('text')
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null)

  // Handle text search
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query)
    setSearchMode('text')
    setDetectedBarcode(null)

    if (!query || query.trim() === '') {
      setProducts([])
      setHasSearched(false)
      setCompletedSearchQuery("")
      return
    }

    setIsSearching(true)
    setHasSearched(true)

    try {
      const response = await fetch(`/api/pick2light/search?q=${encodeURIComponent(query)}`)

      if (response.ok) {
        const data = await response.json()
        setProducts(data.results)
        setCompletedSearchQuery(query)

        if (data.count === 0) {
          toast({
            title: "No Results",
            description: "No products found matching your search"
          })
        }
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Search Error",
          description: error.error || "Failed to search products"
        })
        setProducts([])
        setCompletedSearchQuery(query)
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Unable to connect to server"
      })
      setProducts([])
      setCompletedSearchQuery(query)
    } finally {
      setIsSearching(false)
    }
  }, [toast])

  // Handle barcode search
  const handleBarcodeSearch = useCallback(async (file: File) => {
    setSearchMode('barcode')
    setIsSearching(true)
    setHasSearched(true)
    setDetectedBarcode(null)

    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('/api/pick2light/search-by-barcode', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setProducts(data.results)
        setDetectedBarcode(data.detectedBarcode || null)
        setCompletedSearchQuery(data.detectedBarcode ? `Barcode: ${data.detectedBarcode}` : 'Barcode scan')

        if (data.count === 0) {
          toast({
            title: "No Products Found",
            description: data.detectedBarcode
              ? `No products found with barcode: ${data.detectedBarcode}`
              : "No barcode detected in the image"
          })
        } else {
          toast({
            title: "Barcode Detected",
            description: `Found ${data.count} product${data.count > 1 ? 's' : ''} with barcode: ${data.detectedBarcode}`
          })
        }
      } else {
        toast({
          variant: "destructive",
          title: "Barcode Search Failed",
          description: data.error || "Failed to detect barcode"
        })
        setProducts([])
        setCompletedSearchQuery('Barcode scan failed')
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Unable to process barcode image"
      })
      setProducts([])
      setCompletedSearchQuery('Barcode scan error')
    } finally {
      setIsSearching(false)
    }
  }, [toast])

  // Handle image search
  const handleImageSearch = useCallback(async (file: File) => {
    setSearchMode('image')
    setIsSearching(true)
    setHasSearched(true)
    setDetectedBarcode(null)

    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('/api/pick2light/search-by-image', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setProducts(data.results)
        setCompletedSearchQuery(`Image search (${data.searchMethod})`)

        if (data.count === 0) {
          toast({
            title: "No Similar Products",
            description: "No visually similar products found"
          })
        } else {
          toast({
            title: "Similar Products Found",
            description: `Found ${data.count} visually similar product${data.count > 1 ? 's' : ''}`
          })
        }
      } else {
        toast({
          variant: "destructive",
          title: "Image Search Failed",
          description: data.error || "Failed to search by image"
        })
        setProducts([])
        setCompletedSearchQuery('Image search failed')
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Unable to process search image"
      })
      setProducts([])
      setCompletedSearchQuery('Image search error')
    } finally {
      setIsSearching(false)
    }
  }, [toast])

  // Handle stock change from ItemCard
  const handleStockChange = useCallback((productId: string, newQuantity: number) => {
    setProducts(prevProducts =>
      prevProducts.map(product =>
        product.id === productId
          ? { ...product, stock_quantity: newQuantity }
          : product
      )
    )
  }, [])

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Header */}
      <div className="bg-[#1a1a1a] border-b border-[#212529] sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-[#ffd60a] p-2 rounded-lg">
              <Package className="h-6 w-6 text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Pick2Light Search</h1>
              <p className="text-gray-400 text-sm">Locate inventory with LED indicators</p>
            </div>
          </div>

          {/* Search Bar */}
          <SearchBar
            onSearch={handleSearch}
            onBarcodeSearch={handleBarcodeSearch}
            onImageSearch={handleImageSearch}
            isSearching={isSearching}
          />
        </div>
      </div>

      {/* Results Section */}
      <div className="container mx-auto px-4 py-6">
        {/* Results Count */}
        {hasSearched && (
          <div className="mb-4 text-sm text-gray-400">
            {isSearching ? (
              <span>Searching...</span>
            ) : (
              <span>
                Found <span className="text-white font-semibold">{products.length}</span> product{products.length !== 1 ? 's' : ''}
                {completedSearchQuery && <span> for "{completedSearchQuery}"</span>}
              </span>
            )}
          </div>
        )}

        {/* Product Grid */}
        {products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <ItemCard
                key={product.id}
                product={product}
                onStockChange={handleStockChange}
              />
            ))}
          </div>
        ) : hasSearched && !isSearching ? (
          // Empty State
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-[#1a1a1a] border-2 border-dashed border-[#212529] rounded-lg p-12 max-w-md">
              <SearchIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-300 mb-2">
                No Products Found
              </h3>
              <p className="text-gray-500 text-sm">
                Try searching with a different term or check your spelling
              </p>
            </div>
          </div>
        ) : (
          // Initial State
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-[#1a1a1a] border-2 border-[#212529] rounded-lg p-12 max-w-md">
              <Package className="h-16 w-16 text-[#ffd60a] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Start Searching
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Search for products by text, barcode/QR code, or upload a product image
              </p>
              <div className="bg-[#212529] rounded-md p-4 text-left text-xs text-gray-400 space-y-2">
                <div className="flex items-start space-x-2">
                  <span className="text-[#ffd60a]">•</span>
                  <span>Type to search by name, part number, barcode, manufacturer, or location</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-[#ffd60a]">•</span>
                  <span>Use camera or upload to scan barcodes/QR codes</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-[#ffd60a]">•</span>
                  <span>Upload product images to find visually similar items</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-[#ffd60a]">•</span>
                  <span>Click +1/-1 to adjust stock, Locate to trigger LEDs</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
