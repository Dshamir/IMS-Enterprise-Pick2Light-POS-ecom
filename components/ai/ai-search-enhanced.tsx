"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  Bot, 
  Loader2, 
  Lightbulb,
  Package,
  MapPin,
  DollarSign,
  Hash
} from "lucide-react"
import { aiService } from "@/lib/ai/ai-service"
import { useToast } from "@/hooks/use-toast"

interface AISearchEnhancedProps {
  className?: string
  onResultSelect?: (product: any) => void
}

export function AISearchEnhanced({ className, onResultSelect }: AISearchEnhancedProps) {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [insights, setInsights] = useState<any>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [searchType, setSearchType] = useState<'basic' | 'ai_enhanced'>('basic')
  const { toast } = useToast()

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsSearching(true)
    setResults([])
    setInsights(null)
    setSuggestions([])

    try {
      const searchResult = await aiService.searchInventoryNL(query.trim())
      
      if (searchResult.success) {
        setResults(searchResult.results || [])
        setInsights(searchResult.ai_insights)
        setSuggestions(searchResult.search_suggestions || [])
        setSearchType(searchResult.metadata?.search_type || 'basic')
        
        toast({
          title: "Search Complete",
          description: `Found ${searchResult.results?.length || 0} items${searchResult.metadata?.search_type === 'ai_enhanced' ? ' with AI enhancement' : ''}`,
        })
      } else {
        throw new Error(searchResult.error || 'Search failed')
      }
    } catch (error) {
      console.error('Search error:', error)
      
      // Set fallback empty results instead of showing error
      setResults([])
      setInsights(null)
      setSuggestions([])
      setSearchType('basic')
      
      toast({
        title: "Search Error",
        description: error instanceof Error ? error.message : "Search failed",
        variant: "destructive"
      })
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    // Auto-search when clicking suggestion
    setTimeout(() => handleSearch(), 100)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5 text-blue-600" />
          AI-Enhanced Search
          {searchType === 'ai_enhanced' && (
            <Badge variant="secondary" className="ml-2">
              <Bot className="h-3 w-3 mr-1" />
              AI Enhanced
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Search your inventory using natural language
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Try: 'blue pens under $20', 'low stock items in warehouse A', 'consumables'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isSearching}
          />
          <Button 
            onClick={handleSearch}
            disabled={!query.trim() || isSearching}
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Search Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="h-4 w-4 text-yellow-600" />
              Suggestions
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-xs"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* AI Insights */}
        {insights && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">AI Analysis</span>
            </div>
            <div className="space-y-2 text-sm text-blue-700">
              {insights.interpretation && (
                <div>
                  <strong>Understanding:</strong> {insights.interpretation}
                </div>
              )}
              {insights.user_intent && insights.user_intent !== 'product_search' && (
                <div>
                  <strong>Intent:</strong> {insights.user_intent.replace('_', ' ')}
                </div>
              )}
              {insights.suggested_categories?.length > 0 && (
                <div>
                  <strong>Relevant Categories:</strong> {insights.suggested_categories.join(', ')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Search Results ({results.length})
              </span>
              {searchType === 'ai_enhanced' && (
                <Badge variant="outline" className="text-xs">
                  <Bot className="h-3 w-3 mr-1" />
                  AI Enhanced
                </Badge>
              )}
            </div>
            
            <div className="max-h-96 overflow-y-auto space-y-2">
              {results.map((product) => (
                <div
                  key={product.id}
                  className="border rounded-lg p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onResultSelect?.(product)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{product.name}</h4>
                      {product.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {product.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          <span className="capitalize">{product.category}</span>
                        </div>
                        
                        {product.Location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{product.Location}</span>
                          </div>
                        )}
                        
                        {product.barcode && (
                          <div className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            <span>{product.barcode}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <DollarSign className="h-3 w-3" />
                        {formatPrice(product.price)}
                      </div>
                      
                      <div className="mt-1">
                        <Badge variant={product.stock_quantity > 0 ? "default" : "destructive"}>
                          Stock: {product.stock_quantity}
                        </Badge>
                      </div>
                      
                      {product.relevance_score && searchType === 'ai_enhanced' && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Relevance: {Math.round(product.relevance_score)}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {!isSearching && query && results.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No items found for "{query}"</p>
            <p className="text-sm mt-1">Try using different keywords or check the suggestions above</p>
          </div>
        )}

        {/* Example Searches */}
        {!query && !results.length && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Example searches:</div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>• "blue pens under $20"</div>
              <div>• "low stock consumables"</div>
              <div>• "items in warehouse A"</div>
              <div>• "equipment from manufacturer X"</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}