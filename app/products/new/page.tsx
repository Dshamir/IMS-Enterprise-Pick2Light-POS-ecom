"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Camera, ImagePlus, X, ArrowLeft, Plus } from "lucide-react"
import Link from "next/link"
import { CategoryModal } from "@/components/category-modal"
import { useToast } from "@/components/ui/use-toast"
import { UnitSelector } from "@/components/units/unit-selector"
import { LEDLocationSection } from "@/components/led/led-location-section"

export default function NewProductPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const defaultCategory = searchParams.get("category") || "equipment"
  const isManufacturedFromUrl = searchParams.get("manufactured") === "true"

  const [isLoading, setIsLoading] = useState(false)
  const [images, setImages] = useState<{ file: File; preview: string }[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [boms, setBoms] = useState<any[]>([])
  const [productionRuns, setProductionRuns] = useState<any[]>([])
  const [isLoadingBoms, setIsLoadingBoms] = useState(false)
  const [isLoadingProductionRuns, setIsLoadingProductionRuns] = useState(false)
  const [ledSegments, setLedSegments] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    stock_quantity: "",
    category: defaultCategory,
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
    is_manufactured: isManufacturedFromUrl,
    bom_id: "",
    default_production_run_id: "",
  })

  // Load categories on component mount
  useEffect(() => {
    loadCategories()
  }, [])

  // Load manufacturing data when manufactured toggle is enabled
  useEffect(() => {
    if (formData.is_manufactured) {
      loadBoms()
      loadProductionRuns()
    }
  }, [formData.is_manufactured])

  // Load manufacturing data immediately if coming from URL
  useEffect(() => {
    if (isManufacturedFromUrl) {
      loadBoms()
      loadProductionRuns()
    }
  }, [isManufacturedFromUrl])

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

  const loadBoms = async () => {
    try {
      setIsLoadingBoms(true)
      const response = await fetch('/api/manufacturing-boms')
      if (response.ok) {
        const data = await response.json()
        setBoms(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error loading BOMs:', error)
    } finally {
      setIsLoadingBoms(false)
    }
  }

  const loadProductionRuns = async () => {
    try {
      setIsLoadingProductionRuns(true)
      const response = await fetch('/api/production-runs')
      if (response.ok) {
        const data = await response.json()
        setProductionRuns(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error loading production runs:', error)
    } finally {
      setIsLoadingProductionRuns(false)
    }
  }

  const handleCategoryCreated = (newCategory: any) => {
    setCategories(prev => [...prev, newCategory])
    setFormData(prev => ({ ...prev, category: newCategory.name }))
    toast({
      title: "Success",
      description: `Category "${newCategory.name}" created and selected!`,
    })
  }

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

  const handleManufacturedChange = (checked: boolean) => {
    setFormData((prev) => ({ 
      ...prev, 
      is_manufactured: checked,
      category: checked ? "Manufactured Products" : defaultCategory,
      bom_id: checked ? prev.bom_id : "",
      default_production_run_id: checked ? prev.default_production_run_id : ""
    }))
  }

  const handleBomChange = (bomId: string) => {
    setFormData((prev) => ({ ...prev, bom_id: bomId }))
  }

  const handleProductionRunChange = (productionRunId: string) => {
    setFormData((prev) => ({ ...prev, default_production_run_id: productionRunId }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)

      // Create previews for each file
      const newImages = newFiles.map((file) => {
        const preview = URL.createObjectURL(file)
        return { file, preview }
      })

      setImages((prev) => [...prev, ...newImages])
    }
  }

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Skip image upload for now and create product without images
      const imageUrls: string[] = []
      const mainImageUrl = null

      // Show message about skipping image upload
      if (images.length > 0) {
        toast({
          variant: "destructive",
          title: "Image Upload Skipped",
          description: `Image upload temporarily disabled. Product will be created without ${images.length} images.`,
        })
      }

      const payload = {
        name: formData.name,
        description: formData.description || null,
        price: Number.parseFloat(formData.price),
        stock_quantity: Number.parseInt(formData.stock_quantity) || 0,
        category: formData.category,
        unit_id: formData.unit_id || null,
        min_stock_level: Number.parseInt(formData.min_stock_level) || 0,
        max_stock_level: Number.parseInt(formData.max_stock_level) || 0,
        reorder_quantity: Number.parseInt(formData.reorder_quantity) || 0,
        barcode: formData.barcode || null,
        mfgname: formData.mfgname || null,
        mfgnum: formData.mfgnum || null,
        Location: formData.Location || null,
        loc_tag: formData.loc_tag || null,
        distributor: formData.distributor || null,
        Product_url_1: formData.Product_url_1 || null,
        Product_url_2: formData.Product_url_2 || null,
        Product_url_3: formData.Product_url_3 || null,
        image_url: mainImageUrl,
        images: imageUrls,
        is_manufactured: formData.is_manufactured ? 1 : 0,
        bom_id: formData.bom_id || null,
        default_production_run_id: formData.default_production_run_id || null,
      }

      console.log('Creating product with payload:', payload)

      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error("Product creation failed:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        throw new Error(`Failed to create product: ${response.status} ${response.statusText}`)
      }

      const productResult = await response.json()
      const productId = productResult.id

      // Save LED segments if any are configured
      if (ledSegments.length > 0 && productId) {
        try {
          // Filter out segments without device selection
          const validSegments = ledSegments.filter(segment => segment.wled_device_id)

          if (validSegments.length > 0) {
            const segmentPromises = validSegments.map(segment =>
              fetch('/api/led-segments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...segment,
                  product_id: productId
                })
              })
            )

            const segmentResults = await Promise.all(segmentPromises)
            const failedSegments = segmentResults.filter(result => !result.ok)

            if (failedSegments.length > 0) {
              console.warn(`Failed to save ${failedSegments.length} LED segments`)
              toast({
                title: "Warning",
                description: `Product created but some LED segments failed to save`,
                variant: "destructive"
              })
            } else {
              toast({
                title: "Success",
                description: `Product and ${validSegments.length} LED segments created successfully!`
              })
            }
          }
        } catch (segmentError) {
          console.error('Error saving LED segments:', segmentError)
          toast({
            title: "Warning",
            description: "Product created but LED segments failed to save",
            variant: "destructive"
          })
        }
      }

      // Redirect to the category page
      router.push(`/${formData.category}`)
    } catch (error) {
      console.error("Error creating product:", error)
      toast({
        variant: "destructive",
        title: "Product Creation Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto md:max-w-none md:w-[90%] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link href={`/${formData.category}`}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to {formData.category}
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Add New Item</h1>
        </div>

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
                disabled={isLoading}
                title="Add new category"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Manufacturing Toggle */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_manufactured"
                checked={formData.is_manufactured}
                onCheckedChange={handleManufacturedChange}
              />
              <Label htmlFor="is_manufactured" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                This is a manufactured product (finished product)
              </Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Check this if this product is manufactured through your production process (not raw materials or components)
            </p>
          </div>

          {/* Manufacturing Fields - Only show when manufactured toggle is enabled */}
          {formData.is_manufactured && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-sm font-medium text-blue-900">Manufacturing Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bom_id">Associated BOM (Optional)</Label>
                  <Select 
                    value={formData.bom_id} 
                    onValueChange={handleBomChange}
                    disabled={isLoadingBoms}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingBoms ? "Loading BOMs..." : "Select BOM"} />
                    </SelectTrigger>
                    <SelectContent>
                      {boms.map((bom) => (
                        <SelectItem key={bom.id} value={bom.id}>
                          {bom.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default_production_run_id">Default Production Run (Optional)</Label>
                  <Select 
                    value={formData.default_production_run_id} 
                    onValueChange={handleProductionRunChange}
                    disabled={isLoadingProductionRuns}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingProductionRuns ? "Loading runs..." : "Select production run"} />
                    </SelectTrigger>
                    <SelectContent>
                      {productionRuns.map((run) => (
                        <SelectItem key={run.id} value={run.id}>
                          {run.bom_name} - {run.status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Item Name</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Unit</Label>
            <UnitSelector
              selectedUnitId={formData.unit_id}
              onUnitChange={handleUnitChange}
              placeholder="Select unit of measurement..."
              disabled={isLoading}
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
                placeholder="Minimum stock"
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
                placeholder="Maximum stock"
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
                placeholder="Reorder amount"
              />
            </div>
          </div>

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
            disabled={isLoading}
          />

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

            {/* Image preview grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              {images.map((image, index) => (
                <div key={index} className="relative aspect-square border rounded-md overflow-hidden">
                  <img
                    src={image.preview || "/placeholder.svg"}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"
                  >
                    <X size={16} />
                  </button>
                  {index === 0 && (
                    <div className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                      Primary
                    </div>
                  )}
                </div>
              ))}

              {/* Add image button */}
              <button
                type="button"
                onClick={triggerFileInput}
                className="border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center p-4 hover:border-gray-400 transition-colors aspect-square"
              >
                <ImagePlus className="h-8 w-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">Add Images</span>
              </button>
            </div>

            {/* Camera button */}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.setAttribute("capture", "environment")
                  fileInputRef.current.click()
                  // Remove the capture attribute after clicking
                  setTimeout(() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.removeAttribute("capture")
                    }
                  }, 100)
                }
              }}
              className="w-full flex items-center justify-center"
            >
              <Camera className="h-4 w-4 mr-2" />
              Take Photo
            </Button>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Adding..." : "Add Item"}
          </Button>
        </form>
      </div>
      
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onOpenChange={setIsCategoryModalOpen}
        onCategoryCreated={handleCategoryCreated}
      />
    </div>
  )
}

