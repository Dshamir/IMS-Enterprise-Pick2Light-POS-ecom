'use client'

/**
 * Analytics Dashboard Component
 *
 * Displays search analytics including:
 * - Overview metrics (total searches, cache hit rate, etc.)
 * - Top queries chart
 * - Zero-result queries (content gaps)
 * - Search trends over time
 *
 * December 2025
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  RefreshCw,
  TrendingUp,
  Search,
  AlertCircle,
  Clock,
  Database,
  BarChart3,
  Zap,
  Trash2,
  Download
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

// ============================================================================
// Types
// ============================================================================

interface TopQuery {
  query: string
  search_count: number
  avg_results: number
  avg_response_time_ms: number
  last_searched: string
}

interface ZeroResultQuery {
  query: string
  search_count: number
  last_searched: string
  first_searched: string
}

interface AnalyticsSummary {
  totalSearches: number
  uniqueQueries: number
  avgResponseTime: number
  cacheHitRate: number
  zeroResultRate: number
  searchesLast24h: number
  searchesLast7d: number
  topQueries: TopQuery[]
  zeroResultQueries: ZeroResultQuery[]
  searchesByHour: { hour: number; count: number }[]
  searchesByDay: { date: string; count: number }[]
}

// ============================================================================
// Component
// ============================================================================

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/knowledge-base/analytics?type=summary')
      if (!response.ok) throw new Error('Failed to fetch analytics')
      const data = await response.json()
      setAnalytics(data)
    } catch (error: any) {
      console.error('Failed to fetch analytics:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load analytics data'
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchAnalytics()
  }

  const handleCleanup = async () => {
    try {
      const response = await fetch('/api/knowledge-base/analytics?keepDays=90', {
        method: 'DELETE'
      })
      const data = await response.json()
      toast({
        title: 'Cleanup Complete',
        description: `Deleted ${data.deleted} old analytics entries`
      })
      fetchAnalytics()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to cleanup analytics'
      })
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch('/api/knowledge-base/analytics?type=export&limit=10000')
      const data = await response.json()
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kb-analytics-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast({
        title: 'Export Complete',
        description: `Exported ${data.data.length} analytics entries`
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to export analytics'
      })
    }
  }

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading analytics...</span>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
        <p>No analytics data available</p>
        <Button onClick={handleRefresh} variant="outline" className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  // Calculate max for bar chart scaling
  const maxHourlyCount = Math.max(...analytics.searchesByHour.map(h => h.count), 1)

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Search Analytics</h3>
          <p className="text-sm text-muted-foreground">
            Insights into search patterns and content gaps
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCleanup}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Cleanup
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Searches</p>
                <p className="text-2xl font-bold">{analytics.totalSearches.toLocaleString()}</p>
              </div>
              <Search className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {analytics.uniqueQueries.toLocaleString()} unique queries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Response</p>
                <p className="text-2xl font-bold">{analytics.avgResponseTime}ms</p>
              </div>
              <Clock className="h-8 w-8 text-green-500 opacity-50" />
            </div>
            <Progress
              value={Math.min(100, (500 - analytics.avgResponseTime) / 5)}
              className="mt-2 h-1"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cache Hit Rate</p>
                <p className="text-2xl font-bold">{analytics.cacheHitRate}%</p>
              </div>
              <Zap className="h-8 w-8 text-yellow-500 opacity-50" />
            </div>
            <Progress value={analytics.cacheHitRate} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Zero Results</p>
                <p className="text-2xl font-bold">{analytics.zeroResultRate}%</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
            <Progress
              value={100 - analytics.zeroResultRate}
              className="mt-2 h-1"
            />
          </CardContent>
        </Card>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Last 24 Hours</p>
                <p className="text-xl font-bold">{analytics.searchesLast24h.toLocaleString()} searches</p>
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Last 7 Days</p>
                <p className="text-xl font-bold">{analytics.searchesLast7d.toLocaleString()} searches</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hourly Activity Mini Chart */}
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground mb-2">Activity (Last 24h)</p>
            <div className="flex items-end gap-0.5 h-12">
              {analytics.searchesByHour.map((hour, i) => (
                <div
                  key={i}
                  className="flex-1 bg-blue-500 rounded-t opacity-70 hover:opacity-100 transition-opacity"
                  style={{
                    height: `${Math.max(4, (hour.count / maxHourlyCount) * 100)}%`
                  }}
                  title={`${hour.hour}:00 - ${hour.count} searches`}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0:00</span>
              <span>12:00</span>
              <span>23:00</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Queries & Zero Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Queries */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Top Queries
            </CardTitle>
            <CardDescription>Most searched terms</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.topQueries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No search data yet
              </p>
            ) : (
              <div className="space-y-2">
                {analytics.topQueries.slice(0, 8).map((query, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1 border-b border-border/50 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" title={query.query}>
                        {query.query}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ~{query.avg_results} results • {query.avg_response_time_ms}ms
                      </p>
                    </div>
                    <Badge variant="secondary" className="ml-2 shrink-0">
                      {query.search_count}x
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Zero Result Queries */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              Content Gaps
            </CardTitle>
            <CardDescription>Queries with no results - consider adding content</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.zeroResultQueries.length === 0 ? (
              <div className="text-center py-4">
                <Database className="h-8 w-8 mx-auto text-green-500 opacity-50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No content gaps detected!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {analytics.zeroResultQueries.slice(0, 8).map((query, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1 border-b border-border/50 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate text-orange-600 dark:text-orange-400" title={query.query}>
                        {query.query}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last: {formatTimeAgo(query.last_searched)}
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-2 shrink-0 border-orange-500/50 text-orange-600">
                      {query.search_count}x
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Trend */}
      {analytics.searchesByDay.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Daily Search Volume
            </CardTitle>
            <CardDescription>Searches over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-24">
              {analytics.searchesByDay.map((day, i) => {
                const maxDaily = Math.max(...analytics.searchesByDay.map(d => d.count), 1)
                return (
                  <div
                    key={i}
                    className="flex-1 bg-blue-500 rounded-t opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                    style={{
                      height: `${Math.max(4, (day.count / maxDaily) * 100)}%`
                    }}
                    title={`${day.date}: ${day.count} searches`}
                  />
                )
              })}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>30 days ago</span>
              <span>Today</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
