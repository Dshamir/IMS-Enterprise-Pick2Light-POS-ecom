"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Bot, 
  Send, 
  Loader2, 
  MessageSquare, 
  User, 
  Minimize2, 
  Maximize2, 
  X,
  AlertCircle 
} from 'lucide-react'
import { aiService } from '@/lib/ai/ai-service'
import { useToast } from '@/hooks/use-toast'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  agent_id?: string
}

interface Agent {
  id: string
  name: string
  role: string
  is_active: boolean
  provider_available: boolean
}

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<string>('')
  const [agents, setAgents] = useState<Agent[]>([])
  const [sessionId] = useState(() => aiService.generateSessionId())
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadAgents()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadAgents = async () => {
    try {
      const agentsData = await aiService.getAgents()
      const activeAgents = agentsData.filter(agent => agent.is_active && agent.provider_available)
      setAgents(activeAgents)
      
      if (activeAgents.length > 0 && !selectedAgent) {
        setSelectedAgent(activeAgents[0].id)
      }
    } catch (error) {
      console.error('Failed to load agents:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedAgent || isLoading) return

    const userMessage: Message = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString(),
      agent_id: selectedAgent
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const result = await aiService.sendMessage(userMessage.content, selectedAgent, sessionId)
      
      if (result.success && result.response) {
        const assistantMessage: Message = {
          id: `msg_${Date.now()}_assistant`,
          role: 'assistant',
          content: result.response,
          timestamp: new Date().toISOString(),
          agent_id: selectedAgent
        }
        
        setMessages(prev => [...prev, assistantMessage])
      } else {
        throw new Error(result.error || 'Failed to get AI response')
      }
    } catch (error) {
      console.error('Chat error:', error)
      
      // Add error message to chat
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: `I'm having trouble responding right now. ${error instanceof Error ? error.message : 'Please try again later.'}`,
        timestamp: new Date().toISOString(),
        agent_id: selectedAgent
      }
      
      setMessages(prev => [...prev, errorMessage])
      
      toast({
        title: "Chat Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getAgentName = (agentId?: string) => {
    const agent = agents.find(a => a.id === agentId)
    return agent?.name || 'AI Assistant'
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg z-50 md:bottom-6 md:right-6 hover:scale-105 transition-all duration-200"
        size="icon"
      >
        <MessageSquare className="h-6 w-6" />
        <span className="sr-only">Open AI Assistant</span>
      </Button>
    )
  }

  if (agents.length === 0) {
    return (
      <Card className="fixed bottom-4 right-4 w-80 h-96 shadow-lg z-50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">AI Assistant</CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center space-y-2">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              No AI agents available. Please configure an AI provider and activate agents first.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`fixed bottom-4 right-4 shadow-lg z-50 transition-all duration-300 ${isMinimized ? 'w-80 h-16 md:w-96' : 'w-80 h-96 md:w-96 md:h-[32rem]'} max-h-[90vh]`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <Bot className="h-4 w-4" />
          <CardTitle className="text-sm font-medium">AI Assistant</CardTitle>
          {selectedAgent && (
            <Badge variant="outline" className="text-xs">
              {getAgentName(selectedAgent)}
            </Badge>
          )}
        </div>
        <div className="flex space-x-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="flex flex-col h-80 md:h-96">
          {/* Agent Selection */}
          <div className="mb-2">
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select AI agent" />
              </SelectTrigger>
              <SelectContent>
                {agents.map(agent => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name} - {agent.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 pr-2">
            <div className="space-y-2">
              {messages.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-6">
                  <Bot className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <div className="space-y-2">
                    <p className="font-medium">Hi! I can help with your inventory.</p>
                    <div className="flex items-center justify-center gap-1 text-xs">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-600">Database connected</span>
                    </div>
                    <p className="text-xs">Try: "What is the value of unused items?"</p>
                  </div>
                </div>
              )}
              
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {message.role === 'assistant' && <Bot className="h-3 w-3 mt-1 flex-shrink-0" />}
                      {message.role === 'user' && <User className="h-3 w-3 mt-1 flex-shrink-0" />}
                      <div className="flex-1">
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <Bot className="h-3 w-3" />
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Input */}
          <div className="flex space-x-2 mt-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask about inventory..."
              className="flex-1 h-8 text-sm"
              disabled={isLoading || !selectedAgent}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading || !selectedAgent}
              size="icon"
              className="h-8 w-8"
            >
              <Send className="h-3 w-3" />
            </Button>
          </div>

          {/* Actions */}
          {messages.length > 0 && (
            <div className="flex justify-end mt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearChat}
                className="h-6 text-xs"
              >
                Clear Chat
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}