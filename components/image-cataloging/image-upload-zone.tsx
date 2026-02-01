"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileImage, X, AlertCircle } from "lucide-react"

interface ImageUploadZoneProps {
  onImagesUploaded: (files: File[]) => void
  maxFiles?: number
  maxSize?: number
}

export function ImageUploadZone({ 
  onImagesUploaded, 
  maxFiles = 10, 
  maxSize = 10 * 1024 * 1024 // 10MB
}: ImageUploadZoneProps) {
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewFiles, setPreviewFiles] = useState<File[]>([])

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null)
    
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const rejectedReasons = rejectedFiles.map(file => 
        file.errors.map((err: any) => err.message).join(', ')
      ).join('; ')
      setError(`Some files were rejected: ${rejectedReasons}`)
    }

    // Handle accepted files
    if (acceptedFiles.length > 0) {
      setPreviewFiles(acceptedFiles)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxFiles,
    maxSize,
    multiple: true
  })

  const handleUpload = async () => {
    if (previewFiles.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      // Process files
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setUploadProgress(100)
      
      // Call the upload handler
      onImagesUploaded(previewFiles)
      
      // Reset state
      setPreviewFiles([])
      setUploadProgress(0)
    } catch (error) {
      setError('Upload failed. Please try again.')
      console.error('Upload error:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const removeFile = (index: number) => {
    setPreviewFiles(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }
          ${isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-muted rounded-full">
            <Upload className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">
              {isDragActive ? 'Drop images here' : 'Upload Product Images'}
            </h3>
            <p className="text-muted-foreground mb-4">
              Drag and drop images here, or click to select files
            </p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Supported formats: PNG, JPG, JPEG, GIF, WebP</p>
              <p>• Maximum {maxFiles} files</p>
              <p>• Maximum {formatFileSize(maxSize)} per file</p>
            </div>
          </div>
          {!isDragActive && (
            <Button variant="outline" className="mt-4">
              <FileImage className="h-4 w-4 mr-2" />
              Select Images
            </Button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading images...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
        </div>
      )}

      {/* File Preview */}
      {previewFiles.length > 0 && !isUploading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Ready to Upload ({previewFiles.length} files)</h4>
            <Button onClick={handleUpload} disabled={isUploading}>
              <Upload className="h-4 w-4 mr-2" />
              Upload & Process
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {previewFiles.map((file, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
                <div className="mt-2">
                  <p className="text-xs font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}