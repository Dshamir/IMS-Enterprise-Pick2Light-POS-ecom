"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import SearchBar from "./search-bar"
import { AlertCircle, ThumbsDown, ImageIcon, Grid3X3, List, ArrowUpDown, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Check, X, Edit3, Plus } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getImageDominantColor, getColorDistance, generateImageHash } from "@/lib/image-utils"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { useRouter } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { updateProduct } from "@/app/actions/products"
import { CategoryModal } from "./category-modal"
import { UnitModal } from "./unit-modal"

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  stock_quantity: number
  min_stock_level: number
  max_stock_level: number
  reorder_quantity: number
  image_url: string | null
  created_at: string
  category: string
  barcode?: string | null
  mfgname?: string | null
  mfgnum?: string | null
  Location?: string | null
  loc_tag?: string | null
  distributor?: string | null
  Product_url_1?: string | null
  Product_url_2?: string | null
  Product_url_3?: string | null
  unit_id?: string | null
  unit_name?: string | null
  unit_symbol?: string | null
  similarity?: number
  images?: { image_url: string; is_primary: boolean }[]
}

interface ProductListProps {
  initialProducts?: Product[]
  category?: string
}

export default function ProductList({ initialProducts = [], category }: ProductListProps) {
  const [allProducts, setAllProducts] = useState<Product[]>(initialProducts)
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [isLoading, setIsLoading] = useState(initialProducts.length === 0)
  const [error, setError] = useState<string | null>(null)
  const [searchMessage, setSearchMessage] = useState<string | null>(null)
  const [currentSearchImageHash, setCurrentSearchImageHash] = useState<string | null>(null)
  const [isImageSearch, setIsImageSearch] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<string>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([])
  const [editingCell, setEditingCell] = useState<{productId: string, field: string} | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [units, setUnits] = useState<any[]>([])
  const [isLoadingUnits, setIsLoadingUnits] = useState(true)
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const sortProducts = (productsToSort: Product[]) => {
    return [...productsToSort].sort((a, b) => {
      let aValue: any = a[sortBy as keyof Product]
      let bValue: any = b[sortBy as keyof Product]

      // Handle null/undefined values
      if (aValue == null) aValue = ''
      if (bValue == null) bValue = ''

      // Convert to lowercase for string comparison
      if (typeof aValue === 'string') aValue = aValue.toLowerCase()
      if (typeof bValue === 'string') bValue = bValue.toLowerCase()

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })
  }

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const getSortIcon = (field: string) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="h-4 w-4" />
    }
    return sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  const startEdit = (productId: string, field: string, currentValue: any) => {
    setEditingCell({ productId, field })
    setEditValue(currentValue?.toString() || '')
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
    setIsSaving(false)
  }

  const saveEdit = async () => {
    if (!editingCell || isSaving) return

    setIsSaving(true)
    try {
      const updateData: any = {}
      
      // Convert value based on field type
      if (editingCell.field === 'price' || editingCell.field === 'stock_quantity') {
        const numValue = parseFloat(editValue)
        if (isNaN(numValue)) {
          toast({
            title: "Invalid value",
            description: "Please enter a valid number",
            variant: "destructive",
            duration: 3000,
          })
          setIsSaving(false)
          return
        }
        updateData[editingCell.field] = numValue
      } else {
        updateData[editingCell.field] = editValue
      }

      const result = await updateProduct(editingCell.productId, updateData)
      
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
          duration: 5000,
        })
      } else {
        // Update the local state
        setProducts(prevProducts => 
          prevProducts.map(product => 
            product.id === editingCell.productId 
              ? { ...product, ...updateData }
              : product
          )
        )
        setAllProducts(prevProducts => 
          prevProducts.map(product => 
            product.id === editingCell.productId 
              ? { ...product, ...updateData }
              : product
          )
        )
        
        toast({
          title: "Success",
          description: "Product updated successfully",
          duration: 3000,
        })
        
        cancelEdit()
      }
    } catch (error) {
      console.error('Error updating product:', error)
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const renderEditableCell = (product: Product, field: keyof Product, value: any) => {
    const isEditing = editingCell?.productId === product.id && editingCell?.field === field
    const isFieldEditable = ['name', 'barcode', 'mfgname', 'mfgnum', 'Location', 'price', 'stock_quantity', 'distributor', 'category', 'unit_id'].includes(field as string)
    
    if (!isFieldEditable) {
      return <span>{value || '-'}</span>
    }

    if (isEditing) {
      // Special handling for category field
      if (field === 'category') {
        return (
          <div className="flex items-center gap-2 min-w-[200px]">
            <Select 
              value={editValue} 
              onValueChange={setEditValue}
              disabled={isLoadingCategories || isSaving}
            >
              <SelectTrigger className="h-8 text-sm flex-1">
                <SelectValue placeholder={isLoadingCategories ? "Loading..." : "Select a category"} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.name} value={category.name}>
                    {category.name.charAt(0).toUpperCase() + category.name.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsCategoryModalOpen(true)}
              disabled={isSaving}
              className="h-6 w-6 p-0"
              title="Add new category"
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={saveEdit}
              disabled={isSaving}
              className="h-6 w-6 p-0"
            >
              <Check className="h-3 w-3 text-green-600" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={cancelEdit}
              disabled={isSaving}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3 text-red-600" />
            </Button>
          </div>
        )
      }

      // Special handling for unit_id field
      if (field === 'unit_id') {
        const selectedUnit = units.find(unit => unit.id === editValue)
        return (
          <div className="flex items-center gap-2 min-w-[200px]">
            <Select 
              value={editValue} 
              onValueChange={setEditValue}
              disabled={isLoadingUnits || isSaving}
            >
              <SelectTrigger className="h-8 text-sm flex-1">
                <SelectValue placeholder={isLoadingUnits ? "Loading..." : "Select a unit"}>
                  {selectedUnit ? `${selectedUnit.display_name} (${selectedUnit.symbol})` : "Select a unit"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.display_name} ({unit.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsUnitModalOpen(true)}
              disabled={isSaving}
              className="h-6 w-6 p-0"
              title="Add new unit"
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={saveEdit}
              disabled={isSaving}
              className="h-6 w-6 p-0"
            >
              <Check className="h-3 w-3 text-green-600" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={cancelEdit}
              disabled={isSaving}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3 text-red-600" />
            </Button>
          </div>
        )
      }

      // Default input for other fields
      return (
        <div className="flex items-center gap-2">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit()
              if (e.key === 'Escape') cancelEdit()
            }}
            className="h-8 text-sm"
            autoFocus
            disabled={isSaving}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={saveEdit}
            disabled={isSaving}
            className="h-6 w-6 p-0"
          >
            <Check className="h-3 w-3 text-green-600" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={cancelEdit}
            disabled={isSaving}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3 text-red-600" />
          </Button>
        </div>
      )
    }

    return (
      <div 
        className="flex items-center gap-2 group cursor-pointer hover:bg-muted/30 rounded px-2 py-1 -mx-2 -my-1"
        onClick={(e) => {
          e.stopPropagation()
          startEdit(product.id, field as string, value)
        }}
      >
        {field === 'category' ? (
          <Badge className="capitalize flex-1">{value || '-'}</Badge>
        ) : field === 'unit_id' ? (
          <Badge className="capitalize flex-1">{product.unit_name ? `${product.unit_name} (${product.unit_symbol})` : value || '-'}</Badge>
        ) : (
          <span className="flex-1">{value || '-'}</span>
        )}
        <Edit3 className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
      </div>
    )
  }

  const fetchProducts = async (searchQuery = "") => {
    setIsLoading(true)
    setError(null)
    setSearchMessage(null)
    setIsImageSearch(false)
    setCurrentSearchImageHash(null)

    try {
      // Build query parameters
      const params = new URLSearchParams()
      
      if (category) {
        params.append('category', category)
      }
      
      if (searchQuery && searchQuery.trim()) {
        params.append('query', searchQuery.trim())
      }

      // Use the API route instead of direct Supabase calls
      const response = await fetch(`/api/products?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }

      const processedData = result.products || []
      setAllProducts(processedData)
      setProducts(sortProducts(processedData))
      setCurrentPage(1)

      if (searchQuery && processedData.length === 0) {
        setSearchMessage(`No products found matching "${searchQuery}"`)
      } else if (searchQuery) {
        setSearchMessage(`Found ${processedData.length} products matching "${searchQuery}"`)
      }
    } catch (err: any) {
      console.error("Error fetching products:", err)
      setError("Error loading products. Please try again later.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageSearch = async (file: File) => {
    setIsLoading(true)
    setError(null)
    setSearchMessage(null)
    setIsImageSearch(true)

    try {
      const formData = new FormData()
      formData.append("image", file)

      // Add category to search if specified
      if (category) {
        formData.append("category", category)
      }

      const response = await fetch("/api/search/image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to perform image search")
      }

      const data = await response.json()

      // Store the search image hash for feedback
      setCurrentSearchImageHash(data.searchImageHash || generateImageHash(file))

      // Create a URL for the uploaded image
      const searchImageUrl = URL.createObjectURL(file)

      // Get the dominant color of the search image
      const searchImageColor = await getImageDominantColor(searchImageUrl)

      // Process all products to find similar images
      const productsWithSimilarity = await Promise.all(
        data.products.map(async (product: Product) => {
          if (!product.image_url) return { ...product, similarity: 0 }

          try {
            const productColor = await getImageDominantColor(product.image_url)
            const colorDistance = getColorDistance(searchImageColor, productColor)
            const similarity = Math.max(0, 1 - colorDistance / 255)
            return { ...product, similarity }
          } catch (err) {
            console.error(`Error processing image for product ${product.id}:`, err)
            return { ...product, similarity: 0 }
          }
        }),
      )

      // Sort by similarity (highest first) and filter for >75% similarity
      const sortedProducts = productsWithSimilarity
        .filter((product) => (product.similarity as number) >= 0.75) // Only keep products with 75% or higher similarity
        .sort((a, b) => (b.similarity as number) - (a.similarity as number))

      // Update the message to reflect the filtering
      const filteredCount = sortedProducts.length
      const totalCount = productsWithSimilarity.length

      setAllProducts(sortedProducts)
      setProducts(sortProducts(sortedProducts))
      setCurrentPage(1)
      setSearchMessage(
        filteredCount > 0
          ? `Found ${filteredCount} products with at least 75% similarity`
          : `No products with at least 75% similarity found (${totalCount} below threshold)`,
      )

      // Clean up the object URL
      URL.revokeObjectURL(searchImageUrl)
    } catch (err) {
      setError("Error performing image search. Please try again.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFeedback = async (productId: string) => {
    if (!currentSearchImageHash || !isImageSearch) {
      toast({
        title: "Cannot submit feedback",
        description: "Feedback is only available for image search results",
        type: "error",
        duration: 3000,
      })
      return
    }

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: productId,
          search_image_hash: currentSearchImageHash,
          feedback_type: "irrelevant",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit feedback")
      }

      // Remove the product from the current results
      setProducts(products.filter((p) => p.id !== productId))

      toast({
        title: "Feedback submitted",
        description: "This product won't appear in similar searches",
        type: "success",
        duration: 3000,
      })
    } catch (error) {
      console.error("Error submitting feedback:", error)
      toast({
        title: "Error",
        description: "Failed to submit feedback",
        type: "error",
        duration: 5000,
      })
    }
  }

  const loadCategories = async () => {
    try {
      setIsLoadingCategories(true)
      const response = await fetch("/api/categories")
      const data = await response.json()
      
      if (response.ok) {
        setCategories(data.categories || [])
      } else {
        // Fallback to hardcoded categories if API fails
        console.error("Failed to load categories:", data.error)
        toast({
          variant: "destructive",
          title: "Warning",
          description: "Failed to load dynamic categories, using defaults",
        })
        setCategories(getDefaultCategories())
      }
    } catch (error) {
      console.error("Error loading categories:", error)
      // Fallback to hardcoded categories
      setCategories(getDefaultCategories())
      toast({
        variant: "destructive",
        title: "Warning", 
        description: "Failed to load dynamic categories, using defaults",
      })
    } finally {
      setIsLoadingCategories(false)
    }
  }

  const getDefaultCategories = () => [
    { name: 'equipment' },
    { name: 'parts' },
    { name: 'consumables' },
    { name: 'tools' },
    { name: 'safety' },
    { name: 'maintenance' },
    { name: 'other' }
  ]

  const handleCategoryCreated = (newCategory: any) => {
    setCategories(prev => [...prev, newCategory])
    setEditValue(newCategory.name)
    toast({
      title: "Success",
      description: `Category "${newCategory.name}" created and selected!`,
    })
  }

  const handleUnitCreated = (newUnit: any) => {
    setUnits(prev => [...prev, newUnit])
    setEditValue(newUnit.id)
    toast({
      title: "Success",
      description: `Unit "${newUnit.display_name}" created and selected!`,
    })
  }

  const loadUnits = async () => {
    try {
      setIsLoadingUnits(true)
      const response = await fetch("/api/units")
      const data = await response.json()
      
      if (response.ok) {
        setUnits(data.units || [])
      } else {
        console.error("Failed to load units:", data.error)
        toast({
          variant: "destructive",
          title: "Warning",
          description: "Failed to load units",
        })
      }
    } catch (error) {
      console.error("Error loading units:", error)
      toast({
        variant: "destructive",
        title: "Warning", 
        description: "Failed to load units",
      })
    } finally {
      setIsLoadingUnits(false)
    }
  }

  useEffect(() => {
    loadCategories()
    loadUnits()
  }, [])

  useEffect(() => {
    if (initialProducts.length === 0) {
      fetchProducts()
    } else {
      setAllProducts(initialProducts)
      setProducts(sortProducts(initialProducts))
    }
  }, [])

  // Re-sort when sort options change
  useEffect(() => {
    setProducts(currentProducts => sortProducts(currentProducts))
  }, [sortBy, sortOrder])

  // Calculate pagination
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    setDisplayedProducts(products.slice(startIndex, endIndex))
  }, [products, currentPage, itemsPerPage])

  const totalPages = Math.ceil(products.length / itemsPerPage)
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, products.length)

  const renderProductList = () => {
    if (isLoading) {
      return (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      )
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )
    }

    if (products.length === 0) {
      return (
        <div className="text-center py-8 border rounded-lg">
          <p className="text-muted-foreground">No products found. Add some products to get started!</p>
        </div>
      )
    }

    return (
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-2">
                  Name
                  {getSortIcon('name')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('barcode')}
              >
                <div className="flex items-center gap-2">
                  Barcode
                  {getSortIcon('barcode')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('mfgname')}
              >
                <div className="flex items-center gap-2">
                  Manufacturer
                  {getSortIcon('mfgname')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('mfgnum')}
              >
                <div className="flex items-center gap-2">
                  Part Number
                  {getSortIcon('mfgnum')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('Location')}
              >
                <div className="flex items-center gap-2">
                  Location
                  {getSortIcon('Location')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('price')}
              >
                <div className="flex items-center gap-2">
                  Price
                  {getSortIcon('price')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('stock_quantity')}
              >
                <div className="flex items-center gap-2">
                  Stock
                  {getSortIcon('stock_quantity')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center gap-2">
                  Category
                  {getSortIcon('category')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('unit_name')}
              >
                <div className="flex items-center gap-2">
                  Unit
                  {getSortIcon('unit_name')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('distributor')}
              >
                <div className="flex items-center gap-2">
                  Distributor
                  {getSortIcon('distributor')}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedProducts.map((product) => (
              <TableRow 
                key={product.id} 
                className="hover:bg-muted/30"
              >
                <TableCell 
                  className="cursor-pointer"
                  onClick={() => router.push(`/products/${product.id}`)}
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-md overflow-hidden">
                    {(product.images && product.images.length > 0) ? (
                      <img
                        src={product.images[0].image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {renderEditableCell(product, 'name', product.name)}
                    </div>
                    <div 
                      className="text-sm text-muted-foreground line-clamp-1 cursor-pointer"
                      onClick={() => router.push(`/products/${product.id}`)}
                    >
                      {product.description || "No description"}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {renderEditableCell(product, 'barcode', product.barcode)}
                </TableCell>
                <TableCell>
                  {renderEditableCell(product, 'mfgname', product.mfgname)}
                </TableCell>
                <TableCell>
                  {renderEditableCell(product, 'mfgnum', product.mfgnum)}
                </TableCell>
                <TableCell>
                  <div>
                    <div>{renderEditableCell(product, 'Location', product.Location)}</div>
                    {product.loc_tag && (
                      <div 
                        className="text-sm text-muted-foreground cursor-pointer"
                        onClick={() => router.push(`/products/${product.id}`)}
                      >
                        {product.loc_tag}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <span>$</span>
                    {renderEditableCell(product, 'price', product.price.toFixed(2))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {renderEditableCell(product, 'stock_quantity', product.stock_quantity)}
                    <Badge variant={product.stock_quantity > 0 ? "default" : "destructive"} className="ml-2">
                      {product.stock_quantity > 0 ? "In Stock" : "Out"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  {renderEditableCell(product, 'category', product.category)}
                </TableCell>
                <TableCell>
                  {renderEditableCell(product, 'unit_id', product.unit_id)}
                </TableCell>
                <TableCell>
                  {renderEditableCell(product, 'distributor', product.distributor)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  const renderProductGrid = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="p-0">
                <Skeleton className="h-48 w-full rounded-none" />
              </CardHeader>
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )
    }

    if (products.length === 0) {
      return (
        <div className="text-center py-8 border rounded-lg">
          <p className="text-muted-foreground">No products found. Add some products to get started!</p>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedProducts.map((product) => (
          <Card
            key={product.id}
            className="overflow-hidden h-full flex flex-col cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push(`/products/${product.id}`)}
          >
            <div className="relative pb-[56.25%] bg-gray-100">
              {(product.images && product.images.length > 0) ? (
                <img
                  src={product.images[0].image_url || "/placeholder.svg"}
                  alt={product.name}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
              ) : product.image_url ? (
                <img
                  src={product.image_url || "/placeholder.svg"}
                  alt={product.name}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                  <span className="text-gray-400">No image</span>
                </div>
              )}

              {/* Multiple images indicator */}
              {product.images && product.images.length > 1 && (
                <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full flex items-center">
                  <ImageIcon className="h-3 w-3 mr-1" />
                  {product.images.length}
                </div>
              )}

              {/* Category badge */}
              <div className="absolute top-2 right-2">
                <Badge className="capitalize">{product.category}</Badge>
              </div>

              {isImageSearch && product.similarity !== undefined && product.similarity > 0 && (
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">
                  {Math.round(product.similarity * 100)}% match
                </div>
              )}

              {/* Feedback button - only show for image search results */}
              {isImageSearch && (
                <div
                  className="absolute bottom-2 right-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleFeedback(product.id)
                  }}
                >
                  <Button variant="outline" size="sm" className="bg-white bg-opacity-70 hover:bg-opacity-100">
                    <ThumbsDown className="h-4 w-4 text-red-500 mr-1" />
                    <span className="text-xs">Not relevant</span>
                  </Button>
                </div>
              )}
            </div>
            <CardHeader>
              <CardTitle className="line-clamp-1">{product.name}</CardTitle>
              <CardDescription className="line-clamp-2">
                {product.description || "No description available"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">${product.price.toFixed(2)}</span>
                <Badge variant={product.stock_quantity > 0 ? "default" : "destructive"}>
                  {product.stock_quantity > 0 ? `In Stock: ${product.stock_quantity}` : "Out of Stock"}
                </Badge>
              </div>
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground border-t pt-4">
              Added on {new Date(product.created_at).toLocaleDateString()}
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <SearchBar onSearch={fetchProducts} onImageSearch={handleImageSearch} category={category} />

      {searchMessage && (
        <Alert>
          <AlertDescription>{searchMessage}</AlertDescription>
        </Alert>
      )}

      {/* View and Sort Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">View:</span>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4 mr-2" />
            Grid
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Sort by:</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="price">Price</SelectItem>
              <SelectItem value="stock_quantity">Stock Quantity</SelectItem>
              <SelectItem value="category">Category</SelectItem>
              <SelectItem value="mfgname">Manufacturer</SelectItem>
              <SelectItem value="Location">Location</SelectItem>
              <SelectItem value="created_at">Date Added</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            <ArrowUpDown className="h-4 w-4 mr-2" />
            {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
          </Button>
        </div>
      </div>

      {/* Results summary and items per page */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="text-sm text-muted-foreground">
          Showing {products.length > 0 ? startItem : 0} to {endItem} of {products.length} products
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Items per page:</span>
          <Select value={itemsPerPage.toString()} onValueChange={(value) => {
            setItemsPerPage(Number(value))
            setCurrentPage(1)
          }}>
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {viewMode === 'grid' ? renderProductGrid() : renderProductList()}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              Page {currentPage} of {totalPages}
            </span>
            {totalPages <= 10 ? (
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1">
                {currentPage > 3 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      className="w-8 h-8 p-0"
                    >
                      1
                    </Button>
                    {currentPage > 4 && <span className="px-2">...</span>}
                  </>
                )}
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                  if (page > totalPages) return null
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  )
                }).filter(Boolean)}
                
                {currentPage < totalPages - 2 && (
                  <>
                    {currentPage < totalPages - 3 && <span className="px-2">...</span>}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      className="w-8 h-8 p-0"
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Last
            </Button>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <Toaster />

      {/* Category Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onOpenChange={setIsCategoryModalOpen}
        onCategoryCreated={handleCategoryCreated}
      />

      {/* Unit Modal */}
      <UnitModal
        isOpen={isUnitModalOpen}
        onOpenChange={setIsUnitModalOpen}
        onUnitCreated={handleUnitCreated}
      />
    </div>
  )
}

