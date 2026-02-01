"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  FileText,
  FileCode,
  FileSpreadsheet,
  Calendar,
  User,
  Hash,
  RefreshCw,
  Clock,
  FileSearch,
  History,
  Loader2,
  ArrowLeft,
  Download,
  Zap,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { ApprovalWorkflow, ApprovalStatusBadge, type ApprovalStatus } from "./approval-workflow"

// ============================================================================
// Type Definitions
// ============================================================================

interface DocumentChunk {
  id: string
  index: number
  content: string
  contentType: string
  sectionTitle: string | null
  sectionPath: string | null
  pageNumber: number | null
  wordCount: number
  tokenEstimate: number
  hasEmbedding: boolean
}

interface AuditEntry {
  id: string
  action: string
  fieldChanged: string | null
  oldValue: string | null
  newValue: string | null
  performedBy: string | null
  performedAt: string
  notes: string | null
}

interface DocumentDetailProps {
  documentId: string
  onBack?: () => void
}

interface DocumentData {
  id: string
  title: string
  description: string | null
  category: string
  sub_category: string | null
  tags: string | null
  source_type: string
  filename: string
  file_path: string | null
  file_size: number
  document_number: string | null
  version: string
  revision_number: number
  effective_date: string | null
  expiry_date: string | null
  review_cycle_days: number | null
  approval_status: ApprovalStatus
  approved_by: string | null
  approved_at: string | null
  processing_status: string
  chunks_count: number
  created_by: string | null
  created_at: string
  updated_by: string | null
  updated_at: string
}

// ============================================================================
// Helper Functions
// ============================================================================

