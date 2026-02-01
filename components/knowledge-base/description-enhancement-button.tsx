"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import {
  Sparkles,
  Loader2,
  FileText,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  FileSearch,
  Shield,
  Copy,
  RefreshCw,
} from "lucide-react"

interface ProductData {
  name?: string
  description?: string
  manufacturer?: string
  partNumber?: string
  category?: string
}

interface DescriptionEnhancementResult {
  success: boolean
  suggestion: {
    id: string
    shortDescription: {
      suggested: string
      original: string | null
    }
    longDescription: {
      suggested: string
      original: string | null
    }
    confidence: number
    confidenceLabel: "high" | "medium" | "low"
    reasoning: string
    needsHumanReview: boolean
    reviewStatus: string
    hasRecallNotice: boolean
    complianceStandards: string[]
  }
  validation: {
    passed: boolean
    errors: string[]
    warnings: string[]
  }
  retrieval: {
    cqoReportsUsed: number
    policiesUsed: number
    partSheetsUsed: number
    sources: string[]
  }
  metadata: {
    generationTimeMs: number
    promptVersion: string
    model: string
  }
}

interface DescriptionEnhancementButtonProps {
  productData: ProductData
  productId?: string
  onDescriptionAccept: (shortDesc: string, longDesc: string) => void
  currentDescription?: string
  disabled?: boolean
}

