"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Database,
  Upload,
  Search,
  Layers,
  BarChart3,
  RefreshCw,
  FileSpreadsheet,
  Loader2,
  Check,
  AlertCircle,
  Trash2,
  Eye,
  DollarSign,
  Tag,
  Package,
  Building,
  Settings,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Clock,
  X,
  Copy,
  MessageSquare,
  Bot,
  GraduationCap,
  ExternalLink,
} from "lucide-react"
import { KBSettings } from "@/components/knowledge-base/kb-settings"
import { ColumnSelector } from "@/components/knowledge-base/column-selector"
import { DynamicDataTable } from "@/components/knowledge-base/dynamic-data-table"
import { DocumentList } from "@/components/knowledge-base/document-list"
import { DocumentUpload } from "@/components/knowledge-base/document-upload"
import { DocumentDetail } from "@/components/knowledge-base/document-detail"
import {
  type ColumnConfig,
  type ColumnPreferences,
  loadColumnPreferences,
  saveColumnPreferences,
  getDefaultColumnPreferences,
  extractMetadataColumns,
} from "@/lib/knowledge-base/column-config"
import {
  type SearchHistoryItem,
  getHistory,
  addToHistory,
  clearHistory,
  formatTimestamp,
} from "@/lib/knowledge-base/search-history"
import { SearchFilters, type ActiveFilters } from "@/components/knowledge-base/search-filters"
import { AnalyticsDashboard } from "@/components/knowledge-base/analytics-dashboard"

interface KBStats {
  total_items: number
  items_with_price: number
  items_with_embedding: number
  items_missing_embedding: number
  total_sources: number
  categories: string[]
  sources_by_type: Record<string, number>
}

interface KBItem {
  id: string
  item_name: string
  description: string | null
  manufacturer: string | null
  manufacturer_part_number: string | null
  category: string | null
  price_low: number | null
  price_high: number | null
  price_unit?: string
  source_type: string
  source_filename: string | null
  source_id?: string | null
  has_embedding: number
  embedding_id?: string | null
  image_url?: string | null
  barcode?: string | null
  sku?: string | null
  metadata?: string | null
  created_at: string
  updated_at?: string
}

interface EmbeddingStats {
  total_items: number
  items_with_embedding: number
  items_missing_embedding: number
  vector_search_available: boolean
  chromadb_status: string
  openai_status: string
}

