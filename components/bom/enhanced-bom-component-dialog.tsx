'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { AlertTriangle, Package, Wrench } from "lucide-react"

interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  stock_quantity: number
}

interface BOMComponent {
  id: string
  assembly_id: string
  component_product_id: string
  quantity: number
  notes?: string
  is_assembly?: boolean
  sequence_number?: number
  is_optional?: boolean
  reference_designator?: string
}

interface EnhancedBOMComponentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assemblyId: string
  component?: BOMComponent | null
  onSave?: () => void
}

export function EnhancedBOMComponentDialog({ 
  open, 
  onOpenChange, 
  assemblyId, 
  component, 
  onSave 
}: EnhancedBOMComponentDialogProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [assemblies, setAssemblies] = useState<any[]>([])
  const [formData, setFormData] = useState({
    component_product_id: '',
    quantity: 1,
    notes: '',
    is_assembly: false,
    sequence_number: 0,
    is_optional: false,
    reference_designator: ''
  })
  const [loading, setLoading] = useState(false)
  const [circularWarning, setCircularWarning] = useState(false)

  useEffect(() => {
    if (open) {
      fetchProducts()
      fetchAssemblies()
      if (component) {
        setFormData({
          component_product_id: component.component_product_id,
          quantity: component.quantity,
          notes: component.notes || '',
          is_assembly: component.is_assembly || false,
          sequence_number: component.sequence_number || 0,
          is_optional: component.is_optional || false,
          reference_designator: component.reference_designator || ''
        })
      } else {
        setFormData({
          component_product_id: '',
          quantity: 1,
          notes: '',
          is_assembly: false,
          sequence_number: 0,
          is_optional: false,
          reference_designator: ''
        })
      }
    }
  }, [open, component])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      if (response.ok) {
        const data = await response.json()
        setProducts(Array.isArray(data) ? data : [])
      } else {
        console.error('Failed to fetch products:', response.status)
        setProducts([])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      setProducts([])
    }
  }

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
    }
  }

  const checkCircularDependency = async (productId: string) => {
    if (!formData.is_assembly) return false
    
    try {
      const response = await fetch(`/api/bom/assemblies/${assemblyId}/circular-check?productId=${productId}`)
      if (response.ok) {
        const data = await response.json()
        return data.hasCircularDependency
      }
    } catch (error) {
      console.error('Error checking circular dependency:', error)
    }
    return false
  }

  const handleProductChange = async (productId: string) => {
    setFormData(prev => ({ ...prev, component_product_id: productId }))
    
    if (formData.is_assembly) {
      const isCircular = await checkCircularDependency(productId)
      setCircularWarning(isCircular)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (circularWarning) {
      alert('Cannot add component: This would create a circular dependency')
      return
    }
    
    setLoading(true)

    try {
      const method = component ? 'PUT' : 'POST'
      const url = component 
        ? `/api/bom/components/${component.id}` 
        : `/api/bom/assemblies/${assemblyId}/components`
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        onSave?.()
        onOpenChange(false)
        setFormData({
          component_product_id: '',
          quantity: 1,
          notes: '',
          is_assembly: false,
          sequence_number: 0,
          is_optional: false,
          reference_designator: ''
        })
      }
    } catch (error) {
      console.error('Error saving component:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedProduct = products && products.length > 0 ? products.find(p => p.id === formData.component_product_id) : null
  const selectedAssembly = assemblies && assemblies.length > 0 ? assemblies.find(a => a.product_id === formData.component_product_id) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {component ? 'Edit BOM Component' : 'Add BOM Component'}
          </DialogTitle>
          <DialogDescription>
            {component ? 'Update the component details.' : 'Add a new component or sub-assembly to the BOM.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Component Type Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="is_assembly"
                checked={formData.is_assembly}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_assembly: checked }))}
              />
              <Label htmlFor="is_assembly" className="flex items-center gap-2">
                {formData.is_assembly ? <Wrench className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                {formData.is_assembly ? 'Sub-Assembly' : 'Component'}
              </Label>
            </div>

            {/* Product Selection */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="component_product_id" className="text-right">
                {formData.is_assembly ? 'Assembly' : 'Product'}
              </Label>
              <div className="col-span-3">
                <Select
                  value={formData.component_product_id}
                  onValueChange={handleProductChange}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select a ${formData.is_assembly ? 'sub-assembly' : 'product'}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.is_assembly ? (
                      assemblies.map((assembly) => (
                        <SelectItem key={assembly.product_id} value={assembly.product_id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{assembly.product_name}</span>
                            <Badge variant="secondary" className="ml-2">
                              <Wrench className="h-3 w-3 mr-1" />
                              Assembly
                            </Badge>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{product.name}</span>
                            <Badge variant="secondary" className="ml-2">
                              {product.category}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                
                {/* Circular Dependency Warning */}
                {circularWarning && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Warning: This would create a circular dependency</span>
                  </div>
                )}
                
                {/* Product Info */}
                {selectedProduct && (
                  <div className="text-sm text-muted-foreground mt-1">
                    <p>${selectedProduct.price.toFixed(2)} - Stock: {selectedProduct.stock_quantity}</p>
                    {selectedProduct.description && (
                      <p className="truncate">{selectedProduct.description}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quantity */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                Quantity
              </Label>
              <Input
                id="quantity"
                type="number"
                min="0.01"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 1 }))}
                className="col-span-3"
                required
              />
            </div>

            {/* Reference Designator */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reference_designator" className="text-right">
                Reference
              </Label>
              <Input
                id="reference_designator"
                value={formData.reference_designator}
                onChange={(e) => setFormData(prev => ({ ...prev, reference_designator: e.target.value }))}
                className="col-span-3"
                placeholder="e.g., R1, C4, U2"
              />
            </div>

            {/* Sequence Number */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sequence_number" className="text-right">
                Sequence
              </Label>
              <Input
                id="sequence_number"
                type="number"
                min="0"
                value={formData.sequence_number}
                onChange={(e) => setFormData(prev => ({ ...prev, sequence_number: parseInt(e.target.value) || 0 }))}
                className="col-span-3"
                placeholder="Assembly order"
              />
            </div>

            {/* Optional Component */}
            <div className="flex items-center space-x-2">
              <Switch
                id="is_optional"
                checked={formData.is_optional}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_optional: checked }))}
              />
              <Label htmlFor="is_optional">Optional Component</Label>
            </div>

            {/* Notes */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="col-span-3"
                placeholder="Installation notes, specifications, etc."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || circularWarning}>
              {loading ? 'Saving...' : (component ? 'Update' : 'Add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}