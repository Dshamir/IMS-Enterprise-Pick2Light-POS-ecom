"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Zap,
  Plus,
  Play,
  Pause,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface AutomationRule {
  id: string
  rule_name: string
  description: string | null
  trigger_type: string
  trigger_condition: string
  action_type: string
  action_params: string
  requires_approval: number
  priority: number
  is_active: number
  execution_count: number
  last_executed_at: string | null
}

interface AutomationExecution {
  id: string
  rule_id: string
  rule_name: string
  execution_status: string
  executed_at: string
  duration_ms: number | null
}

export default function AutopilotPage() {
  const { toast } = useToast()
  const [autopilotEnabled, setAutopilotEnabled] = useState(false)
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [executions, setExecutions] = useState<AutomationExecution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showRuleDialog, setShowRuleDialog] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    rule_name: '',
    description: '',
    trigger_type: 'low_stock',
    action_type: 'reorder',
    priority: 5,
    requires_approval: true,
    is_active: true
  })

  useEffect(() => {
    loadData()
    loadAutopilotStatus()
  }, [])

  const loadAutopilotStatus = async () => {
    try {
      const response = await fetch('/api/command-center/config')
      if (response.ok) {
        const config = await response.json()
        const autopilotConfig = config.find((c: any) => c.key === 'autopilot_enabled')
        if (autopilotConfig) {
          setAutopilotEnabled(autopilotConfig.value === 'true')
        }
      }
    } catch (error) {
      console.error('Failed to load autopilot status:', error)
    }
  }

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [rulesRes, executionsRes] = await Promise.all([
        fetch('/api/command-center/automation-rules'),
        fetch('/api/command-center/automation-executions?limit=20')
      ])

      if (rulesRes.ok) {
        const rulesData = await rulesRes.json()
        setRules(rulesData)
      }

      if (executionsRes.ok) {
        const executionsData = await executionsRes.json()
        setExecutions(executionsData)
      }
    } catch (error) {
      toast({
        type: "error",
        title: "Error",
        description: "Failed to load automation data"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleAutopilot = async (enabled: boolean) => {
    try {
      const response = await fetch('/api/command-center/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'autopilot_enabled', value: String(enabled) })
      })

      if (response.ok) {
        setAutopilotEnabled(enabled)
        toast({
          type: "success",
          title: enabled ? "Autopilot Enabled" : "Autopilot Disabled",
          description: enabled ? "Automation rules will now run automatically" : "Automation paused"
        })
      }
    } catch (error) {
      toast({
        type: "error",
        title: "Error",
        description: "Failed to toggle autopilot"
      })
    }
  }

  const executeRule = async (ruleId: string) => {
    try {
      const response = await fetch('/api/command-center/automation-executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule_id: ruleId })
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          type: "success",
          title: "Automation Executed",
          description: `Rule executed with status: ${data.status}`
        })
        loadData()
      }
    } catch (error) {
      toast({
        type: "error",
        title: "Error",
        description: "Failed to execute automation"
      })
    }
  }

  const toggleRuleStatus = async (ruleId: string, isActive: boolean) => {
    try {
      const rule = rules.find(r => r.id === ruleId)
      if (!rule) return

      const response = await fetch(`/api/command-center/automation-rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rule, is_active: isActive ? 1 : 0 })
      })

      if (response.ok) {
        toast({
          type: "success",
          title: isActive ? "Rule Enabled" : "Rule Disabled",
          description: `${rule.rule_name} is now ${isActive ? 'active' : 'inactive'}`
        })
        loadData()
      }
    } catch (error) {
      toast({
        type: "error",
        title: "Error",
        description: "Failed to toggle rule status"
      })
    }
  }

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return

    try {
      const response = await fetch(`/api/command-center/automation-rules/${ruleId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          type: "success",
          title: "Rule Deleted",
          description: "Automation rule has been removed"
        })
        loadData()
      }
    } catch (error) {
      toast({
        type: "error",
        title: "Error",
        description: "Failed to delete rule"
      })
    }
  }

  const saveRule = async () => {
    try {
      const url = editingRule
        ? `/api/command-center/automation-rules/${editingRule.id}`
        : '/api/command-center/automation-rules'

      const response = await fetch(url, {
        method: editingRule ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast({
          type: "success",
          title: editingRule ? "Rule Updated" : "Rule Created",
          description: "Automation rule saved successfully"
        })
        setShowRuleDialog(false)
        setEditingRule(null)
        resetForm()
        loadData()
      }
    } catch (error) {
      toast({
        type: "error",
        title: "Error",
        description: "Failed to save rule"
      })
    }
  }

  const openEditDialog = (rule: AutomationRule) => {
    setEditingRule(rule)
    setFormData({
      rule_name: rule.rule_name,
      description: rule.description || '',
      trigger_type: rule.trigger_type,
      action_type: rule.action_type,
      priority: rule.priority,
      requires_approval: rule.requires_approval === 1,
      is_active: rule.is_active === 1
    })
    setShowRuleDialog(true)
  }

  const resetForm = () => {
    setFormData({
      rule_name: '',
      description: '',
      trigger_type: 'low_stock',
      action_type: 'reorder',
      priority: 5,
      requires_approval: true,
      is_active: true
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'failed': return 'text-red-600 bg-red-100'
      case 'running': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-purple-50">
      {/* Header */}
      <div className="command-center-gradient text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20">
                <Link href="/command-center">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Link>
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Autopilot</h1>
                  <p className="text-white/90 text-sm">Automated inventory management</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-3 px-4 py-2 bg-white/20 backdrop-blur-md rounded-lg">
                <Label htmlFor="autopilot-toggle" className="text-white cursor-pointer">
                  {autopilotEnabled ? 'Enabled' : 'Disabled'}
                </Label>
                <Switch
                  id="autopilot-toggle"
                  checked={autopilotEnabled}
                  onCheckedChange={toggleAutopilot}
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={loadData}
                className="bg-white/20 backdrop-blur-md hover:bg-white/30 border-white/30"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="command-center-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total Rules</p>
                <Zap className="h-5 w-5 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{rules.length}</p>
            </CardContent>
          </Card>

          <Card className="command-center-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Active Rules</p>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {rules.filter(r => r.is_active).length}
              </p>
            </CardContent>
          </Card>

          <Card className="command-center-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total Executions</p>
                <Play className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{executions.length}</p>
            </CardContent>
          </Card>

          <Card className="command-center-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Success Rate</p>
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {executions.length > 0
                  ? Math.round((executions.filter(e => e.execution_status === 'completed').length / executions.length) * 100)
                  : 0}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Automation Rules */}
        <Card className="command-center-card mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Automation Rules</CardTitle>
                <CardDescription>Configure automated inventory actions</CardDescription>
              </div>
              <Button
                onClick={() => {
                  resetForm()
                  setEditingRule(null)
                  setShowRuleDialog(true)
                }}
                className="command-center-button-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Rule
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-4 border-2 border-purple-200 rounded-lg hover:border-purple-400 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{rule.rule_name}</h3>
                        <Badge className={rule.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline">Priority {rule.priority}</Badge>
                      </div>
                      {rule.description && (
                        <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                      )}
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>Trigger: {rule.trigger_type}</span>
                        <span>Action: {rule.action_type}</span>
                        <span>Executions: {rule.execution_count}</span>
                        {rule.last_executed_at && (
                          <span>Last: {new Date(rule.last_executed_at).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.is_active === 1}
                        onCheckedChange={(checked) => toggleRuleStatus(rule.id, checked)}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => executeRule(rule.id)}
                        disabled={!rule.is_active}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(rule)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {rules.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Zap className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No automation rules configured yet</p>
                  <p className="text-sm">Create your first rule to get started</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Execution History */}
        <Card className="command-center-card">
          <CardHeader>
            <CardTitle>Execution History</CardTitle>
            <CardDescription>Recent automation executions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {executions.map((execution) => (
                <div
                  key={execution.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {execution.execution_status === 'completed' && (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                    {execution.execution_status === 'failed' && (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    {execution.execution_status === 'running' && (
                      <Clock className="h-5 w-5 text-blue-600 animate-spin" />
                    )}
                    <div>
                      <p className="font-medium">{execution.rule_name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(execution.executed_at).toLocaleString()}
                        {execution.duration_ms && ` • ${execution.duration_ms}ms`}
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(execution.execution_status)}>
                    {execution.execution_status}
                  </Badge>
                </div>
              ))}

              {executions.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No executions yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rule Dialog */}
      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit' : 'Create'} Automation Rule</DialogTitle>
            <DialogDescription>
              Configure automated actions for inventory management
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="rule_name">Rule Name *</Label>
              <Input
                id="rule_name"
                value={formData.rule_name}
                onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                placeholder="e.g., Auto-Reorder Low Stock Items"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this rule does..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="trigger_type">Trigger Type *</Label>
                <Select
                  value={formData.trigger_type}
                  onValueChange={(value) => setFormData({ ...formData, trigger_type: value })}
                >
                  <SelectTrigger id="trigger_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low_stock">Low Stock</SelectItem>
                    <SelectItem value="accuracy_drop">Accuracy Drop</SelectItem>
                    <SelectItem value="zone_congestion">Zone Congestion</SelectItem>
                    <SelectItem value="schedule">Schedule</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="action_type">Action Type *</Label>
                <Select
                  value={formData.action_type}
                  onValueChange={(value) => setFormData({ ...formData, action_type: value })}
                >
                  <SelectTrigger id="action_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reorder">Reorder</SelectItem>
                    <SelectItem value="rebalance">Rebalance</SelectItem>
                    <SelectItem value="alert">Alert</SelectItem>
                    <SelectItem value="audit">Audit</SelectItem>
                    <SelectItem value="relocate">Relocate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority (1-10)</Label>
                <Input
                  id="priority"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 5 })}
                />
              </div>

              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  id="requires_approval"
                  checked={formData.requires_approval}
                  onCheckedChange={(checked) => setFormData({ ...formData, requires_approval: checked })}
                />
                <Label htmlFor="requires_approval">Requires Approval</Label>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRuleDialog(false)
                setEditingRule(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={saveRule} className="command-center-button-primary">
              {editingRule ? 'Update' : 'Create'} Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
