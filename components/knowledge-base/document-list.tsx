"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  Search,
  Eye,
  Trash2,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

// ============================================================================
// Type Definitions
// ============================================================================

interface KBDocument {
  id: string
  source_type: string
  filename: string
  title: string
  description: string | null
  category: string
  processing_status: string
  approval_status: string
  document_number: string | null
  version: string
  chunks_count: number
  created_at: string
}

interface DocumentCategory {
  id: string
  name: string
  slug: string
}

export interface DocumentListProps {
  onSelectDocument?: (documentId: string) => void
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDocumentIcon(sourceType: string) {
  switch (sourceType) {
    case 'pdf':
      return <FileText className="h-10 w-10 text-red-500" />
    case 'docx':
    case 'doc':
      return <FileSpreadsheet className="h-10 w-10 text-blue-500" />
    case 'markdown':
    case 'md':
      return <FileCode className="h-10 w-10 text-gray-500" />
    default:
      return <FileText className="h-10 w-10 text-muted-foreground" />
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Processed
        </Badge>
      )
    case 'processing':
      return (
        <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Processing
        </Badge>
      )
    case 'pending':
      return (
        <Badge variant="default" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      )
    case 'failed':
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function getApprovalBadge(status: string) {
  switch (status) {
    case 'approved':
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
          <FileCheck className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      )
    case 'pending_review':
      return (
        <Badge variant="default" className="bg-orange-100 text-orange-800 hover:bg-orange-100">
          <Clock className="h-3 w-3 mr-1" />
          Pending Review
        </Badge>
      )
    case 'draft':
      return (
        <Badge variant="secondary">
          Draft
        </Badge>
      )
    case 'rejected':
      return (
        <Badge variant="destructive">
          Rejected
        </Badge>
      )
    case 'obsolete':
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Obsolete
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ============================================================================
// Component
// ============================================================================

export function DocumentList({ onSelectDocument }: DocumentListProps) {
  const { toast } = useToast()
  const [documents, setDocuments] = useState<KBDocument[]>([])
  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(0)
  const pageSize = 10

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('query', searchQuery)
      if (categoryFilter !== 'all') params.set('category', categoryFilter)
      if (statusFilter !== 'all') params.set('approval_status', statusFilter)
      params.set('limit', String(pageSize))
      params.set('offset', String(page * pageSize))

      const response = await fetch(`/api/knowledge-base/documents?${params}`)
      const data = await response.json()

      if (response.ok) {
        setDocuments(data.documents || [])
        setTotal(data.total || 0)
        setCategories(data.categories || [])
      } else {
        throw new Error(data.error || 'Failed to fetch documents')
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load documents",
      })
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, categoryFilter, statusFilter, page, toast])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleSearch = () => {
    setPage(0)
    fetchDocuments()
  }

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value)
    setPage(0)
  }

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setPage(0)
  }

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      const response = await fetch(`/api/knowledge-base/documents/${docId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Delete failed')
      }

      toast({
        title: "Document deleted",
        description: "The document has been removed.",
      })

      fetchDocuments()
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const handleReprocess = async (docId: string) => {
    try {
      toast({
        title: "Reprocessing",
        description: "Document is being reprocessed...",
      })

      const response = await fetch(`/api/knowledge-base/documents/${docId}/reprocess`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Reprocess failed')
      }

      toast({
        title: "Reprocessing complete",
        description: `Created ${data.chunksCreated} chunks.`,
      })

      fetchDocuments()
    } catch (error) {
      console.error('Reprocess error:', error)
      toast({
        variant: "destructive",
        title: "Reprocessing failed",
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
        <CardDescription>
          {total} document{total !== 1 ? 's' : ''} in the knowledge base
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={categoryFilter} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.slug} value={cat.slug}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending_review">Pending Review</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="obsolete">Obsolete</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Document List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No documents found</p>
            <p className="text-sm">Upload a document to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => onSelectDocument?.(doc.id)}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    {getDocumentIcon(doc.source_type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-medium text-lg truncate">{doc.title}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {doc.document_number && (
                            <span className="text-sm font-mono text-muted-foreground">
                              {doc.document_number}
                            </span>
                          )}
                          <span className="text-sm text-muted-foreground">
                            v{doc.version}
                          </span>
                          <Badge variant="outline">{doc.category}</Badge>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onSelectDocument?.(doc.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {doc.processing_status !== 'processing' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReprocess(doc.id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(doc.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {doc.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {doc.description}
                      </p>
                    )}

                    {/* Status Row */}
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      {getStatusBadge(doc.processing_status)}
                      {getApprovalBadge(doc.approval_status)}
                      <span className="text-xs text-muted-foreground">
                        {doc.chunks_count} chunks
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(doc.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
