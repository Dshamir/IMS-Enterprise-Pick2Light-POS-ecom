'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Play, 
  Pause, 
  Square, 
  RefreshCw, 
  Plus, 
  Eye, 
  Trash2, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Activity
} from 'lucide-react'

interface Task {
  id: string
  agent_id: string
  task_type: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  input_data: any
  output_data?: any
  error_message?: string
  created_at: string
  started_at?: string
  completed_at?: string
  execution_time_ms?: number
}

interface Agent {
  id: string
  name: string
  type: string
  description: string
  is_active: number
}

const TASK_TYPES = [
  { value: 'inventory_analysis', label: 'Inventory Analysis' },
  { value: 'reorder_suggestions', label: 'Reorder Suggestions' },
  { value: 'low_stock_alert', label: 'Low Stock Alert' },
  { value: 'demand_forecast', label: 'Demand Forecast' },
  { value: 'cost_optimization', label: 'Cost Optimization' },
  { value: 'supplier_analysis', label: 'Supplier Analysis' },
  { value: 'custom_analysis', label: 'Custom Analysis' }
]

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'default'
    case 'running': return 'secondary'
    case 'failed': return 'destructive'
    case 'cancelled': return 'outline'
    default: return 'outline'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return <CheckCircle className="h-4 w-4" />
    case 'running': return <Activity className="h-4 w-4 animate-spin" />
    case 'failed': return <AlertTriangle className="h-4 w-4" />
    case 'cancelled': return <Square className="h-4 w-4" />
    default: return <Clock className="h-4 w-4" />
  }
}

export function AITaskManagement() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<string>('')
  const [taskType, setTaskType] = useState<string>('')
  const [inputData, setInputData] = useState<string>('')
  const [autoExecute, setAutoExecute] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/ai/tasks')
      if (response.ok) {
        const result = await response.json()
        setTasks(result.tasks || [])
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    }
  }

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/ai/agents')
      if (response.ok) {
        const result = await response.json()
        setAgents(result.agents || [])
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error)
    }
  }

  const createTask = async () => {
    if (!selectedAgent || !taskType) return

    try {
      let parsedInputData = {}
      if (inputData.trim()) {
        try {
          parsedInputData = JSON.parse(inputData)
        } catch {
          parsedInputData = { query: inputData }
        }
      }

      const response = await fetch('/api/ai/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: selectedAgent,
          task_type: taskType,
          input_data: parsedInputData,
          auto_execute: autoExecute
        })
      })

      if (response.ok) {
        setSelectedAgent('')
        setTaskType('')
        setInputData('')
        setAutoExecute(false)
        fetchTasks()
      }
    } catch (error) {
      console.error('Failed to create task:', error)
    }
  }

  const executeTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/ai/tasks/${taskId}/execute`, {
        method: 'POST'
      })
      if (response.ok) {
        fetchTasks()
      }
    } catch (error) {
      console.error('Failed to execute task:', error)
    }
  }

  const cancelTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/ai/tasks/${taskId}/cancel`, {
        method: 'POST'
      })
      if (response.ok) {
        fetchTasks()
      }
    } catch (error) {
      console.error('Failed to cancel task:', error)
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/ai/tasks/${taskId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        fetchTasks()
      }
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchTasks(), fetchAgents()])
      setLoading(false)
    }
    loadData()
  }, [])

  const filteredTasks = tasks.filter(task => 
    filterStatus === 'all' || task.status === filterStatus
  )

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h2 className="text-2xl font-bold">AI Task Management</h2>
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchTasks} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Create Task */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Task
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="agent">AI Agent</Label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.filter(agent => agent.is_active).map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name} ({agent.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="task-type">Task Type</Label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select task type" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="input-data">Input Data (JSON or text)</Label>
            <Textarea
              id="input-data"
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              placeholder='{"category": "electronics"} or "Analyze inventory levels"'
              rows={3}
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoExecute}
                onChange={(e) => setAutoExecute(e.target.checked)}
              />
              <span className="text-sm">Auto-execute task</span>
            </label>
            <Button 
              onClick={createTask} 
              disabled={!selectedAgent || !taskType}
              className="ml-auto"
            >
              Create Task
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Task List */}
      <Card>
        <CardHeader>
          <CardTitle>Tasks ({filteredTasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No tasks found</p>
              ) : (
                filteredTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-4 border rounded">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant={getStatusColor(task.status)} className="flex items-center gap-1">
                          {getStatusIcon(task.status)}
                          {task.status}
                        </Badge>
                        <span className="font-medium">{task.task_type.replace('_', ' ')}</span>
                        <span className="text-sm text-gray-500">
                          {formatDate(task.created_at)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Duration: {formatDuration(task.execution_time_ms)}
                        {task.error_message && (
                          <span className="text-red-600 ml-4">Error: {task.error_message}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {task.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => executeTask(task.id)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      {task.status === 'running' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => cancelTask(task.id)}
                        >
                          <Square className="h-4 w-4" />
                        </Button>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedTask(task)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle>Task Details</DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="max-h-96">
                            <div className="space-y-4">
                              <div>
                                <Label>Task ID</Label>
                                <p className="text-sm font-mono bg-gray-100 p-2 rounded">{task.id}</p>
                              </div>
                              <div>
                                <Label>Input Data</Label>
                                <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
                                  {JSON.stringify(task.input_data, null, 2)}
                                </pre>
                              </div>
                              {task.output_data && (
                                <div>
                                  <Label>Output Data</Label>
                                  <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
                                    {JSON.stringify(task.output_data, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {task.error_message && (
                                <div>
                                  <Label>Error Message</Label>
                                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                                    {task.error_message}
                                  </p>
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteTask(task.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}