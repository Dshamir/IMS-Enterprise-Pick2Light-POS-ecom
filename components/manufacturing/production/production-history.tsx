'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Clock, 
  Package, 
  CheckCircle, 
  AlertTriangle, 
  Calendar,
  TrendingUp,
  BarChart3,
  History
} from "lucide-react"

interface ProductionHistoryStats {
  totalRuns: number
  completedRuns: number
  totalUnitsProduced: number
  averageCompletionTime: number
  recentRuns: any[]
}

export function ProductionHistory() {
  const [stats, setStats] = useState<ProductionHistoryStats>({
    totalRuns: 0,
    completedRuns: 0,
    totalUnitsProduced: 0,
    averageCompletionTime: 0,
    recentRuns: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProductionHistory()
  }, [])

  const fetchProductionHistory = async () => {
    try {
      const response = await fetch('/api/production-runs')
      if (response.ok) {
        const runs = await response.json()
        
        const totalRuns = runs.length
        const completedRuns = runs.filter(r => r.status === 'completed').length
        const totalUnitsProduced = runs
          .filter(r => r.status === 'completed')
          .reduce((sum, r) => sum + (r.actual_quantity || 0), 0)
        
        // Calculate average completion time
        const completedWithDates = runs.filter(r => 
          r.status === 'completed' && r.start_date && r.end_date
        )
        const averageCompletionTime = completedWithDates.length > 0
          ? completedWithDates.reduce((sum, r) => {
              const start = new Date(r.start_date)
              const end = new Date(r.end_date)
              return sum + (end.getTime() - start.getTime())
            }, 0) / completedWithDates.length / (1000 * 60 * 60) // Convert to hours
          : 0
        
        setStats({
          totalRuns,
          completedRuns,
          totalUnitsProduced,
          averageCompletionTime,
          recentRuns: runs.slice(0, 10) // Last 10 runs
        })
      }
    } catch (error) {
      console.error('Error fetching production history:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatDuration = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)} minutes`
    if (hours < 24) return `${Math.round(hours)} hours`
    return `${Math.round(hours / 24)} days`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-muted-foreground">Loading production history...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <History className="h-6 w-6" />
          Production History
        </h2>
        <p className="text-muted-foreground">
          Track production performance and historical data
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRuns}</div>
            <p className="text-xs text-muted-foreground">
              All production runs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedRuns}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalRuns > 0 
                ? `${Math.round((stats.completedRuns / stats.totalRuns) * 100)}% success rate`
                : 'No runs yet'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Units Produced</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUnitsProduced}</div>
            <p className="text-xs text-muted-foreground">
              Total manufactured units
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageCompletionTime > 0 
                ? formatDuration(stats.averageCompletionTime)
                : 'N/A'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Average completion time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Runs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Production Runs
          </CardTitle>
          <CardDescription>
            Latest production runs and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentRuns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No production runs found
            </div>
          ) : (
            <div className="space-y-4">
              {stats.recentRuns.map((run, index) => (
                <div key={run.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{run.bom_name}</span>
                      <Badge className={getStatusColor(run.status)}>
                        {run.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {run.production_line_name || run.project_name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {run.actual_quantity || run.planned_quantity} units
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(run.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}