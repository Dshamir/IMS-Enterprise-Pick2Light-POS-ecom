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
  Database,
  AlertCircle,
  Trash2
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

export function AIDashboardChat() {
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

  const quickPrompts = [
    "What is the value of unused items?",
    "Show me low stock alerts",
    "Which items need reordering?",
    "List unused items",
    "What's our total inventory value?",
    "Show me critical stock items"
  ]

  const handleQuickPrompt = (prompt: string) => {
    setInputMessage(prompt)
  }

  if (agents.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            AI Assistant Chat
            <Badge variant="destructive" className="ml-auto">No Agents Available</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-80">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <p className="text-lg font-medium">AI Assistant Not Available</p>
              <p className="text-sm text-muted-foreground">
                No AI agents are configured or active. Please set up an AI provider and activate agents.
              </p>
            </div>
            <Button asChild variant="outline">
              <a href="/ai-assistant/settings">Configure AI Assistant</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          AI Assistant Chat
          <Badge variant="outline" className="ml-auto flex items-center gap-1">
            <Database className="h-3 w-3" />
            Connected to Database
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col h-[400px] md:h-[500px]">
        {/* Agent Selection */}
        <div className="mb-4">
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select AI agent" />
            </SelectTrigger>
            <SelectContent>
              {agents.map(agent => (
                <SelectItem key={agent.id} value={agent.id}>
                  <div className="flex items-center gap-2">
                    <Bot className="h-3 w-3" />
                    {agent.name} - {agent.role}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quick Action Prompts */}
        {messages.length === 0 && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">Quick Questions (optimized for database queries):</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {quickPrompts.map((prompt, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="h-auto text-xs p-2 justify-start hover:bg-primary/5 transition-colors"
                  onClick={() => handleQuickPrompt(prompt)}
                >
                  <span className="text-green-600 mr-1">⚡</span>
                  {prompt}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              💡 These questions will execute database queries for instant results
            </p>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">
                <Bot className="h-12 w-12 mx-auto mb-4 text-primary" />
                <div>
                  <p className="font-medium mb-2">Hi! I'm your inventory AI assistant.</p>
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <p className="text-xs text-green-600">Live database connection active</p>
                  </div>
                  <p>I can help you with:</p>
                  <ul className="text-left mt-2 space-y-1 max-w-xs mx-auto">
                    <li>• Real-time stock levels and alerts</li>
                    <li>• Product searches and details</li>
                    <li>• Reorder recommendations</li>
                    <li>• Inventory analytics and reports</li>
                  </ul>
                </div>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.role === 'assistant' && <Bot className="h-4 w-4 mt-1 flex-shrink-0" />}
                    {message.role === 'user' && <User className="h-4 w-4 mt-1 flex-shrink-0" />}
                    <div className="flex-1">
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-2">
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <Bot className="h-4 w-4" />
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Analyzing your inventory data...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        {/* Input */}
        <div className="flex space-x-2 mt-4">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask about your inventory..."
            className="flex-1"
            disabled={isLoading || !selectedAgent}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading || !selectedAgent}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
          {messages.length > 0 && (
            <Button
              variant="outline"
              size="icon"
              onClick={clearChat}
              title="Clear chat"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}