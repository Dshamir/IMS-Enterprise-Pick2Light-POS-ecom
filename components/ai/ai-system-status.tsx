'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Database, 
  Zap, 
  Activity, 
  Clock,
  Server,
  Wifi,
  Shield,
  HardDrive
} from 'lucide-react'

// Updated interface to match the actual API response
interface APIResponse {
  success: boolean
  system_status: 'operational' | 'degraded' | 'warning' | 'setup_required' | 'error'
  timestamp: string
  response_time_ms: number
  checks: {
    health_checks: Array<{
      name: string
      status: 'healthy' | 'unhealthy' | 'warning'
      message: string
      details?: any
      error?: string
    }>
    component_status: {
      providers: {
        total: number
        active: number
        configured: number
        status: 'operational' | 'inactive'
      }
      agents: {
        total: number
        active: number
        assigned: number
        active_assigned: number
        status: 'operational' | 'inactive'
      }
      tasks: {
        total_24h: number
        completed_24h: number
        failed_24h: number
        pending: number
        status: 'normal' | 'backlogged'
        success_rate: number
      }
      conversations: {
        total_24h: number
        total_messages_24h: number
        status: 'operational'
      }
      usage: {
        requests_24h: number
        tokens_24h: number
        cost_24h: number
        avg_response_time_24h: number
        status: 'normal' | 'slow'
      }
    }
    performance_metrics: {
      response_times: {
        percentiles: {
          p50: number
          p95: number
          p99: number
        }
        unit: string
      }
      error_rate: {
        percentage: number
        failed_requests: number
        total_requests: number
      }
      throughput: {
        hourly_distribution: Array<{ hour: string; requests: number }>
        avg_requests_per_hour: number
      }
    }
    recent_activity: {
      recent_tasks: Array<any>
      recent_conversations: Array<any>
      recent_errors: Array<any>
    }
    capabilities: {
      active_providers: Array<any>
      active_agents: Array<any>
      supported_features: string[]
      api_endpoints: string[]
    }
    security_status: {
      api_key_security: {
        total_providers: number
        keys_stored: number
        encryption_status: 'secure' | 'partial'
      }
      access_control: {
        failed_authentications_24h: number
        status: 'operational'
      }
      data_privacy: {
        conversation_retention: string
        usage_logging: string
        status: 'compliant'
      }
    }
  }
  error?: string
}

// Helper functions for status mapping
const getStatusColor = (status: string) => {
  switch (status) {
    case 'healthy':
    case 'operational':
    case 'normal':
    case 'secure':
    case 'compliant':
      return 'text-green-600'
    case 'warning':
    case 'slow':
    case 'partial':
      return 'text-yellow-600'
    case 'critical':
    case 'unhealthy':
    case 'degraded':
    case 'backlogged':
    case 'inactive':
      return 'text-red-600'
    default:
      return 'text-gray-600'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'healthy':
    case 'operational':
    case 'normal':
    case 'secure':
    case 'compliant':
      return <CheckCircle className="h-5 w-5 text-green-600" />
    case 'warning':
    case 'slow':
    case 'partial':
      return <AlertTriangle className="h-5 w-5 text-yellow-600" />
    case 'critical':
    case 'unhealthy':
    case 'degraded':
    case 'backlogged':
    case 'inactive':
      return <XCircle className="h-5 w-5 text-red-600" />
    default:
      return <Activity className="h-5 w-5 text-gray-600" />
  }
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'healthy':
    case 'operational':
    case 'normal':
    case 'secure':
    case 'compliant':
      return 'default'
    case 'warning':
    case 'slow':
    case 'partial':
      return 'secondary'
    case 'critical':
    case 'unhealthy':
    case 'degraded':
    case 'backlogged':
    case 'inactive':
      return 'destructive'
    default:
      return 'outline'
  }
}

