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

interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
}

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

interface BOMAssemblyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assembly?: BOMAssembly | null
  onSave?: () => void
}

export function BOMAssemblyDialog({ open, onOpenChange, assembly, onSave }: BOMAssemblyDialogProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [formData, setFormData] = useState({
    product_id: '',
    name: '',
    description: '',
    status: 'active'
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      fetchProducts()
      if (assembly) {
        setFormData({
          product_id: assembly.product_id,
          name: assembly.name,
          description: assembly.description || '',
          status: assembly.status
        })
      } else {
        setFormData({
          product_id: '',
          name: '',
          description: '',
          status: 'active'
        })
      }
    }
  }, [open, assembly])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const method = assembly ? 'PUT' : 'POST'
      const url = assembly ? `/api/bom/assemblies/${assembly.id}` : '/api/bom/assemblies'
      
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
        // Reset form
        setFormData({
          product_id: '',
          name: '',
          description: '',
          status: 'active'
        })
      }
    } catch (error) {
      console.error('Error saving assembly:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedProduct = products && products.length > 0 ? products.find(p => p.id === formData.product_id) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {assembly ? 'Edit BOM Assembly' : 'Create BOM Assembly'}
          </DialogTitle>
          <DialogDescription>
            {assembly ? 'Update the BOM assembly details.' : 'Create a new Bill of Materials assembly.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="product_id" className="text-right">
                Product
              </Label>
              <div className="col-span-3">
                <Select
                  value={formData.product_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, product_id: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{product.name}</span>
                          <Badge variant="secondary" className="ml-2">
                            {product.category}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProduct && (
                  <p className="text-sm text-muted-foreground mt-1">
                    ${selectedProduct.price.toFixed(2)} - {selectedProduct.description}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="col-span-3"
                placeholder="BOM Assembly Name"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="col-span-3"
                placeholder="Optional description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (assembly ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}