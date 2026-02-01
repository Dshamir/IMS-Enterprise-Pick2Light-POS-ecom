"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Plus, MessageSquare, Trash2, Search, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Conversation {
  id: string
  title: string
  modelUsed: string | null
  kbContextUsed: boolean
  messageCount: number
  createdAt: string
  updatedAt: string
}

interface ChatSidebarProps {
  currentConversationId?: string
  onSelectConversation: (id: string | null) => void
  onNewConversation: () => void
}

export function ChatSidebar({
  currentConversationId,
  onSelectConversation,
  onNewConversation
}: ChatSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/knowledge-base/chat/conversations')
      const data = await response.json()

      if (data.success) {
        setConversations(data.conversations)
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    try {
      const response = await fetch(`/api/knowledge-base/chat/conversations/${deleteId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setConversations(prev => prev.filter(c => c.id !== deleteId))
        if (currentConversationId === deleteId) {
          onSelectConversation(null)
        }
        toast({
          title: "Conversation deleted",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete conversation"
      })
    } finally {
      setDeleteId(null)
    }
  }

  const filteredConversations = conversations.filter(c =>
    (c.title || 'New Chat').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  // Group conversations by date
  const groupedConversations = filteredConversations.reduce((groups, conv) => {
    const dateKey = formatDate(conv.updatedAt)
    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(conv)
    return groups
  }, {} as Record<string, Conversation[]>)

  return (
    <div className="flex flex-col h-full border-r">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <Button
          onClick={onNewConversation}
          className="w-full justify-start gap-2"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>

        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Conversations list */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : Object.keys(groupedConversations).length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs">Start a new chat to begin</p>
          </div>
        ) : (
          <div className="p-2">
            {Object.entries(groupedConversations).map(([date, convs]) => (
              <div key={date} className="mb-4">
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  {date}
                </div>
                <div className="space-y-1">
                  {convs.map((conv) => (
                    <div
                      key={conv.id}
                      className={cn(
                        "group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer hover:bg-muted",
                        currentConversationId === conv.id && "bg-muted"
                      )}
                      onClick={() => onSelectConversation(conv.id)}
                    >
                      <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{conv.title || 'New Chat'}</p>
                        <p className="text-xs text-muted-foreground">
                          {conv.messageCount} messages
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteId(conv.id)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              conversation and all its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