// Data transformation helpers
const transformHealthChecks = (healthChecks: any[]) => {
  const databaseCheck = healthChecks.find(check => check.name === 'database_connectivity' || check.name === 'ai_tables_integrity')
  const providerCheck = healthChecks.find(check => check.name === 'provider_connectivity')
  
  return {
    database: {
      status: databaseCheck?.status === 'healthy' ? 'healthy' : databaseCheck?.status === 'warning' ? 'warning' : 'critical',
      message: databaseCheck?.message || 'Database status unknown',
      response_time_ms: 0, // Not provided in health checks
      details: {
        total_tables: databaseCheck?.details?.total_tables || 0,
        ai_tables_present: databaseCheck?.details?.tables_found || databaseCheck?.details?.tables_required || 0,
        connection_pool_size: 1
      }
    },
    ai_providers: {
      status: providerCheck?.status === 'healthy' ? 'healthy' : providerCheck?.status === 'warning' ? 'warning' : 'critical',
      message: providerCheck?.message || 'Provider status unknown',
      details: Array.isArray(providerCheck?.details) ? providerCheck.details.map((provider: any) => ({
        provider: provider.provider_name || 'Unknown',
        status: provider.status === 'healthy' ? 'healthy' : provider.status === 'warning' ? 'warning' : 'critical',
        response_time_ms: provider.response_time,
        error: provider.error
      })) : []
    }
  }
}

