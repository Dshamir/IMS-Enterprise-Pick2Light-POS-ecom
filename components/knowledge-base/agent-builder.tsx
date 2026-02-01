"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ModelSelector } from "@/components/ai/model-selector"
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/components/ui/use-toast"
import {
  Plus,
  X,
  Save,
  Loader2,
  Database,
  Package,
  Image,
  Code,
  FileText,
  Globe,
  Upload,
} from "lucide-react"

interface AgentCapabilities {
  kb_search: boolean
  inventory: boolean
  images: boolean
  code: boolean
  reports: boolean
  web_search: boolean
}

interface Agent {
  id?: string
  name: string
  description: string
  avatarUrl: string
  instructions: string
  conversationStarters: string[]
  knowledgeItems: string[]
  knowledgeFiles: string[]
  capabilities: AgentCapabilities
  modelId: string
  temperature: number
  maxTokens: number
  isPublished: boolean
}

interface AgentBuilderProps {
  agentId?: string
  onSave?: (agent: Agent) => void
  onCancel?: () => void
}

const defaultAgent: Agent = {
  name: "",
  description: "",
  avatarUrl: "",
  instructions: "",
  conversationStarters: [],
  knowledgeItems: [],
  knowledgeFiles: [],
  capabilities: {
    kb_search: true,
    inventory: false,
    images: false,
    code: false,
    reports: false,
    web_search: false
  },
  modelId: "gpt-4o",
  temperature: 0.7,
  maxTokens: 2000,
  isPublished: false
}

export function AgentBuilder({ agentId, onSave, onCancel }: AgentBuilderProps) {
  const [agent, setAgent] = useState<Agent>(defaultAgent)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newStarter, setNewStarter] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    if (agentId) {
      loadAgent(agentId)
    }
  }, [agentId])

  const loadAgent = async (id: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/knowledge-base/agents/${id}`)
      const data = await response.json()

      if (data.success) {
        setAgent(data.agent)
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load agent"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!agent.name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Agent name is required"
      })
      return
    }

    try {
      setIsSaving(true)

      const method = agentId ? 'PUT' : 'POST'
      const url = agentId
        ? `/api/knowledge-base/agents/${agentId}`
        : '/api/knowledge-base/agents'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agent)
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: agentId ? "Agent updated" : "Agent created",
          description: `${agent.name} has been saved successfully`
        })
        onSave?.({ ...agent, id: data.id || agentId })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save agent"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const addConversationStarter = () => {
    if (newStarter.trim() && agent.conversationStarters.length < 4) {
      setAgent({
        ...agent,
        conversationStarters: [...agent.conversationStarters, newStarter.trim()]
      })
      setNewStarter("")
    }
  }

  const removeConversationStarter = (index: number) => {
    setAgent({
      ...agent,
      conversationStarters: agent.conversationStarters.filter((_, i) => i !== index)
    })
  }

  const toggleCapability = (key: keyof AgentCapabilities) => {
    setAgent({
      ...agent,
      capabilities: {
        ...agent.capabilities,
        [key]: !agent.capabilities[key]
      }
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="create">
        <TabsList>
          <TabsTrigger value="create">Create</TabsTrigger>
          <TabsTrigger value="configure">Configure</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6 pt-4">
          {/* Avatar and Name */}
          <div className="flex gap-4 items-start">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-dashed">
              {agent.avatarUrl ? (
                <img src={agent.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                <Plus className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <Label>Name</Label>
              <Input
                value={agent.name}
                onChange={(e) => setAgent({ ...agent, name: e.target.value })}
                placeholder="Name your agent"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={agent.description}
              onChange={(e) => setAgent({ ...agent, description: e.target.value })}
              placeholder="Add a short description about what this agent does"
            />
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label>Instructions</Label>
            <Textarea
              value={agent.instructions}
              onChange={(e) => setAgent({ ...agent, instructions: e.target.value })}
              placeholder="What does this agent do? How does it behave? What should it avoid doing?"
              className="min-h-[150px]"
            />
            <p className="text-xs text-muted-foreground">
              Conversations with your agent can potentially include part or all of the instructions provided.
            </p>
          </div>

          {/* Conversation Starters */}
          <div className="space-y-2">
            <Label>Conversation starters</Label>
            <div className="space-y-2">
              {agent.conversationStarters.map((starter, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={starter} readOnly className="flex-1" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeConversationStarter(i)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {agent.conversationStarters.length < 4 && (
                <div className="flex gap-2">
                  <Input
                    value={newStarter}
                    onChange={(e) => setNewStarter(e.target.value)}
                    placeholder="Add a conversation starter..."
                    onKeyPress={(e) => e.key === 'Enter' && addConversationStarter()}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={addConversationStarter}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Knowledge */}
          <div className="space-y-2">
            <Label>Knowledge</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Conversations with your agent can potentially reveal part or all of the files uploaded.
            </p>
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload files
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="configure" className="space-y-6 pt-4">
          {/* Model Selection */}
          <div className="space-y-2">
            <Label>Recommended Model</Label>
            <ModelSelector
              value={agent.modelId}
              onValueChange={(value) => setAgent({ ...agent, modelId: value })}
              showCapabilities
            />
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Temperature</Label>
              <span className="text-sm text-muted-foreground">{agent.temperature}</span>
            </div>
            <Slider
              value={[agent.temperature]}
              onValueChange={([value]) => setAgent({ ...agent, temperature: value })}
              min={0}
              max={2}
              step={0.1}
            />
            <p className="text-xs text-muted-foreground">
              Lower values make output more focused, higher values more creative.
            </p>
          </div>

          {/* Capabilities */}
          <div className="space-y-4">
            <Label>Capabilities</Label>

            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span>KB Search</span>
                </div>
                <Switch
                  checked={agent.capabilities.kb_search}
                  onCheckedChange={() => toggleCapability('kb_search')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <span>Inventory Actions</span>
                </div>
                <Switch
                  checked={agent.capabilities.inventory}
                  onCheckedChange={() => toggleCapability('inventory')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  <span>Image Analysis</span>
                </div>
                <Switch
                  checked={agent.capabilities.images}
                  onCheckedChange={() => toggleCapability('images')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  <span>Code Interpreter</span>
                </div>
                <Switch
                  checked={agent.capabilities.code}
                  onCheckedChange={() => toggleCapability('code')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Report Generation</span>
                </div>
                <Switch
                  checked={agent.capabilities.reports}
                  onCheckedChange={() => toggleCapability('reports')}
                />
              </div>
            </div>
          </div>

          {/* Publish Toggle */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <Label>Published</Label>
              <p className="text-xs text-muted-foreground">Make this agent available to all users</p>
            </div>
            <Switch
              checked={agent.isPublished}
              onCheckedChange={(checked) => setAgent({ ...agent, isPublished: checked })}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Save className="h-4 w-4 mr-2" />
          {agentId ? 'Update Agent' : 'Create Agent'}
        </Button>
      </div>
    </div>
  )
}
