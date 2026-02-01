'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Factory, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  DollarSign,
  TrendingUp,
  ShoppingCart
} from "lucide-react"

interface ProductionPlan {
  assembly_id: string
  assembly_name: string
  planned_quantity: number
  production_date: string
  components: ComponentRequirement[]
  total_cost: number
  feasibility: 'feasible' | 'partial' | 'impossible'
}

interface ComponentRequirement {
  component_id: string
  component_name: string
  required_quantity: number
  available_quantity: number
  unit_cost: number
  total_cost: number
  shortage: number
  status: 'available' | 'partial' | 'unavailable'
  level: number
  is_assembly: boolean
}

interface ProductionPlannerProps {
  assemblyId: string
  assemblyName: string
}

export function ProductionPlanner({ assemblyId, assemblyName }: ProductionPlannerProps) {
  const [plannedQuantity, setPlannedQuantity] = useState(1)
  const [productionDate, setProductionDate] = useState('')
  const [productionPlan, setProductionPlan] = useState<ProductionPlan | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Set default production date to tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setProductionDate(tomorrow.toISOString().split('T')[0])
  }, [])

  const calculateProductionPlan = async () => {
    if (!plannedQuantity || plannedQuantity <= 0) return
    
    setLoading(true)
    try {
      // Get flat BOM list for calculation
      const bomResponse = await fetch(`/api/bom/assemblies/${assemblyId}/flat`)
      const bomData = await bomResponse.json()
      
      // Get cost data
      const costResponse = await fetch(`/api/bom/assemblies/${assemblyId}/advanced-cost?includeLaborOverhead=true`)
      const costData = await costResponse.json()
      
      // Calculate component requirements
      const componentRequirements: ComponentRequirement[] = bomData.map((component: any) => {
        const requiredQuantity = component.total_quantity * plannedQuantity
        const shortage = Math.max(0, requiredQuantity - component.component_stock)
        
        let status: 'available' | 'partial' | 'unavailable' = 'available'
        if (component.component_stock === 0) {
          status = 'unavailable'
        } else if (component.component_stock < requiredQuantity) {
          status = 'partial'
        }
        
        return {
          component_id: component.component_product_id,
          component_name: component.component_name,
          required_quantity: requiredQuantity,
          available_quantity: component.component_stock,
          unit_cost: component.component_price,
          total_cost: requiredQuantity * component.component_price,
          shortage: shortage,
          status: status,
          level: component.level,
          is_assembly: component.is_assembly
        }
      })
      
      // Determine overall feasibility
      const unavailableComponents = componentRequirements.filter(c => c.status === 'unavailable')
      const partialComponents = componentRequirements.filter(c => c.status === 'partial')
      
      let feasibility: 'feasible' | 'partial' | 'impossible' = 'feasible'
      if (unavailableComponents.length > 0) {
        feasibility = 'impossible'
      } else if (partialComponents.length > 0) {
        feasibility = 'partial'
      }
      
      const plan: ProductionPlan = {
        assembly_id: assemblyId,
        assembly_name: assemblyName,
        planned_quantity: plannedQuantity,
        production_date: productionDate,
        components: componentRequirements,
        total_cost: costData.total_cost * plannedQuantity,
        feasibility: feasibility
      }
      
      setProductionPlan(plan)
    } catch (error) {
      console.error('Error calculating production plan:', error)
    } finally {
      setLoading(false)
    }
  }

  const generatePurchaseOrder = () => {
    if (!productionPlan) return
    
    const shortageComponents = productionPlan.components
      .filter(c => c.shortage > 0)
      .map(c => ({
        name: c.component_name,
        quantity: c.shortage,
        unit_cost: c.unit_cost,
        total_cost: c.shortage * c.unit_cost
      }))
    
    console.log('Purchase Order Required:', shortageComponents)
    // In a real application, this would create a purchase order
    alert(`Purchase order generated for ${shortageComponents.length} components`)
  }

  const getFeasibilityColor = (feasibility: string) => {
    switch (feasibility) {
      case 'feasible': return 'text-green-600'
      case 'partial': return 'text-yellow-600'
      case 'impossible': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getFeasibilityIcon = (feasibility: string) => {
    switch (feasibility) {
      case 'feasible': return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'partial': return <Clock className="h-5 w-5 text-yellow-600" />
      case 'impossible': return <AlertTriangle className="h-5 w-5 text-red-600" />
      default: return <Package className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'partial': return <Clock className="h-4 w-4 text-yellow-600" />
      case 'unavailable': return <AlertTriangle className="h-4 w-4 text-red-600" />
      default: return <Package className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Production Planning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label htmlFor="planned_quantity">Planned Quantity</Label>
              <Input
                id="planned_quantity"
                type="number"
                min="1"
                value={plannedQuantity}
                onChange={(e) => setPlannedQuantity(parseInt(e.target.value) || 1)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="production_date">Production Date</Label>
              <Input
                id="production_date"
                type="date"
                value={productionDate}
                onChange={(e) => setProductionDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={calculateProductionPlan}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Calculating...' : 'Calculate Plan'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {productionPlan && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Production Feasibility
                </div>
                <div className="flex items-center gap-2">
                  {getFeasibilityIcon(productionPlan.feasibility)}
                  <span className={`font-semibold ${getFeasibilityColor(productionPlan.feasibility)}`}>
                    {productionPlan.feasibility.toUpperCase()}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{productionPlan.planned_quantity}</div>
                  <div className="text-sm text-muted-foreground">Units to Produce</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    ${productionPlan.total_cost.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Cost</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {productionPlan.components.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Components</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {productionPlan.components.filter(c => c.shortage > 0).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Shortages</div>
                </div>
              </div>
              
              {productionPlan.components.filter(c => c.shortage > 0).length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <Button onClick={generatePurchaseOrder} className="w-full">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Generate Purchase Order for Shortages
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Component Requirements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {productionPlan.components.map((component, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(component.status)}
                        <span className="font-medium" style={{ marginLeft: component.level * 20 }}>
                          {component.component_name}
                        </span>
                        {component.is_assembly && (
                          <Badge variant="secondary" className="text-xs">Assembly</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-medium">${component.total_cost.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Required:</span>
                        <span className="ml-2 font-medium">{component.required_quantity}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Available:</span>
                        <span className="ml-2 font-medium">{component.available_quantity}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Unit Cost:</span>
                        <span className="ml-2 font-medium">${component.unit_cost.toFixed(2)}</span>
                      </div>
                      {component.shortage > 0 && (
                        <div>
                          <span className="text-muted-foreground">Shortage:</span>
                          <span className="ml-2 font-medium text-red-600">{component.shortage}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}