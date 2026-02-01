"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, Image as ImageIcon, X, AlertCircle } from "lucide-react"
import { uploadManufacturingImage, type ManufacturingEntityType } from "@/app/actions/upload-manufacturing-image"

interface ImageUploadProps {
  entityType: ManufacturingEntityType
  currentImageUrl?: string
  onImageChange: (imageUrl: string | null) => void
  label?: string
  className?: string
}

export function ImageUpload({ 
  entityType, 
  currentImageUrl, 
  onImageChange, 
  label = "Image",
  className = ""
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    setIsUploading(true)

    try {
      // Create preview
      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)

      // Upload the file
      const formData = new FormData()
      formData.append('image', file)

      const result = await uploadManufacturingImage(formData, entityType)
      
      if (result.error) {
        setError(result.error)
        setPreviewUrl(currentImageUrl || null)
        return
      }

      if (result.url) {
        // Clean up the preview URL and set the actual URL
        URL.revokeObjectURL(objectUrl)
        setPreviewUrl(result.url)
        onImageChange(result.url)
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      setError('Failed to upload image. Please try again.')
      setPreviewUrl(currentImageUrl || null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setPreviewUrl(null)
    onImageChange(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <Label>{label}</Label>
      
      {/* Image Preview */}
      {previewUrl && (
        <div className="relative inline-block">
          <div className="w-32 h-32 bg-muted rounded-lg overflow-hidden border">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
            onClick={handleRemoveImage}
            disabled={isUploading}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Upload Button */}
      {!previewUrl && (
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <ImageIcon className="h-4 w-4 mr-2" />
                Select Image
              </>
            )}
          </Button>
        </div>
      )}

      {/* Replace Button */}
      {previewUrl && (
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Replace Image
              </>
            )}
          </Button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload Guidelines */}
      <div className="text-xs text-muted-foreground">
        <p>• Supported formats: PNG, JPG, JPEG, GIF, WebP</p>
        <p>• Maximum file size: 25MB</p>
      </div>
    </div>
  )
}