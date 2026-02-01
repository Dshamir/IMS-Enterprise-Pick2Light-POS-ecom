"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Bot, Users, Settings, CheckCircle } from "lucide-react"

interface CustomAgentFormProps {
  onSave: (agent: any) => void
  onCancel: () => void
  editAgent?: any
}

interface Provider {
  id: string
  display_name: string
  is_active: boolean
}

interface Agent {
  id: string
  name: string
  type: 'orchestrator' | 'worker' | 'individual'
}

export function CustomAgentForm({ onSave, onCancel, editAgent }: CustomAgentFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'individual' as 'individual' | 'orchestrator' | 'worker',
    role: '',
    system_prompt: '',
    capabilities: [] as string[],
    orchestrator_id: '',
    provider_id: '',
    is_active: true
  })

  const [providers, setProviders] = useState<Provider[]>([])
  const [orchestrators, setOrchestrators] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Available capabilities
  const availableCapabilities = [
    { id: 'inventory_analysis', label: 'Inventory Analysis', description: 'Analyze stock levels and trends' },
    { id: 'product_management', label: 'Product Management', description: 'Create and update products' },
    { id: 'order_processing', label: 'Order Processing', description: 'Handle customer orders' },
    { id: 'supplier_management', label: 'Supplier Management', description: 'Manage supplier relationships' },
    { id: 'price_optimization', label: 'Price Optimization', description: 'Optimize product pricing' },
    { id: 'demand_forecasting', label: 'Demand Forecasting', description: 'Predict future demand' },
    { id: 'task_delegation', label: 'Task Delegation', description: 'Assign tasks to other agents' },
    { id: 'agent_coordination', label: 'Agent Coordination', description: 'Coordinate multiple agents' },
    { id: 'report_generation', label: 'Report Generation', description: 'Generate business reports' },
    { id: 'quality_monitoring', label: 'Quality Monitoring', description: 'Monitor product quality' }
  ]

  // Load providers and orchestrators
  useEffect(() => {
    loadFormData()
  }, [])

  // Initialize form with edit data
  useEffect(() => {
    if (editAgent) {
      setFormData({
        name: editAgent.name || '',
        description: editAgent.description || '',
        type: editAgent.type || 'individual',
        role: editAgent.role || '',
        system_prompt: editAgent.system_prompt || '',
        capabilities: editAgent.capabilities || [],
        orchestrator_id: editAgent.orchestrator_id || '',
        provider_id: editAgent.provider_id || '',
        is_active: editAgent.is_active !== false
      })
    }
  }, [editAgent])

  const loadFormData = async () => {
    try {
      // Load real providers
      const providersResponse = await fetch('/api/ai/providers')
      if (providersResponse.ok) {
        const providersData = await providersResponse.json()
        setProviders(providersData.providers.filter((p: Provider) => p.is_active))
      }

      // Load real orchestrator agents
      const agentsResponse = await fetch('/api/ai/agents')
      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json()
        const orchestratorAgents = agentsData.agents
          .filter((a: any) => a.type === 'orchestrator')
          .map((a: any) => ({
            id: a.id,
            name: a.name,
            type: a.type
          }))
        setOrchestrators(orchestratorAgents)
      }
    } catch (error) {
      console.error('Error loading form data:', error)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleCapabilityToggle = (capabilityId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      capabilities: checked
        ? [...prev.capabilities, capabilityId]
        : prev.capabilities.filter(c => c !== capabilityId)
    }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) newErrors.name = 'Agent name is required'
    if (!formData.description.trim()) newErrors.description = 'Description is required'
    if (!formData.role.trim()) newErrors.role = 'Role/Purpose is required'
    if (!formData.system_prompt.trim()) newErrors.system_prompt = 'System prompt is required'
    if (!formData.provider_id) newErrors.provider_id = 'Provider is required'
    if (formData.capabilities.length === 0) newErrors.capabilities = 'At least one capability is required'

    // Type-specific validations
    if (formData.type === 'worker' && !formData.orchestrator_id) {
      newErrors.orchestrator_id = 'Worker agents must be assigned to an orchestrator'
    }

    if (formData.type === 'orchestrator' && !formData.capabilities.includes('task_delegation')) {
      newErrors.capabilities = 'Orchestrators must have task delegation capability'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    try {
      const method = editAgent ? 'PUT' : 'POST'
      const url = editAgent ? `/api/ai/agents/${editAgent.id}` : '/api/ai/agents'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save agent')
      }
      
      const result = await response.json()
      
      if (result.success) {
        onSave(result.agent || formData)
      } else {
        throw new Error(result.error || 'Failed to save agent')
      }
    } catch (error) {
      console.error('Error saving agent:', error)
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to save agent' })
    } finally {
      setIsLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'orchestrator': return <Users className="h-4 w-4" />
      case 'worker': return <Settings className="h-4 w-4" />
      default: return <Bot className="h-4 w-4" />
    }
  }

  const getTypeDescription = (type: string) => {
    switch (type) {
      case 'orchestrator': return 'Coordinates multiple agents and manages complex workflows'
      case 'worker': return 'Executes tasks assigned by orchestrator agents'
      default: return 'Works independently on specific tasks'
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Define your agent's identity and purpose</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Agent Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Price Optimizer"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role/Purpose *</Label>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                placeholder="e.g., pricing_analyst"
                className={errors.role ? 'border-red-500' : ''}
              />
              {errors.role && <p className="text-sm text-red-500">{errors.role}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe what this agent does..."
              className={errors.description ? 'border-red-500' : ''}
              rows={3}
            />
            {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Agent Type */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Type</CardTitle>
          <CardDescription>Choose how this agent operates in your system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['individual', 'orchestrator', 'worker'] as const).map((type) => (
              <div
                key={type}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  formData.type === type
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-muted hover:border-muted-foreground/50'
                }`}
                onClick={() => handleInputChange('type', type)}
              >
                <div className="flex items-center gap-2 mb-2">
                  {getTypeIcon(type)}
                  <span className="font-medium capitalize">{type}</span>
                  {formData.type === type && <CheckCircle className="h-4 w-4 text-primary ml-auto" />}
                </div>
                <p className="text-sm text-muted-foreground">{getTypeDescription(type)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Orchestration Settings */}
      {formData.type === 'worker' && (
        <Card>
          <CardHeader>
            <CardTitle>Orchestration Settings</CardTitle>
            <CardDescription>Configure how this agent works with orchestrators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="orchestrator">Assigned to Orchestrator *</Label>
              <Select
                value={formData.orchestrator_id}
                onValueChange={(value) => handleInputChange('orchestrator_id', value)}
              >
                <SelectTrigger className={errors.orchestrator_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select an orchestrator" />
                </SelectTrigger>
                <SelectContent>
                  {orchestrators.map((orchestrator) => (
                    <SelectItem key={orchestrator.id} value={orchestrator.id}>
                      {orchestrator.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.orchestrator_id && <p className="text-sm text-red-500">{errors.orchestrator_id}</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Prompt */}
      <Card>
        <CardHeader>
          <CardTitle>AI Behavior</CardTitle>
          <CardDescription>Define how your agent thinks and responds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="system_prompt">System Prompt *</Label>
            <Textarea
              id="system_prompt"
              value={formData.system_prompt}
              onChange={(e) => handleInputChange('system_prompt', e.target.value)}
              placeholder="You are an AI assistant specialized in..."
              className={errors.system_prompt ? 'border-red-500' : ''}
              rows={6}
            />
            {errors.system_prompt && <p className="text-sm text-red-500">{errors.system_prompt}</p>}
            <p className="text-xs text-muted-foreground">
              Define the agent's personality, expertise, and how it should respond to requests
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Capabilities */}
      <Card>
        <CardHeader>
          <CardTitle>Capabilities</CardTitle>
          <CardDescription>Select what this agent can access and do</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableCapabilities.map((capability) => (
              <div key={capability.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id={capability.id}
                  checked={formData.capabilities.includes(capability.id)}
                  onCheckedChange={(checked) => handleCapabilityToggle(capability.id, checked === true)}
                />
                <div className="flex-1">
                  <Label htmlFor={capability.id} className="font-medium cursor-pointer">
                    {capability.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{capability.description}</p>
                </div>
              </div>
            ))}
          </div>
          {errors.capabilities && <p className="text-sm text-red-500 mt-2">{errors.capabilities}</p>}
        </CardContent>
      </Card>

      {/* Provider & Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Technical settings for your agent</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider">AI Provider *</Label>
              <Select
                value={formData.provider_id}
                onValueChange={(value) => handleInputChange('provider_id', value)}
              >
                <SelectTrigger className={errors.provider_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers.filter(p => p.is_active).map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.provider_id && <p className="text-sm text-red-500">{errors.provider_id}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="active">Agent Status</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                />
                <Label htmlFor="active">
                  {formData.is_active ? 'Active' : 'Inactive'}
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="space-y-4">
        {errors.submit && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {errors.submit}
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : editAgent ? 'Update Agent' : 'Create Agent'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  )
}