"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ProductList from "@/components/product-list"
import { UniversalCamera } from "@/components/universal-camera"
import { useIsMobile } from "@/hooks/use-mobile"
import { 
  Search, 
  Camera, 
  Loader2, 
  ImageIcon,
  Type,
  Sparkles
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function EnhancedSearchPage() {
  const [textQuery, setTextQuery] = useState("")
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [searchType, setSearchType] = useState<'text' | 'image' | null>(null)
  const [searchMethod, setSearchMethod] = useState<string>('')
  const isMobile = useIsMobile()

  // Text search function
  const handleTextSearch = useCallback(async (query: string) => {
    if (!query.trim()) return

    setIsLoading(true)
    setError(null)
    setSearchType('text')

    try {
      const response = await fetch(`/api/products?query=${encodeURIComponent(query)}`)
      
      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setProducts(data.products || [])
      setSearchMethod(data.searchMethod || 'traditional')
    } catch (err: any) {
      console.error('Text search error:', err)
      setError('Search failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Image search function
  const handleImageSearch = useCallback(async (file: File) => {
    setIsLoading(true)
    setError(null)
    setSearchType('image')
    setShowCamera(false)

    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('/api/search/image', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Image search failed')
      }

      const data = await response.json()
      setProducts(data.products || [])
      setSearchMethod(data.searchMethod || 'traditional')
    } catch (err: any) {
      console.error('Image search error:', err)
      setError('Image search failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleTextSearch(textQuery)
  }

  const clearResults = () => {
    setProducts([])
    setTextQuery("")
    setSearchType(null)
    setSearchMethod('')
    setError(null)
  }

  return (
    <div className="container mx-auto md:max-w-none md:w-[90%] py-4 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Search Products</h1>
        <p className="text-muted-foreground">
          Find products by typing keywords or taking a photo
        </p>
      </div>

      {showCamera ? (
        <div className="mb-6">
          <UniversalCamera
            onCapture={handleImageSearch}
            onClose={() => setShowCamera(false)}
            mode="photo"
          />
        </div>
      ) : (
        <Card className="mb-6">
          <CardContent className="p-6">
            <Tabs defaultValue="text" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="text" className="flex items-center">
                  <Type className="h-4 w-4 mr-2" />
                  Text Search
                </TabsTrigger>
                <TabsTrigger value="image" className="flex items-center">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Image Search
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Search products by name, description, or category..."
                      value={textQuery}
                      onChange={(e) => setTextQuery(e.target.value)}
                      className="flex-1 h-12 text-base"
                    />
                    <Button 
                      type="submit" 
                      disabled={isLoading || !textQuery.trim()}
                      size="lg"
                      className="px-6"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    Try searching for: "red tool", "safety equipment", "electronics", etc.
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="image">
                <div className="text-center space-y-4">
                  <div className="mb-4">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Visual Search</h3>
                    <p className="text-sm text-muted-foreground">
                      Take a photo or upload an image to find similar products
                    </p>
                  </div>

                  <Button
                    onClick={() => setShowCamera(true)}
                    size="lg"
                    className="w-full max-w-sm h-12"
                    disabled={isLoading}
                  >
                    <Camera className="h-5 w-5 mr-2" />
                    {isMobile ? 'Take Photo' : 'Open Camera'}
                  </Button>

                  <div className="text-sm text-muted-foreground">
                    Works best with clear, well-lit product images
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">
            {searchType === 'image' ? 'Analyzing image...' : 'Searching...'}
          </span>
        </div>
      )}

      {products.length > 0 && !isLoading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-semibold">
                Search Results ({products.length})
              </h2>
              {searchMethod === 'vector' && (
                <div className="flex items-center text-sm text-primary">
                  <Sparkles className="h-4 w-4 mr-1" />
                  Smart Search
                </div>
              )}
            </div>
            <Button variant="outline" onClick={clearResults}>
              Clear Results
            </Button>
          </div>
          
          <ProductList products={products} />
        </div>
      )}

      {products.length === 0 && !isLoading && searchType && (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            {searchType === 'image' 
              ? 'No similar products found. Try a different image or adjust the lighting.'
              : 'No products found matching your search. Try different keywords.'
            }
          </div>
          <Button variant="outline" onClick={clearResults}>
            Try Another Search
          </Button>
        </div>
      )}

      {!searchType && !isLoading && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            Use the search options above to find products in your inventory
          </div>
        </div>
      )}
    </div>
  )
}