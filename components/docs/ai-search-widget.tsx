"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Bot,
  Search,
  Loader2,
  Sparkles,
  ArrowRight,
  Clock,
  Tag,
  AlertCircle,
  Lightbulb,
  FileText
} from "lucide-react"
import Link from "next/link"

interface AISearchResult {
  document: {
    title: string
    slug: string
    description: string
    category: string
    tags: string[]
    lastUpdated: string
    size: string
  }
  aiSummary: string
  relevanceScore: number
  keyPoints: string[]
  directAnswer?: string
}

interface AISearchResponse {
  results: AISearchResult[]
  directAnswer?: string
  suggestedQueries: string[]
  processingTime: number
  query: string
  aiProcessed: boolean
}

interface AISearchWidgetProps {
  className?: string
  placeholder?: string
  maxResults?: number
}

export function AISearchWidget({ 
  className = "", 
  placeholder = "Ask the documentation anything...",
  maxResults = 5
}: AISearchWidgetProps) {
  const [query, setQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<AISearchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsSearching(true)
    setError(null)
    setShowResults(true)

    try {
      const response = await fetch('/api/docs/ai-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({
          query: query.trim(),
          maxResults,
          includeContent: true
        }),
      })

      if (!response.ok) {
        throw new Error('AI search failed')
      }

      const data: AISearchResponse = await response.json()
      setResults(data)
    } catch (err) {
      console.error('AI search error:', err)
      setError('AI search is temporarily unavailable. Please try the regular search.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleSuggestedQuery = (suggestedQuery: string) => {
    setQuery(suggestedQuery)
    setShowResults(false)
    // Focus input for user to see the query and potentially modify it
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return "text-green-600"
    if (score >= 0.6) return "text-yellow-600"
    return "text-gray-600"
  }

  const renderMarkdown = (content: string) => {
    // Simple markdown to HTML conversion
    let html = content
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mb-2 text-green-700 dark:text-green-300">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mb-3 text-green-700 dark:text-green-300">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4 text-green-700 dark:text-green-300">$1</h1>')
      // Code blocks
      .replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        return `
          <div class="relative bg-gray-100 dark:bg-gray-800 rounded-lg p-3 my-3 border">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-gray-600 dark:text-gray-400 font-medium">${lang || 'Code'}</span>
            </div>
            <pre class="text-sm overflow-x-auto text-gray-800 dark:text-gray-200"><code>${code.trim()}</code></pre>
          </div>
        `
      })
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 dark:text-blue-400 hover:underline">$1</a>')
      // Unordered lists
      .replace(/^• (.*$)/gim, '<li class="mb-1">$1</li>')
      .replace(/(<li class="mb-1">.*<\/li>)/s, '<ul class="list-disc pl-6 my-3 space-y-1">$1</ul>')
      // Paragraphs and line breaks
      .replace(/\n\n/g, '</p><p class="mb-3">')
      .replace(/\n/g, '<br/>')
      
    return `<div class="prose prose-sm max-w-none text-green-800 dark:text-green-200"><p class="mb-3">${html}</p></div>`
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* AI Search Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">AI Documentation Assistant</CardTitle>
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <CardDescription>
            Ask questions in natural language and get intelligent answers from the documentation.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Search Input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            ref={inputRef}
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-10"
            disabled={isSearching}
          />
        </div>
        <Button 
          onClick={handleSearch} 
          disabled={isSearching || !query.trim()}
          className="flex items-center gap-2"
        >
          {isSearching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking...
            </>
          ) : (
            <>
              <Bot className="h-4 w-4" />
              Ask AI
            </>
          )}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {showResults && results && (
        <div className="space-y-4">
          {/* Direct Answer */}
          {results.directAnswer && (
            <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-green-600" />
                  Quick Answer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="text-green-800 dark:text-green-200"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(results.directAnswer) }}
                />
              </CardContent>
            </Card>
          )}

          {/* AI Processing Info */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Bot className="h-3 w-3" />
                {results.aiProcessed ? 'AI Enhanced' : 'Basic Search'}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {results.processingTime}ms
              </span>
              <span>{results.results.length} results</span>
            </div>
          </div>

          {/* Search Results */}
          {results.results.length > 0 ? (
            <div className="space-y-4">
              {results.results.map((result, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">
                            <Link 
                              href={`/docs/${result.document.slug}`}
                              className="hover:text-primary transition-colors"
                            >
                              {result.document.title}
                            </Link>
                          </CardTitle>
                          {results.aiProcessed && (
                            <Badge 
                              variant="outline" 
                              className={getRelevanceColor(result.relevanceScore)}
                            >
                              {Math.round(result.relevanceScore * 100)}% match
                            </Badge>
                          )}
                        </div>
                        
                        {/* AI Summary */}
                        <CardDescription className="mb-3">
                          <strong>AI Summary:</strong> {result.aiSummary}
                        </CardDescription>

                        {/* Key Points */}
                        {result.keyPoints.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium mb-2">Key Points:</p>
                            <div className="flex flex-wrap gap-1">
                              {result.keyPoints.map((point, pointIndex) => (
                                <Badge key={pointIndex} variant="secondary" className="text-xs">
                                  {point}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {result.document.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(result.document.lastUpdated)}
                        </span>
                        <span>{result.document.size}</span>
                      </div>
                      <div className="flex gap-1">
                        {result.document.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No documentation found matching your query.</p>
              </CardContent>
            </Card>
          )}

          {/* Suggested Queries */}
          {results.suggestedQueries.length > 0 && (
            <>
              <Separator />
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    You might also ask:
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {results.suggestedQueries.map((suggestion, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuggestedQuery(suggestion)}
                        className="text-sm"
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  )
}