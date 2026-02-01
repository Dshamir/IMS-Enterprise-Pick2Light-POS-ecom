'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wrench, Package, DollarSign, Edit, Trash2, Eye } from "lucide-react"
import { BOMAssemblyDialog } from "./bom-assembly-dialog"

interface BOMAssembly {
  id: string
  product_id: string
  name: string
  description: string
  status: string
  created_at: string
  updated_at: string
  product_name: string
  product_description: string
  product_price: number
}

export function BOMAssemblyList() {
  const [assemblies, setAssemblies] = useState<BOMAssembly[]>([])
  const [loading, setLoading] = useState(true)
  const [editingAssembly, setEditingAssembly] = useState<BOMAssembly | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  useEffect(() => {
    fetchAssemblies()
  }, [])

  const fetchAssemblies = async () => {
    try {
      const response = await fetch('/api/bom/assemblies')
      if (response.ok) {
        const data = await response.json()
        setAssemblies(Array.isArray(data) ? data : [])
      } else {
        console.error('Failed to fetch assemblies:', response.status)
        setAssemblies([])
      }
    } catch (error) {
      console.error('Error fetching assemblies:', error)
      setAssemblies([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this BOM assembly?')) {
      return
    }

    try {
      const response = await fetch(`/api/bom/assemblies/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setAssemblies(assemblies.filter(a => a.id !== id))
      }
    } catch (error) {
      console.error('Error deleting assembly:', error)
    }
  }

  const handleEdit = (assembly: BOMAssembly) => {
    setEditingAssembly(assembly)
    setIsEditDialogOpen(true)
  }

  const handleAssemblyUpdate = () => {
    fetchAssemblies()
    setIsEditDialogOpen(false)
    setEditingAssembly(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-muted-foreground">Loading assemblies...</div>
      </div>
    )
  }

  if (assemblies.length === 0) {
    return (
      <div className="text-center py-8">
        <Wrench className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No BOM Assemblies</h3>
        <p className="text-muted-foreground mb-4">
          Create your first Bill of Materials to define product assemblies and component lists.
        </p>
        <Button onClick={() => window.location.reload()}>
          <Package className="h-4 w-4 mr-2" />
          Create First BOM
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {assemblies.map((assembly) => (
          <Card key={assembly.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-lg">{assembly.name}</CardTitle>
                    <Badge variant={assembly.status === 'active' ? 'default' : 'secondary'}>
                      {assembly.status}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm">
                    Product: {assembly.product_name}
                  </CardDescription>
                  {assembly.description && (
                    <CardDescription className="text-sm mt-1">
                      {assembly.description}
                    </CardDescription>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(assembly)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(assembly.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  <span>0 components</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  <span>$0.00 estimated cost</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>View Details</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <BOMAssemblyDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        assembly={editingAssembly}
        onSave={handleAssemblyUpdate}
      />
    </>
  )
}