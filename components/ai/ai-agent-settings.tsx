"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Bot, 
  Settings, 
  AlertCircle, 
  BarChart3, 
  MessageSquare,
  Play,
  Pause,
  Edit,
  Info,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw
} from "lucide-react"
import { aiService } from "@/lib/ai/ai-service"
import { useToast } from "@/hooks/use-toast"

interface AIAgent {
  id: string
  name: string
  role: string
  description: string
  capabilities: string[]
  is_active: boolean
  provider_id?: string
  provider_name?: string
  provider_available: boolean
}

interface AIProvider {
  id: string
  name: string
  display_name: string
  is_active: boolean
  has_api_key: boolean
}

export function AIAgentSettings() {
  const [agents, setAgents] = useState<AIAgent[]>([])
  const [providers, setProviders] = useState<AIProvider[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [agentsData, providersData] = await Promise.all([
        aiService.getAgents(),
        aiService.getProviders()
      ])
      
      setAgents(agentsData)
      setProviders(providersData.filter(p => p.is_active && p.has_api_key))
    } catch (error) {
      console.error('Failed to load agent/provider data:', error)
      toast({
        title: "Loading Error",
        description: "Failed to load agent and provider data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleAgent = async (agentId: string, isActive: boolean) => {
    setUpdating(agentId)
    try {
      const result = await aiService.toggleAgent(agentId, isActive)
      
      if (result.success) {
        await loadData() // Reload to get updated status
        toast({
          title: isActive ? "Agent Activated" : "Agent Deactivated",
          description: `Agent has been ${isActive ? 'activated' : 'deactivated'} successfully`,
        })
      } else {
        throw new Error(result.error || 'Failed to update agent')
      }
    } catch (error) {
      console.error('Failed to toggle agent:', error)
      
      // Handle specific JSON parsing errors
      let errorMessage = "Failed to update agent"
      if (error instanceof Error) {
        if (error.message.includes('Unexpected token')) {
          errorMessage = "Server error - please check the connection and try again"
        } else {
          errorMessage = error.message
        }
      }
      
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setUpdating(null)
    }
  }

  const assignProvider = async (agentId: string, providerId: string) => {
    setUpdating(agentId)
    try {
      const response = await fetch(`/api/ai/agents/${agentId}/assign-provider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: providerId })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to assign provider')
      }
      
      const result = await response.json()
      if (result.success) {
        await loadData()
        toast({
          title: "Provider Assigned",
          description: result.message,
        })
      }
    } catch (error) {
      console.error('Failed to assign provider:', error)
      toast({
        title: "Assignment Failed",
        description: error instanceof Error ? error.message : "Failed to assign provider",
        variant: "destructive"
      })
    } finally {
      setUpdating(null)
    }
  }

  const autoAssignAll = async () => {
    try {
      const response = await fetch('/api/ai/agents/auto-assign', {
        method: 'POST'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Auto-assignment failed')
      }
      
      const result = await response.json()
      if (result.success) {
        await loadData()
        toast({
          title: "Auto-Assignment Complete",
          description: result.message,
        })
      }
    } catch (error) {
      console.error('Failed to auto-assign agents:', error)
      toast({
        title: "Auto-Assignment Failed",
        description: error instanceof Error ? error.message : "Failed to auto-assign agents",
        variant: "destructive"
      })
    }
  }

  const getStatusBadge = (agent: AIAgent) => {
    if (!agent.provider_id) {
      return <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" />No Provider</Badge>
    }
    
    if (!agent.provider_available) {
      return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Provider Inactive</Badge>
    }
    
    if (agent.is_active) {
      return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>
    }
    
    return <Badge variant="secondary"><Pause className="h-3 w-3 mr-1" />Ready</Badge>
  }

  const getAgentIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'inventory monitoring':
        return <AlertCircle className="h-5 w-5 text-orange-600" />
      case 'purchase planning':
        return <BarChart3 className="h-5 w-5 text-blue-600" />
      case 'natural language search':
        return <MessageSquare className="h-5 w-5 text-green-600" />
      default:
        return <Bot className="h-5 w-5 text-gray-600" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading AI agents...</span>
      </div>
    )
  }

  if (providers.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No active AI providers found. Please configure and activate an AI provider first before managing agents.
        </AlertDescription>
      </Alert>
    )
  }

  const unassignedAgents = agents.filter(agent => !agent.provider_id)

  return (
    <div className="space-y-6">
      {/* Auto-assign section */}
      {unassignedAgents.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{unassignedAgents.length} agents need to be assigned to providers</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={autoAssignAll}
            >
              Auto-Assign All
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Agents Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <Card key={agent.id} className={agent.is_active ? 'border-green-200' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getAgentIcon(agent.role)}
                  <span className="text-base">{agent.name}</span>
                </div>
                {getStatusBadge(agent)}
              </CardTitle>
              <CardDescription>{agent.role}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {agent.description}
                </p>

                {/* Provider Assignment */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">AI Provider</Label>
                  <Select
                    value={agent.provider_id || ''}
                    onValueChange={(providerId) => assignProvider(agent.id, providerId)}
                    disabled={updating === agent.id}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {agent.provider_name && (
                    <p className="text-xs text-muted-foreground">
                      Currently assigned to: {agent.provider_name}
                    </p>
                  )}
                </div>

                {/* Capabilities */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Capabilities</Label>
                  <div className="flex flex-wrap gap-1">
                    {agent.capabilities.slice(0, 3).map((capability, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {capability.replace('_', ' ')}
                      </Badge>
                    ))}
                    {agent.capabilities.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{agent.capabilities.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Activation Toggle */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`agent-${agent.id}`}
                      checked={agent.is_active}
                      onCheckedChange={(checked) => toggleAgent(agent.id, checked)}
                      disabled={!agent.provider_available || updating === agent.id}
                    />
                    <Label htmlFor={`agent-${agent.id}`} className="text-sm">
                      {agent.is_active ? 'Active' : 'Inactive'}
                    </Label>
                  </div>
                  
                  {updating === agent.id && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </div>

                {!agent.provider_available && agent.provider_id && (
                  <Alert className="mt-2">
                    <AlertCircle className="h-3 w-3" />
                    <AlertDescription className="text-xs">
                      Assigned provider is inactive. Please activate the provider or reassign.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Refresh button */}
      <div className="flex justify-center pt-4">
        <Button variant="outline" onClick={loadData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Agents
        </Button>
      </div>
    </div>
  )
}