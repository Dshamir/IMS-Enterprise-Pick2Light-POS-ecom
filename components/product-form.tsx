"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { uploadProductImage } from "@/app/actions/upload-image"
import { Camera, ImagePlus, X, Plus } from "lucide-react"
import { CategoryModal } from "./category-modal"
import { useToast } from "@/components/ui/use-toast"

export default function ProductForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    stock_quantity: "",
    category: "equipment",
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
    image: null as File | null,
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setFormData((prev) => ({ ...prev, image: file }))

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const clearImage = () => {
    setFormData((prev) => ({ ...prev, image: null }))
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      let imageUrl = null

      // Upload image if selected
      if (formData.image) {
        const imageFormData = new FormData()
        imageFormData.append("image", formData.image)

        const { url, error } = await uploadProductImage(imageFormData)

        if (error) {
          console.error("Error uploading image:", error)
        } else {
          imageUrl = url
        }
      }

      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          price: Number.parseFloat(formData.price),
          stock_quantity: Number.parseInt(formData.stock_quantity) || 0,
          category: formData.category,
          min_stock_level: Number.parseInt(formData.min_stock_level) || 0,
          max_stock_level: Number.parseInt(formData.max_stock_level) || 100,
          reorder_quantity: Number.parseInt(formData.reorder_quantity) || 10,
          barcode: formData.barcode || null,
          mfgname: formData.mfgname || null,
          mfgnum: formData.mfgnum || null,
          Location: formData.Location || null,
          loc_tag: formData.loc_tag || null,
          distributor: formData.distributor || null,
          Product_url_1: formData.Product_url_1 || null,
          Product_url_2: formData.Product_url_2 || null,
          Product_url_3: formData.Product_url_3 || null,
          image_url: imageUrl,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create product")
      }

      // Reset form
      setFormData({
        name: "",
        description: "",
        price: "",
        stock_quantity: "",
        category: "equipment",
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
        image: null,
      })
      setImagePreview(null)

      router.refresh()
    } catch (error) {
      console.error("Error creating product:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
      <h2 className="text-xl font-bold">Add New Product</h2>

      <div className="space-y-2">
        <Label htmlFor="name">Product Name</Label>
        <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={3} />
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <div className="flex gap-2">
            <Select 
              value={formData.category} 
              onValueChange={(value) => handleSelectChange("category", value)}
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
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Manufacturer Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div className="space-y-2">
            <Label htmlFor="mfgnum">Manufacturer Part Number</Label>
            <Input
              id="mfgnum"
              name="mfgnum"
              value={formData.mfgnum}
              onChange={handleChange}
              placeholder="Manufacturer part number"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Location Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="Location">Location</Label>
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
              placeholder="Location tag or code"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Distributor & Product URLs</h3>
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

        <div className="grid grid-cols-1 gap-4">
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
      </div>

      <div className="space-y-2">
        <Label>Product Image</Label>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          id="image"
          name="image"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Image preview or placeholder */}
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer"
          onClick={imagePreview ? undefined : triggerFileInput}
        >
          {imagePreview ? (
            <div className="relative">
              <img src={imagePreview || "/placeholder.svg"} alt="Preview" className="mx-auto max-h-48 rounded-md" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  clearImage()
                }}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-4">
              <ImagePlus className="h-12 w-12 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Tap to take a photo or upload an image</p>
            </div>
          )}
        </div>

        {/* Camera and gallery buttons */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.setAttribute("capture", "environment")
                fileInputRef.current.click()
              }
            }}
            className="flex items-center justify-center"
          >
            <Camera className="h-4 w-4 mr-2" />
            Camera
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.removeAttribute("capture")
                fileInputRef.current.click()
              }
            }}
            className="flex items-center justify-center"
          >
            <ImagePlus className="h-4 w-4 mr-2" />
            Gallery
          </Button>
        </div>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Adding..." : "Add Product"}
      </Button>
    </form>
      
    <CategoryModal
      isOpen={isCategoryModalOpen}
      onOpenChange={setIsCategoryModalOpen}
      onCategoryCreated={handleCategoryCreated}
    />
  </>
  )
}

