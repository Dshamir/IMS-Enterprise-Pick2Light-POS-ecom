"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { ReviewItem } from "./review-item"
import {
  Loader2,
  RefreshCw,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  AlertTriangle,
  BarChart3,
} from "lucide-react"

interface AISuggestion {
  id: string
  product_id: string | null
  kb_item_id: string | null
  field: "name" | "description" | "price" | "barcode" | "part_number" | "category"
  original_value: string | null
  suggested_value: string | null
  was_applied: boolean
  needs_human_review: boolean
  review_status: "pending" | "approved" | "rejected" | "auto_approved"
  reviewer_id: string | null
  reviewed_at: string | null
  review_notes: string | null
  confidence_score: number | null
  reasons: string[] | null
  retrieval_sources: string[] | null
  prompt_version: string
  model_version: string
  generation_time_ms: number | null
  validation_passed: boolean
  validation_errors: string[] | null
  created_at: string
}

interface SuggestionStats {
  total: number
  pending: number
  approved: number
  rejected: number
  autoApproved: number
  avgConfidence: number
  avgGenerationTime: number
  byField: Record<string, number>
  byReviewStatus: Record<string, number>
}

interface ReviewQueueProps {
  reviewerId?: string
}

export function ReviewQueue({ reviewerId = "system" }: ReviewQueueProps) {
  const { toast } = useToast()
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([])
  const [stats, setStats] = useState<SuggestionStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [fieldFilter, setFieldFilter] = useState<string>("all")
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const limit = 20

  const fetchSuggestions = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        pending: "true",
        limit: limit.toString(),
        offset: (page * limit).toString(),
      })

      if (fieldFilter !== "all") {
        params.set("field", fieldFilter)
      }

      const response = await fetch(`/api/ai-suggestions?${params}`)
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions)
        setTotal(data.total)
      }
    } catch (error) {
      console.error("Failed to fetch suggestions:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load review queue",
      })
    }
  }, [page, fieldFilter, toast])

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/ai-suggestions?stats=true")
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([fetchSuggestions(), fetchStats()])
      setIsLoading(false)
    }
    loadData()
  }, [fetchSuggestions, fetchStats])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([fetchSuggestions(), fetchStats()])
    setIsRefreshing(false)
  }

  const handleReviewComplete = (id: string, decision: "approved" | "rejected") => {
    // Remove from list and refresh stats
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
    setTotal((prev) => prev - 1)
    fetchStats()
  }

  const handleFilterChange = (value: string) => {
    setFieldFilter(value)
    setPage(0)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading review queue...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending Review</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.approved}</p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.rejected}</p>
                  <p className="text-xs text-muted-foreground">Rejected</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.autoApproved}</p>
                  <p className="text-xs text-muted-foreground">Auto-Approved</p>
                </div>
                <Sparkles className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Average Stats */}
      {stats && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <BarChart3 className="h-4 w-4" />
            <span>Avg Confidence: {Math.round(stats.avgConfidence * 100)}%</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>Avg Generation: {stats.avgGenerationTime}ms</span>
          </div>
          <div className="flex items-center gap-1">
            <Sparkles className="h-4 w-4" />
            <span>Total Suggestions: {stats.total}</span>
          </div>
        </div>
      )}

      {/* Queue Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Review Queue</h2>
          <p className="text-sm text-muted-foreground">
            {total} suggestions pending human review
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={fieldFilter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by field" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fields</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="description">Description</SelectItem>
              <SelectItem value="price">Price</SelectItem>
              <SelectItem value="barcode">Barcode</SelectItem>
              <SelectItem value="part_number">Part Number</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Field Distribution */}
      {stats && stats.byField && Object.keys(stats.byField).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.byField).map(([field, count]) => (
            <Badge key={field} variant="outline" className="text-xs">
              {field}: {count}
            </Badge>
          ))}
        </div>
      )}

      {/* Suggestions List */}
      <div className="space-y-4">
        {suggestions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">All Caught Up!</h3>
              <p className="text-muted-foreground">
                No suggestions pending review. Great job!
              </p>
            </CardContent>
          </Card>
        ) : (
          suggestions.map((suggestion) => (
            <ReviewItem
              key={suggestion.id}
              suggestion={suggestion}
              onReviewComplete={handleReviewComplete}
              reviewerId={reviewerId}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {page * limit + 1} - {Math.min((page + 1) * limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * limit >= total}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
