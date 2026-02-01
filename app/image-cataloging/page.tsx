"use client"

import { useState, useEffect } from "react"

// Force dynamic rendering to prevent build-time static generation
export const dynamic = 'force-dynamic'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Image, 
  Upload, 
  Grid3X3, 
  List, 
  Search, 
  Filter, 
  Eye, 
  Link as LinkIcon,
  Package,
  Camera,
  Cpu,
  FileText,
  Zap,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Archive,
  EyeOff,
  CheckSquare,
  Square
} from "lucide-react"
import { ImageUploadZone } from "@/components/image-cataloging/image-upload-zone"
import { ImageProcessingCard } from "@/components/image-cataloging/image-processing-card"
import { ImageAssignmentModal } from "@/components/image-cataloging/image-assignment-modal"

interface ProcessedImage {
  id: string
  filename: string
  url: string
  size: number
  uploadedAt: string
  status: 'processing' | 'processed' | 'assigned' | 'error'
  archived?: boolean
  aiResults?: {
    objects: string[]
    extractedText: string
    description: string
    confidence: number
  }
  assignedProduct?: {
    id: string
    name: string
    barcode: string
  }
}

export default function ImageCatalogingPage() {
  const [images, setImages] = useState<ProcessedImage[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hideProcessed, setHideProcessed] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)

  // Statistics with safety checks
  const totalImages = Array.isArray(images) ? images.length : 0
  const processedImages = Array.isArray(images) ? images.filter(img => img?.status === 'processed').length : 0
  const assignedImages = Array.isArray(images) ? images.filter(img => img?.status === 'assigned').length : 0
  const processingImages = Array.isArray(images) ? images.filter(img => img?.status === 'processing').length : 0

  // Load existing images
  useEffect(() => {
    loadImages()
  }, [])

  const loadImages = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/image-cataloging/images')
      if (!response.ok) {
        throw new Error('Failed to load images')
      }
      const data = await response.json()
      setImages(data.images || [])
    } catch (error) {
      console.error('Error loading images:', error)
      setImages([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleImagesUploaded = async (files: File[]) => {
    setIsLoading(true)
    try {
      const formData = new FormData()
      files.forEach(file => {
        formData.append('files', file)
      })

      const uploadResponse = await fetch('/api/image-cataloging/upload', {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload images')
      }

      const uploadData = await uploadResponse.json()
      
      // Create processing entries for each uploaded file
      const newImages: ProcessedImage[] = uploadData.files.map((fileData: any) => ({
        id: fileData.id,
        filename: fileData.filename,
        url: fileData.url,
        size: fileData.size,
        uploadedAt: fileData.uploadedAt,
        status: 'processing'
      }))

      setImages(prev => [...prev, ...newImages])

      // Process each image with AI
      for (const image of newImages) {
        await processImageWithAI(image.id)
      }
    } catch (error) {
      console.error('Error uploading images:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const processImageWithAI = async (imageId: string) => {
    try {
      const response = await fetch('/api/image-cataloging/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imageId })
      })

      if (!response.ok) {
        throw new Error('Failed to process image')
      }

      const data = await response.json()

      setImages(prev => prev.map(img => 
        img.id === imageId 
          ? { 
              ...img, 
              status: 'processed' as const, 
              aiResults: data.aiResults 
            }
          : img
      ))
    } catch (error) {
      console.error('Error processing image:', error)
      setImages(prev => prev.map(img => 
        img.id === imageId 
          ? { ...img, status: 'error' as const }
          : img
      ))
    }
  }

  const handleImageSelection = (imageId: string, selected: boolean) => {
    setSelectedImages(prev => 
      selected 
        ? [...prev, imageId]
        : prev.filter(id => id !== imageId)
    )
  }

  const handleBulkAssignment = () => {
    if (selectedImages.length === 0) return
    setShowAssignmentModal(true)
  }

  const handleAssignmentComplete = async (barcode: string) => {
    try {
      const response = await fetch('/api/image-cataloging/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          imageIds: selectedImages,
          barcode: barcode
        })
      })

      if (!response.ok) {
        throw new Error('Failed to assign images')
      }

      const data = await response.json()
      
      // Update images with assignment data
      setImages(prev => prev.map(img => 
        selectedImages.includes(img.id)
          ? { 
              ...img, 
              status: 'assigned' as const,
              assignedProduct: data.product
            }
          : img
      ))
      
      setSelectedImages([])
      setShowAssignmentModal(false)
    } catch (error) {
      console.error('Error assigning images:', error)
    }
  }

  // Bulk operations
  const handleSelectAll = (visibleImages: ProcessedImage[]) => {
    const visibleImageIds = visibleImages.map(img => img.id)
    if (selectedImages.length === visibleImageIds.length) {
      // If all visible images are selected, unselect all
      setSelectedImages([])
    } else {
      // Select all visible images
      setSelectedImages(visibleImageIds)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedImages.length === 0) return
    
    try {
      const response = await fetch('/api/image-cataloging/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imageIds: selectedImages })
      })

      if (!response.ok) {
        throw new Error('Failed to delete images')
      }

      // Remove deleted images from state
      setImages(prev => prev.filter(img => !selectedImages.includes(img.id)))
      setSelectedImages([])
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Error deleting images:', error)
    }
  }

  const handleBulkArchive = async () => {
    if (selectedImages.length === 0) return
    
    try {
      const response = await fetch('/api/image-cataloging/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imageIds: selectedImages })
      })

      if (!response.ok) {
        throw new Error('Failed to archive images')
      }

      // Mark images as archived
      setImages(prev => prev.map(img => 
        selectedImages.includes(img.id)
          ? { ...img, archived: true }
          : img
      ))
      setSelectedImages([])
      setShowArchiveDialog(false)
    } catch (error) {
      console.error('Error archiving images:', error)
    }
  }

  const handleClearView = () => {
    setHideProcessed(!hideProcessed)
    setSelectedImages([]) // Clear selections when toggling view
  }

  // Filter and search images with comprehensive safety checks
  const filteredImages = Array.isArray(images) ? images.filter(image => {
    if (!image) return false
    
    // Don't show archived images in normal view
    if (image.archived) return false
    
    // Hide processed images if hideProcessed is enabled
    if (hideProcessed && (image.status === 'processed' || image.status === 'assigned')) return false
    
    const searchLower = (searchQuery || '').toLowerCase()
    
    const matchesSearch = !searchQuery || (
      (image.filename || '').toLowerCase().includes(searchLower) ||
      (image.aiResults?.extractedText || '').toLowerCase().includes(searchLower) ||
      (Array.isArray(image.aiResults?.objects) ? image.aiResults.objects : []).some(obj => 
        (obj || '').toLowerCase().includes(searchLower)
      )
    )
    
    const matchesFilter = filterStatus === 'all' || image.status === filterStatus
    
    return matchesSearch && matchesFilter
  }) : []

  return (
    <main className="container mx-auto py-4 px-4 md:py-8 md:max-w-none md:w-[90%]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Image className="h-8 w-8 text-blue-600" />
            AI Image Cataloging & Assignment
          </h1>
          <p className="text-muted-foreground">
            Upload, process, and assign images to inventory items using AI
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Images</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalImages}</div>
            <p className="text-xs text-muted-foreground">uploaded images</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processingImages}</div>
            <p className="text-xs text-muted-foreground">being processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processedImages}</div>
            <p className="text-xs text-muted-foreground">ready for assignment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedImages}</div>
            <p className="text-xs text-muted-foreground">assigned to products</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upload">Upload & Process</TabsTrigger>
          <TabsTrigger value="browse">Browse Images</TabsTrigger>
          <TabsTrigger value="assign">Assign to Products</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Images for AI Processing</CardTitle>
              <CardDescription>
                Upload product images to extract information and prepare for assignment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImageUploadZone onImagesUploaded={handleImagesUploaded} />
            </CardContent>
          </Card>

          {/* Recent Processing */}
          {images.filter(img => img.status === 'processing').length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Currently Processing</CardTitle>
                <CardDescription>AI is analyzing your uploaded images</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {images.filter(img => img.status === 'processing').map(image => (
                    <div key={image.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{image.filename}</h3>
                        <p className="text-sm text-muted-foreground">Processing with AI...</p>
                      </div>
                      <Badge variant="secondary">Processing</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="browse" className="space-y-6">
          {/* Search and Filter Controls */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-1 gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search images, text, or objects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="processed">Processed</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Operations Action Bar */}
          {filteredImages.length > 0 && (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="pt-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Selection Controls */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedImages.length === filteredImages.length && filteredImages.length > 0}
                        onCheckedChange={() => handleSelectAll(filteredImages)}
                        className="mr-1"
                      />
                      <span className="text-sm font-medium">
                        {selectedImages.length > 0 
                          ? `${selectedImages.length} item${selectedImages.length > 1 ? 's' : ''} selected`
                          : "Select All"
                        }
                      </span>
                    </div>
                    
                    {selectedImages.length > 0 && (
                      <div className="h-4 w-px bg-border" />
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearView}
                      className="gap-2"
                    >
                      <EyeOff className="h-4 w-4" />
                      {hideProcessed ? "Show All" : "Hide Processed"}
                    </Button>
                  </div>

                  {/* Bulk Action Buttons */}
                  {selectedImages.length > 0 && (
                    <div className="flex items-center gap-2">
                      {/* Archive Button */}
                      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Archive className="h-4 w-4" />
                            Archive ({selectedImages.length})
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Archive Selected Images</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to archive {selectedImages.length} image{selectedImages.length > 1 ? 's' : ''}? 
                              Archived images will be hidden from the main view but can be restored later.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleBulkArchive}>
                              Archive Images
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      {/* Delete Button */}
                      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" className="gap-2">
                            <Trash2 className="h-4 w-4" />
                            Delete ({selectedImages.length})
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Selected Images</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to permanently delete {selectedImages.length} image{selectedImages.length > 1 ? 's' : ''}? 
                              This action cannot be undone and will remove the images from storage.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={handleBulkDelete}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete Permanently
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Images Display */}
          <Card>
            <CardHeader>
              <CardTitle>
                Processed Images ({filteredImages.length})
                {hideProcessed && (
                  <Badge variant="secondary" className="ml-2">
                    Recent Only
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Browse and manage your processed images
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredImages.length === 0 ? (
                <div className="text-center py-8">
                  <Camera className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No images found</h3>
                  <p className="text-muted-foreground">Upload some images to get started</p>
                </div>
              ) : (
                <div className={viewMode === 'grid' 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  : "space-y-4"
                }>
                  {filteredImages.map(image => (
                    <ImageProcessingCard
                      key={image.id}
                      image={image}
                      viewMode={viewMode}
                      isSelected={selectedImages.includes(image.id)}
                      onSelectionChange={(selected) => handleImageSelection(image.id, selected)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assign" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assign Images to Products</CardTitle>
              <CardDescription>
                Select processed images and assign them to inventory items
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Selected Images: {selectedImages.length}</h3>
                    <p className="text-sm text-muted-foreground">
                      Select images from the browse tab to assign them
                    </p>
                  </div>
                  <Button 
                    onClick={handleBulkAssignment}
                    disabled={selectedImages.length === 0}
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Assign to Product
                  </Button>
                </div>

                {selectedImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {selectedImages.map(imageId => {
                      const image = images.find(img => img.id === imageId)
                      if (!image) return null
                      return (
                        <div key={imageId} className="relative">
                          <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                            <img 
                              src={image.url} 
                              alt={image.filename}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <p className="text-xs mt-1 truncate">{image.filename}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assignment Modal */}
      <ImageAssignmentModal
        open={showAssignmentModal}
        onOpenChange={setShowAssignmentModal}
        selectedImages={selectedImages.map(id => images.find(img => img.id === id)!).filter(Boolean)}
        onAssignmentComplete={handleAssignmentComplete}
      />
    </main>
  )
}