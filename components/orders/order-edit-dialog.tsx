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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingCart, User, Settings } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface OrderEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string | null
  onOrderUpdated: (order: any) => void
}

interface OrderDetails {
  id: string
  order_number: string
  customer_name: string
  status: string
  total_value: number
}

export function OrderEditDialog({ 
  open, 
  onOpenChange, 
  orderId,
  onOrderUpdated 
}: OrderEditDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [formData, setFormData] = useState({
    status: ''
  })

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
        setFormData({
          status: data.status || 'pending'
        })
      }
    } catch (error) {
      console.error('Error fetching order details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!orderId) return
    
    setSubmitting(true)
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const updatedOrder = await response.json()
        
        toast({
          title: "Success",
          description: "Order updated successfully!",
        })

        onOrderUpdated(updatedOrder)
        onOpenChange(false)
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to update order",
        })
      }
    } catch (error) {
      console.error('Error updating order:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update order",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({ status: '' })
    setOrder(null)
    onOpenChange(false)
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Loading Order
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Edit Order - {order.order_number}
          </DialogTitle>
          <DialogDescription>
            Update order information and status
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Order Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Order Number</Label>
                  <Input
                    value={order.order_number}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input
                    value={order.customer_name}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Total Value</Label>
                  <Input
                    value={`$${order.total_value.toFixed(2)}`}
                    disabled
                    className="bg-muted"
                  />
                </div>
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
              disabled={submitting || !formData.status}
            >
              {submitting ? 'Updating...' : 'Update Order'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}