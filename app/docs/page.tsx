"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  BookOpen,
  Search,
  FileText,
  Clock,
  Tag,
  ArrowRight,
  Loader2,
  AlertCircle,
  Bot,
  Sparkles
} from "lucide-react"
import { DocCategory, DocMetadata } from "@/lib/docs-parser"
import { AISearchWidget } from "@/components/docs/ai-search-widget"

interface DocsApiResponse {
  categories: DocCategory[]
  totalDocs: number
  categoriesCount: number
}

interface SearchApiResponse {
  results: DocMetadata[]
  query: string
  count: number
}

export default function DocsPage() {
  const [categories, setCategories] = useState<DocCategory[]>([])
  const [searchResults, setSearchResults] = useState<DocMetadata[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalDocs, setTotalDocs] = useState(0)
  const [useAISearch, setUseAISearch] = useState(false)

  useEffect(() => {
    loadDocumentation()
  }, [])

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch()
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(delayedSearch)
  }, [searchQuery])

  const loadDocumentation = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/docs')
      const data: DocsApiResponse = await response.json()
      
      if (response.ok) {
        setCategories(data.categories)
        setTotalDocs(data.totalDocs)
      } else {
        setError('Failed to load documentation')
      }
    } catch (error) {
      console.error('Error loading documentation:', error)
      setError('Failed to load documentation')
    } finally {
      setIsLoading(false)
    }
  }

  const performSearch = async () => {
    if (!searchQuery.trim()) return
    
    try {
      setIsSearching(true)
      const response = await fetch(`/api/docs?q=${encodeURIComponent(searchQuery)}`)
      const data: SearchApiResponse = await response.json()
      
      if (response.ok) {
        setSearchResults(data.results)
      } else {
        console.error('Search failed:', data)
      }
    } catch (error) {
      console.error('Error searching documentation:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading documentation...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error Loading Documentation</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadDocumentation} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Documentation</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Comprehensive documentation for the Supabase Store inventory management system.
        </p>
        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            {totalDocs} documents
          </span>
          <span className="flex items-center gap-1">
            <Tag className="h-4 w-4" />
            {categories.length} categories
          </span>
        </div>
      </div>

      {/* Search Options */}
      <div className="mb-8 space-y-6">
        {/* Search Mode Toggle */}
        <div className="flex items-center justify-between max-w-2xl">
          <h2 className="text-lg font-semibold">Search Documentation</h2>
          <div className="flex items-center gap-2">
            <Button
              variant={!useAISearch ? "default" : "outline"}
              size="sm"
              onClick={() => setUseAISearch(false)}
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Keyword Search
            </Button>
            <Button
              variant={useAISearch ? "default" : "outline"}
              size="sm"
              onClick={() => setUseAISearch(true)}
              className="flex items-center gap-2"
            >
              <Bot className="h-4 w-4" />
              AI Search
              <Sparkles className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Regular Search */}
        {!useAISearch && (
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
          </div>
        )}

        {/* AI Search Widget */}
        {useAISearch && (
          <div className="max-w-4xl">
            <AISearchWidget 
              placeholder="Ask the documentation anything... (e.g., 'How do I add categories?')"
              maxResults={6}
            />
          </div>
        )}
      </div>

      {/* Search Results (Regular Search Only) */}
      {!useAISearch && searchResults.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold">Search Results</h2>
            <Badge variant="secondary">{searchResults.length} found</Badge>
          </div>
          <div className="grid gap-4">
            {searchResults.map((doc) => (
              <Card key={doc.slug} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        <Link 
                          href={`/docs/${doc.slug}`}
                          className="hover:text-primary transition-colors"
                        >
                          {doc.title}
                        </Link>
                      </CardTitle>
                      {doc.description && (
                        <CardDescription className="mt-1">
                          {doc.description}
                        </CardDescription>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground mt-1" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(doc.lastUpdated)}
                      </span>
                      <span>{doc.size}</span>
                    </div>
                    <div className="flex gap-1">
                      {doc.tags.slice(0, 3).map((tag) => (
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
          <Separator className="mt-8" />
        </div>
      )}

      {/* Categories */}
      <div className="grid gap-6">
        {categories.map((category) => (
          <Card key={category.slug}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {category.name}
                    <Badge variant="secondary">{category.count}</Badge>
                  </CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {category.docs.map((doc) => (
                  <div
                    key={doc.slug}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <Link 
                        href={`/docs/${doc.slug}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {doc.title}
                      </Link>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {doc.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(doc.lastUpdated)}
                        </span>
                        <span>{doc.size}</span>
                        {doc.tags.length > 0 && (
                          <div className="flex gap-1">
                            {doc.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
        <p>
          Documentation automatically generated from markdown files in the project.
          <br />
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}