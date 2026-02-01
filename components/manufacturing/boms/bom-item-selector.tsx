'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Package, Plus, Minus, Search, DollarSign, AlertCircle } from "lucide-react"

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  stock_quantity: number
  unit_id: string | null
  category: string
  image_url: string | null
}

interface BOMItem {
  product_id: string
  quantity: number
  unit_cost: number
  notes: string
  product?: Product
}

interface BOMItemSelectorProps {
  bomData: {
    name: string
    description: string
    project_id: string
    production_line_id: string
    quantity: number
    notes: string
  }
  bomId?: string
  onSave: () => void
  onCancel: () => void
}

export function BOMItemSelector({ bomData, bomId, onSave, onCancel }: BOMItemSelectorProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedItems, setSelectedItems] = useState<BOMItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchProducts()
    if (bomId) {
      fetchExistingItems()
    }
  }, [bomId])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/products')
      if (response.ok) {
        const data = await response.json()
        
        // Handle different response formats
        let productsArray = []
        if (Array.isArray(data)) {
          // Direct array format
          productsArray = data
        } else if (data && Array.isArray(data.products)) {
          // Object with products property
          productsArray = data.products
        } else {
          console.warn('Unexpected API response format:', data)
          productsArray = []
        }
        
        setProducts(productsArray)
      } else {
        console.error('Failed to fetch products:', response.status, response.statusText)
        setProducts([])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const fetchExistingItems = async () => {
    if (!bomId) return
    
    try {
      const response = await fetch(`/api/manufacturing-boms/${bomId}/items`)
      if (response.ok) {
        const data = await response.json()
        const items = Array.isArray(data) ? data : []
        
        // Convert to BOMItem format
        const bomItems = items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_cost: item.product_price || 0,
          notes: item.notes || '',
          product: {
            id: item.product_id,
            name: item.product_name,
            description: item.product_description,
            price: item.product_price || 0,
            stock_quantity: item.product_stock || 0,
            unit_id: item.unit_id,
            category: item.category || '',
            image_url: null
          }
        }))
        
        setSelectedItems(bomItems)
      }
    } catch (error) {
      console.error('Error fetching existing BOM items:', error)
    }
  }

  const filteredProducts = products.filter(product => {
    if (!product || !product.name) return false
    
    const searchLower = searchTerm.toLowerCase()
    const name = product.name.toLowerCase()
    const description = product.description?.toLowerCase() || ''
    const category = product.category?.toLowerCase() || ''
    
    return name.includes(searchLower) || 
           description.includes(searchLower) || 
           category.includes(searchLower)
  })

  const addItem = (product: Product) => {
    const existingItem = selectedItems.find(item => item.product_id === product.id)
    if (existingItem) {
      setSelectedItems(prev => 
        prev.map(item => 
          item.product_id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      )
    } else {
      setSelectedItems(prev => [...prev, {
        product_id: product.id,
        quantity: 1,
        unit_cost: product.price,
        notes: '',
        product
      }])
    }
  }

  const removeItem = (productId: string) => {
    setSelectedItems(prev => prev.filter(item => item.product_id !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId)
      return
    }
    setSelectedItems(prev => 
      prev.map(item => 
        item.product_id === productId 
          ? { ...item, quantity }
          : item
      )
    )
  }

  const updateNotes = (productId: string, notes: string) => {
    setSelectedItems(prev => 
      prev.map(item => 
        item.product_id === productId 
          ? { ...item, notes }
          : item
      )
    )
  }

  const calculateTotalCost = () => {
    return selectedItems.reduce((total, item) => total + (item.quantity * item.unit_cost), 0)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const handleSave = async () => {
    if (selectedItems.length === 0) {
      alert('Please select at least one product for the BOM')
      return
    }

    setSaving(true)
    try {
      // First create the BOM
      const bomPayload = {
        ...bomData,
        type: bomData.project_id ? 'project' : 'production_line'
      }
      
      
      const bomResponse = await fetch('/api/manufacturing-boms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bomPayload),
      })

      if (bomResponse.ok) {
        const bomResult = await bomResponse.json()
        
        // Then add all the items
        const itemPromises = selectedItems.map(item => 
          fetch(`/api/manufacturing-boms/${bomResult.id}/items`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              product_id: item.product_id,
              quantity: item.quantity,
              unit_cost: item.unit_cost,
              notes: item.notes
            }),
          })
        )

        await Promise.all(itemPromises)
        onSave()
      } else {
        const errorData = await bomResponse.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Failed to create BOM:', bomResponse.status, errorData)
        alert(`Failed to create BOM: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error saving BOM:', error)
    } finally {
      setSaving(false)
    }
  }

  const isProductSelected = (productId: string) => {
    return selectedItems.some(item => item.product_id === productId)
  }

  const getSelectedQuantity = (productId: string) => {
    const item = selectedItems.find(item => item.product_id === productId)
    return item ? item.quantity : 0
  }

  return (
    <div className="space-y-6">
      {/* Search Products */}
      <div className="space-y-2">
        <Label htmlFor="search">Search Products</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            id="search"
            placeholder="Search by name, description, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Product Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Available Products</Label>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">
                Loading products...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No products found
              </div>
            ) : (
              filteredProducts.map((product) => (
                <Card key={product.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{product.name}</h4>
                        <p className="text-xs text-muted-foreground mb-1">
                          {product.description || 'No description'}
                        </p>
                        <div className="flex items-center gap-2 text-xs">
                          <Badge variant="outline">{product.category}</Badge>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(product.price)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-1 text-xs">
                          <Package className="h-3 w-3" />
                          <span>{product.stock_quantity}</span>
                        </div>
                        <Button
                          size="sm"
                          variant={isProductSelected(product.id) ? "secondary" : "default"}
                          onClick={() => addItem(product)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Selected Items */}
        <div className="space-y-2">
          <Label>Selected Items ({selectedItems.length})</Label>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {selectedItems.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No items selected
              </div>
            ) : (
              selectedItems.map((item) => (
                <Card key={item.product_id} className="border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{item.product?.name}</h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          {formatCurrency(item.unit_cost)} each
                        </p>
                        <div className="flex items-center gap-2 mb-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium w-8 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Textarea
                          placeholder="Notes for this item..."
                          value={item.notes}
                          onChange={(e) => updateNotes(item.product_id, e.target.value)}
                          className="text-xs"
                          rows={2}
                        />
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-sm font-semibold">
                          {formatCurrency(item.quantity * item.unit_cost)}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeItem(item.product_id)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          
          {selectedItems.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span>Total Cost:</span>
                <span>{formatCurrency(calculateTotalCost())}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Cost per BOM unit:</span>
                <span>{formatCurrency(calculateTotalCost() / bomData.quantity)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving || selectedItems.length === 0}>
          {saving ? 'Creating BOM...' : 'Create BOM'}
        </Button>
      </div>
    </div>
  )
}