"use client"

import { cn } from "@/lib/utils"
import { User, Bot, Database, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import ReactMarkdown from "react-markdown"

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
  metadata?: {
    model?: string
    tokensUsed?: number
    kbContext?: boolean
    toolsUsed?: string[]
    searchResults?: any[]
  }
}

export function ChatMessage({ role, content, timestamp, metadata }: ChatMessageProps) {
  const isUser = role === 'user'
  const isSystem = role === 'system'

  if (isSystem) {
    return null // Don't display system messages
  }

  return (
    <div className={cn(
      "flex gap-3 p-4",
      isUser ? "bg-muted/50" : "bg-background"
    )}>
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        isUser ? "bg-primary text-primary-foreground" : "bg-green-600 text-white"
      )}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-2 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {isUser ? 'You' : 'Assistant'}
          </span>
          {timestamp && (
            <span className="text-xs text-muted-foreground">
              {new Date(timestamp).toLocaleTimeString()}
            </span>
          )}
          {metadata?.kbContext && (
            <Badge variant="secondary" className="text-xs py-0 gap-1">
              <Database className="h-3 w-3" />
              KB
            </Badge>
          )}
          {metadata?.model && (
            <Badge variant="outline" className="text-xs py-0">
              {metadata.model}
            </Badge>
          )}
        </div>

        {/* Message content with markdown */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            components={{
              pre: ({ children }) => (
                <pre className="bg-muted p-3 rounded-lg overflow-x-auto text-sm">
                  {children}
                </pre>
              ),
              code: ({ children, className }) => {
                const isInline = !className
                return isInline ? (
                  <code className="bg-muted px-1 py-0.5 rounded text-sm">
                    {children}
                  </code>
                ) : (
                  <code className={className}>{children}</code>
                )
              },
              table: ({ children }) => (
                <div className="overflow-x-auto">
                  <table className="border-collapse border border-border">
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-border px-3 py-2 bg-muted">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-border px-3 py-2">
                  {children}
                </td>
              )
            }}
          >
            {content}
          </ReactMarkdown>
        </div>

        {/* Search results summary */}
        {metadata?.searchResults && metadata.searchResults.length > 0 && (
          <div className="mt-2 pt-2 border-t">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Search className="h-3 w-3" />
              Sources ({metadata.searchResults.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {metadata.searchResults.slice(0, 3).map((result: any, i: number) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {result.title || result.name || `Source ${i + 1}`}
                </Badge>
              ))}
              {metadata.searchResults.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{metadata.searchResults.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Token usage */}
        {metadata?.tokensUsed && !isUser && (
          <div className="text-xs text-muted-foreground">
            {metadata.tokensUsed.toLocaleString()} tokens
          </div>
        )}
      </div>
    </div>
  )
}
