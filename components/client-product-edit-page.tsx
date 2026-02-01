"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Camera, ImagePlus, X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { uploadProductImage } from "@/app/actions/upload-image"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { UniversalCamera } from "@/components/universal-camera"
import { useIsMobile } from "@/hooks/use-mobile"
import { CategoryModal } from "./category-modal"
import { UnitSelector } from "@/components/units/unit-selector"
import { LEDLocationSection } from "@/components/led/led-location-section"

// Add an ID validation function for SQLite hex IDs
function isValidProductId(id: string) {
  // SQLite generates 32-character hex strings
  const hexRegex = /^[0-9a-f]{32}$/i
  return hexRegex.test(id)
}

interface ClientProductEditPageProps {
  id: string
}

export default function ClientProductEditPage({ id }: ClientProductEditPageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [images, setImages] = useState<{ file: File; preview: string; id: string }[]>([])
  const [existingImages, setExistingImages] = useState<{ id: string; url: string; isPrimary: boolean }[]>([])
  const [showCamera, setShowCamera] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [ledSegments, setLedSegments] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { toast } = useToast()
  const isMobile = useIsMobile()

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    stock_quantity: "",
    category: "",
    unit_id: "",
    min_stock_level: "",
    max_stock_level: "",
    reorder_quantity: "",
    barcode: "",
    mfgname: "",
    mfgnum: "",
    Location: "",
    loc_tag: "",
    distributor: "",
    Product_url_1: "",
    Product_url_2: "",
    Product_url_3: "",
  })

  // Load categories on component mount
  useEffect(() => {
    loadCategories()
  }, [])

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
    setFormData(prev => ({ ...prev, category: newCategory.name }))
    toast({
      title: "Success",
      description: `Category "${newCategory.name}" created and selected!`,
    })
  }

  useEffect(() => {
    async function fetchProduct() {
      setIsLoading(true)
      setError(null)

      // Check if the ID is a valid UUID
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
        
        const product = await response.json()
        
        if (product.error) {
          throw new Error(product.error)
        }

        // Set form data
        setFormData({
          name: product.name,
          description: product.description || "",
          price: product.price.toString(),
          stock_quantity: product.stock_quantity.toString(),
          category: product.category,
          unit_id: product.unit_id || "",
          min_stock_level: (product.min_stock_level || 0).toString(),
          max_stock_level: (product.max_stock_level || 0).toString(),
          reorder_quantity: (product.reorder_quantity || 0).toString(),
          barcode: product.barcode || "",
          mfgname: product.mfgname || "",
          mfgnum: product.mfgnum || "",
          Location: product.Location || "",
          loc_tag: product.loc_tag || "",
          distributor: product.distributor || "",
          Product_url_1: product.Product_url_1 || "",
          Product_url_2: product.Product_url_2 || "",
          Product_url_3: product.Product_url_3 || "",
        })

        // Prepare existing images array from product data
        const existingImgs = []

        // Add images from the API response
        if (product.images && product.images.length > 0) {
          product.images.forEach((img, index) => {
            if (img.image_url) {
              existingImgs.push({
                id: img.image_id || img.id || `img-${index}`,
                url: img.image_url,
                isPrimary: img.is_primary,
              })
            }
          })
        } else if (product.image_url) {
          // If no images in the images array but there's an image_url, use that
          existingImgs.push({
            id: "main",
            url: product.image_url,
            isPrimary: true,
          })
        }

        setExistingImages(existingImgs)
      } catch (err) {
        console.error("Error fetching product:", err)
        setError("Failed to load product details. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProduct()
  }, [id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCategoryChange = (value: string) => {
    setFormData((prev) => ({ ...prev, category: value }))
  }

  const handleUnitChange = (unitId: string) => {
    setFormData((prev) => ({ ...prev, unit_id: unitId }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)
      const maxSize = 25 * 1024 * 1024 // 25MB
      
      // Check file sizes before processing
      const oversizedFiles = newFiles.filter(file => file.size > maxSize)
      if (oversizedFiles.length > 0) {
        toast({
          title: "File too large",
          description: `${oversizedFiles.length} file(s) exceed the 25MB limit and were not added.`,
          type: "error",
          duration: 5000,
        })
        // Only process files that are within size limit
        const validFiles = newFiles.filter(file => file.size <= maxSize)
        if (validFiles.length === 0) return
      }

      // Create previews for valid files only
      const validFiles = newFiles.filter(file => file.size <= maxSize)
      const newImages = validFiles.map((file, index) => {
        const preview = URL.createObjectURL(file)
        return { 
          file, 
          preview,
          id: `new-${Date.now()}-${index}`
        }
      })

      setImages((prev) => [...prev, ...newImages])
    }
  }

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleCameraCapture = (file: File) => {
    const maxSize = 25 * 1024 * 1024 // 25MB
    
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Captured image exceeds the 25MB limit. Please try again with lower quality.",
        type: "error",
        duration: 5000,
      })
      setShowCamera(false)
      return
    }
    
    const preview = URL.createObjectURL(file)
    const id = `camera-${Date.now()}`
    setImages((prev) => [...prev, { file, preview, id }])
    setShowCamera(false)
  }

  const removeImage = (index: number) => {
    setImages((prev) => {
      const newImages = [...prev]
      // Revoke the object URL to avoid memory leaks
      URL.revokeObjectURL(newImages[index].preview)
      newImages.splice(index, 1)
      return newImages
    })
  }

  const removeExistingImage = (imageId: string) => {
    setExistingImages((prev) => prev.filter((img) => img.id !== imageId))
  }

  const setPrimaryImage = (imageId: string) => {
    setExistingImages((prev) =>
      prev.map((img) => ({
        ...img,
        isPrimary: img.id === imageId,
      })),
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      // Upload new images
      const newImageUrls: string[] = []

      for (const image of images) {
        const imageFormData = new FormData()
        imageFormData.append("image", image.file)

        const { url, error } = await uploadProductImage(imageFormData)

        if (error) {
          console.error("Error uploading image:", error)
        } else if (url) {
          newImageUrls.push(url)
        }
      }

      // Determine primary image
      let primaryImageUrl: string | null = null

      // Check if there's a primary image in existing images
      const primaryExisting = existingImages.find((img) => img.isPrimary)
      if (primaryExisting) {
        primaryImageUrl = primaryExisting.url
      }
      // If no primary in existing, use the first new image if available
      else if (newImageUrls.length > 0) {
        primaryImageUrl = newImageUrls[0]
      }

      // Update product data via API
      const updateResponse = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          price: Number.parseFloat(formData.price),
          stock_quantity: Number.parseInt(formData.stock_quantity) || 0,
          category: formData.category,
          unit_id: formData.unit_id || null,
          min_stock_level: Number.parseInt(formData.min_stock_level) || 0,
          max_stock_level: Number.parseInt(formData.max_stock_level) || 0,
          reorder_quantity: Number.parseInt(formData.reorder_quantity) || 0,
          image_url: primaryImageUrl,
          barcode: formData.barcode || null,
          mfgname: formData.mfgname || null,
          mfgnum: formData.mfgnum || null,
          Location: formData.Location || null,
          loc_tag: formData.loc_tag || null,
          distributor: formData.distributor || null,
          Product_url_1: formData.Product_url_1 || null,
          Product_url_2: formData.Product_url_2 || null,
          Product_url_3: formData.Product_url_3 || null,
          updated_at: new Date().toISOString(),
          existingImages: existingImages.map(img => ({
            id: img.id,
            url: img.url,
            isPrimary: img.isPrimary
          })),
          newImages: newImageUrls
        })
      })

      if (!updateResponse.ok) {
        let errorMessage = 'Failed to update product'
        try {
          const errorData = await updateResponse.json()
          errorMessage = errorData.error || errorMessage
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          errorMessage = `Server error: ${updateResponse.status} ${updateResponse.statusText}`
        }
        throw new Error(errorMessage)
      }

      // TODO: Implement complex image gallery features later
      // For now, we only handle the main product image via image_url field

      // Save LED segments
      try {
        // Filter out segments without device selection
        const validSegments = ledSegments.filter(segment => segment.wled_device_id)

        if (validSegments.length > 0) {
          // Delete existing segments and create new ones
          const deleteResponse = await fetch(`/api/led-segments?product_id=${id}`, {
            method: 'DELETE'
          })

          // Create new segments
          const segmentPromises = validSegments.map(segment =>
            fetch('/api/led-segments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...segment,
                product_id: id
              })
            })
          )

          const segmentResults = await Promise.all(segmentPromises)
          const failedSegments = segmentResults.filter(result => !result.ok)

          if (failedSegments.length > 0) {
            console.warn(`Failed to save ${failedSegments.length} LED segments`)
            toast({
              title: "Warning",
              description: `Product updated but some LED segments failed to save`,
              variant: "destructive"
            })
          } else if (validSegments.length > 0) {
            toast({
              title: "Success",
              description: `Product and ${validSegments.length} LED segments updated successfully!`,
              type: "success",
              duration: 3000,
            })
          } else {
            toast({
              title: "Success",
              description: "Product updated successfully",
              type: "success",
              duration: 3000,
            })
          }
        } else {
          // No LED segments to save, just regular success message
          toast({
            title: "Success",
            description: "Product updated successfully",
            type: "success",
            duration: 3000,
          })
        }
      } catch (segmentError) {
        console.error('Error saving LED segments:', segmentError)
        toast({
          title: "Warning",
          description: "Product updated but LED segments failed to save",
          variant: "destructive"
        })
      }

      // Redirect back to product page
      router.push(`/products/${id}`)
      router.refresh()
    } catch (error: any) {
      console.error("Error updating product:", error)
      setError(error.message || "Failed to update product")
      toast({
        title: "Error",
        description: "Failed to update product",
        type: "error",
        duration: 5000,
      })
    } finally {
      setIsSaving(false)
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

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <div className="flex gap-2">
            <Select 
              value={formData.category} 
              onValueChange={handleCategoryChange}
              disabled={isLoadingCategories}
            >
              <SelectTrigger className="flex-1">
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
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setIsCategoryModalOpen(true)}
              disabled={isSaving}
              title="Add new category"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Item Name</Label>
          <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={3} />
        </div>

        <div className="space-y-2">
          <Label>Unit</Label>
          <UnitSelector
            selectedUnitId={formData.unit_id}
            onUnitChange={handleUnitChange}
            placeholder="Select unit of measurement..."
            disabled={isSaving}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="price">Price ($)</Label>
            <Input
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock_quantity">Stock Quantity</Label>
            <Input
              id="stock_quantity"
              name="stock_quantity"
              type="number"
              min="0"
              value={formData.stock_quantity}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="min_stock_level">Min Stock Level</Label>
            <Input
              id="min_stock_level"
              name="min_stock_level"
              type="number"
              min="0"
              value={formData.min_stock_level}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_stock_level">Max Stock Level</Label>
            <Input
              id="max_stock_level"
              name="max_stock_level"
              type="number"
              min="0"
              value={formData.max_stock_level}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reorder_quantity">Reorder Quantity</Label>
            <Input
              id="reorder_quantity"
              name="reorder_quantity"
              type="number"
              min="0"
              value={formData.reorder_quantity}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Barcode and Manufacturer Information */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="barcode">Barcode</Label>
            <Input
              id="barcode"
              name="barcode"
              value={formData.barcode}
              onChange={handleChange}
              placeholder="Product barcode"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mfgnum">Manufacturer Part Number</Label>
            <Input
              id="mfgnum"
              name="mfgnum"
              value={formData.mfgnum}
              onChange={handleChange}
              placeholder="MFG part number"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mfgname">Manufacturer Name</Label>
          <Input
            id="mfgname"
            name="mfgname"
            value={formData.mfgname}
            onChange={handleChange}
            placeholder="Manufacturer name"
          />
        </div>

        {/* Location Information */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="Location">Storage Location</Label>
            <Input
              id="Location"
              name="Location"
              value={formData.Location}
              onChange={handleChange}
              placeholder="Storage location"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="loc_tag">Location Tag</Label>
            <Input
              id="loc_tag"
              name="loc_tag"
              value={formData.loc_tag}
              onChange={handleChange}
              placeholder="Location tag/identifier"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="distributor">Distributor</Label>
          <Input
            id="distributor"
            name="distributor"
            value={formData.distributor}
            onChange={handleChange}
            placeholder="Distributor name"
          />
        </div>

        {/* LED LOCATION SYSTEM SECTION */}
        <LEDLocationSection
          segments={ledSegments}
          onSegmentsChange={setLedSegments}
          disabled={isSaving}
          productId={id}
        />

        {/* Product URLs */}
        <div className="space-y-4">
          <Label>Product URLs</Label>
          
          <div className="space-y-2">
            <Label htmlFor="Product_url_1">Product URL 1</Label>
            <Input
              id="Product_url_1"
              name="Product_url_1"
              type="url"
              value={formData.Product_url_1}
              onChange={handleChange}
              placeholder="https://example.com/product"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="Product_url_2">Product URL 2</Label>
            <Input
              id="Product_url_2"
              name="Product_url_2"
              type="url"
              value={formData.Product_url_2}
              onChange={handleChange}
              placeholder="https://example.com/product"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="Product_url_3">Product URL 3</Label>
            <Input
              id="Product_url_3"
              name="Product_url_3"
              type="url"
              value={formData.Product_url_3}
              onChange={handleChange}
              placeholder="https://example.com/product"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Images</Label>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            id="image"
            name="image"
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />

          {showCamera && (
            <div className="mb-4">
              <UniversalCamera
                onCapture={handleCameraCapture}
                onClose={() => setShowCamera(false)}
                mode="photo"
              />
            </div>
          )}

          {/* Existing images */}
          {existingImages.length > 0 && (
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Existing Images</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                {existingImages.map((image, index) => (
                  <div key={`existing-${image.id}-${index}`} className="relative aspect-square border rounded-md overflow-hidden">
                    <img src={image.url || "/placeholder.svg"} alt="Product" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(image.id)}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrimaryImage(image.id)}
                      className={`absolute bottom-1 left-1 text-xs px-2 py-1 rounded-full transition-colors ${
                        image.isPrimary
                          ? "bg-primary text-primary-foreground"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {image.isPrimary ? "Primary" : "Set as Primary"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New images */}
          {images.length > 0 && (
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">New Images</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                {images.map((image, index) => (
                  <div key={`new-${image.id}-${index}`} className="relative aspect-square border rounded-md overflow-hidden">
                    <img
                      src={image.preview || "/placeholder.svg"}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!showCamera && (
            <div className="space-y-2">
              {/* Camera button - primary action */}
              <Button
                type="button"
                onClick={() => setShowCamera(true)}
                className="w-full h-12 text-base"
                size="lg"
              >
                <Camera className="h-5 w-5 mr-2" />
                {isMobile ? 'Take Photo' : 'Open Camera'}
              </Button>

              {/* File upload button */}
              <Button
                type="button"
                variant="outline"
                onClick={triggerFileInput}
                className="w-full"
              >
                <ImagePlus className="h-4 w-4 mr-2" />
                {isMobile ? 'Choose from Gallery' : 'Upload Images'}
              </Button>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={isSaving} className="flex-1">
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
            Cancel
          </Button>
        </div>
      </form>

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onOpenChange={setIsCategoryModalOpen}
        onCategoryCreated={handleCategoryCreated}
      />
    </div>
  )
}

