"use client"

import type React from "react"

import { useState, useRef } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { uploadProductImage } from "@/lib/supabase/storage"
import { addProductImageRecord } from "@/app/actions/product-images"
import { Loader2, Upload } from "lucide-react"

interface ProductImageUploadProps {
  productId: string
  onSuccess?: () => void
}

export function ProductImageUpload({ productId, onSuccess }: ProductImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)

    try {
      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // Validate file type
        if (!file.type.startsWith("image/")) {
          toast.error(`File ${file.name} is not an image`)
          continue
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`File ${file.name} exceeds 5MB size limit`)
          continue
        }

        // Upload to Supabase Storage
        const { url } = await uploadProductImage(file, productId)

        // Add record to database
        const result = await addProductImageRecord(productId, url)

        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success(`Image ${file.name} uploaded successfully`)
        }
      }

      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      // Call the success callback
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple className="hidden" />
      <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} variant="outline" className="w-full">
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Upload Images
          </>
        )}
      </Button>
    </div>
  )
}

