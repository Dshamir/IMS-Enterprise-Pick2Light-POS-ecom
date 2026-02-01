"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatMessage } from "./chat-message"
import { ChatSidebar } from "./chat-sidebar"
import { ModelSelector } from "@/components/ai/model-selector"
import { Send, Loader2, Settings2, Database, PanelLeftClose, PanelLeft } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Message {
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

interface Conversation {
  id: string
  title: string
  messages: Message[]
}

export function KBChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const [selectedModel, setSelectedModel] = useState("gpt-4o")
  const [useKBContext, setUseKBContext] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Load conversation when ID changes
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId)
    } else {
      setMessages([])
    }
  }, [conversationId])

  const loadConversation = async (id: string) => {
    try {
      const response = await fetch(`/api/knowledge-base/chat/conversations/${id}`)
      const data = await response.json()

      if (data.success) {
        setMessages(data.conversation.messages)
      }
    } catch (error) {
      console.error('Failed to load conversation:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load conversation"
      })
    }
  }

  const handleNewConversation = () => {
    setConversationId(null)
    setMessages([])
    setInput("")
    textareaRef.current?.focus()
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()

    const trimmedInput = input.trim()
    if (!trimmedInput || isLoading) return

    // Add user message immediately
    const userMessage: Message = {
      role: 'user',
      content: trimmedInput,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Create new conversation ID if needed
    const currentConvId = conversationId || crypto.randomUUID()
    if (!conversationId) {
      setConversationId(currentConvId)
    }

    try {
      const response = await fetch('/api/knowledge-base/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          conversationId: currentConvId,
          generateTitleFromFirst: messages.length === 0,
          options: {
            modelId: selectedModel,
            useKBContext
          }
        })
      })

      const data = await response.json()

      if (data.success) {
        setMessages(prev => [...prev, data.message])
      } else {
        throw new Error(data.error || 'Failed to get response')
      }
    } catch (error) {
      console.error('Chat error:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message"
      })
      // Remove user message on error
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] border rounded-lg overflow-hidden">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-64 flex-shrink-0">
          <ChatSidebar
            currentConversationId={conversationId || undefined}
            onSelectConversation={setConversationId}
            onNewConversation={handleNewConversation}
          />
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 p-3 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            {showSidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </Button>

          <div className="flex-1">
            <ModelSelector
              value={selectedModel}
              onValueChange={setSelectedModel}
              className="w-48"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64">
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Chat Settings</h4>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="kb-context">Use KB Context</Label>
                  </div>
                  <Switch
                    id="kb-context"
                    checked={useKBContext}
                    onCheckedChange={setUseKBContext}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  When enabled, the assistant will search the knowledge base before responding.
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <Database className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Knowledge Base Chat</h3>
              <p className="text-muted-foreground max-w-md">
                Ask questions about products, documents, or any information in your knowledge base.
                The assistant will search relevant content and provide informed answers.
              </p>
            </div>
          ) : (
            <div>
              {messages.map((message, index) => (
                <ChatMessage key={index} {...message} />
              ))}
              {isLoading && (
                <div className="flex gap-3 p-4">
                  <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Thinking...</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your knowledge base..."
              className="min-h-[44px] max-h-32 resize-none"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  )
}
