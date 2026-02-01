"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { Trash2, Star, StarOff, MoveVertical, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { deleteProductImageRecord, setPrimaryProductImage, reorderProductImages } from "@/app/actions/product-images"
import type { ProductImage } from "@/lib/types"
import { createClientSupabaseClient } from "@/lib/supabase/client"

interface ProductImageGalleryProps {
  productId: string
}

export function ProductImageGallery({ productId }: ProductImageGalleryProps) {
  const [images, setImages] = useState<ProductImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isSettingPrimary, setIsSettingPrimary] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const fetchImages = async () => {
    setIsLoading(true)
    try {
      const supabase = createClientSupabaseClient()

      const { data, error } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", productId)
        .order("display_order", { ascending: true })

      if (error) {
        throw error
      }

      setImages(data || [])
    } catch (error: any) {
      console.error("Error fetching product images:", error.message)
      // Don't show error toast as the table might not exist yet
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchImages()
  }, [productId])

  const handleDelete = async (imageId: string) => {
    setIsDeleting(imageId)
    try {
      const result = await deleteProductImageRecord(imageId, productId)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Image deleted successfully")
        fetchImages()
      }
    } catch (error: any) {
      toast.error(`Failed to delete image: ${error.message}`)
    } finally {
      setIsDeleting(null)
    }
  }

  const handleSetPrimary = async (imageId: string) => {
    setIsSettingPrimary(imageId)
    try {
      const result = await setPrimaryProductImage(imageId, productId)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Primary image updated")
        fetchImages()
      }
    } catch (error: any) {
      toast.error(`Failed to set primary image: ${error.message}`)
    } finally {
      setIsSettingPrimary(null)
    }
  }

  const handleDragStart = (index: number) => {
    setIsDragging(true)
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null) return

    const newImages = [...images]
    const draggedImage = newImages[draggedIndex]

    // Remove the dragged item
    newImages.splice(draggedIndex, 1)
    // Insert it at the new position
    newImages.splice(index, 0, draggedImage)

    setImages(newImages)
    setDraggedIndex(index)
  }

  const handleDragEnd = async () => {
    setIsDragging(false)
    setDraggedIndex(null)

    // Save the new order
    try {
      const imageIds = images.map((img) => img.id)
      const result = await reorderProductImages(productId, imageIds)

      if (result.error) {
        toast.error(result.error)
        // Refresh to get the original order
        fetchImages()
      }
    } catch (error: any) {
      toast.error(`Failed to reorder images: ${error.message}`)
      fetchImages()
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (images.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No images uploaded yet</div>
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {images.map((image, index) => (
        <div
          key={image.id}
          className={`relative border rounded-md overflow-hidden group ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          } ${image.is_primary ? "ring-2 ring-primary" : ""}`}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
        >
          <div className="aspect-square relative">
            <Image
              src={image.image_url || "/placeholder.svg"}
              alt={`Product image ${index + 1}`}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className="object-cover"
            />
          </div>

          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white hover:text-white hover:bg-primary/20"
              onClick={() => handleSetPrimary(image.id)}
              disabled={image.is_primary || isSettingPrimary === image.id}
            >
              {isSettingPrimary === image.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : image.is_primary ? (
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ) : (
                <StarOff className="h-4 w-4" />
              )}
            </Button>

            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white hover:text-white hover:bg-destructive/20"
              onClick={() => handleDelete(image.id)}
              disabled={isDeleting === image.id}
            >
              {isDeleting === image.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>

            <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:text-white hover:bg-primary/20">
              <MoveVertical className="h-4 w-4" />
            </Button>
          </div>

          {image.is_primary && (
            <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
              Primary
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

