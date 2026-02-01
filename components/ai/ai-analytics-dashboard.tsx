'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { Activity, TrendingUp, Users, DollarSign, Clock, Zap, AlertTriangle, CheckCircle } from 'lucide-react'

interface AnalyticsData {
  usage_statistics: {
    total_requests: number
    total_tokens: number
    average_response_time: number
    success_rate: number
  }
  cost_analysis: {
    total_cost: number
    cost_breakdown: Array<{
      provider: string
      cost: number
      percentage: number
    }>
  }
  performance_metrics: {
    requests_by_hour: Array<{
      hour: string
      requests: number
      avg_response_time: number
    }>
    provider_performance: Array<{
      provider: string
      avg_response_time: number
      success_rate: number
      total_requests: number
    }>
  }
  agent_metrics: Array<{
    agent_name: string
    total_requests: number
    avg_response_time: number
    success_rate: number
  }>
  model_breakdown?: Array<{
    model_used: string
    requests: number
    total_tokens: number
    prompt_tokens: number
    completion_tokens: number
    total_cost: number
    avg_response_time: number
    success_rate: number
  }>
  operation_breakdown?: Array<{
    operation_type: string
    requests: number
    total_tokens: number
    total_cost: number
    avg_response_time: number
    success_rate: number
  }>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export function AIAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('ytd') // Default to Year to Date to show historical data
  const [provider, setProvider] = useState<string>('all')

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ period })
      if (provider !== 'all') {
        params.append('provider', provider)
      }
      
      const response = await fetch(`/api/ai/analytics?${params}`)
      if (response.ok) {
        const result = await response.json()
        setData(result.analytics || result.data)
      } else {
        console.warn('Analytics API returned non-OK status:', response.status)
        // Set fallback empty data
        setData({
          usage_statistics: { total_requests: 0, total_tokens: 0, average_response_time: 0, success_rate: 1 },
          cost_analysis: { total_cost: 0, cost_breakdown: [] },
          performance_metrics: { requests_by_hour: [], provider_performance: [] },
          agent_metrics: []
        })
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      // Set fallback empty data instead of crashing
      setData({
        usage_statistics: { total_requests: 0, total_tokens: 0, average_response_time: 0, success_rate: 1 },
        cost_analysis: { total_cost: 0, cost_breakdown: [] },
        performance_metrics: { requests_by_hour: [], provider_performance: [] },
        agent_metrics: []
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [period, provider])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          No analytics data available
        </CardContent>
      </Card>
    )
  }

  const formatCurrency = (amount: number | undefined | null) => `$${(amount || 0).toFixed(4)}`
  const formatNumber = (num: number | undefined | null) => (num || 0).toLocaleString()

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h2 className="text-2xl font-bold">AI Analytics Dashboard</h2>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1day">Last 24h</SelectItem>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Providers</SelectItem>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="anthropic">Anthropic</SelectItem>
              <SelectItem value="google">Google</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchAnalytics} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold">{formatNumber(data.usage_statistics?.total_requests)}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tokens</p>
                <p className="text-2xl font-bold">{formatNumber(data.usage_statistics?.total_tokens)}</p>
              </div>
              <Zap className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold">{(data.usage_statistics?.average_response_time || 0).toFixed(0)}ms</p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold">{((data.usage_statistics?.success_rate || 0) * 100).toFixed(1)}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requests Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Requests Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.performance_metrics?.requests_by_hour || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="requests" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  name="Requests"
                  yAxisId="left"
                />
                <Line 
                  type="monotone" 
                  dataKey="avg_response_time" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  name="Avg Response Time (ms)"
                  yAxisId="right"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Breakdown</CardTitle>
            <p className="text-sm text-gray-600">Total: {formatCurrency(data.cost_analysis?.total_cost)}</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.cost_analysis?.cost_breakdown || []}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="cost"
                  label={({ provider, percentage }) => `${provider} (${percentage.toFixed(1)}%)`}
                >
                  {(data.cost_analysis?.cost_breakdown || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Provider Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Provider Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.performance_metrics?.provider_performance || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="provider" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="avg_response_time" fill="#8884d8" name="Avg Response Time (ms)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Agent Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(data.agent_metrics || []).slice(0, 5).map((agent, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{agent.agent_name}</p>
                    <p className="text-sm text-gray-600">
                      {formatNumber(agent.total_requests)} requests
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={agent.success_rate > 0.95 ? "default" : "secondary"}>
                      {(agent.success_rate * 100).toFixed(1)}% success
                    </Badge>
                    <p className="text-sm text-gray-600 mt-1">
                      {agent.avg_response_time.toFixed(0)}ms avg
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Details */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Analysis Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(data.cost_analysis?.cost_breakdown || []).map((item, index) => (
              <div key={index} className="p-4 border rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium capitalize">{item.provider}</span>
                  <Badge variant="outline">{item.percentage.toFixed(1)}%</Badge>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(item.cost)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Model Breakdown */}
      {data.model_breakdown && data.model_breakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Model Usage Breakdown</CardTitle>
            <p className="text-sm text-gray-600">Performance and cost by AI model</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Model</th>
                    <th className="text-right p-2">Requests</th>
                    <th className="text-right p-2">Tokens</th>
                    <th className="text-right p-2">Cost</th>
                    <th className="text-right p-2">Avg Time</th>
                    <th className="text-right p-2">Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.model_breakdown.map((model, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{model.model_used || 'Unknown'}</td>
                      <td className="text-right p-2">{formatNumber(model.requests)}</td>
                      <td className="text-right p-2">{formatNumber(model.total_tokens)}</td>
                      <td className="text-right p-2">{formatCurrency(model.total_cost)}</td>
                      <td className="text-right p-2">{(model.avg_response_time || 0).toFixed(0)}ms</td>
                      <td className="text-right p-2">
                        <Badge variant={model.success_rate > 95 ? "default" : "secondary"}>
                          {(model.success_rate || 0).toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Operation Type Breakdown */}
      {data.operation_breakdown && data.operation_breakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Operation Type Breakdown</CardTitle>
            <p className="text-sm text-gray-600">Usage by operation type</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.operation_breakdown.map((op, index) => (
                <div key={index} className="p-4 border rounded">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium capitalize">{op.operation_type.replace(/_/g, ' ')}</span>
                    <Badge variant="outline">{formatNumber(op.requests)} req</Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tokens:</span>
                      <span className="font-medium">{formatNumber(op.total_tokens)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cost:</span>
                      <span className="font-medium">{formatCurrency(op.total_cost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Time:</span>
                      <span className="font-medium">{(op.avg_response_time || 0).toFixed(0)}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Success:</span>
                      <Badge variant={op.success_rate > 95 ? "default" : "secondary"} className="text-xs">
                        {(op.success_rate || 0).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}