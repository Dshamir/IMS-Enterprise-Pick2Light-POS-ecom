import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/supabase-helpers'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    // Get order details using current schema
    const order = await sqliteHelpers.db.get(
      `SELECT 
        o.*,
        o.user_id as customer_name,
        '' as customer_email,
        '' as customer_phone,
        o.order_date as due_date,
        'normal' as priority,
        0 as requires_manufacturing,
        'not_required' as manufacturing_status,
        '' as notes
      FROM orders o
      WHERE o.id = ?`,
      [id]
    )
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    
    // Get order items
    const items = await sqliteHelpers.db.all(
      `SELECT 
        oi.*,
        COALESCE(p.name, 'Unknown Product') as product_name,
        (oi.quantity * oi.unit_price) as total_price
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
      ORDER BY oi.created_at`,
      [id]
    )
    
    // Transform to match expected interface
    const transformedOrder = {
      ...order,
      order_number: order.id, // Use ID as order number for now
      total_value: order.total_amount || 0,
      items: items.map(item => ({
        ...item,
        product_name: item.product_name || 'Unknown Product'
      }))
    }
    
    return NextResponse.json(transformedOrder)
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const { status } = body
    
    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }
    
    const now = new Date().toISOString()
    
    // Update order status using current schema
    await sqliteHelpers.db.run(
      `UPDATE orders SET status = ?, updated_at = ? WHERE id = ?`,
      [status, now, id]
    )
    
    // Return updated order
    const updatedOrder = await sqliteHelpers.db.get(
      `SELECT 
        o.*,
        COUNT(oi.id) as item_count,
        o.user_id as customer_name,
        '' as customer_email,
        '' as customer_phone,
        o.order_date as due_date,
        'normal' as priority,
        0 as requires_manufacturing,
        'not_required' as manufacturing_status,
        '' as notes
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = ?
      GROUP BY o.id`,
      [id]
    )
    
    const transformedOrder = {
      ...updatedOrder,
      order_number: updatedOrder.id,
      total_value: updatedOrder.total_amount || 0
    }
    
    return NextResponse.json(transformedOrder)
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    // Begin transaction
    await sqliteHelpers.db.run('BEGIN TRANSACTION')
    
    try {
      // Delete order items first
      await sqliteHelpers.db.run('DELETE FROM order_items WHERE order_id = ?', [id])
      
      // Delete order
      await sqliteHelpers.db.run('DELETE FROM orders WHERE id = ?', [id])
      
      await sqliteHelpers.db.run('COMMIT')
      
      return NextResponse.json({ success: true })
    } catch (error) {
      await sqliteHelpers.db.run('ROLLBACK')
      throw error
    }
  } catch (error) {
    console.error('Error deleting order:', error)
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 })
  }
}