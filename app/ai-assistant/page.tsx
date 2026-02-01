"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { ArrowLeft, Bot, Settings, MessageSquare, BarChart3, AlertCircle, Zap, Activity, TrendingUp, Monitor, CheckCircle, Clock } from "lucide-react"
import { AIInventoryInsights } from "@/components/ai/ai-inventory-insights"
import { AISearchEnhanced } from "@/components/ai/ai-search-enhanced"
import { AIAnalyticsDashboard } from "@/components/ai/ai-analytics-dashboard"
import { AITaskManagement } from "@/components/ai/ai-task-management"
import { AISystemStatus } from "@/components/ai/ai-system-status"
import { useState, useEffect } from "react"

interface AISetupStatus {
  hasActiveProvider: boolean
  hasAssignedAgents: boolean
  providersCount: number
  agentsCount: number
}

interface AIStats {
  providers: {
    total: number
    active: number
    configured: number
  }
  agents: {
    total: number
    active: number
    assigned: number
  }
  tasks: {
    total_24h: number
    completed_24h: number
  }
  conversations: {
    total_7d: number
  }
}

export default function AIAssistantPage() {
  const [setupStatus, setSetupStatus] = useState<AISetupStatus>({
    hasActiveProvider: false,
    hasAssignedAgents: false,
    providersCount: 0,
    agentsCount: 0
  })
  const [stats, setStats] = useState<AIStats>({
    providers: { total: 0, active: 0, configured: 0 },
    agents: { total: 0, active: 0, assigned: 0 },
    tasks: { total_24h: 0, completed_24h: 0 },
    conversations: { total_7d: 0 }
  })
  const [isLoading, setIsLoading] = useState(true)

  // Load AI setup status
  useEffect(() => {
    loadSetupStatus()
  }, [])

  const loadSetupStatus = async () => {
    try {
      setIsLoading(true)
      const [systemResponse, statsResponse] = await Promise.all([
        fetch('/api/ai/system-status'),
        fetch('/api/ai/stats')
      ])

      if (systemResponse.ok) {
        const systemData = await systemResponse.json()
        
        // Extract data from the correct structure
        const checks = systemData.checks || {}
        const componentStatus = checks.component_status || {}
        const providers = componentStatus.providers || {}
        const agents = componentStatus.agents || {}
        
        const newStatus = {
          hasActiveProvider: (providers.active || 0) > 0,
          hasAssignedAgents: (agents.active_assigned || 0) > 0,
          providersCount: providers.active || 0,
          agentsCount: agents.active_assigned || 0
        }
        
        console.log('AI Setup Status Updated:', newStatus) // Debug the final status
        setSetupStatus(newStatus)
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        if (statsData.success) {
          setStats(statsData.stats)
        }
      }
    } catch (error) {
      console.error('Error loading AI setup status:', error)
    } finally {
      setIsLoading(false)
    }
  }
  return (
    <main className="container mx-auto py-4 px-4 md:py-8 md:max-w-none md:w-[90%]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Bot className="h-8 w-8 text-blue-600" />
            AI Assistant
          </h1>
          <p className="text-muted-foreground">Intelligent automation and insights for your inventory</p>
        </div>

        <div className="flex gap-2 mt-4 md:mt-0">
          <Button variant="outline" asChild>
            <Link href="/ai-assistant/settings">
              <Settings className="h-4 w-4 mr-2" />
              AI Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* AI Status Overview */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Agents</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{setupStatus.agentsCount}</div>
            <p className="text-xs text-muted-foreground">Active agents ready</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Today</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tasks.completed_24h}</div>
            <p className="text-xs text-muted-foreground">Automated tasks completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversations.total_7d}</div>
            <p className="text-xs text-muted-foreground">Chat sessions this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant={setupStatus.hasActiveProvider && setupStatus.hasAssignedAgents ? "default" : "secondary"}>
                {setupStatus.hasActiveProvider && setupStatus.hasAssignedAgents ? "Operational" : "Setup Required"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {setupStatus.hasActiveProvider && setupStatus.hasAssignedAgents 
                ? "All systems ready" 
                : "Configure AI providers"
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Agents Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Stock Monitor
            </CardTitle>
            <CardDescription>
              Real-time inventory monitoring and low stock alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Status:</span>
                <Badge variant={setupStatus.hasActiveProvider && setupStatus.hasAssignedAgents ? "default" : "secondary"}>
                  {setupStatus.hasActiveProvider && setupStatus.hasAssignedAgents ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Capabilities:</span>
                <span className="text-xs text-muted-foreground">4</span>
              </div>
              <div className="pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full" 
                  disabled={!setupStatus.hasActiveProvider}
                >
                  {setupStatus.hasActiveProvider ? "Test Agent" : "Configure Provider First"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Reorder Assistant
            </CardTitle>
            <CardDescription>
              Intelligent reorder quantity and timing suggestions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Status:</span>
                <Badge variant={setupStatus.hasActiveProvider && setupStatus.hasAssignedAgents ? "default" : "secondary"}>
                  {setupStatus.hasActiveProvider && setupStatus.hasAssignedAgents ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Capabilities:</span>
                <span className="text-xs text-muted-foreground">4</span>
              </div>
              <div className="pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full" 
                  disabled={!setupStatus.hasActiveProvider}
                >
                  {setupStatus.hasActiveProvider ? "Test Agent" : "Configure Provider First"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              Search Assistant
            </CardTitle>
            <CardDescription>
              Natural language inventory search and discovery
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Status:</span>
                <Badge variant={setupStatus.hasActiveProvider && setupStatus.hasAssignedAgents ? "default" : "secondary"}>
                  {setupStatus.hasActiveProvider && setupStatus.hasAssignedAgents ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Capabilities:</span>
                <span className="text-xs text-muted-foreground">4</span>
              </div>
              <div className="pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full" 
                  disabled={!setupStatus.hasActiveProvider}
                >
                  {setupStatus.hasActiveProvider ? "Test Agent" : "Configure Provider First"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Setup */}
      {!setupStatus.hasActiveProvider && !isLoading && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Bot className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-blue-900 mb-1">Setup Required</h3>
                <p className="text-sm text-blue-700 mb-3">
                  Configure an AI provider to unlock intelligent inventory analysis, natural language search, and automated insights.
                </p>
                <Button variant="default" size="sm" asChild className="bg-blue-600 hover:bg-blue-700">
                  <Link href="/ai-assistant/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure AI Providers
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Assistant Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="status" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Status
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* AI Features Demo */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* AI Inventory Insights */}
            <AIInventoryInsights />
            
            {/* AI Enhanced Search */}
            <AISearchEnhanced 
              onResultSelect={(product) => {
                window.open(`/products/${product.id}`, '_blank')
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <AIAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="tasks">
          <AITaskManagement />
        </TabsContent>

        <TabsContent value="status">
          <AISystemStatus />
        </TabsContent>
      </Tabs>
    </main>
  )
}