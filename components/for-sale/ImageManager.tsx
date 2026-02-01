"use client"

import { useState, useEffect } from "react"
import { Sparkles, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface ProductImage {
  id: string
  url: string
  isPrimary: boolean
}

interface APIImage {
  image_id?: string
  product_image_id?: string
  image_url: string
  is_primary: number | boolean
  display_order?: number
}

interface ImageManagerProps {
  productId: string
}

export function ImageManager({ productId }: ImageManagerProps) {
  const { toast } = useToast()
  const [images, setImages] = useState<ProductImage[]>([])
  const [loading, setLoading] = useState(true)
  const [enhancing, setEnhancing] = useState(false)

  useEffect(() => {
    loadImages()
  }, [productId])

  async function loadImages() {
    setLoading(true)
    try {
      const res = await fetch(`/api/products/${productId}`)
      if (res.ok) {
        const data = await res.json()
        // Handle both direct product response and nested product response
        const product = data.product || data
        if (product?.images && Array.isArray(product.images)) {
          // Map API response to component format, sorted by display_order
          const mappedImages: ProductImage[] = product.images
            .sort((a: APIImage, b: APIImage) => (a.display_order || 0) - (b.display_order || 0))
            .map((img: APIImage) => ({
              id: img.image_id || img.product_image_id || img.image_url,
              url: img.image_url,
              isPrimary: Boolean(img.is_primary),
            }))
          setImages(mappedImages)
        }
      }
    } catch (error) {
      console.error("Error loading images:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleEnhanceAll() {
    if (images.length === 0) {
      toast({
        title: "No images to enhance",
        description: "Add some images first before using AI enhancement.",
        type: "error",
        duration: 5000,
      })
      return
    }

    setEnhancing(true)
    try {
      const response = await fetch("/api/for-sale/enhance-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          imageUrls: images.map((img) => img.url),
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Images analyzed",
          description: result.message || `Analyzed ${images.length} images for marketplace optimization.`,
          type: "success",
          duration: 3000,
        })

        // If enhancement returned suggestions, show them
        if (result.suggestions && result.suggestions.length > 0) {
          toast({
            title: "Enhancement Suggestions",
            description: result.suggestions.slice(0, 2).join("; "),
            type: "info",
            duration: 8000,
          })
        }

        // Reload images if any were updated
        if (result.updated) {
          await loadImages()
        }
      } else {
        throw new Error(result.error || "Failed to enhance images")
      }
    } catch (error) {
      toast({
        title: "Enhancement failed",
        description: error instanceof Error ? error.message : "Please try again.",
        type: "error",
        duration: 5000,
      })
    } finally {
      setEnhancing(false)
    }
  }

  // Placeholder slots for empty images
  const displayImages = [...images]
  while (displayImages.length < 5) {
    displayImages.push({ id: `placeholder-${displayImages.length}`, url: "", isPrimary: false })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-700 mb-3 flex items-center justify-between">
        <span>📷 Listing Images</span>
        <button
          onClick={handleEnhanceAll}
          disabled={enhancing || images.length === 0}
          className={cn(
            "text-sm flex items-center gap-1 transition-colors",
            enhancing || images.length === 0
              ? "text-gray-400 cursor-not-allowed"
              : "text-orange-500 hover:text-orange-600"
          )}
        >
          {enhancing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          AI Enhance All
        </button>
      </h3>

      {/* Image Grid */}
      <div className="grid grid-cols-3 gap-2">
        {displayImages.map((image, index) => (
          <div
            key={image.id}
            className={cn(
              "aspect-square rounded-lg flex items-center justify-center relative overflow-hidden",
              image.url
                ? image.isPrimary
                  ? "border-2 border-emerald-500 bg-gray-100"
                  : "bg-gray-100"
                : "bg-gray-50 border-2 border-dashed border-gray-300"
            )}
          >
            {image.url ? (
              <>
                <img
                  src={image.url}
                  alt={`Product image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {image.isPrimary && (
                  <span className="absolute top-1 left-1 bg-emerald-500 text-white text-xs px-1.5 py-0.5 rounded">
                    Primary
                  </span>
                )}
              </>
            ) : (
              <span className="text-3xl text-gray-300">📷</span>
            )}
          </div>
        ))}
      </div>

      {images.length > 0 && (
        <p className="text-xs text-gray-400 mt-2 text-center">
          {images.length} image{images.length !== 1 ? 's' : ''} • Edit images from the main product page
        </p>
      )}

      {images.length === 0 && !loading && (
        <p className="text-xs text-gray-400 mt-2 text-center">
          No images. Add images from the main product page.
        </p>
      )}
    </div>
  )
}
