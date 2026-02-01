"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import {
  ArrowLeft,
  Clock,
  FileText,
  Tag,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  BookOpen
} from "lucide-react"
import { DocContent } from "@/lib/docs-parser"

interface DocApiResponse {
  doc: DocContent
}

export default function DocPage() {
  const params = useParams()
  const router = useRouter()
  const [doc, setDoc] = useState<DocContent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [tableOfContents, setTableOfContents] = useState<Array<{ id: string; text: string; level: number }>>([])

  const slug = Array.isArray(params.slug) ? params.slug.join('--') : params.slug

  useEffect(() => {
    if (slug) {
      loadDocument()
    }
  }, [slug])

  useEffect(() => {
    if (doc) {
      generateTableOfContents()
    }
  }, [doc])

  const loadDocument = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(`/api/docs?slug=${encodeURIComponent(slug)}`)
      const data: DocApiResponse = await response.json()
      
      if (response.ok) {
        setDoc(data.doc)
      } else {
        setError('Document not found')
      }
    } catch (error) {
      console.error('Error loading document:', error)
      setError('Failed to load document')
    } finally {
      setIsLoading(false)
    }
  }

  const generateTableOfContents = () => {
    if (!doc) return
    
    const headings: Array<{ id: string; text: string; level: number }> = []
    const headingRegex = /^(#{1,6})\s+(.+)$/gm
    let match
    let index = 0
    
    while ((match = headingRegex.exec(doc.content)) !== null) {
      const level = match[1].length
      const text = match[2].trim()
      const baseId = text.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .trim()
      
      // Ensure unique IDs by appending index
      const id = `${baseId}-${index}`
      index++
      
      headings.push({ id, text, level })
    }
    
    setTableOfContents(headings)
  }

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedCode(id)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderMarkdown = (content: string) => {
    // Simple markdown to HTML conversion
    let html = content
    let headerIndex = 0
    
    // Headers with unique IDs
    html = html.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, text) => {
      const level = hashes.length
      const baseId = text.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .trim()
      const id = `${baseId}-${headerIndex}`
      headerIndex++
      return `<h${level} id="${id}">${text}</h${level}>`
    })
    
    html = html
      // Code blocks
      .replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        const codeId = Math.random().toString(36).substr(2, 9)
        return `
          <div class="relative bg-muted rounded-lg p-4 my-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs text-muted-foreground font-medium">${lang || 'Code'}</span>
              <button 
                onclick="copyCode('${codeId}', '${code.replace(/'/g, "\\'")}'); event.preventDefault();" 
                class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <span id="copy-icon-${codeId}">Copy</span>
              </button>
            </div>
            <pre class="text-sm overflow-x-auto"><code>${code.trim()}</code></pre>
          </div>
        `
      })
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline">$1</a>')
      // Unordered lists
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul class="list-disc pl-6 my-4">$1</ul>')
      // Ordered lists
      .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
      // Tables (basic support)
      .replace(/\|(.+)\|/g, (match, content) => {
        const cells = content.split('|').map(cell => cell.trim())
        return '<tr>' + cells.map(cell => `<td class="border px-4 py-2">${cell}</td>`).join('') + '</tr>'
      })
      // Checkboxes
      .replace(/- \[ \] (.*)/g, '<div class="flex items-center gap-2 my-1"><input type="checkbox" disabled /> $1</div>')
      .replace(/- \[x\] (.*)/g, '<div class="flex items-center gap-2 my-1"><input type="checkbox" checked disabled /> $1</div>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p class="mb-4">')
      
    return `<div class="prose prose-slate dark:prose-invert max-w-none"><p class="mb-4">${html}</p></div>`
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading document...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Document Not Found</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => router.back()} variant="outline">
                Go Back
              </Button>
              <Button asChild>
                <Link href="/docs">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Browse Documentation
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/docs">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Documentation
            </Link>
          </Button>
        </div>
        
        <h1 className="text-3xl font-bold mb-4">{doc.title}</h1>
        
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Updated {formatDate(doc.lastUpdated)}
          </span>
          <span className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            {doc.size}
          </span>
          <Badge variant="outline">{doc.category.replace(/-/g, ' ')}</Badge>
        </div>
        
        {doc.tags.length > 0 && (
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-1 flex-wrap">
              {doc.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Table of Contents */}
        {tableOfContents.length > 0 && (
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Table of Contents
                </h3>
                <nav className="space-y-1">
                  {tableOfContents.map((heading) => (
                    <a
                      key={heading.id}
                      href={`#${heading.id}`}
                      className={`block text-sm hover:text-primary transition-colors ${
                        heading.level === 1 ? 'font-medium' :
                        heading.level === 2 ? 'pl-2' :
                        'pl-4 text-muted-foreground'
                      }`}
                    >
                      {heading.text}
                    </a>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Content */}
        <div className={tableOfContents.length > 0 ? "lg:col-span-3" : "lg:col-span-4"}>
          <div 
            className="markdown-content"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.content) }}
          />
          
          <Separator className="my-8" />
          
          {/* Footer */}
          <div className="text-sm text-muted-foreground">
            <p>
              <strong>File:</strong> {doc.filePath}
            </p>
            <p className="mt-1">
              Last modified: {formatDate(doc.lastUpdated)}
            </p>
          </div>
        </div>
      </div>

      {/* Global script for copy functionality */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.copyCode = function(id, code) {
              navigator.clipboard.writeText(code).then(() => {
                const icon = document.getElementById('copy-icon-' + id);
                if (icon) {
                  icon.textContent = 'Copied!';
                  setTimeout(() => {
                    icon.textContent = 'Copy';
                  }, 2000);
                }
              });
            };
          `
        }}
      />
    </div>
  )
}