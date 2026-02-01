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
import { useToast } from "@/components/ui/use-toast"
import {
  Sparkles,
  Loader2,
  Type,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  FileSearch,
  RefreshCw,
} from "lucide-react"

interface ProductData {
  name?: string
  description?: string
  manufacturer?: string
  category?: string
}

interface NameGenerationResult {
  success: boolean
  suggestion: {
    id: string
    suggestedName: string
    originalName: string | null
    changesMade: string[]
    confidence: number
    confidenceLabel: "high" | "medium" | "low"
    reasoning: string
    needsHumanReview: boolean
    reviewStatus: string
  }
  validation: {
    passed: boolean
    errors: string[]
    warnings: string[]
  }
  retrieval: {
    policiesUsed: number
    similarProductsUsed: number
    sources: string[]
  }
  metadata: {
    generationTimeMs: number
    promptVersion: string
    model: string
  }
}

interface NameGenerationButtonProps {
  productData: ProductData
  productId?: string
  onNameAccept: (name: string) => void
  currentName?: string
  disabled?: boolean
}

export function NameGenerationButton({
  productData,
  productId,
  onNameAccept,
  currentName,
  disabled = false,
}: NameGenerationButtonProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<NameGenerationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!productData.description && !productData.manufacturer && !currentName) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter a description, manufacturer, or current name first",
      })
      return
    }

    setIsOpen(true)
    setIsLoading(true)
    setResult(null)
    setError(null)

    try {
      const response = await fetch("/api/knowledge-base/name-generation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          currentName: currentName || productData.name,
          description: productData.description,
          manufacturer: productData.manufacturer,
          category: productData.category,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setResult(data)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to generate product name")
      }
    } catch (err) {
      setError("Failed to connect to name generation service. Please ensure ChromaDB is running.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcceptName = (name: string) => {
    onNameAccept(name)
    setIsOpen(false)
    toast({
      title: "Name Applied",
      description: `Product name set to "${name.substring(0, 40)}${name.length > 40 ? '...' : ''}"`,
    })
  }

  const getConfidenceBadge = (confidence: string, needsReview: boolean) => {
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
        onClick={handleGenerate}
        disabled={disabled || (!productData.description && !productData.manufacturer && !currentName)}
        className="text-purple-600 border-purple-300 hover:bg-purple-50 hover:text-purple-700"
      >
        <Sparkles className="h-4 w-4 mr-1" />
        AI Name
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Type className="h-5 w-5 text-purple-500" />
              AI Product Name Generation
            </DialogTitle>
            <DialogDescription className="text-sm">
              Generating optimized product name using RAG and AI
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 flex-shrink-0">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-4" />
              <p className="text-muted-foreground">Analyzing product and searching knowledge base...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-medium text-red-700 dark:text-red-400">Generation Failed</p>
                <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleGenerate} className="bg-purple-500 hover:bg-purple-600">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          ) : result ? (
            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Suggested Name - Clickable to apply */}
              <div
                className="text-center p-4 bg-muted rounded-lg cursor-pointer hover:bg-purple-50 hover:border-purple-300 border-2 border-transparent transition-all group"
                onClick={() => handleAcceptName(result.suggestion.suggestedName)}
                title="Click to apply this name"
              >
                <p className="text-sm text-muted-foreground mb-1">Suggested Name <span className="text-purple-500 group-hover:text-purple-600">(click to apply)</span></p>
                <div className="text-xl font-bold text-primary px-2 break-words group-hover:text-purple-600">
                  {result.suggestion.suggestedName}
                </div>
                <div className="flex items-center justify-center gap-2 mt-3">
                  {getConfidenceBadge(result.suggestion.confidenceLabel, result.suggestion.needsHumanReview)}
                </div>
              </div>

              {/* Original vs Suggested Comparison */}
              {result.suggestion.originalName && result.suggestion.originalName !== result.suggestion.suggestedName && (
                <div className="p-3 border rounded-lg">
                  <p className="text-sm font-medium mb-2">Name Comparison</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div
                      className="cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                      onClick={() => handleAcceptName(result.suggestion.originalName!)}
                      title="Click to keep original"
                    >
                      <p className="text-xs text-muted-foreground mb-1">Original <span className="text-gray-400">(click to keep)</span></p>
                      <p className="text-muted-foreground">{result.suggestion.originalName}</p>
                    </div>
                    <div
                      className="cursor-pointer hover:bg-purple-50 p-2 rounded transition-colors"
                      onClick={() => handleAcceptName(result.suggestion.suggestedName)}
                      title="Click to apply suggested"
                    >
                      <p className="text-xs text-muted-foreground mb-1">Suggested <span className="text-purple-400">(click to apply)</span></p>
                      <p className="font-medium text-purple-600">{result.suggestion.suggestedName}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Changes Made */}
              {result.suggestion.changesMade.length > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">Changes Applied</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {result.suggestion.changesMade.map((change, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-purple-500">•</span>
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

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
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <FileSearch className="h-3 w-3" />
                  <span>{result.retrieval.policiesUsed} policies</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileSearch className="h-3 w-3" />
                  <span>{result.retrieval.similarProductsUsed} similar products</span>
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
                  onClick={() => handleAcceptName(result.suggestion.suggestedName)}
                  className="flex-1 bg-purple-500 hover:bg-purple-600"
                >
                  <Type className="h-4 w-4 mr-1" />
                  Accept Name
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
