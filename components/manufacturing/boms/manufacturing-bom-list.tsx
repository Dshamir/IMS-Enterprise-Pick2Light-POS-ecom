'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wrench, Package, DollarSign, Edit, Trash2, Eye, Plus, Building, Briefcase } from "lucide-react"
import { ManufacturingBOMDialog } from "./manufacturing-bom-dialog"

interface ManufacturingBOM {
  id: string
  name: string
  description: string
  project_id: string
  production_line_id: string
  quantity: number
  unit_cost: number
  total_cost: number
  notes: string
  image_url: string | null
  created_at: string
  updated_at: string
  project_name?: string
  production_line_name?: string
  item_count?: number
}

interface ManufacturingBOMListProps {
  projectId?: string
  productionLineId?: string
  showCreateButton?: boolean
}

export function ManufacturingBOMList({ 
  projectId, 
  productionLineId, 
  showCreateButton = true 
}: ManufacturingBOMListProps) {
  const [boms, setBoms] = useState<ManufacturingBOM[]>([])
  const [loading, setLoading] = useState(true)
  const [editingBOM, setEditingBOM] = useState<ManufacturingBOM | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  useEffect(() => {
    fetchBOMs()
  }, [projectId, productionLineId])

  const fetchBOMs = async () => {
    try {
      let url = '/api/manufacturing-boms'
      const params = new URLSearchParams()
      
      if (projectId) params.append('project_id', projectId)
      if (productionLineId) params.append('production_line_id', productionLineId)
      
      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setBoms(Array.isArray(data) ? data : [])
      } else {
        console.error('Failed to fetch BOMs:', response.status)
        setBoms([])
      }
    } catch (error) {
      console.error('Error fetching BOMs:', error)
      setBoms([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this BOM?')) {
      return
    }

    try {
      const response = await fetch(`/api/manufacturing-boms/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setBoms(boms.filter(b => b.id !== id))
      }
    } catch (error) {
      console.error('Error deleting BOM:', error)
    }
  }

  const handleEdit = (bom: ManufacturingBOM) => {
    setEditingBOM(bom)
    setIsEditDialogOpen(true)
  }

  const handleBOMUpdate = () => {
    fetchBOMs()
    setIsCreateDialogOpen(false)
    setIsEditDialogOpen(false)
    setEditingBOM(null)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const getContextInfo = (bom: ManufacturingBOM) => {
    if (bom.project_name) {
      return {
        icon: <Briefcase className="h-4 w-4" />,
        label: `Project: ${bom.project_name}`,
        type: 'project'
      }
    }
    if (bom.production_line_name) {
      return {
        icon: <Building className="h-4 w-4" />,
        label: `Production Line: ${bom.production_line_name}`,
        type: 'production_line'
      }
    }
    return {
      icon: <Package className="h-4 w-4" />,
      label: 'No context',
      type: 'none'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-muted-foreground">Loading BOMs...</div>
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Manufacturing BOMs</h2>
          <p className="text-muted-foreground">
            {projectId || productionLineId 
              ? 'BOMs for this context' 
              : 'Manage Bills of Materials for projects and production lines'
            }
          </p>
        </div>
        {showCreateButton && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New BOM
          </Button>
        )}
      </div>

      {boms.length === 0 ? (
        <div className="text-center py-8">
          <Wrench className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Manufacturing BOMs</h3>
          <p className="text-muted-foreground mb-4">
            Create your first BOM by selecting products from inventory for manufacturing.
          </p>
          {showCreateButton && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First BOM
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {boms.map((bom) => {
            const contextInfo = getContextInfo(bom)
            return (
              <Card key={bom.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex gap-4 items-start">
                    {/* Image Thumbnail */}
                    {bom.image_url ? (
                      <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={bom.image_url}
                          alt={bom.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                        <Wrench className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg truncate">{bom.name}</CardTitle>
                        <Badge variant={contextInfo.type === 'project' ? 'default' : 'secondary'}>
                          {contextInfo.type === 'project' ? 'Project' : 'Production Line'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                        {contextInfo.icon}
                        <span>{contextInfo.label}</span>
                      </div>
                      <CardDescription className="text-sm">
                        {bom.description || 'No description'}
                      </CardDescription>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(bom)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(bom.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      <span>Qty: {bom.quantity}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      <span>{bom.item_count || 0} items</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      <span>Unit: {formatCurrency(bom.unit_cost)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      <span>Total: {formatCurrency(bom.total_cost)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <ManufacturingBOMDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSave={handleBOMUpdate}
        defaultProjectId={projectId}
        defaultProductionLineId={productionLineId}
      />

      <ManufacturingBOMDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        bom={editingBOM}
        onSave={handleBOMUpdate}
      />
    </>
  )
}