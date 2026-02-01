'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building, Users, DollarSign, Edit, Trash2, Plus, Clock, Package } from "lucide-react"
import { ProductionLineDialog } from "./production-line-dialog"

interface ProductionLine {
  id: string
  name: string
  description: string
  capacity: number
  hourly_rate: number
  status: string
  shift_hours: number
  department: string
  notes: string
  image_url: string | null
  created_at: string
  updated_at: string
}

export function ProductionLineList() {
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([])
  const [loading, setLoading] = useState(true)
  const [editingLine, setEditingLine] = useState<ProductionLine | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  useEffect(() => {
    fetchProductionLines()
  }, [])

  const fetchProductionLines = async () => {
    try {
      const response = await fetch('/api/production-lines')
      if (response.ok) {
        const data = await response.json()
        setProductionLines(Array.isArray(data) ? data : [])
      } else {
        console.error('Failed to fetch production lines:', response.status)
        setProductionLines([])
      }
    } catch (error) {
      console.error('Error fetching production lines:', error)
      setProductionLines([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this production line?')) {
      return
    }

    try {
      const response = await fetch(`/api/production-lines/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setProductionLines(productionLines.filter(line => line.id !== id))
      }
    } catch (error) {
      console.error('Error deleting production line:', error)
    }
  }

  const handleEdit = (line: ProductionLine) => {
    setEditingLine(line)
    setIsEditDialogOpen(true)
  }

  const handleLineUpdate = () => {
    fetchProductionLines()
    setIsCreateDialogOpen(false)
    setIsEditDialogOpen(false)
    setEditingLine(null)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'maintenance': return 'outline'
      case 'inactive': return 'secondary'
      default: return 'secondary'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const calculateDailyCost = (hourlyRate: number, shiftHours: number) => {
    return hourlyRate * shiftHours
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-muted-foreground">Loading production lines...</div>
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Production Lines</h2>
          <p className="text-muted-foreground">Manage recurring manufacturing lines</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Production Line
        </Button>
      </div>

      {productionLines.length === 0 ? (
        <div className="text-center py-8">
          <Building className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Production Lines</h3>
          <p className="text-muted-foreground mb-4">
            Create your first production line to start recurring manufacturing.
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Production Line
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {productionLines.map((line) => (
            <Card key={line.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex gap-4 items-start">
                  {/* Image Thumbnail */}
                  {line.image_url ? (
                    <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={line.image_url}
                        alt={line.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg truncate">{line.name}</CardTitle>
                      <Badge variant={getStatusColor(line.status)}>
                        {line.status}
                      </Badge>
                    </div>
                    {line.department && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                        <Building className="h-3 w-3" />
                        <span>{line.department}</span>
                      </div>
                    )}
                    <CardDescription className="text-sm">
                      {line.description || 'No description'}
                    </CardDescription>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(line)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(line.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span>Capacity: {line.capacity}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Shift: {line.shift_hours}h</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>Rate: {formatCurrency(line.hourly_rate)}/h</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>Daily: {formatCurrency(calculateDailyCost(line.hourly_rate, line.shift_hours))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProductionLineDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSave={handleLineUpdate}
      />

      <ProductionLineDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        productionLine={editingLine}
        onSave={handleLineUpdate}
      />
    </>
  )
}