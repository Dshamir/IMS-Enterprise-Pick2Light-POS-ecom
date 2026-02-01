"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import {
  ArrowLeft,
  Plus,
  Bot,
  Loader2,
  Edit,
  Trash2,
  MessageSquare,
  Database,
  Package,
  Image,
  Code,
  FileText,
} from "lucide-react"
import Link from "next/link"
import { AgentBuilder } from "@/components/knowledge-base/agent-builder"
import { AgentPreview } from "@/components/knowledge-base/agent-preview"

interface Agent {
  id: string
  name: string
  description: string | null
  avatarUrl: string | null
  instructions: string | null
  conversationStarters: string[]
  capabilities: {
    kb_search?: boolean
    inventory?: boolean
    images?: boolean
    code?: boolean
    reports?: boolean
  }
  modelId: string | null
  isPublished: boolean
  createdAt: string
  updatedAt: string
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingAgent, setEditingAgent] = useState<string | null>(null)
  const [testingAgent, setTestingAgent] = useState<Agent | null>(null)
  const [deletingAgent, setDeletingAgent] = useState<Agent | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadAgents()
  }, [])

  const loadAgents = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/knowledge-base/agents')
      const data = await response.json()

      if (data.success) {
        setAgents(data.agents)
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load agents"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingAgent) return

    try {
      const response = await fetch(`/api/knowledge-base/agents/${deletingAgent.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setAgents(prev => prev.filter(a => a.id !== deletingAgent.id))
        toast({
          title: "Agent deleted",
          description: `${deletingAgent.name} has been deleted`
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete agent"
      })
    } finally {
      setDeletingAgent(null)
    }
  }

  const getCapabilityIcons = (capabilities: Agent['capabilities']) => {
    const icons = []
    if (capabilities.kb_search) icons.push(<Database key="kb" className="h-3 w-3" />)
    if (capabilities.inventory) icons.push(<Package key="inv" className="h-3 w-3" />)
    if (capabilities.images) icons.push(<Image key="img" className="h-3 w-3" />)
    if (capabilities.code) icons.push(<Code key="code" className="h-3 w-3" />)
    if (capabilities.reports) icons.push(<FileText key="rep" className="h-3 w-3" />)
    return icons
  }

  return (
    <div className="container py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/knowledge-base">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Custom AI Agents</h1>
            <p className="text-muted-foreground">
              Create and manage AI agents with custom capabilities
            </p>
          </div>
        </div>
        <Button onClick={() => setShowBuilder(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Agent
        </Button>
      </div>

      {/* Agents Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : agents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No agents yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first custom AI agent to get started
            </p>
            <Button onClick={() => setShowBuilder(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Agent
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card key={agent.id} className="relative">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                    {agent.avatarUrl ? (
                      <img src={agent.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <Bot className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{agent.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {agent.description || 'No description'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Capabilities */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs text-muted-foreground">Capabilities:</span>
                  <div className="flex gap-1">
                    {getCapabilityIcons(agent.capabilities).length > 0 ? (
                      getCapabilityIcons(agent.capabilities)
                    ) : (
                      <span className="text-xs text-muted-foreground">None</span>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2 mb-4">
                  {agent.isPublished ? (
                    <Badge variant="default">Published</Badge>
                  ) : (
                    <Badge variant="secondary">Draft</Badge>
                  )}
                  {agent.modelId && (
                    <Badge variant="outline" className="text-xs">
                      {agent.modelId}
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setTestingAgent(agent)}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Test
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingAgent(agent.id)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeletingAgent(agent)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showBuilder || !!editingAgent} onOpenChange={(open) => {
        if (!open) {
          setShowBuilder(false)
          setEditingAgent(null)
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAgent ? 'Edit Agent' : 'Create New Agent'}
            </DialogTitle>
          </DialogHeader>
          <AgentBuilder
            agentId={editingAgent || undefined}
            onSave={() => {
              setShowBuilder(false)
              setEditingAgent(null)
              loadAgents()
            }}
            onCancel={() => {
              setShowBuilder(false)
              setEditingAgent(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={!!testingAgent} onOpenChange={(open) => !open && setTestingAgent(null)}>
        <DialogContent className="max-w-2xl h-[600px] flex flex-col p-0">
          {testingAgent && (
            <AgentPreview
              agentId={testingAgent.id}
              agentName={testingAgent.name}
              conversationStarters={testingAgent.conversationStarters}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingAgent} onOpenChange={() => setDeletingAgent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete agent?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deletingAgent?.name} and all its conversations.
              This action cannot be undone.
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
