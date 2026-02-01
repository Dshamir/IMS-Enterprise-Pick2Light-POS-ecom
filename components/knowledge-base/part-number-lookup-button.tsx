"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2, Check, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

interface PartNumberLookupButtonProps {
  productData: {
    name?: string
    description?: string
    category?: string
    manufacturer?: string
  }
  onPartNumberAccept: (partNumber: string) => void
  currentPartNumber?: string
  disabled?: boolean
}

interface PartNumberMatch {
  partNumber: string
  manufacturer: string
  itemName: string
  similarity: number
}

interface PartNumberLookupResult {
  suggestedPartNumber: string | null
  confidence: 'high' | 'medium' | 'low' | 'none'
  source: 'kb_match' | 'none'
  matches: PartNumberMatch[]
  explanation: string
}

export function PartNumberLookupButton({
  productData,
  onPartNumberAccept,
  currentPartNumber,
  disabled = false,
}: PartNumberLookupButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<PartNumberLookupResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleLookup = async () => {
    setIsOpen(true)
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/knowledge-base/part-number-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to lookup part number')
      }

      const data = await response.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Failed to lookup part number')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccept = () => {
    if (result?.suggestedPartNumber) {
      onPartNumberAccept(result.suggestedPartNumber)
      setIsOpen(false)
    }
  }

  const handleAcceptMatch = (partNumber: string) => {
    onPartNumberAccept(partNumber)
    setIsOpen(false)
  }

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <Badge className="bg-green-500">High Confidence</Badge>
      case 'medium':
        return <Badge className="bg-yellow-500">Medium Confidence</Badge>
      case 'low':
        return <Badge className="bg-orange-500">Low Confidence</Badge>
      default:
        return <Badge variant="secondary">No Match</Badge>
    }
  }

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.85) return 'text-green-600'
    if (similarity >= 0.6) return 'text-yellow-600'
    return 'text-orange-600'
  }

  const button = (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={handleLookup}
      disabled={disabled || isLoading}
      className="h-8 w-8 p-0 border-dashed border-orange-500/50 hover:border-orange-500 hover:bg-orange-500/5 transition-colors"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
      ) : (
        <Sparkles className="h-4 w-4 text-orange-500" />
      )}
    </Button>
  )

  return (
    <>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p>AI Part Number Lookup</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-500" />
              AI Part Number Lookup
            </DialogTitle>
            <DialogDescription>
              Part numbers matched from product catalogues in the Knowledge Base
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-hidden">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <span className="ml-2 text-muted-foreground">Searching knowledge base...</span>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg">
                <p className="font-medium">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {result && !isLoading && (
              <>
                {result.suggestedPartNumber ? (
                  <div className="space-y-4 overflow-hidden">
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Best Match</span>
                        {getConfidenceBadge(result.confidence)}
                      </div>
                      <p className="text-xl font-mono font-bold text-orange-700 truncate">
                        {result.suggestedPartNumber}
                      </p>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {result.explanation}
                    </p>

                    {currentPartNumber && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <span className="text-xs text-muted-foreground">Current part number:</span>
                        <p className="font-mono text-sm truncate">{currentPartNumber}</p>
                      </div>
                    )}

                    {result.matches && result.matches.length > 0 && (
                      <div className="overflow-hidden">
                        <span className="text-sm font-medium">KB Matches:</span>
                        <div className="space-y-2 max-h-36 overflow-y-auto mt-2">
                          {result.matches.map((match, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleAcceptMatch(match.partNumber)}
                              className="w-full text-left p-2 bg-gray-50 hover:bg-gray-100 rounded-lg border transition-colors overflow-hidden"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono font-medium text-sm truncate">{match.partNumber}</span>
                                <span className={`text-xs flex-shrink-0 ${getSimilarityColor(match.similarity)}`}>
                                  {Math.round(match.similarity * 100)}% match
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-1">
                                {match.manufacturer && `${match.manufacturer} - `}{match.itemName}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                      <Button onClick={handleAccept} className="flex-1 bg-orange-500 hover:bg-orange-600">
                        <Check className="h-4 w-4 mr-1" />
                        Accept Best Match
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">
                      No matching part numbers found in Knowledge Base.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Try adding more product details or upload more catalogues to the KB.
                    </p>
                    <Button variant="outline" onClick={() => setIsOpen(false)} className="mt-4">
                      Close
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
