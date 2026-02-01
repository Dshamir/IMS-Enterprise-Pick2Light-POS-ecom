'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  ShoppingCart, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Factory,
  User,
  Calendar,
  Plus,
  Eye,
  Edit,
  Trash2
} from "lucide-react"
import { CreateOrderDialog } from "./create-order-dialog"
import { OrderDetailsDialog } from "./order-details-dialog"
import { OrderEditDialog } from "./order-edit-dialog"

interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  order_date: string
  due_date: string
  status: string
  priority: string
  total_value: number
  requires_manufacturing: number
  manufacturing_status: string
  item_count: number
  manufacturing_items_count: number
  notes: string
}

interface OrdersListProps {
  showCreateButton?: boolean
}

export function OrdersList({ showCreateButton = true }: OrdersListProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [filter])

  const fetchOrders = async () => {
    try {
      let url = '/api/orders'
      const params = new URLSearchParams()
      
      if (filter === 'manufacturing') {
        params.append('manufacturing', 'true')
      } else if (filter === 'pending') {
        params.append('status', 'pending')
      } else if (filter === 'in_progress') {
        params.append('status', 'in_progress')
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setOrders(Array.isArray(data) ? data : [])
      } else {
        console.error('Failed to fetch orders:', response.status)
        setOrders([])
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
      setOrders([])
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

  const getManufacturingStatusColor = (status: string) => {
    switch (status) {
      case 'not_required':
        return 'bg-gray-100 text-gray-600'
      case 'bom_needed':
        return 'bg-yellow-100 text-yellow-800'
      case 'bom_created':
        return 'bg-blue-100 text-blue-800'
      case 'in_production':
        return 'bg-purple-100 text-purple-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
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
    return new Date(dateString).toLocaleDateString()
  }

  const handleCreateBOM = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/create-bom`, {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        console.log('BOMs created:', data)
        // Refresh orders to show updated status
        fetchOrders()
      } else {
        console.error('Failed to create BOMs:', response.status)
      }
    } catch (error) {
      console.error('Error creating BOMs:', error)
    }
  }

  const getManufacturingStatusText = (status: string) => {
    switch (status) {
      case 'not_required':
        return 'No Manufacturing'
      case 'bom_needed':
        return 'BOM Needed'
      case 'bom_created':
        return 'BOM Created'
      case 'in_production':
        return 'In Production'
      case 'completed':
        return 'Manufacturing Complete'
      default:
        return status
    }
  }

  const handleOrderCreated = (newOrder: Order) => {
    setOrders(prev => [newOrder, ...prev])
    setShowCreateDialog(false)
  }

  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId)
    setShowDetailsDialog(true)
  }

  const handleEditOrder = (orderId: string) => {
    setSelectedOrderId(orderId)
    setShowEditDialog(true)
  }

  const handleOrderUpdated = (updatedOrder: Order) => {
    setOrders(prev => prev.map(order => 
      order.id === updatedOrder.id ? updatedOrder : order
    ))
    setShowEditDialog(false)
  }

  const handleDeleteOrder = async (orderId: string) => {
    if (confirm('Are you sure you want to delete this order?')) {
      try {
        const response = await fetch(`/api/orders/${orderId}`, {
          method: 'DELETE',
        })
        
        if (response.ok) {
          setOrders(prev => prev.filter(order => order.id !== orderId))
        } else {
          console.error('Failed to delete order')
        }
      } catch (error) {
        console.error('Error deleting order:', error)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-muted-foreground">Loading orders...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Customer Orders
          </h2>
          <p className="text-muted-foreground">
            Manage customer orders and manufacturing requirements
          </p>
        </div>
        {showCreateButton && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All Orders
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('pending')}
        >
          Pending
        </Button>
        <Button
          variant={filter === 'in_progress' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('in_progress')}
        >
          In Progress
        </Button>
        <Button
          variant={filter === 'manufacturing' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('manufacturing')}
        >
          Manufacturing Required
        </Button>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Orders Found</h3>
            <p className="text-muted-foreground mb-4">
              {filter === 'all' 
                ? 'Create your first order to get started.'
                : `No orders match the "${filter}" filter.`
              }
            </p>
            {showCreateButton && filter === 'all' && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Order
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{order.order_number}</CardTitle>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.replace('_', ' ')}
                      </Badge>
                      <Badge className={getPriorityColor(order.priority)}>
                        {order.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-1">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{order.customer_name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Due: {formatDate(order.due_date)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>{order.item_count} items</span>
                      </div>
                    </div>
                    <CardDescription className="text-sm">
                      {order.customer_email}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleViewOrder(order.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEditOrder(order.id)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteOrder(order.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-lg font-semibold">
                        {formatCurrency(order.total_value)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Order Value
                      </div>
                    </div>
                    
                    {order.requires_manufacturing === 1 && (
                      <>
                        <Separator orientation="vertical" className="h-8" />
                        <div className="flex items-center gap-2">
                          <Factory className="h-4 w-4 text-purple-600" />
                          <div>
                            <Badge className={getManufacturingStatusColor(order.manufacturing_status)}>
                              {getManufacturingStatusText(order.manufacturing_status)}
                            </Badge>
                            <div className="text-xs text-muted-foreground mt-1">
                              {order.manufacturing_items_count} items need manufacturing
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {order.requires_manufacturing === 1 && order.manufacturing_status === 'bom_needed' && (
                    <Button size="sm" onClick={() => handleCreateBOM(order.id)}>
                      <Factory className="h-4 w-4 mr-2" />
                      Create Manufacturing BOM
                    </Button>
                  )}
                </div>
                
                {order.notes && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-800">{order.notes}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <CreateOrderDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onOrderCreated={handleOrderCreated}
      />
      
      <OrderDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        orderId={selectedOrderId}
      />
      
      <OrderEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        orderId={selectedOrderId}
        onOrderUpdated={handleOrderUpdated}
      />
    </div>
  )
}