export function AISystemStatus() {
  const [status, setStatus] = useState<APIResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchSystemStatus = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/ai/system-status')
      
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setStatus(result)
          setLastRefresh(new Date())
        } else {
          setError(result.error || 'Failed to fetch system status')
        }
      } else {
        setError(`API returned status ${response.status}`)
      }
    } catch (err) {
      console.error('Failed to fetch system status:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSystemStatus()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSystemStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !status) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !status) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          {error || 'Unable to fetch system status. Please check your connection and try again.'}
        </AlertDescription>
      </Alert>
    )
  }

  // Transform the health checks data
  const transformedChecks = transformHealthChecks(status.checks?.health_checks || [])
  const componentStatus = status.checks?.component_status || {}
  const performanceMetrics = status.checks?.performance_metrics || {}

  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const formatNumber = (num: number) => num?.toLocaleString() || '0'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            AI System Status
            {getStatusIcon(status.system_status)}
          </h2>
          <p className="text-sm text-gray-600">
            Last updated: {new Date(status.timestamp).toLocaleString()}
            {lastRefresh && (
              <span className="ml-2">
                (Refreshed: {lastRefresh.toLocaleTimeString()})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusBadgeVariant(status.system_status)} className="capitalize">
            {status.system_status}
          </Badge>
          <Button 
            onClick={fetchSystemStatus} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status Alert */}
      {status.system_status !== 'operational' && (
        <Alert className={
          status.system_status === 'degraded' || status.system_status === 'error'
            ? 'border-red-200 bg-red-50'
            : 'border-yellow-200 bg-yellow-50'
        }>
          {getStatusIcon(status.system_status)}
          <AlertDescription className="font-medium">
            {status.system_status === 'degraded' 
              ? 'System is experiencing issues that may affect AI functionality.'
              : status.system_status === 'error'
              ? 'Critical system error detected.'
              : status.system_status === 'setup_required'
              ? 'System setup is incomplete. Please configure AI providers.'
              : 'Some issues detected that may impact performance.'
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Database Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database
              </span>
              {getStatusIcon(transformedChecks.database?.status || 'unknown')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <p className="text-gray-600">Response Time</p>
              <p className="font-medium">{status.response_time_ms || 0}ms</p>
            </div>
            <div className="text-sm">
              <p className="text-gray-600">AI Tables</p>
              <p className="font-medium">
                {transformedChecks.database?.details?.ai_tables_present || 0}/{transformedChecks.database?.details?.total_tables || 0}
              </p>
            </div>
            <p className="text-xs text-gray-500">{transformedChecks.database?.message || 'No database info available'}</p>
          </CardContent>
        </Card>

        {/* AI Providers Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                AI Providers
              </span>
              {getStatusIcon(componentStatus.providers?.status || 'unknown')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <p className="text-gray-600">Active Providers</p>
              <p className="font-medium">
                {componentStatus.providers?.active || 0}/{componentStatus.providers?.total || 0}
              </p>
            </div>
            <div className="text-sm">
              <p className="text-gray-600">Configured</p>
              <p className="font-medium">{componentStatus.providers?.configured || 0}</p>
            </div>
            <p className="text-xs text-gray-500">
              {componentStatus.providers?.status === 'operational' ? 'All systems operational' : 'Setup required'}
            </p>
          </CardContent>
        </Card>

        {/* Performance Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Performance
              </span>
              {getStatusIcon(componentStatus.usage?.status || 'unknown')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <p className="text-gray-600">Success Rate (24h)</p>
              <p className="font-medium">{componentStatus.tasks?.success_rate || 0}%</p>
            </div>
            <div className="text-sm">
              <p className="text-gray-600">Avg Response Time</p>
              <p className="font-medium">{Math.round(componentStatus.usage?.avg_response_time_24h || 0)}ms</p>
            </div>
            <div className="text-sm">
              <p className="text-gray-600">Requests (24h)</p>
              <p className="font-medium">{formatNumber(componentStatus.usage?.requests_24h || 0)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Agents Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                AI Agents
              </span>
              {getStatusIcon(componentStatus.agents?.status || 'unknown')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <p className="text-gray-600">Active Agents</p>
              <p className="font-medium">
                {componentStatus.agents?.active || 0}/{componentStatus.agents?.total || 0}
              </p>
            </div>
            <div className="text-sm">
              <p className="text-gray-600">Assigned</p>
              <p className="font-medium">{componentStatus.agents?.active_assigned || 0}</p>
            </div>
            <p className="text-xs text-gray-500">
              {componentStatus.agents?.status === 'operational' ? 'All agents ready' : 'Setup needed'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Status Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Task Performance (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Tasks</span>
                <span className="text-lg font-bold">
                  {formatNumber(componentStatus.tasks?.total_24h || 0)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Completed</span>
                <span className="text-lg font-bold text-green-600">
                  {formatNumber(componentStatus.tasks?.completed_24h || 0)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Failed</span>
                <span className="text-lg font-bold text-red-600">
                  {formatNumber(componentStatus.tasks?.failed_24h || 0)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Pending</span>
                <span className="text-lg font-bold text-yellow-600">
                  {formatNumber(componentStatus.tasks?.pending || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Response Time Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Response Time Percentiles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">P50 (Median)</span>
                <span className="text-lg font-bold">
                  {Math.round(performanceMetrics.response_times?.percentiles?.p50 || 0)}ms
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">P95</span>
                <span className="text-lg font-bold">
                  {Math.round(performanceMetrics.response_times?.percentiles?.p95 || 0)}ms
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">P99</span>
                <span className="text-lg font-bold">
                  {Math.round(performanceMetrics.response_times?.percentiles?.p99 || 0)}ms
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Error Rate</span>
                <span className={`text-lg font-bold ${
                  (performanceMetrics.error_rate?.percentage || 0) > 5 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {(performanceMetrics.error_rate?.percentage || 0).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Database
              </h4>
              <div className="text-sm space-y-1">
                <p>Tables: {transformedChecks.database?.details?.total_tables || 0}</p>
                <p>AI Tables: {transformedChecks.database?.details?.ai_tables_present || 0}</p>
                <p>Status: {transformedChecks.database?.status || 'Unknown'}</p>
              </div>
            </div>
            <div className="p-4 border rounded">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Providers
              </h4>
              <div className="text-sm space-y-1">
                <p>Total: {componentStatus.providers?.total || 0}</p>
                <p>Active: {componentStatus.providers?.active || 0}</p>
                <p>Configured: {componentStatus.providers?.configured || 0}</p>
              </div>
            </div>
            <div className="p-4 border rounded">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Usage (24h)
              </h4>
              <div className="text-sm space-y-1">
                <p>Requests: {formatNumber(componentStatus.usage?.requests_24h || 0)}</p>
                <p>Tokens: {formatNumber(componentStatus.usage?.tokens_24h || 0)}</p>
                <p>Cost: ${(componentStatus.usage?.cost_24h || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}