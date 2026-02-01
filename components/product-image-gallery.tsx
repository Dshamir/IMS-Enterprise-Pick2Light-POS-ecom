"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ProductImageGalleryProps {
  images: string[]
}

export default function ProductImageGallery({ images }: ProductImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  // If no images, show placeholder
  if (images.length === 0) {
    return (
      <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
        <span className="text-gray-400">No images available</span>
      </div>
    )
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  return (
    <div className="space-y-4">
      {/* Main image */}
      <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
        <img src={images[currentIndex] || "/placeholder.svg"} alt="Product" className="w-full h-full object-contain" />

        {/* Navigation arrows - only show if more than one image */}
        {images.length > 1 && (
          <>
            <Button
              variant="outline"
              size="icon"
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100"
              onClick={goToPrevious}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100"
              onClick={goToNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Thumbnails - only show if more than one image */}
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((image, index) => (
            <div
              key={index}
              className={`aspect-square rounded-md overflow-hidden cursor-pointer border-2 ${
                index === currentIndex ? "border-primary" : "border-transparent"
              }`}
              onClick={() => setCurrentIndex(index)}
            >
              <img
                src={image || "/placeholder.svg"}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

