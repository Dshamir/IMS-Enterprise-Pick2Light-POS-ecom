'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  ChevronRight, 
  ChevronDown, 
  Package, 
  Wrench, 
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  Edit,
  Trash2
} from "lucide-react"

interface BOMHierarchyItem {
  id: string
  assembly_id: string
  component_product_id: string
  quantity: number
  notes?: string
  is_assembly?: boolean
  sequence_number?: number
  is_optional?: boolean
  reference_designator?: string
  component_name: string
  component_description: string
  component_price: number
  component_stock: number
  unit_name?: string
  unit_symbol?: string
  component_type: 'assembly' | 'component'
  level: number
  children: BOMHierarchyItem[]
}

interface BOMHierarchyViewerProps {
  assemblyId: string
  onEdit?: (component: BOMHierarchyItem) => void
  onDelete?: (componentId: string) => void
}

export function BOMHierarchyViewer({ assemblyId, onEdit, onDelete }: BOMHierarchyViewerProps) {
  const [hierarchy, setHierarchy] = useState<BOMHierarchyItem[]>([])
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [costData, setCostData] = useState<any>(null)

  useEffect(() => {
    fetchHierarchy()
    fetchCostData()
  }, [assemblyId])

  const fetchHierarchy = async () => {
    try {
      const response = await fetch(`/api/bom/assemblies/${assemblyId}/hierarchy`)
      if (response.ok) {
        const data = await response.json()
        setHierarchy(data)
        // Auto-expand first level
        const firstLevelIds = data.map((item: BOMHierarchyItem) => item.id)
        setExpandedItems(new Set(firstLevelIds))
      }
    } catch (error) {
      console.error('Error fetching hierarchy:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCostData = async () => {
    try {
      const response = await fetch(`/api/bom/assemblies/${assemblyId}/advanced-cost?includeLaborOverhead=true`)
      if (response.ok) {
        const data = await response.json()
        setCostData(data)
      }
    } catch (error) {
      console.error('Error fetching cost data:', error)
    }
  }

  const toggleExpansion = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  const getAvailabilityStatus = (stock: number, required: number) => {
    if (stock >= required) return 'available'
    if (stock > 0) return 'partial'
    return 'unavailable'
  }

  const getAvailabilityIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'partial':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'unavailable':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Package className="h-4 w-4 text-gray-400" />
    }
  }

  const renderHierarchyItem = (item: BOMHierarchyItem, level: number = 0) => {
    const isExpanded = expandedItems.has(item.id)
    const hasChildren = item.children && item.children.length > 0
    const availabilityStatus = getAvailabilityStatus(item.component_stock, item.quantity)
    const totalCost = item.quantity * item.component_price

    return (
      <div key={item.id} className="border rounded-lg mb-2">
        <div 
          className={`p-3 hover:bg-gray-50 cursor-pointer ${level > 0 ? 'ml-' + (level * 4) : ''}`}
          style={{ marginLeft: level * 20 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              {hasChildren ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpansion(item.id)}
                  className="h-6 w-6 p-0"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              ) : (
                <div className="w-6" />
              )}
              
              <div className="flex items-center gap-2">
                {item.component_type === 'assembly' ? (
                  <Wrench className="h-4 w-4 text-blue-600" />
                ) : (
                  <Package className="h-4 w-4 text-green-600" />
                )}
                {getAvailabilityIcon(availabilityStatus)}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.component_name}</span>
                  {item.is_optional && (
                    <Badge variant="outline" className="text-xs">Optional</Badge>
                  )}
                  {item.reference_designator && (
                    <Badge variant="secondary" className="text-xs">{item.reference_designator}</Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Qty: {item.quantity} {item.unit_symbol || ''}</span>
                  <span>Stock: {item.component_stock}</span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {item.component_price.toFixed(2)} each
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {totalCost.toFixed(2)} total
                  </span>
                </div>
                
                {item.notes && (
                  <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit?.(item)}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete?.(item.id)}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="border-t bg-gray-50/50">
            {item.children.map(child => renderHierarchyItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-muted-foreground">Loading BOM hierarchy...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Cost Summary */}
      {costData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cost Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  ${costData.material_cost.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Material Cost</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  ${costData.labor_cost.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Labor Cost</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  ${costData.overhead_cost.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Overhead Cost</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  ${costData.total_cost.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Total Cost</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hierarchy Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            BOM Hierarchy
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hierarchy.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No components added to this assembly yet.
            </div>
          ) : (
            <div className="space-y-2">
              {hierarchy.map(item => renderHierarchyItem(item))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}