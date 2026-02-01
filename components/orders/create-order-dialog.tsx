'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, ShoppingCart, User, Calendar, DollarSign, Package } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface CreateOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOrderCreated: (order: any) => void
}

interface OrderItem {
  id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

interface Product {
  id: string
  name: string
  price: number
  stock_quantity: number
}

export function CreateOrderDialog({ 
  open, 
  onOpenChange, 
  onOrderCreated
}: CreateOrderDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    due_date: '',
    priority: 'normal',
    notes: ''
  })
  
  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    {
      id: '1',
      product_id: '',
      product_name: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0
    }
  ])

  useEffect(() => {
    if (open) {
      fetchProducts()
    }
  }, [open])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      // Fetch products from finished products category
      const response = await fetch('/api/products?category=finished%20products')
      if (response.ok) {
        const data = await response.json()
        console.log('Products API Response:', data) // Debug log
        // Handle both new API format and old array format
        const productsArray = data.products || (Array.isArray(data) ? data : [])
        console.log('Products Array:', productsArray) // Debug log
        setProducts(productsArray)
      } else {
        console.error('Products API Response Error:', response.status, response.statusText)
        toast({
          variant: "destructive",
          title: "Error",
          description: `Failed to load products: ${response.status}`,
        })
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load products",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const updatedItems = [...orderItems]
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    }
    
    // If product changed, update name and price
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === value)
      if (product) {
        updatedItems[index].product_name = product.name
        updatedItems[index].unit_price = product.price
      }
    }
    
    // Calculate total price
    updatedItems[index].total_price = updatedItems[index].quantity * updatedItems[index].unit_price
    
    setOrderItems(updatedItems)
  }

  const addOrderItem = () => {
    setOrderItems(prev => [...prev, {
      id: (prev.length + 1).toString(),
      product_id: '',
      product_name: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0
    }])
  }

  const removeOrderItem = (index: number) => {
    if (orderItems.length > 1) {
      setOrderItems(prev => prev.filter((_, i) => i !== index))
    }
  }

  const getTotalAmount = () => {
    return orderItems.reduce((sum, item) => sum + item.total_price, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.customer_name) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Customer name is required",
      })
      return
    }
    
    const validItems = orderItems.filter(item => item.product_id && item.quantity > 0)
    if (validItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "At least one order item is required",
      })
      return
    }
    
    setSubmitting(true)

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          items: validItems.map(item => ({
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price
          }))
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        toast({
          title: "Success",
          description: `Order ${result.order_number || 'created'} successfully!`,
        })

        onOrderCreated(result)
        handleClose()
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to create order",
        })
      }
    } catch (error) {
      console.error('Error creating order:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create order",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    // Reset form
    setFormData({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      due_date: '',
      priority: 'normal',
      notes: ''
    })
    setOrderItems([{
      id: '1',
      product_id: '',
      product_name: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0
    }])
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Create New Order
          </DialogTitle>
          <DialogDescription>
            Create a new customer order with products and delivery details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Customer Name *</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) => handleInputChange('customer_name', e.target.value)}
                    placeholder="e.g., Acme Corporation"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_email">Email</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => handleInputChange('customer_email', e.target.value)}
                    placeholder="customer@example.com"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_phone">Phone</Label>
                  <Input
                    id="customer_phone"
                    value={formData.customer_phone}
                    onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                    placeholder="+1-555-0123"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => handleInputChange('due_date', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Additional notes or special instructions..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Order Items
              </CardTitle>
              <CardDescription>
                Add products to this order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orderItems.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-4 items-end p-4 border rounded-lg">
                    <div className="col-span-4 space-y-2">
                      <Label>Product</Label>
                      <Select 
                        value={item.product_id} 
                        onValueChange={(value) => handleItemChange(index, 'product_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {loading ? (
                            <div className="p-2 text-center text-muted-foreground">Loading products...</div>
                          ) : products.length === 0 ? (
                            <div className="p-2 text-center text-muted-foreground">No finished products available</div>
                          ) : (
                            products.map(product => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} - ${product.price}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="col-span-2 space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    
                    <div className="col-span-2 space-y-2">
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    
                    <div className="col-span-2 space-y-2">
                      <Label>Total</Label>
                      <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center font-mono">
                        ${item.total_price.toFixed(2)}
                      </div>
                    </div>
                    
                    <div className="col-span-2 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOrderItem(index)}
                        disabled={orderItems.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={addOrderItem}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total Amount:</span>
                <span className="font-mono">${getTotalAmount().toFixed(2)}</span>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {orderItems.filter(item => item.product_id).length} items
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !formData.customer_name}
            >
              {submitting ? 'Creating...' : 'Create Order'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}