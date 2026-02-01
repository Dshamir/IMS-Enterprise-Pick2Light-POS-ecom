'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { 
  CheckCircle, 
  Clock, 
  Package, 
  AlertTriangle, 
  Play,
  Pause,
  CheckSquare,
  Square,
  Factory,
  User,
  Timer
} from "lucide-react"

interface BOMItem {
  id: string
  bom_id: string
  product_id: string
  quantity: number
  notes: string
  created_at: string
  updated_at: string
  product_name: string
  product_description: string
  product_price: number
  product_stock: number
  unit_name: string
  unit_symbol: string
}

interface ManufacturingBOM {
  id: string
  name: string
  description: string
  type: string
  project_id: string
  production_line_id: string
  quantity: number
  status: string
  notes: string
  project_name?: string
  production_line_name?: string
  production_line_location?: string
}

interface AssemblyViewProps {
  bomId: string
  productionRunId?: string
  onStartProduction?: () => void
  onCompleteProduction?: () => void
  onMarkItemUsed?: (itemId: string, used: boolean) => void
}

export function AssemblyView({ 
  bomId, 
  productionRunId, 
  onStartProduction, 
  onCompleteProduction,
  onMarkItemUsed 
}: AssemblyViewProps) {
  const [bom, setBom] = useState<ManufacturingBOM | null>(null)
  const [items, setItems] = useState<BOMItem[]>([])
  const [loading, setLoading] = useState(true)
  const [usedItems, setUsedItems] = useState<Set<string>>(new Set())
  const [productionStarted, setProductionStarted] = useState(false)
  const [productionCompleted, setProductionCompleted] = useState(false)

  useEffect(() => {
    fetchBOMDetails()
    fetchBOMItems()
  }, [bomId])

  const fetchBOMDetails = async () => {
    try {
      const response = await fetch(`/api/manufacturing-boms/${bomId}`)
      if (response.ok) {
        const data = await response.json()
        setBom(data)
      }
    } catch (error) {
      console.error('Error fetching BOM details:', error)
    }
  }

  const fetchBOMItems = async () => {
    try {
      const response = await fetch(`/api/manufacturing-boms/${bomId}/items`)
      if (response.ok) {
        const data = await response.json()
        setItems(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching BOM items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleItemCheck = (itemId: string) => {
    const newUsedItems = new Set(usedItems)
    if (newUsedItems.has(itemId)) {
      newUsedItems.delete(itemId)
    } else {
      newUsedItems.add(itemId)
    }
    setUsedItems(newUsedItems)
    onMarkItemUsed?.(itemId, newUsedItems.has(itemId))
  }

  const handleStartProduction = () => {
    setProductionStarted(true)
    onStartProduction?.()
  }

  const handleCompleteProduction = () => {
    // Only complete if all items are used
    if (completedItems < totalItems) {
      alert(`Please complete all ${totalItems} items before finishing production. Currently completed: ${completedItems}`)
      return
    }
    
    const confirmed = confirm(`Are you sure you want to complete this production run? This will deduct inventory and create finished products.`)
    if (!confirmed) return
    
    setProductionCompleted(true)
    onCompleteProduction?.()
  }

  const handlePauseProduction = () => {
    setProductionStarted(false)
    // TODO: Add pause/stop production API call
  }

  const completedItems = usedItems.size
  const totalItems = items.length
  const progressPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0

  const getAvailabilityStatus = (item: BOMItem) => {
    if (item.product_stock >= item.quantity) {
      return { status: 'available', color: 'green' }
    } else if (item.product_stock > 0) {
      return { status: 'partial', color: 'yellow' }
    } else {
      return { status: 'unavailable', color: 'red' }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading assembly instructions...</div>
      </div>
    )
  }

  if (!bom) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">BOM not found</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Factory className="h-6 w-6" />
            Assembly Instructions
          </h1>
          <p className="text-muted-foreground">
            {bom.name} - {bom.production_line_name || bom.project_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={productionCompleted ? "default" : productionStarted ? "secondary" : "outline"}>
            {productionCompleted ? "Completed" : productionStarted ? "In Progress" : "Ready"}
          </Badge>
          {bom.production_line_location && (
            <Badge variant="outline">
              Location: {bom.production_line_location}
            </Badge>
          )}
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Production Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Items Used: {completedItems} of {totalItems}
              </span>
              <span className="text-sm text-muted-foreground">
                {progressPercentage.toFixed(0)}%
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4" />
                <span>Producing {bom.quantity} units</span>
              </div>
              <div className="flex gap-2">
                {!productionStarted && (
                  <Button onClick={handleStartProduction} size="sm">
                    <Play className="h-4 w-4 mr-2" />
                    Start Production
                  </Button>
                )}
                {productionStarted && !productionCompleted && (
                  <>
                    <Button 
                      onClick={handlePauseProduction} 
                      size="sm"
                      variant="outline"
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Pause Production
                    </Button>
                    <Button 
                      onClick={handleCompleteProduction} 
                      size="sm"
                      disabled={completedItems < totalItems}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Production
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assembly Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Required Materials
          </CardTitle>
          <CardDescription>
            Check off items as you use them during assembly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item, index) => {
              const availability = getAvailabilityStatus(item)
              const isUsed = usedItems.has(item.id)
              
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border ${
                    isUsed ? 'bg-green-50 border-green-200' : 'bg-white'
                  }`}
                >
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => handleItemCheck(item.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {isUsed ? (
                        <CheckSquare className="h-5 w-5 text-green-600" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{item.product_name}</span>
                      <Badge 
                        variant={availability.status === 'available' ? 'default' : 'destructive'}
                        className={`text-xs ${
                          availability.status === 'available' ? 'bg-green-100 text-green-800' :
                          availability.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}
                      >
                        {availability.status === 'available' ? 'Available' :
                         availability.status === 'partial' ? 'Partial' : 'Unavailable'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        Required: {item.quantity} {item.unit_symbol}
                      </span>
                      <span>
                        In Stock: {item.product_stock} {item.unit_symbol}
                      </span>
                      {item.product_description && (
                        <span>• {item.product_description}</span>
                      )}
                    </div>
                    
                    {item.notes && (
                      <div className="mt-1 text-sm text-blue-600 bg-blue-50 p-2 rounded">
                        Note: {item.notes}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      Step {index + 1}
                    </div>
                    {availability.status !== 'available' && (
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-1" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Production Notes */}
      {bom.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Production Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">{bom.notes}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}