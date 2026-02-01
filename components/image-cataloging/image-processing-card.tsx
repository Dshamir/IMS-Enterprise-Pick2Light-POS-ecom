"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  Eye, 
  Package, 
  FileText, 
  Tag, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Calendar
} from "lucide-react"

interface ProcessedImage {
  id: string
  filename: string
  url: string
  size: number
  uploadedAt: string
  status: 'processing' | 'processed' | 'assigned' | 'error'
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

interface ImageProcessingCardProps {
  image: ProcessedImage
  viewMode: 'grid' | 'list'
  isSelected: boolean
  onSelectionChange: (selected: boolean) => void
}

export function ImageProcessingCard({ 
  image, 
  viewMode, 
  isSelected, 
  onSelectionChange 
}: ImageProcessingCardProps) {
  const [showDetails, setShowDetails] = useState(false)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processing':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Processing
          </Badge>
        )
      case 'processed':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Processed
          </Badge>
        )
      case 'assigned':
        return (
          <Badge variant="default" className="bg-purple-100 text-purple-800">
            <Package className="h-3 w-3 mr-1" />
            Assigned
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600'
    if (confidence >= 0.7) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (viewMode === 'grid') {
    return (
      <Card className={`relative overflow-hidden transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`}>
        <div className="absolute top-2 left-2 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelectionChange}
            className="bg-white/80 backdrop-blur-sm"
          />
        </div>
        <div className="absolute top-2 right-2 z-10">
          {getStatusBadge(image.status)}
        </div>
        
        <div className="aspect-square bg-muted overflow-hidden">
          <img
            src={image.url}
            alt={image.filename}
            className="w-full h-full object-cover"
          />
        </div>
        
        <CardContent className="p-4">
          <div className="space-y-2">
            <h3 className="font-medium truncate" title={image.filename}>
              {image.filename}
            </h3>
            
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(image.uploadedAt)}
              </div>
              <div>{formatFileSize(image.size)}</div>
            </div>

            {image.aiResults && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs">
                  <Tag className="h-3 w-3" />
                  <span className="truncate">
                    {image.aiResults.objects.slice(0, 2).join(', ')}
                    {image.aiResults.objects.length > 2 && '...'}
                  </span>
                </div>
                <div className={`text-xs font-medium ${getConfidenceColor(image.aiResults.confidence)}`}>
                  {Math.round(image.aiResults.confidence * 100)}% confidence
                </div>
              </div>
            )}

            {image.assignedProduct && (
              <div className="text-xs bg-purple-50 text-purple-800 p-2 rounded">
                <div className="font-medium">{image.assignedProduct.name}</div>
                <div>Barcode: {image.assignedProduct.barcode}</div>
              </div>
            )}

            <div className="flex gap-1">
              <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="h-3 w-3 mr-1" />
                    Details
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{image.filename}</DialogTitle>
                  </DialogHeader>
                  <ImageDetailsView image={image} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // List view
  return (
    <Card className={`transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelectionChange}
          />
          
          <div className="h-16 w-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
            <img
              src={image.url}
              alt={image.filename}
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium truncate">{image.filename}</h3>
              {getStatusBadge(image.status)}
            </div>
            
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center gap-4">
                <span>{formatFileSize(image.size)}</span>
                <span>{formatDate(image.uploadedAt)}</span>
                {image.aiResults && (
                  <span className={getConfidenceColor(image.aiResults.confidence)}>
                    {Math.round(image.aiResults.confidence * 100)}% confidence
                  </span>
                )}
              </div>
              
              {image.aiResults && (
                <div className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  <span className="truncate">
                    Objects: {image.aiResults.objects.join(', ')}
                  </span>
                </div>
              )}
              
              {image.assignedProduct && (
                <div className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  <span>Assigned to: {image.assignedProduct.name} ({image.assignedProduct.barcode})</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  Details
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{image.filename}</DialogTitle>
                </DialogHeader>
                <ImageDetailsView image={image} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ImageDetailsView({ image }: { image: ProcessedImage }) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Image Preview */}
      <div className="flex justify-center">
        <div className="max-w-md">
          <img
            src={image.url}
            alt={image.filename}
            className="w-full h-auto rounded-lg shadow-lg"
          />
        </div>
      </div>

      {/* File Information */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="font-medium">Filename:</span>
          <p className="text-muted-foreground break-all">{image.filename}</p>
        </div>
        <div>
          <span className="font-medium">Size:</span>
          <p className="text-muted-foreground">{formatFileSize(image.size)}</p>
        </div>
        <div>
          <span className="font-medium">Uploaded:</span>
          <p className="text-muted-foreground">
            {new Date(image.uploadedAt).toLocaleString()}
          </p>
        </div>
        <div>
          <span className="font-medium">Status:</span>
          <div className="mt-1">
            {image.status === 'processing' && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Processing
              </Badge>
            )}
            {image.status === 'processed' && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Processed
              </Badge>
            )}
            {image.status === 'assigned' && (
              <Badge variant="default" className="bg-purple-100 text-purple-800">
                <Package className="h-3 w-3 mr-1" />
                Assigned
              </Badge>
            )}
            {image.status === 'error' && (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                Error
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* AI Results */}
      {image.aiResults && (
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            AI Analysis Results
          </h4>
          
          <div className="grid gap-4">
            <div>
              <span className="font-medium text-sm">Detected Objects:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {image.aiResults.objects.map((object, index) => (
                  <Badge key={index} variant="outline">
                    {object}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div>
              <span className="font-medium text-sm">Extracted Text:</span>
              <p className="text-muted-foreground text-sm mt-1 p-2 bg-muted rounded">
                {image.aiResults.extractedText || 'No text detected'}
              </p>
            </div>
            
            <div>
              <span className="font-medium text-sm">AI Description:</span>
              <p className="text-muted-foreground text-sm mt-1">
                {image.aiResults.description}
              </p>
            </div>
            
            <div>
              <span className="font-medium text-sm">Confidence Score:</span>
              <p className="text-sm mt-1">
                <span className={`font-medium ${
                  image.aiResults.confidence >= 0.9 ? 'text-green-600' :
                  image.aiResults.confidence >= 0.7 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {Math.round(image.aiResults.confidence * 100)}%
                </span>
                <span className="text-muted-foreground ml-2">
                  ({image.aiResults.confidence >= 0.9 ? 'High' : 
                    image.aiResults.confidence >= 0.7 ? 'Medium' : 'Low'} confidence)
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Information */}
      {image.assignedProduct && (
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <Package className="h-4 w-4" />
            Product Assignment
          </h4>
          <div className="p-3 bg-purple-50 rounded-lg">
            <div className="font-medium text-purple-900">{image.assignedProduct.name}</div>
            <div className="text-sm text-purple-700">Barcode: {image.assignedProduct.barcode}</div>
          </div>
        </div>
      )}
    </div>
  )
}