'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { 
  Play, 
  Pause, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Package,
  Factory,
  User,
  Calendar,
  Plus,
  Eye
} from "lucide-react"
import { AssemblyView } from "../assembly/assembly-view"
import { ProductionRunDialog } from "./production-run-dialog"
import { SerialNumberDisplay } from "./serial-number-display"

interface ProductionRun {
  id: string
  bom_id: string
  planned_quantity: number
  actual_quantity: number
  start_date: string
  end_date: string
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
  notes: string
  image_url: string | null
  created_at: string
  updated_at: string
  bom_name?: string
  bom_description?: string
  production_line_name?: string
  project_name?: string
}

interface ProductionRunManagerProps {
  bomId?: string
  showCreateButton?: boolean
}

export function ProductionRunManager({ bomId, showCreateButton = true }: ProductionRunManagerProps) {
  const [runs, setRuns] = useState<ProductionRun[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRun, setSelectedRun] = useState<ProductionRun | null>(null)
  const [showAssemblyView, setShowAssemblyView] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  useEffect(() => {
    fetchProductionRuns()
  }, [bomId])

  const fetchProductionRuns = async () => {
    try {
      let url = '/api/production-runs'
      if (bomId) {
        url += `?bom_id=${bomId}`
      }
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setRuns(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching production runs:', error)
    } finally {
      setLoading(false)
    }
  }

  const createProductionRun = async (bomId: string, quantity: number) => {
    try {
      const response = await fetch('/api/production-runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bom_id: bomId,
          planned_quantity: quantity,
          status: 'planned'
        })
      })

      if (response.ok) {
        fetchProductionRuns()
      }
    } catch (error) {
      console.error('Error creating production run:', error)
    }
  }

  const startProductionRun = async (runId: string) => {
    try {
      const response = await fetch(`/api/production-runs/${runId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'in_progress',
          start_date: new Date().toISOString()
        })
      })

      if (response.ok) {
        fetchProductionRuns()
      }
    } catch (error) {
      console.error('Error starting production run:', error)
    }
  }

  const completeProductionRun = async (runId: string, actualQuantity: number) => {
    try {
      const response = await fetch(`/api/production-runs/${runId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'completed',
          end_date: new Date().toISOString(),
          actual_quantity: actualQuantity
        })
      })

      if (response.ok) {
        fetchProductionRuns()
        // Trigger inventory deduction
        await deductInventory(runId)
        // Create product instances with serial numbers
        await createProductInstances(runId)
      }
    } catch (error) {
      console.error('Error completing production run:', error)
    }
  }

  const deductInventory = async (runId: string) => {
    try {
      const response = await fetch(`/api/production-runs/${runId}/deduct-inventory`, {
        method: 'POST'
      })

      if (!response.ok) {
        console.error('Error deducting inventory:', response.status)
      }
    } catch (error) {
      console.error('Error deducting inventory:', error)
    }
  }

  const createProductInstances = async (runId: string) => {
    try {
      const response = await fetch(`/api/production-runs/${runId}/create-product`, {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Created product instances:', data)
      } else {
        console.error('Error creating product instances:', response.status)
      }
    } catch (error) {
      console.error('Error creating product instances:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned':
        return 'bg-blue-100 text-blue-800'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planned':
        return <Clock className="h-4 w-4" />
      case 'in_progress':
        return <Play className="h-4 w-4" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'cancelled':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Package className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (showAssemblyView && selectedRun) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => setShowAssemblyView(false)}
          >
            ← Back to Production Runs
          </Button>
          <h2 className="text-xl font-semibold">
            Production Run: {selectedRun.bom_name}
          </h2>
        </div>
        
        <AssemblyView
          bomId={selectedRun.bom_id}
          productionRunId={selectedRun.id}
          onStartProduction={() => startProductionRun(selectedRun.id)}
          onCompleteProduction={() => completeProductionRun(selectedRun.id, selectedRun.planned_quantity)}
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-muted-foreground">Loading production runs...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Factory className="h-6 w-6" />
            Production Runs
          </h2>
          <p className="text-muted-foreground">
            Manage and track production runs for manufacturing BOMs
          </p>
        </div>
        {showCreateButton && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Production Run
          </Button>
        )}
      </div>

      {/* Production Runs List */}
      {runs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Factory className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Production Runs</h3>
            <p className="text-muted-foreground mb-4">
              Start your first production run to begin manufacturing.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {runs.map((run) => (
            <Card key={run.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex gap-4 items-start">
                  {/* Image Thumbnail */}
                  {run.image_url ? (
                    <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={run.image_url}
                        alt={run.bom_name || 'Production Run'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                      <Factory className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg truncate">{run.bom_name}</CardTitle>
                      <Badge className={getStatusColor(run.status)}>
                        {getStatusIcon(run.status)}
                        <span className="ml-1 capitalize">{run.status}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        {run.production_line_name || run.project_name}
                      </span>
                      <span>•</span>
                      <span>
                        Planned: {run.planned_quantity} units
                      </span>
                      {run.actual_quantity > 0 && (
                        <>
                          <span>•</span>
                          <span>
                            Actual: {run.actual_quantity} units
                          </span>
                        </>
                      )}
                    </div>
                    <CardDescription className="text-sm mt-1">
                      {run.bom_description || 'No description'}
                    </CardDescription>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRun(run)
                        setShowAssemblyView(true)
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Assembly
                    </Button>
                    {run.status === 'planned' && (
                      <Button
                        size="sm"
                        onClick={() => startProductionRun(run.id)}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Start
                      </Button>
                    )}
                    {run.status === 'in_progress' && (
                      <Button
                        size="sm"
                        onClick={() => completeProductionRun(run.id, run.planned_quantity)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Created: {formatDate(run.created_at)}
                    </span>
                  </div>
                  {run.start_date && (
                    <div className="flex items-center gap-1">
                      <Play className="h-4 w-4" />
                      <span>
                        Started: {formatDate(run.start_date)}
                      </span>
                    </div>
                  )}
                  {run.end_date && (
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      <span>
                        Completed: {formatDate(run.end_date)}
                      </span>
                    </div>
                  )}
                </div>
                
                {run.status === 'in_progress' && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm text-muted-foreground">
                        {run.actual_quantity}/{run.planned_quantity} units
                      </span>
                    </div>
                    <Progress 
                      value={(run.actual_quantity / run.planned_quantity) * 100} 
                      className="h-2"
                    />
                  </div>
                )}

                {/* Serial Numbers Section */}
                <div className="mt-4">
                  <SerialNumberDisplay 
                    productionRunId={run.id}
                    className="border-0 shadow-none bg-transparent p-0"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProductionRunDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSave={fetchProductionRuns}
        selectedBomId={bomId}
      />
    </div>
  )
}