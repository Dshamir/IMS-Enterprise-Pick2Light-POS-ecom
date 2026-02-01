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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  ShoppingCart, 
  User, 
  Calendar,
  Mail,
  Phone,
  Package,
  DollarSign,
  Clock,
  StickyNote,
  Factory
} from "lucide-react"

interface OrderDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string | null
}

interface OrderDetails {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  customer_phone: string
  order_date: string
  due_date: string
  status: string
  priority: string
  total_value: number
  notes: string
  items: OrderItem[]
  requires_manufacturing: number
  manufacturing_status: string
}

interface OrderItem {
  id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

export function OrderDetailsDialog({ 
  open, 
  onOpenChange, 
  orderId 
}: OrderDetailsDialogProps) {
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && orderId) {
      fetchOrderDetails()
    }
  }, [open, orderId])

  const fetchOrderDetails = async () => {
    if (!orderId) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/orders/${orderId}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data)
      }
    } catch (error) {
      console.error('Error fetching order details:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'manufacturing':
        return 'bg-purple-100 text-purple-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'normal':
        return 'bg-blue-100 text-blue-800'
      case 'low':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Loading Order Details
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Loading order details...</div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!order) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Order Not Found
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Order not found</div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Order Details - {order.order_number}
          </DialogTitle>
          <DialogDescription>
            Complete order information and items
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Overview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Order Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Status</div>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Priority</div>
                  <Badge className={getPriorityColor(order.priority)}>
                    {order.priority}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Order Date</div>
                  <div className="font-medium">{formatDate(order.order_date)}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Due Date</div>
                  <div className="font-medium">{formatDate(order.due_date)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Customer Name</div>
                  <div className="font-medium">{order.customer_name}</div>
                </div>
                {order.customer_email && (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Email</div>
                    <div className="font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {order.customer_email}
                    </div>
                  </div>
                )}
                {order.customer_phone && (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Phone</div>
                    <div className="font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {order.customer_phone}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Order Items ({order.items?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.items && order.items.length > 0 ? (
                <div className="space-y-3">
                  {order.items.map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{item.product_name}</div>
                        <div className="text-sm text-muted-foreground">
                          Product ID: {item.product_id}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-right">
                          <div className="font-medium">Qty: {item.quantity}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(item.unit_price)}</div>
                          <div className="text-muted-foreground">per unit</div>
                        </div>
                        <div className="text-right font-medium min-w-[80px]">
                          {formatCurrency(item.total_price)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No items found for this order
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manufacturing Information */}
          {order.requires_manufacturing === 1 && (
            <Card className="border-purple-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Factory className="h-4 w-4" />
                  Manufacturing Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Manufacturing Status</div>
                  <Badge className="bg-purple-100 text-purple-800">
                    {order.manufacturing_status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Total */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Order Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total Amount:</span>
                <span className="text-2xl font-bold font-mono">{formatCurrency(order.total_value)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm">{order.notes}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}