export default function KnowledgeBasePage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [stats, setStats] = useState<KBStats | null>(null)
  const [recentItems, setRecentItems] = useState<KBItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Data tab state
  const [items, setItems] = useState<KBItem[]>([])
  const [itemsTotal, setItemsTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(0)
  const [isLoadingItems, setIsLoadingItems] = useState(false)

  // Column preferences state
  const [columnPreferences, setColumnPreferences] = useState<ColumnPreferences>(getDefaultColumnPreferences())
  const [dynamicColumns, setDynamicColumns] = useState<ColumnConfig[]>([])

  // Documents tab state
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [documentCategories, setDocumentCategories] = useState<Array<{ id: string; name: string; slug: string; description: string | null }>>([])
  const [documentsRefreshKey, setDocumentsRefreshKey] = useState(0)

  // Load column preferences on mount
  useEffect(() => {
    setColumnPreferences(loadColumnPreferences())
  }, [])

  // Extract dynamic columns from metadata when items change
  useEffect(() => {
    if (items.length > 0) {
      const metaCols = extractMetadataColumns(items)
      setDynamicColumns(metaCols)
    }
  }, [items])

  // Handle column preferences change
  const handleColumnPreferencesChange = (newPrefs: ColumnPreferences) => {
    setColumnPreferences(newPrefs)
    saveColumnPreferences(newPrefs)
  }

  // Fetch document categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch('/api/knowledge-base/categories')
        if (response.ok) {
          const data = await response.json()
          setDocumentCategories(data.categories || [])
        }
      } catch (error) {
        console.error('Failed to fetch document categories:', error)
      }
    }
    fetchCategories()
  }, [])

  // Upload tab state
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState<any>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Embeddings tab state
  const [embeddingStats, setEmbeddingStats] = useState<EmbeddingStats | null>(null)
  const [isGeneratingEmbeddings, setIsGeneratingEmbeddings] = useState(false)

  // Search tab state
  const [semanticQuery, setSemanticQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [extractedAnswer, setExtractedAnswer] = useState<{
    answer: string
    confidence: number
    answerType: string
    evidence: Array<{
      text: string
      source: string
      sourceType: string
      similarity: number
      highlight?: string
    }>
  } | null>(null)

  // Answer feedback state
  const [answerFeedback, setAnswerFeedback] = useState<'positive' | 'negative' | null>(null)
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)

  // Search history state
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([])
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false)

  // Search filters state
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    categories: [],
    manufacturers: [],
    priceRange: null
  })

  // Load search history on mount
  useEffect(() => {
    setSearchHistory(getHistory())
  }, [])

  // Item detail dialog
  const [selectedItem, setSelectedItem] = useState<KBItem | null>(null)

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/knowledge-base")
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setRecentItems(data.recentItems || [])
      }
    } catch (error) {
      console.error("Failed to fetch KB stats:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch items for data tab
  const fetchItems = useCallback(async () => {
    setIsLoadingItems(true)
    try {
      const params = new URLSearchParams({
        limit: "20",
        offset: String(currentPage * 20),
      })
      if (searchQuery) params.set("query", searchQuery)
      if (categoryFilter) params.set("category", categoryFilter)

      const response = await fetch(`/api/knowledge-base/items?${params}`)
      if (response.ok) {
        const data = await response.json()
        setItems(data.items)
        setItemsTotal(data.total)
      }
    } catch (error) {
      console.error("Failed to fetch items:", error)
    } finally {
      setIsLoadingItems(false)
    }
  }, [currentPage, searchQuery, categoryFilter])

  // Fetch embedding stats
  const fetchEmbeddingStats = useCallback(async () => {
    try {
      const response = await fetch("/api/knowledge-base/embeddings")
      if (response.ok) {
        const data = await response.json()
        setEmbeddingStats(data)
      }
    } catch (error) {
      console.error("Failed to fetch embedding stats:", error)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  useEffect(() => {
    if (activeTab === "data") {
      fetchItems()
    } else if (activeTab === "embeddings") {
      fetchEmbeddingStats()
    }
  }, [activeTab, fetchItems, fetchEmbeddingStats])

  // Handle file selection for preview
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadFile(file)
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("preview", "true")

      const response = await fetch("/api/knowledge-base/upload", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setUploadPreview(data)
        setColumnMapping(data.suggestedMapping || {})
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Preview failed",
          description: error.error,
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to preview file",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Handle file import
  const handleImport = async () => {
    if (!uploadFile) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", uploadFile)
      formData.append("mapping", JSON.stringify(columnMapping))
      formData.append("generateEmbeddings", "true")

      const response = await fetch("/api/knowledge-base/upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Import successful",
          description: `Imported ${data.itemsImported} items (${data.itemsWithPrice} with pricing)`,
        })
        setUploadFile(null)
        setUploadPreview(null)
        setColumnMapping({})
        if (fileInputRef.current) fileInputRef.current.value = ""
        fetchDashboardData()
      } else {
        toast({
          variant: "destructive",
          title: "Import failed",
          description: data.error || "Unknown error",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to import file",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Generate embeddings
  const handleGenerateEmbeddings = async () => {
    setIsGeneratingEmbeddings(true)
    try {
      const response = await fetch("/api/knowledge-base/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize: 100 }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Embeddings generated",
          description: `Processed ${data.processed} items (${data.added} added, ${data.failed} failed)`,
        })
        fetchEmbeddingStats()
      } else {
        toast({
          variant: "destructive",
          title: "Generation failed",
          description: data.error,
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate embeddings",
      })
    } finally {
      setIsGeneratingEmbeddings(false)
    }
  }

  // Semantic search with Answer Extraction
  const handleSemanticSearch = async () => {
    if (!semanticQuery.trim()) return

    setIsSearching(true)
    setExtractedAnswer(null)
    setAnswerFeedback(null) // Reset feedback state for new search

    try {
      // Call the Answer Extraction API to get actual content from documents
      const answerResponse = await fetch('/api/knowledge-base/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: semanticQuery,
          options: {
            searchDocuments: true,
            searchKBItems: true,
            useAI: true,
            maxChunks: 10,
            expandQuery: true,
            highlightRelevantSentences: true
          }
        })
      })

      if (answerResponse.ok) {
        const answerData = await answerResponse.json()

        // Set the extracted answer if we got one
        if (answerData.answer) {
          setExtractedAnswer({
            answer: answerData.answer,
            confidence: answerData.confidence || 0,
            answerType: answerData.answerType || 'unknown',
            evidence: answerData.evidence || []
          })
        }

        // Add to search history
        setSearchHistory(addToHistory(semanticQuery))

        // Also fetch regular search results for the list view (with filters)
        const searchParams = new URLSearchParams({
          q: semanticQuery,
          limit: '10'
        })
        if (activeFilters.categories.length > 0) {
          searchParams.set('categories', activeFilters.categories.join(','))
        }
        if (activeFilters.manufacturers.length > 0) {
          searchParams.set('manufacturers', activeFilters.manufacturers.join(','))
        }
        if (activeFilters.priceRange) {
          searchParams.set('priceMin', String(activeFilters.priceRange.min))
          searchParams.set('priceMax', String(activeFilters.priceRange.max))
        }

        const searchResponse = await fetch(
          `/api/knowledge-base/search?${searchParams.toString()}`
        )

        if (searchResponse.ok) {
          const searchData = await searchResponse.json()
          setSearchResults(searchData.results || [])
        }
      } else {
        // Fallback to regular search if answer extraction fails
        const searchResponse = await fetch(
          `/api/knowledge-base/search?q=${encodeURIComponent(semanticQuery)}&limit=10`
        )

        if (searchResponse.ok) {
          const searchData = await searchResponse.json()
          setSearchResults(searchData.results || [])
        } else {
          const error = await searchResponse.json()
          toast({
            variant: "destructive",
            title: "Search failed",
            description: error.error,
          })
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Search failed",
      })
    } finally {
      setIsSearching(false)
    }
  }

  // Handle answer feedback (thumbs up/down)
  const handleAnswerFeedback = async (isPositive: boolean) => {
    if (!extractedAnswer || !semanticQuery) return

    setIsSubmittingFeedback(true)
    try {
      const response = await fetch('/api/knowledge-base/answer/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: semanticQuery,
          answer: extractedAnswer.answer,
          isPositive,
          confidenceScore: extractedAnswer.confidence,
          sourceType: extractedAnswer.evidence?.[0]?.sourceType || 'unknown'
        })
      })

      if (response.ok) {
        setAnswerFeedback(isPositive ? 'positive' : 'negative')
        toast({
          title: isPositive ? "Thanks for the feedback!" : "Thanks for letting us know",
          description: isPositive
            ? "This helps improve our answers."
            : "We'll work on improving this type of answer.",
        })
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Feedback failed",
          description: error.error || "Could not submit feedback",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit feedback",
      })
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  // Handle filter changes - auto re-search if there's a query
  const handleFiltersChange = (newFilters: ActiveFilters) => {
    setActiveFilters(newFilters)
    // If there's an active query, re-search with new filters
    if (semanticQuery.trim()) {
      // Trigger search after state update
      setTimeout(() => handleSemanticSearch(), 100)
    }
  }

  // Copy to clipboard utility
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Could not copy to clipboard",
      })
    }
  }

  // Delete item
  const handleDeleteItem = async (id: string) => {
    try {
      const response = await fetch(`/api/knowledge-base/items/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({ title: "Item deleted" })
        fetchItems()
        fetchDashboardData()
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete item",
      })
    }
  }

  const formatPrice = (low: number | null, high: number | null) => {
    if (low === null && high === null) return "—"
    if (low !== null && high !== null && low !== high) {
      return `$${low.toFixed(2)} - $${high.toFixed(2)}`
    }
    return `$${(low ?? high)?.toFixed(2)}`
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="h-8 w-8" />
            Knowledge Base
          </h1>
          <p className="text-muted-foreground">
            AI-powered product reference database with semantic search
          </p>
        </div>
        <Button onClick={fetchDashboardData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-auto min-w-full">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="embeddings" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Embeddings
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="agents" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Agents
            </TabsTrigger>
            <TabsTrigger value="training" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Training
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.total_items || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">With Price</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.items_with_price || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">With Embeddings</CardTitle>
                    <Layers className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.items_with_embedding || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Sources</CardTitle>
                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.total_sources || 0}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions & Recent Items */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Common tasks for managing your knowledge base</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-2">
                    <Button
                      variant="outline"
                      className="justify-start"
                      onClick={() => setActiveTab("upload")}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Files
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start"
                      onClick={() => setActiveTab("search")}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Semantic Search
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start"
                      onClick={() => setActiveTab("embeddings")}
                    >
                      <Layers className="h-4 w-4 mr-2" />
                      Generate Embeddings
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start"
                      onClick={() => setActiveTab("data")}
                    >
                      <Database className="h-4 w-4 mr-2" />
                      Browse Data
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Items</CardTitle>
                    <CardDescription>Latest items added to the knowledge base</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentItems.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No items yet. Upload a file to get started.</p>
                    ) : (
                      <div className="space-y-2">
                        {recentItems.slice(0, 5).map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer"
                            onClick={() => setSelectedItem(item)}
                          >
                            <div className="truncate flex-1">
                              <p className="font-medium truncate">{item.item_name}</p>
                              <p className="text-sm text-muted-foreground truncate">
                                {item.manufacturer || item.source_filename || "—"}
                              </p>
                            </div>
                            {(item.price_low || item.price_high) && (
                              <Badge variant="secondary" className="ml-2">
                                {formatPrice(item.price_low, item.price_high)}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Categories */}
              {stats?.categories && stats.categories.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {stats.categories.map((cat) => (
                        <Badge key={cat} variant="outline">
                          <Tag className="h-3 w-3 mr-1" />
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Data Tab */}
        <TabsContent value="data" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(0)
                }}
                onKeyDown={(e) => e.key === "Enter" && fetchItems()}
              />
            </div>
            <Select
              value={categoryFilter}
              onValueChange={(v) => {
                setCategoryFilter(v === "all" ? "" : v)
                setCurrentPage(0)
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {stats?.categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={fetchItems} disabled={isLoadingItems}>
              {isLoadingItems ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
            <ColumnSelector
              preferences={columnPreferences}
              onPreferencesChange={handleColumnPreferencesChange}
              dynamicColumns={dynamicColumns}
              disabled={isLoadingItems}
            />
          </div>

          {/* Items Table - Dynamic Columns */}
          <Card>
            <CardContent className="p-0">
              <DynamicDataTable
                items={items}
                preferences={columnPreferences}
                dynamicColumns={dynamicColumns}
                isLoading={isLoadingItems}
                onViewItem={(item) => setSelectedItem(item)}
                onDeleteItem={(itemId) => handleDeleteItem(itemId)}
              />
            </CardContent>
          </Card>

          {/* Pagination */}
          {itemsTotal > 20 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {currentPage * 20 + 1} - {Math.min((currentPage + 1) * 20, itemsTotal)} of {itemsTotal}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(currentPage + 1) * 20 >= itemsTotal}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          {selectedDocumentId ? (
            <DocumentDetail
              documentId={selectedDocumentId}
              onBack={() => setSelectedDocumentId(null)}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <DocumentList
                  key={documentsRefreshKey}
                  onSelectDocument={(id) => setSelectedDocumentId(id)}
                />
              </div>
              <div>
                <DocumentUpload
                  categories={documentCategories}
                  onUploadComplete={() => setDocumentsRefreshKey(k => k + 1)}
                />
              </div>
            </div>
          )}
        </TabsContent>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload File</CardTitle>
              <CardDescription>
                Import data from XLSX or CSV files. Column mapping will be auto-detected.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">
                    {uploadFile ? uploadFile.name : "Click to upload"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supports XLSX and CSV files
                  </p>
                </label>
              </div>

              {/* Preview Section */}
              {uploadPreview && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Preview</h3>
                    <p className="text-sm text-muted-foreground">
                      {uploadPreview.totalRows} rows detected
                    </p>
                  </div>

                  {/* Column Mapping */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {Object.entries({
                      item_name: "Item Name *",
                      description: "Description",
                      manufacturer: "Manufacturer",
                      manufacturer_part_number: "Part Number",
                      category: "Category",
                      price_low: "Price (Low)",
                      price_high: "Price (High)",
                    }).map(([field, label]) => (
                      <div key={field} className="space-y-1">
                        <Label>{label}</Label>
                        <Select
                          value={columnMapping[field] || ""}
                          onValueChange={(v) =>
                            setColumnMapping((prev) => ({
                              ...prev,
                              [field]: v === "none" ? "" : v,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— Not mapped —</SelectItem>
                            {uploadPreview.headers.map((header: string) => (
                              <SelectItem key={header} value={header}>
                                {header}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>

                  {/* Sample Data */}
                  {uploadPreview.sampleRows?.length > 0 && (
                    <div className="overflow-x-auto">
                      <h4 className="text-sm font-medium mb-2">Sample Data</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {uploadPreview.headers.map((h: string) => (
                              <TableHead key={h} className="whitespace-nowrap">
                                {h}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {uploadPreview.sampleRows.slice(0, 3).map((row: any, idx: number) => (
                            <TableRow key={idx}>
                              {uploadPreview.headers.map((h: string) => (
                                <TableCell key={h} className="max-w-[200px] truncate">
                                  {row[h] || "—"}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Import Button */}
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setUploadFile(null)
                        setUploadPreview(null)
                        setColumnMapping({})
                        if (fileInputRef.current) fileInputRef.current.value = ""
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleImport} disabled={isUploading || !columnMapping.item_name}>
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Import {uploadPreview.totalRows} Items
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Embeddings Tab */}
        <TabsContent value="embeddings" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Embedding Status</CardTitle>
                <CardDescription>
                  Vector embeddings enable semantic search
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {embeddingStats && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Items</p>
                        <p className="text-2xl font-bold">{embeddingStats.total_items}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">With Embeddings</p>
                        <p className="text-2xl font-bold text-green-600">
                          {embeddingStats.items_with_embedding}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Missing</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {embeddingStats.items_missing_embedding}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Vector Store</p>
                        <p className="text-2xl font-bold">{embeddingStats.vector_search_available ? "Ready" : "Offline"}</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {embeddingStats.total_items > 0 && (
                      <div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-600 transition-all"
                            style={{
                              width: `${(embeddingStats.items_with_embedding / embeddingStats.total_items) * 100}%`,
                            }}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {Math.round((embeddingStats.items_with_embedding / embeddingStats.total_items) * 100)}% complete
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
                <CardDescription>Vector search infrastructure</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {embeddingStats && (
                  <>
                    <div className="flex items-center justify-between">
                      <span>ChromaDB</span>
                      <Badge variant={embeddingStats.chromadb_status === "healthy" ? "default" : "destructive"}>
                        {embeddingStats.chromadb_status === "healthy" ? (
                          <Check className="h-3 w-3 mr-1" />
                        ) : (
                          <AlertCircle className="h-3 w-3 mr-1" />
                        )}
                        {embeddingStats.chromadb_status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>OpenAI Embeddings</span>
                      <Badge variant={embeddingStats.openai_status === "configured" ? "default" : "secondary"}>
                        {embeddingStats.openai_status === "configured" ? (
                          <Check className="h-3 w-3 mr-1" />
                        ) : (
                          <AlertCircle className="h-3 w-3 mr-1" />
                        )}
                        {embeddingStats.openai_status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Semantic Search</span>
                      <Badge variant={embeddingStats.vector_search_available ? "default" : "destructive"}>
                        {embeddingStats.vector_search_available ? "Available" : "Unavailable"}
                      </Badge>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Generate Embeddings</CardTitle>
              <CardDescription>
                Generate vector embeddings for items that don&apos;t have them yet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleGenerateEmbeddings}
                disabled={isGeneratingEmbeddings || !embeddingStats?.vector_search_available}
              >
                {isGeneratingEmbeddings ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Layers className="h-4 w-4 mr-2" />
                    Generate Missing Embeddings
                    {embeddingStats?.items_missing_embedding
                      ? ` (${embeddingStats.items_missing_embedding})`
                      : ""}
                  </>
                )}
              </Button>
              {!embeddingStats?.vector_search_available && (
                <p className="text-sm text-muted-foreground mt-2">
                  Vector search is not available. Make sure ChromaDB is running and OpenAI API key is configured.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Semantic Search</CardTitle>
              <CardDescription>
                Search the knowledge base using natural language
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Search for products, parts, or descriptions..."
                      value={semanticQuery}
                      onChange={(e) => setSemanticQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSemanticSearch()}
                      onFocus={() => searchHistory.length > 0 && setShowHistoryDropdown(true)}
                      onBlur={() => setTimeout(() => setShowHistoryDropdown(false), 200)}
                    />
                    {/* Search History Dropdown */}
                    {showHistoryDropdown && searchHistory.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-background border rounded-md shadow-lg">
                        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
                          <span className="text-xs font-medium flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Recent Searches
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              clearHistory()
                              setSearchHistory([])
                              setShowHistoryDropdown(false)
                            }}
                          >
                            Clear
                          </Button>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {searchHistory.map((item, idx) => (
                            <button
                              key={idx}
                              className="w-full px-3 py-2 text-left hover:bg-muted flex items-center justify-between group text-sm"
                              onClick={() => {
                                setSemanticQuery(item.query)
                                setShowHistoryDropdown(false)
                                // Trigger search automatically
                                setTimeout(() => handleSemanticSearch(), 100)
                              }}
                            >
                              <span className="truncate flex-1">{item.query}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {formatTimestamp(item.timestamp)}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <Button onClick={handleSemanticSearch} disabled={isSearching || !semanticQuery.trim()}>
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Search Filters */}
              <SearchFilters
                activeFilters={activeFilters}
                onFiltersChange={handleFiltersChange}
              />

              {/* Extracted Answer - THE KEY FEATURE: Shows actual content, not just document references */}
              {extractedAnswer && (
                <div className="border-2 border-primary/20 rounded-lg bg-primary/5 p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-primary">Answer Found</h4>
                        <p className="text-xs text-muted-foreground">
                          {extractedAnswer.answerType === 'direct' ? 'Direct match' :
                           extractedAnswer.answerType === 'synthesized' ? 'AI synthesized' :
                           extractedAnswer.answerType === 'partial' ? 'Partial match' : 'Best match'}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={extractedAnswer.confidence >= 0.7 ? "default" :
                               extractedAnswer.confidence >= 0.4 ? "secondary" : "outline"}
                    >
                      {Math.round(extractedAnswer.confidence * 100)}% confidence
                    </Badge>
                  </div>

                  {/* The Actual Answer */}
                  <div className="bg-background rounded-md p-3 border">
                    <p className="text-base leading-relaxed">{extractedAnswer.answer}</p>
                  </div>

                  {/* Evidence/Source Passages */}
                  {extractedAnswer.evidence && extractedAnswer.evidence.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Source Evidence ({extractedAnswer.evidence.length})
                      </h5>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {extractedAnswer.evidence.map((ev, idx) => (
                          <div key={idx} className="bg-background rounded border p-3 text-sm">
                            {/* Highlighted relevant passage */}
                            {ev.highlight ? (
                              <p className="mb-2">
                                <span className="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">
                                  {ev.highlight}
                                </span>
                              </p>
                            ) : ev.text && (
                              <p className="text-muted-foreground mb-2 line-clamp-3">
                                &ldquo;{ev.text}&rdquo;
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-xs">
                                {ev.sourceType === 'document' ? (
                                  <><FileText className="h-3 w-3 mr-1" />Document</>
                                ) : (
                                  <><Package className="h-3 w-3 mr-1" />Product</>
                                )}
                              </Badge>
                              <span>{ev.source}</span>
                              {ev.similarity > 0 && (
                                <span className="ml-auto">{Math.round(ev.similarity * 100)}% match</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Answer Feedback Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-primary/10">
                    <span className="text-xs text-muted-foreground">Was this answer helpful?</span>
                    <div className="flex items-center gap-2">
                      {answerFeedback ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          {answerFeedback === 'positive' ? (
                            <>
                              <ThumbsUp className="h-3 w-3 text-green-600" />
                              Thanks for your feedback!
                            </>
                          ) : (
                            <>
                              <ThumbsDown className="h-3 w-3 text-orange-600" />
                              We&apos;ll work on improving this.
                            </>
                          )}
                        </span>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                            onClick={() => handleAnswerFeedback(true)}
                            disabled={isSubmittingFeedback}
                          >
                            {isSubmittingFeedback ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <ThumbsUp className="h-4 w-4 mr-1" />
                                Yes
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-muted-foreground hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
                            onClick={() => handleAnswerFeedback(false)}
                            disabled={isSubmittingFeedback}
                          >
                            {isSubmittingFeedback ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <ThumbsDown className="h-4 w-4 mr-1" />
                                No
                              </>
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Search Results List */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">
                    {searchResults.length} related result{searchResults.length !== 1 && "s"}
                  </h4>
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="p-4 border rounded-lg hover:bg-muted cursor-pointer"
                      onClick={() => result.type !== 'document_chunk' && setSelectedItem(result)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Document Chunk Result */}
                          {result.type === 'document_chunk' ? (
                            <>
                              <div className="flex items-center gap-2 mb-1">
                                <FileText className="h-4 w-4 text-blue-500" />
                                <p className="font-medium">{result.documentTitle || result.title}</p>
                              </div>
                              {result.title !== result.documentTitle && (
                                <p className="text-sm text-muted-foreground mb-1">
                                  Section: {result.title}
                                </p>
                              )}
                              {result.excerpt && (
                                <p className="text-sm text-muted-foreground line-clamp-3 bg-muted/50 p-2 rounded">
                                  &ldquo;{result.excerpt}&rdquo;
                                </p>
                              )}
                              <div className="flex gap-2 mt-2">
                                <Badge variant="outline" className="bg-blue-50">
                                  <FileText className="h-3 w-3 mr-1" />
                                  Document
                                </Badge>
                                {result.metadata?.documentCategory && (
                                  <Badge variant="outline">
                                    <Tag className="h-3 w-3 mr-1" />
                                    {result.metadata.documentCategory}
                                  </Badge>
                                )}
                                {result.metadata?.pageNumber && (
                                  <Badge variant="outline">
                                    Page {result.metadata.pageNumber}
                                  </Badge>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              {/* KB Item / Product Result */}
                              <p className="font-medium">{result.item_name || result.title}</p>
                              {(result.description || result.excerpt) && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {result.description || result.excerpt}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                {result.manufacturer && (
                                  <Badge variant="outline">
                                    <Building className="h-3 w-3 mr-1" />
                                    {result.manufacturer}
                                  </Badge>
                                )}
                                {(result.category || result.metadata?.category) && (
                                  <Badge variant="outline">
                                    <Tag className="h-3 w-3 mr-1" />
                                    {result.category || result.metadata?.category}
                                  </Badge>
                                )}

                                {/* Quick Copy Buttons */}
                                <div className="flex items-center gap-1 ml-auto">
                                  {(result.item_name || result.title) && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        copyToClipboard(result.item_name || result.title, "Name")
                                      }}
                                      title="Copy name"
                                    >
                                      <Copy className="h-3 w-3 mr-1" />
                                      Name
                                    </Button>
                                  )}
                                  {result.manufacturer_part_number && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        copyToClipboard(result.manufacturer_part_number, "Part #")
                                      }}
                                      title="Copy part number"
                                    >
                                      <Copy className="h-3 w-3 mr-1" />
                                      Part #
                                    </Button>
                                  )}
                                  {result.barcode && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        copyToClipboard(result.barcode, "Barcode")
                                      }}
                                      title="Copy barcode"
                                    >
                                      <Copy className="h-3 w-3 mr-1" />
                                      Barcode
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary">
                            {result.similarity_percent || Math.round(result.similarity * 100)}% match
                          </Badge>
                          {(result.price_low || result.price_high) && (
                            <p className="text-sm font-medium mt-1">
                              {formatPrice(result.price_low, result.price_high)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {semanticQuery && searchResults.length === 0 && !extractedAnswer && !isSearching && (
                <p className="text-center text-muted-foreground py-8">
                  No results found for &ldquo;{semanticQuery}&rdquo;
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <KBSettings />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <AnalyticsDashboard />
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Knowledge Base Chat
              </CardTitle>
              <CardDescription>
                Chat with your knowledge base using AI. Get answers from products, documents, and more.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <p className="text-muted-foreground text-center max-w-md">
                  Open the full chat interface to have conversations with your knowledge base.
                  The AI will search relevant content and provide informed answers.
                </p>
                <Button asChild>
                  <a href="/knowledge-base/chat" className="flex items-center gap-2">
                    Open Chat
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Custom AI Agents
              </CardTitle>
              <CardDescription>
                Create custom GPT-like agents trained on your knowledge base with specific capabilities.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <p className="text-muted-foreground text-center max-w-md">
                  Build specialized AI agents with custom instructions, knowledge sources, and capabilities.
                  Share agents across your organization.
                </p>
                <Button asChild>
                  <a href="/knowledge-base/agents" className="flex items-center gap-2">
                    Manage Agents
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Training Tab */}
        <TabsContent value="training" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                KB Training & Evaluation
              </CardTitle>
              <CardDescription>
                Train, test, and evaluate your knowledge base for better accuracy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <p className="text-muted-foreground text-center max-w-md">
                  Add training data, run test queries, and track answer accuracy over time.
                  Use feedback to continuously improve your KB.
                </p>
                <Button asChild>
                  <a href="/knowledge-base/training" className="flex items-center gap-2">
                    Open Training
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Item Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedItem?.item_name}</DialogTitle>
            <DialogDescription>Knowledge Base Item Details</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="grid gap-4">
              {selectedItem.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p>{selectedItem.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Manufacturer</Label>
                  <p>{selectedItem.manufacturer || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Part Number</Label>
                  <p className="font-mono">{selectedItem.manufacturer_part_number || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Category</Label>
                  <p>{selectedItem.category || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Price</Label>
                  <p className="font-medium">
                    {formatPrice(selectedItem.price_low, selectedItem.price_high)}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Source</Label>
                  <p>{selectedItem.source_type}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Has Embedding</Label>
                  <p>{selectedItem.has_embedding ? "Yes" : "No"}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedItem(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