function getFileIcon(sourceType: string) {
  switch (sourceType) {
    case 'pdf':
      return <FileText className="h-5 w-5 text-red-500" />
    case 'docx':
    case 'doc':
      return <FileSpreadsheet className="h-5 w-5 text-blue-500" />
    case 'md':
    case 'markdown':
      return <FileCode className="h-5 w-5 text-gray-500" />
    default:
      return <FileText className="h-5 w-5 text-muted-foreground" />
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ============================================================================
// Component
// ============================================================================

export function DocumentDetail({ documentId, onBack }: DocumentDetailProps) {
  const { toast } = useToast()
  const [document, setDocument] = useState<DocumentData | null>(null)
  const [chunks, setChunks] = useState<DocumentChunk[]>([])
  const [history, setHistory] = useState<AuditEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isReprocessing, setIsReprocessing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  // Fetch document data
  useEffect(() => {
    async function fetchDocument() {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/knowledge-base/documents/${documentId}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load document')
        }

        setDocument(data.document)
      } catch (error) {
        console.error('Error loading document:', error)
        toast({
          variant: "destructive",
          title: "Error",
          description: error instanceof Error ? error.message : 'Failed to load document',
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchDocument()
  }, [documentId, toast])

  // Fetch chunks when tab changes
  useEffect(() => {
    if (activeTab === 'chunks' && chunks.length === 0) {
      fetchChunks()
    }
    if (activeTab === 'history' && history.length === 0) {
      fetchHistory()
    }
  }, [activeTab])

  async function fetchChunks() {
    try {
      const response = await fetch(`/api/knowledge-base/documents/${documentId}/chunks`)
      const data = await response.json()

      if (response.ok) {
        setChunks(data.chunks)
      }
    } catch (error) {
      console.error('Error loading chunks:', error)
    }
  }

  async function fetchHistory() {
    try {
      const response = await fetch(`/api/knowledge-base/documents/${documentId}/history`)
      const data = await response.json()

      if (response.ok) {
        setHistory(data.entries)
      }
    } catch (error) {
      console.error('Error loading history:', error)
    }
  }

  async function handleReprocess() {
    setIsReprocessing(true)
    try {
      const response = await fetch(`/api/knowledge-base/documents/${documentId}/reprocess`, {
        method: 'POST',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Reprocessing failed')
      }

      toast({
        title: "Document reprocessed",
        description: `Created ${data.chunksCreated} chunks.`,
      })

      // Refresh document and chunks
      setDocument(data.document)
      setChunks([])
      if (activeTab === 'chunks') {
        fetchChunks()
      }
    } catch (error) {
      console.error('Reprocess error:', error)
      toast({
        variant: "destructive",
        title: "Reprocessing failed",
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsReprocessing(false)
    }
  }

  function handleStatusChange(newStatus: ApprovalStatus) {
    if (document) {
      setDocument({ ...document, approval_status: newStatus })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Document not found</p>
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <div className="flex items-center gap-3">
              {getFileIcon(document.source_type)}
              <h1 className="text-2xl font-bold">{document.title}</h1>
            </div>
            {document.description && (
              <p className="text-muted-foreground mt-1">{document.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">{document.category}</Badge>
              <ApprovalStatusBadge status={document.approval_status} />
              {document.document_number && (
                <Badge variant="secondary">
                  <Hash className="h-3 w-3 mr-1" />
                  {document.document_number}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReprocess}
            disabled={isReprocessing}
          >
            {isReprocessing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Reprocess
          </Button>
          {document.file_path && (
            <Button variant="outline" size="sm" asChild>
              <a href={document.file_path} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-2" />
                Download
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="chunks">
            <FileSearch className="h-4 w-4 mr-1" />
            Chunks ({document.chunks_count})
          </TabsTrigger>
          <TabsTrigger value="approval">
            <Zap className="h-4 w-4 mr-1" />
            Approval
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-1" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* File Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">File Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Filename</span>
                  <span className="font-medium">{document.filename}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium uppercase">{document.source_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Size</span>
                  <span className="font-medium">{formatFileSize(document.file_size)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Processing Status</span>
                  <Badge variant={document.processing_status === 'completed' ? 'default' : 'secondary'}>
                    {document.processing_status}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* MDSAP Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">MDSAP Compliance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Document Number</span>
                  <span className="font-medium">{document.document_number || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version</span>
                  <span className="font-medium">v{document.version} (Rev {document.revision_number})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Effective Date</span>
                  <span className="font-medium">{formatDate(document.effective_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Review Cycle</span>
                  <span className="font-medium">
                    {document.review_cycle_days ? `${document.review_cycle_days} days` : '-'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Audit Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Audit Trail</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">{formatDateTime(document.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created By</span>
                  <span className="font-medium">{document.created_by || 'System'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span className="font-medium">{formatDateTime(document.updated_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated By</span>
                  <span className="font-medium">{document.updated_by || '-'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            {document.tags && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {JSON.parse(document.tags).map((tag: string, i: number) => (
                      <Badge key={i} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Chunks Tab */}
        <TabsContent value="chunks">
          <Card>
            <CardHeader>
              <CardTitle>Document Chunks</CardTitle>
              <CardDescription>
                {chunks.length} chunks extracted from this document
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chunks.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading chunks...
                </div>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {chunks.map((chunk) => (
                    <AccordionItem key={chunk.id} value={chunk.id}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-3 text-left">
                          <Badge variant="outline" className="shrink-0">
                            #{chunk.index + 1}
                          </Badge>
                          <span className="truncate">
                            {chunk.sectionTitle || `Chunk ${chunk.index + 1}`}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {chunk.wordCount} words
                          </span>
                          {chunk.hasEmbedding && (
                            <Badge variant="secondary" className="shrink-0">
                              <Zap className="h-3 w-3 mr-1" />
                              Embedded
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3">
                          {chunk.sectionPath && (
                            <div className="text-xs text-muted-foreground">
                              Path: {chunk.sectionPath}
                            </div>
                          )}
                          {chunk.pageNumber && (
                            <div className="text-xs text-muted-foreground">
                              Page: {chunk.pageNumber}
                            </div>
                          )}
                          <div className="bg-muted p-3 rounded-md text-sm whitespace-pre-wrap">
                            {chunk.content}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approval Tab */}
        <TabsContent value="approval">
          <ApprovalWorkflow
            documentId={documentId}
            documentTitle={document.title}
            currentStatus={document.approval_status}
            approvedBy={document.approved_by}
            approvedAt={document.approved_at}
            onStatusChange={handleStatusChange}
          />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Audit History</CardTitle>
              <CardDescription>
                Complete history of changes to this document
              </CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading history...
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((entry) => (
                    <div key={entry.id} className="flex gap-4 border-b pb-4 last:border-0">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium capitalize">
                            {entry.action.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(entry.performedAt)}
                          </span>
                        </div>
                        {entry.performedBy && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <User className="h-3 w-3" />
                            {entry.performedBy}
                          </div>
                        )}
                        {entry.fieldChanged && (
                          <div className="text-sm mt-1">
                            <span className="text-muted-foreground">{entry.fieldChanged}:</span>{' '}
                            <span className="line-through text-red-500">{entry.oldValue}</span>{' '}
                            → <span className="text-green-500">{entry.newValue}</span>
                          </div>
                        )}
                        {entry.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
