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

interface BarcodeLookupButtonProps {
  productData: {
    name?: string
    description?: string
    category?: string
    manufacturer?: string
  }
  onBarcodeAccept: (barcode: string) => void
  currentBarcode?: string
  disabled?: boolean
}

interface BarcodeLookupResult {
  suggestedBarcode: string | null
  pattern: string | null
  confidence: 'high' | 'medium' | 'low' | 'none'
  source: 'kb_match' | 'generated' | 'none'
  explanation: string
  alternatives?: string[]
}

export function BarcodeLookupButton({
  productData,
  onBarcodeAccept,
  currentBarcode,
  disabled = false,
}: BarcodeLookupButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<BarcodeLookupResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleLookup = async () => {
    setIsOpen(true)
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/knowledge-base/barcode-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to lookup barcode')
      }

      const data = await response.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Failed to lookup barcode')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccept = () => {
    if (result?.suggestedBarcode) {
      onBarcodeAccept(result.suggestedBarcode)
      setIsOpen(false)
    }
  }

  const handleAcceptAlternative = (barcode: string) => {
    onBarcodeAccept(barcode)
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
        return <Badge variant="secondary">Unknown</Badge>
    }
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
            <p>AI Barcode Generation</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-500" />
              AI Barcode Generation
            </DialogTitle>
            <DialogDescription>
              Barcode generated based on category patterns from knowledge base
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <span className="ml-2 text-muted-foreground">Generating barcode...</span>
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
                {result.suggestedBarcode ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Suggested Barcode</span>
                        {getConfidenceBadge(result.confidence)}
                      </div>
                      <p className="text-2xl font-mono font-bold text-orange-700">
                        {result.suggestedBarcode}
                      </p>
                      {result.pattern && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Pattern: {result.pattern}
                        </p>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {result.explanation}
                    </p>

                    {currentBarcode && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <span className="text-xs text-muted-foreground">Current barcode:</span>
                        <p className="font-mono text-sm">{currentBarcode}</p>
                      </div>
                    )}

                    {result.alternatives && result.alternatives.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-sm text-muted-foreground">Alternatives:</span>
                        <div className="space-y-1">
                          {result.alternatives.map((alt, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleAcceptAlternative(alt)}
                              className="w-full text-left p-2 bg-gray-50 hover:bg-gray-100 rounded font-mono text-sm"
                            >
                              {alt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleAccept} className="flex-1 bg-orange-500 hover:bg-orange-600">
                        <Check className="h-4 w-4 mr-2" />
                        Accept
                      </Button>
                      <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">
                      Could not generate a barcode. Please enter manually.
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
