"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { ArrowLeft, Bot, Plus, Edit3, Trash2, Users, Settings, Eye, Play, Loader2, Send } from "lucide-react"
import { CustomAgentForm } from "@/components/ai/custom-agent-form"
import { useToast } from "@/components/ui/use-toast"

interface CustomAgent {
  id: string
  name: string
  description: string
  type: 'individual' | 'orchestrator' | 'worker'
  role: string
  system_prompt: string
  capabilities: string[]
  orchestrator_id: string | null
  provider_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function CustomAgentsPage() {
  const { toast } = useToast()
  const [agents, setAgents] = useState<CustomAgent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  
  // Modal states
  const [viewAgent, setViewAgent] = useState<CustomAgent | null>(null)
  const [editAgent, setEditAgent] = useState<CustomAgent | null>(null)
  const [testAgent, setTestAgent] = useState<CustomAgent | null>(null)
  
  // Loading states
  const [isLoadingAgent, setIsLoadingAgent] = useState(false)
  const [isTestingAgent, setIsTestingAgent] = useState(false)
  
  // Test agent state
  const [testMessage, setTestMessage] = useState("")
  const [testResponse, setTestResponse] = useState("")

  // Load custom agents
  useEffect(() => {
    loadAgents()
  }, [])

  const loadAgents = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/ai/agents')
      if (response.ok) {
        const data = await response.json()
        // Filter to only show custom agents (not the default system agents)
        const customAgents = data.agents.filter((agent: any) => 
          !['Stock Monitor', 'Reorder Assistant', 'Search Assistant', 'Image Processing Specialist'].includes(agent.name)
        )
        setAgents(customAgents)
      } else {
        throw new Error('Failed to fetch agents')
      }
    } catch (error) {
      console.error('Error loading agents:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveAgent = (agentData: any) => {
    console.log('Agent saved:', agentData)
    setShowCreateForm(false)
    loadAgents() // Refresh list
  }

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/ai/agents/${agentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadAgents() // Refresh list
      } else {
        const error = await response.json()
        alert(`Failed to delete agent: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting agent:', error)
      alert('Failed to delete agent')
    }
  }

  const handleViewAgent = async (agent: CustomAgent) => {
    setIsLoadingAgent(true)
    try {
      const response = await fetch(`/api/ai/agents/${agent.id}`)
      if (response.ok) {
        const data = await response.json()
        setViewAgent(data.agent)
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load agent details",
        })
      }
    } catch (error) {
      console.error('Error loading agent details:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load agent details",
      })
    } finally {
      setIsLoadingAgent(false)
    }
  }

  const handleEditAgent = async (agent: CustomAgent) => {
    setIsLoadingAgent(true)
    try {
      const response = await fetch(`/api/ai/agents/${agent.id}`)
      if (response.ok) {
        const data = await response.json()
        setEditAgent(data.agent)
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load agent for editing",
        })
      }
    } catch (error) {
      console.error('Error loading agent for editing:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load agent for editing",
      })
    } finally {
      setIsLoadingAgent(false)
    }
  }

  const handleTestAgent = (agent: CustomAgent) => {
    setTestAgent(agent)
    setTestMessage("")
    setTestResponse("")
  }

  const handleSaveEditedAgent = async (agentData: any) => {
    if (!editAgent) return

    try {
      const response = await fetch(`/api/ai/agents/${editAgent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentData)
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Agent updated successfully",
        })
        setEditAgent(null)
        loadAgents() // Refresh list
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to update agent",
        })
      }
    } catch (error) {
      console.error('Error updating agent:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update agent",
      })
    }
  }

  const handleSendTestMessage = async () => {
    if (!testAgent || !testMessage.trim()) return

    setIsTestingAgent(true)
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: testMessage,
          agent_id: testAgent.id,
          context: {
            type: 'agent_test',
            agent_name: testAgent.name
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        setTestResponse(data.response || "No response received")
      } else {
        setTestResponse("Error: Failed to get response from agent")
      }
    } catch (error) {
      console.error('Error testing agent:', error)
      setTestResponse("Error: Failed to communicate with agent")
    } finally {
      setIsTestingAgent(false)
    }
  }

  const getAgentTypeIcon = (type: string) => {
    switch (type) {
      case 'orchestrator':
        return <Users className="h-4 w-4" />
      case 'worker':
        return <Settings className="h-4 w-4" />
      default:
        return <Bot className="h-4 w-4" />
    }
  }

  const getAgentTypeBadge = (type: string) => {
    switch (type) {
      case 'orchestrator':
        return <Badge variant="default" className="bg-purple-100 text-purple-800">Orchestrator</Badge>
      case 'worker':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Worker</Badge>
      default:
        return <Badge variant="default" className="bg-green-100 text-green-800">Individual</Badge>
    }
  }

  const orchestrators = agents.filter(a => a.type === 'orchestrator')
  const workers = agents.filter(a => a.type === 'worker')
  const individuals = agents.filter(a => a.type === 'individual')

  return (
    <main className="container mx-auto py-4 px-4 md:py-8 md:max-w-none md:w-[90%]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/ai-assistant">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to AI Assistant
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Bot className="h-8 w-8 text-blue-600" />
            Custom AI Agents
          </h1>
          <p className="text-muted-foreground">Create and manage your custom AI agents and orchestration workflows</p>
        </div>

        <div className="flex gap-2 mt-4 md:mt-0">
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Agent
          </Button>
        </div>
      </div>

      {/* Agent Statistics */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Custom Agents</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.length}</div>
            <p className="text-xs text-muted-foreground">
              {agents.filter(a => a.is_active).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agent Types</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Orchestrators:</span>
                <span className="ml-1 font-medium">{orchestrators.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Workers:</span>
                <span className="ml-1 font-medium">{workers.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Individual:</span>
                <span className="ml-1 font-medium">{individuals.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Your Custom Agents</CardTitle>
          <CardDescription>
            Manage your custom AI agents and their configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading agents...</div>
                </div>
              ) : agents.length === 0 ? (
                <div className="text-center py-8">
                  <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No custom agents yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first custom AI agent to get started</p>
                  <Button onClick={() => setShowCreateForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Agent
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {agents.map((agent) => (
                    <div key={agent.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-lg">
                          {getAgentTypeIcon(agent.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{agent.name}</h3>
                            {getAgentTypeBadge(agent.type)}
                            <Badge variant={agent.is_active ? "default" : "secondary"}>
                              {agent.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{agent.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Role: {agent.role}</span>
                            <span>Capabilities: {agent.capabilities.length}</span>
                            {agent.orchestrator_id && (
                              <span>Managed by: {agents.find(a => a.id === agent.orchestrator_id)?.name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="View Details"
                          onClick={() => handleViewAgent(agent)}
                          disabled={isLoadingAgent}
                        >
                          {isLoadingAgent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="Edit Agent"
                          onClick={() => handleEditAgent(agent)}
                          disabled={isLoadingAgent}
                        >
                          {isLoadingAgent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit3 className="h-4 w-4" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="Test Agent"
                          onClick={() => handleTestAgent(agent)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:text-destructive"
                          title="Delete Agent"
                          onClick={() => handleDeleteAgent(agent.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
        </CardContent>
      </Card>

      {/* View Agent Details Modal */}
      <Dialog open={!!viewAgent} onOpenChange={() => setViewAgent(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Agent Details: {viewAgent?.name}
            </DialogTitle>
            <DialogDescription>
              View the configuration and details of this AI agent
            </DialogDescription>
          </DialogHeader>
          
          {viewAgent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-sm text-muted-foreground">{viewAgent.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  <div className="flex items-center gap-2">
                    {getAgentTypeIcon(viewAgent.type)}
                    {getAgentTypeBadge(viewAgent.type)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Role</Label>
                  <p className="text-sm text-muted-foreground">{viewAgent.role}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge variant={viewAgent.is_active ? "default" : "secondary"}>
                    {viewAgent.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm text-muted-foreground mt-1">{viewAgent.description}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">System Prompt</Label>
                <ScrollArea className="h-32 w-full border rounded-md p-3 mt-1">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {viewAgent.system_prompt || "No system prompt configured"}
                  </p>
                </ScrollArea>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Capabilities</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {viewAgent.capabilities && viewAgent.capabilities.length > 0 ? (
                    viewAgent.capabilities.map((capability, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {capability}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No capabilities defined</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Created</Label>
                  <p className="text-sm text-muted-foreground">
                    {viewAgent.created_at ? new Date(viewAgent.created_at).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Last Updated</Label>
                  <p className="text-sm text-muted-foreground">
                    {viewAgent.updated_at ? new Date(viewAgent.updated_at).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Agent Modal */}
      <Dialog open={!!editAgent} onOpenChange={() => setEditAgent(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Edit Agent: {editAgent?.name}
            </DialogTitle>
            <DialogDescription>
              Update the configuration and settings of this AI agent
            </DialogDescription>
          </DialogHeader>
          
          {editAgent && (
            <CustomAgentForm
              initialData={editAgent}
              onSave={handleSaveEditedAgent}
              onCancel={() => setEditAgent(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Test Agent Modal */}
      <Dialog open={!!testAgent} onOpenChange={() => setTestAgent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Test Agent: {testAgent?.name}
            </DialogTitle>
            <DialogDescription>
              Send a test message to this agent and see how it responds
            </DialogDescription>
          </DialogHeader>
          
          {testAgent && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="test-message" className="text-sm font-medium">
                  Test Message
                </Label>
                <Textarea
                  id="test-message"
                  placeholder="Enter a message to test the agent's response..."
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
              
              <Button 
                onClick={handleSendTestMessage}
                disabled={!testMessage.trim() || isTestingAgent}
                className="w-full"
              >
                {isTestingAgent ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Test Message
                  </>
                )}
              </Button>
              
              {testResponse && (
                <div>
                  <Label className="text-sm font-medium">Agent Response</Label>
                  <ScrollArea className="h-32 w-full border rounded-md p-3 mt-1">
                    <p className="text-sm whitespace-pre-wrap">{testResponse}</p>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}