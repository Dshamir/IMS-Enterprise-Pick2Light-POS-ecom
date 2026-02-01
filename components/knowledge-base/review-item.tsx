"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useToast } from "@/components/ui/use-toast"
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertTriangle,
  Type,
  FileText,
  DollarSign,
  Barcode,
  Hash,
  Tag,
  Loader2,
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

interface ReviewItemProps {
  suggestion: AISuggestion
  onReviewComplete: (id: string, decision: "approved" | "rejected") => void
  reviewerId: string
}

const FIELD_ICONS: Record<string, React.ElementType> = {
  name: Type,
  description: FileText,
  price: DollarSign,
  barcode: Barcode,
  part_number: Hash,
  category: Tag,
}

const FIELD_COLORS: Record<string, string> = {
  name: "text-purple-600 bg-purple-50",
  description: "text-teal-600 bg-teal-50",
  price: "text-orange-600 bg-orange-50",
  barcode: "text-blue-600 bg-blue-50",
  part_number: "text-indigo-600 bg-indigo-50",
  category: "text-pink-600 bg-pink-50",
}

export function ReviewItem({ suggestion, onReviewComplete, reviewerId }: ReviewItemProps) {
  const { toast } = useToast()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [reviewNotes, setReviewNotes] = useState("")

  const FieldIcon = FIELD_ICONS[suggestion.field] || Tag
  const fieldColor = FIELD_COLORS[suggestion.field] || "text-gray-600 bg-gray-50"

  const handleReview = async (decision: "approved" | "rejected") => {
    setIsLoading(true)

    try {
      const response = await fetch(`/api/ai-suggestions/${suggestion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: decision === "approved" ? "approve" : "reject",
          reviewerId,
          notes: reviewNotes || undefined,
        }),
      })

      if (response.ok) {
        onReviewComplete(suggestion.id, decision)
        toast({
          title: decision === "approved" ? "Suggestion Approved" : "Suggestion Rejected",
          description: `The ${suggestion.field} suggestion has been ${decision}.`,
        })
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Review Failed",
          description: error.error || "Failed to submit review",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to connect to review service",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatConfidence = (score: number | null) => {
    if (score === null) return "N/A"
    return `${Math.round(score * 100)}%`
  }

  const getConfidenceColor = (score: number | null) => {
    if (score === null) return "bg-gray-100 text-gray-600"
    if (score >= 0.8) return "bg-green-100 text-green-700"
    if (score >= 0.5) return "bg-yellow-100 text-yellow-700"
    return "bg-red-100 text-red-700"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Card className="border-l-4 border-l-yellow-400">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${fieldColor}`}>
              <FieldIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium capitalize">{suggestion.field.replace("_", " ")}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Clock className="h-3 w-3" />
                <span>{formatDate(suggestion.created_at)}</span>
                <span>•</span>
                <span>{suggestion.model_version}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className={getConfidenceColor(suggestion.confidence_score)}>
              {formatConfidence(suggestion.confidence_score)}
            </Badge>
            {!suggestion.validation_passed && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Validation Failed
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Value Comparison */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Original Value</p>
            <p className="text-sm break-words">
              {suggestion.original_value || <span className="text-muted-foreground italic">Not set</span>}
            </p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-600 mb-1">Suggested Value</p>
            <p className="text-sm break-words font-medium">
              {suggestion.suggested_value || <span className="text-muted-foreground italic">Empty</span>}
            </p>
          </div>
        </div>

        {/* Collapsible Details */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span className="text-xs">View Details</span>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3">
            {/* Reasons */}
            {suggestion.reasons && suggestion.reasons.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">AI Reasoning</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {suggestion.reasons.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Validation Errors */}
            {suggestion.validation_errors && suggestion.validation_errors.length > 0 && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs font-medium text-red-700 mb-1">Validation Errors</p>
                <ul className="text-xs text-red-600 space-y-1">
                  {suggestion.validation_errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Retrieval Sources */}
            {suggestion.retrieval_sources && suggestion.retrieval_sources.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">Sources Used</p>
                <div className="flex flex-wrap gap-1">
                  {suggestion.retrieval_sources.slice(0, 3).map((source, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {source.split(":")[0]}
                    </Badge>
                  ))}
                  {suggestion.retrieval_sources.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{suggestion.retrieval_sources.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Version: {suggestion.prompt_version}</span>
              {suggestion.generation_time_ms && <span>Generated in {suggestion.generation_time_ms}ms</span>}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Review Notes Input */}
        <div>
          <Textarea
            placeholder="Add review notes (optional)..."
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            className="text-sm min-h-[60px]"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => handleReview("rejected")}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </>
            )}
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => handleReview("approved")}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