export function DescriptionEnhancementButton({
  productData,
  productId,
  onDescriptionAccept,
  currentDescription,
  disabled = false,
}: DescriptionEnhancementButtonProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<DescriptionEnhancementResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"short" | "long">("short")

  const handleEnhance = async () => {
    if (!productData.name && !currentDescription) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter a product name or description first",
      })
      return
    }

    setIsOpen(true)
    setIsLoading(true)
    setResult(null)
    setError(null)

    try {
      const response = await fetch("/api/knowledge-base/description-enhancement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          name: productData.name,
          currentDescription: currentDescription || productData.description,
          manufacturer: productData.manufacturer,
          partNumber: productData.partNumber,
          category: productData.category,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setResult(data)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to enhance description")
      }
    } catch (err) {
      setError("Failed to connect to description enhancement service. Please ensure ChromaDB is running.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccept = () => {
    if (!result) return

    onDescriptionAccept(
      result.suggestion.shortDescription.suggested,
      result.suggestion.longDescription.suggested
    )
    setIsOpen(false)
    toast({
      title: "Description Applied",
      description: "Product description has been updated",
    })
  }

  const handleAcceptShort = (text: string) => {
    if (!result) return
    onDescriptionAccept(text, result.suggestion.longDescription.suggested)
    setIsOpen(false)
    toast({
      title: "Short Description Applied",
      description: "Product short description has been updated",
    })
  }

  const handleAcceptLong = (text: string) => {
    if (!result) return
    onDescriptionAccept(result.suggestion.shortDescription.suggested, text)
    setIsOpen(false)
    toast({
      title: "Long Description Applied",
      description: "Product long description has been updated",
    })
  }

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    })
  }

  const getConfidenceBadge = (confidence: string, needsReview: boolean, hasRecall: boolean) => {
    if (hasRecall) {
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          Recall Notice
        </Badge>
      )
    }

    if (needsReview) {
      return (
        <Badge variant="destructive" className="bg-yellow-600">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Needs Review
        </Badge>
      )
    }

    switch (confidence) {
      case "high":
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            High Confidence
          </Badge>
        )
      case "medium":
        return (
          <Badge variant="default" className="bg-yellow-600">
            <Info className="h-3 w-3 mr-1" />
            Medium Confidence
          </Badge>
        )
      case "low":
        return (
          <Badge variant="secondary">
            <AlertCircle className="h-3 w-3 mr-1" />
            Low Confidence
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleEnhance}
        disabled={disabled || (!productData.name && !currentDescription)}
        className="text-teal-600 border-teal-300 hover:bg-teal-50 hover:text-teal-700"
      >
        <Sparkles className="h-4 w-4 mr-1" />
        AI Description
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-teal-500" />
              AI Description Enhancement
            </DialogTitle>
            <DialogDescription className="text-sm">
              Enhancing product description using QA reports, policies, and technical specs
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 flex-shrink-0">
              <Loader2 className="h-8 w-8 animate-spin text-teal-500 mb-4" />
              <p className="text-muted-foreground">Searching documents and generating descriptions...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-medium text-red-700 dark:text-red-400">Enhancement Failed</p>
                <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleEnhance} className="bg-teal-500 hover:bg-teal-600">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          ) : result ? (
            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Recall Notice Warning */}
              {result.suggestion.hasRecallNotice && (
                <div className="p-3 border border-red-300 bg-red-50 rounded-lg">
                  <p className="text-sm font-bold text-red-700 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    RECALL NOTICE DETECTED
                  </p>
                  <p className="text-sm text-red-600 mt-1">
                    This product may have an active recall. Please verify before publishing.
                  </p>
                </div>
              )}

              {/* Confidence and Compliance */}
              <div className="flex items-center justify-between">
                {getConfidenceBadge(
                  result.suggestion.confidenceLabel,
                  result.suggestion.needsHumanReview,
                  result.suggestion.hasRecallNotice
                )}
                {result.suggestion.complianceStandards.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <span className="text-xs text-muted-foreground">
                      {result.suggestion.complianceStandards.join(", ")}
                    </span>
                  </div>
                )}
              </div>

              {/* Description Tabs */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "short" | "long")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="short">Short Description</TabsTrigger>
                  <TabsTrigger value="long">Long Description</TabsTrigger>
                </TabsList>

                <TabsContent value="short" className="space-y-3">
                  {/* Suggested Short - Clickable */}
                  <div
                    className="p-4 bg-muted rounded-lg relative cursor-pointer hover:bg-teal-50 hover:border-teal-300 border-2 border-transparent transition-all group"
                    onClick={() => handleAcceptShort(result.suggestion.shortDescription.suggested)}
                    title="Click to apply this short description"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-xs text-muted-foreground">
                        Suggested ({result.suggestion.shortDescription.suggested.length}/150 chars) <span className="text-teal-500 group-hover:text-teal-600">(click to apply)</span>
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopyToClipboard(result.suggestion.shortDescription.suggested, "Short description")
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-sm leading-relaxed group-hover:text-teal-700">
                      {result.suggestion.shortDescription.suggested}
                    </p>
                  </div>

                  {/* Original Short - Clickable to keep */}
                  {result.suggestion.shortDescription.original && (
                    <div
                      className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleAcceptShort(result.suggestion.shortDescription.original!)}
                      title="Click to keep original"
                    >
                      <p className="text-xs text-muted-foreground mb-1">Original <span className="text-gray-400">(click to keep)</span></p>
                      <p className="text-sm text-muted-foreground">
                        {result.suggestion.shortDescription.original}
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="long" className="space-y-3">
                  {/* Suggested Long - Clickable */}
                  <div
                    className="p-4 bg-muted rounded-lg relative cursor-pointer hover:bg-teal-50 hover:border-teal-300 border-2 border-transparent transition-all group"
                    onClick={() => handleAcceptLong(result.suggestion.longDescription.suggested)}
                    title="Click to apply this long description"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-xs text-muted-foreground">
                        Suggested ({result.suggestion.longDescription.suggested.length}/1000 chars) <span className="text-teal-500 group-hover:text-teal-600">(click to apply)</span>
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopyToClipboard(result.suggestion.longDescription.suggested, "Long description")
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap group-hover:text-teal-700">
                      {result.suggestion.longDescription.suggested}
                    </p>
                  </div>

                  {/* Original Long - Clickable to keep */}
                  {result.suggestion.longDescription.original && (
                    <div
                      className="p-3 border rounded-lg max-h-32 overflow-y-auto cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleAcceptLong(result.suggestion.longDescription.original!)}
                      title="Click to keep original"
                    >
                      <p className="text-xs text-muted-foreground mb-1">Original <span className="text-gray-400">(click to keep)</span></p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {result.suggestion.longDescription.original}
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Reasoning */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-1">AI Reasoning</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {result.suggestion.reasoning}
                </p>
              </div>

              {/* Validation */}
              {(result.validation.errors.length > 0 || result.validation.warnings.length > 0) && (
                <div className="p-3 border border-yellow-200 bg-yellow-50 rounded-lg">
                  <p className="text-sm font-medium mb-2 text-yellow-800">Validation Notes</p>
                  {result.validation.errors.map((error, idx) => (
                    <p key={`err-${idx}`} className="text-sm text-red-600 flex items-start gap-1">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      {error}
                    </p>
                  ))}
                  {result.validation.warnings.map((warning, idx) => (
                    <p key={`warn-${idx}`} className="text-sm text-yellow-700 flex items-start gap-1">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      {warning}
                    </p>
                  ))}
                </div>
              )}

              {/* Retrieval Info */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1">
                  <FileSearch className="h-3 w-3" />
                  <span>{result.retrieval.cqoReportsUsed} QA reports</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileSearch className="h-3 w-3" />
                  <span>{result.retrieval.policiesUsed} policies</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileSearch className="h-3 w-3" />
                  <span>{result.retrieval.partSheetsUsed} part sheets</span>
                </div>
                <div className="ml-auto">
                  {result.metadata.generationTimeMs}ms
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t mt-4 sticky bottom-0 bg-background pb-1">
                <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleAccept}
                  className="flex-1 bg-teal-500 hover:bg-teal-600"
                  disabled={result.suggestion.hasRecallNotice}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Accept Description
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
