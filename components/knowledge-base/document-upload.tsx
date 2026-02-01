"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import {
  Upload,
  FileText,
  FileSpreadsheet,
  FileCode,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

// ============================================================================
// Type Definitions
// ============================================================================

interface DocumentCategory {
  id: string
  name: string
  slug: string
  description: string | null
}

interface DocumentUploadProps {
  categories: DocumentCategory[]
  onUploadComplete?: () => void
}

interface UploadState {
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error'
  progress: number
  message: string
}

// ============================================================================
// Helper Functions
// ============================================================================

function getFileIcon(filename: string) {
  const ext = filename.toLowerCase().split('.').pop()
  switch (ext) {
    case 'pdf':
      return <FileText className="h-8 w-8 text-red-500" />
    case 'docx':
    case 'doc':
      return <FileSpreadsheet className="h-8 w-8 text-blue-500" />
    case 'md':
    case 'markdown':
      return <FileCode className="h-8 w-8 text-gray-500" />
    default:
      return <FileText className="h-8 w-8 text-muted-foreground" />
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isValidFileType(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop()
  return ['pdf', 'docx', 'doc', 'md', 'markdown'].includes(ext || '')
}

// ============================================================================
// Component
// ============================================================================

export function DocumentUpload({ categories, onUploadComplete }: DocumentUploadProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [generateDocNumber, setGenerateDocNumber] = useState(true)
  const [documentNumber, setDocumentNumber] = useState("")
  const [effectiveDate, setEffectiveDate] = useState("")
  const [reviewCycleDays, setReviewCycleDays] = useState("365")

  // Upload state
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    message: '',
  })

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false)

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    if (!isValidFileType(file.name)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload a PDF, DOCX, or Markdown file.",
      })
      return
    }

    setSelectedFile(file)
    // Auto-fill title from filename if empty
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '))
    }
  }, [title, toast])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  // Clear file
  const clearFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Reset form
  const resetForm = () => {
    clearFile()
    setTitle("")
    setDescription("")
    setCategory("")
    setGenerateDocNumber(true)
    setDocumentNumber("")
    setEffectiveDate("")
    setReviewCycleDays("365")
    setUploadState({ status: 'idle', progress: 0, message: '' })
  }

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        variant: "destructive",
        title: "No file selected",
        description: "Please select a document to upload.",
      })
      return
    }

    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Title required",
        description: "Please enter a title for the document.",
      })
      return
    }

    if (!category) {
      toast({
        variant: "destructive",
        title: "Category required",
        description: "Please select a category for the document.",
      })
      return
    }

    setUploadState({ status: 'uploading', progress: 10, message: 'Uploading file...' })

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('title', title.trim())
      formData.append('description', description.trim())
      formData.append('category', category)
      formData.append('generateDocNumber', String(generateDocNumber))
      if (!generateDocNumber && documentNumber) {
        formData.append('documentNumber', documentNumber)
      }
      if (effectiveDate) {
        formData.append('effectiveDate', effectiveDate)
      }
      if (reviewCycleDays) {
        formData.append('reviewCycleDays', reviewCycleDays)
      }

      setUploadState({ status: 'uploading', progress: 30, message: 'Processing document...' })

      const response = await fetch('/api/knowledge-base/documents', {
        method: 'POST',
        body: formData,
      })

      setUploadState({ status: 'processing', progress: 60, message: 'Creating chunks...' })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setUploadState({ status: 'success', progress: 100, message: 'Document uploaded successfully!' })

      toast({
        title: "Document uploaded",
        description: `"${title}" has been processed with ${data.chunksCreated} chunks.`,
      })

      // Reset form after success
      setTimeout(() => {
        resetForm()
        onUploadComplete?.()
      }, 1500)

    } catch (error) {
      console.error('Upload error:', error)
      setUploadState({
        status: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Upload failed',
      })

      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const isUploading = uploadState.status === 'uploading' || uploadState.status === 'processing'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Document</CardTitle>
        <CardDescription>
          Upload PDF, Word (DOCX), or Markdown files for the knowledge base
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : selectedFile
              ? 'border-green-500 bg-green-50'
              : 'border-muted-foreground/25'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.md,.markdown"
            onChange={handleInputChange}
            className="hidden"
            id="document-upload"
            disabled={isUploading}
          />

          {selectedFile ? (
            <div className="flex items-center justify-center gap-4">
              {getFileIcon(selectedFile.name)}
              <div className="text-left">
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              {!isUploading && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearFile}
                  className="ml-4"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <label
              htmlFor="document-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">
                Drop a file here or click to upload
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Supports PDF, DOCX, and Markdown files
              </p>
            </label>
          )}
        </div>

        {/* Upload Progress */}
        {uploadState.status !== 'idle' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {uploadState.status === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : uploadState.status === 'error' ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin" />
              )}
              <span className="text-sm">{uploadState.message}</span>
            </div>
            <Progress value={uploadState.progress} />
          </div>
        )}

        {/* Document Metadata Form */}
        {selectedFile && uploadState.status === 'idle' && (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the document"
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.slug}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* MDSAP Fields */}
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium">MDSAP Compliance Fields</h4>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="generateDocNumber">Auto-generate Document Number</Label>
                  <p className="text-xs text-muted-foreground">
                    Generate a sequential document number based on category
                  </p>
                </div>
                <Switch
                  id="generateDocNumber"
                  checked={generateDocNumber}
                  onCheckedChange={setGenerateDocNumber}
                />
              </div>

              {!generateDocNumber && (
                <div className="grid gap-2">
                  <Label htmlFor="documentNumber">Document Number</Label>
                  <Input
                    id="documentNumber"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    placeholder="e.g., SOP-QA-001"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="effectiveDate">Effective Date</Label>
                  <Input
                    id="effectiveDate"
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="reviewCycleDays">Review Cycle (days)</Label>
                  <Input
                    id="reviewCycleDays"
                    type="number"
                    value={reviewCycleDays}
                    onChange={(e) => setReviewCycleDays(e.target.value)}
                    placeholder="365"
                  />
                </div>
              </div>
            </div>

            {/* Upload Button */}
            <Button onClick={handleUpload} className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
