import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/supabase-helpers'
import { v4 as uuidv4 } from 'uuid'

function generateOrderNumber(): string {
  const year = new Date().getFullYear()
  const timestamp = Date.now().toString().slice(-6)
  return `ORD-${year}-${timestamp}`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const manufacturing = searchParams.get('manufacturing')
    
    // First, let's check what columns actually exist in the orders table
    let query = `
      SELECT 
        o.*,
        COUNT(oi.id) as item_count,
        0 as manufacturing_items_count,
        COALESCE(o.user_id, 'Unknown Customer') as customer_name,
        '' as customer_email,
        o.order_date as due_date,
        'normal' as priority,
        0 as requires_manufacturing,
        'not_required' as manufacturing_status,
        '' as notes
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE 1=1
    `
    
    const params: any[] = []
    
    if (status) {
      query += ` AND o.status = ?`
      params.push(status)
    }
    
    query += ` GROUP BY o.id ORDER BY o.created_at DESC`
    
    const orders = await sqliteHelpers.db.all(query, params)
    
    // Transform the orders to match the expected interface
    const transformedOrders = orders.map(order => ({
      ...order,
      order_number: order.id, // Use ID as order number for now
      total_value: order.total_amount || 0
    }))
    
    return NextResponse.json(transformedOrders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      customer_name, 
      customer_email, 
      customer_phone,
      due_date, 
      priority = 'normal',
      notes = '',
      items = []
    } = body
    
    if (!customer_name || !items.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    const orderId = uuidv4()
    const orderNumber = generateOrderNumber()
    const now = new Date().toISOString()
    
    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + ((item.quantity || 1) * (item.unit_price || 0)), 0)
    
    // Begin transaction
    await sqliteHelpers.db.run('BEGIN TRANSACTION')
    
    try {
      // Create order using current schema (user_id, total_amount)
      await sqliteHelpers.db.run(
        `INSERT INTO orders 
         (id, user_id, status, total_amount, order_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderId, customer_name, 'pending', totalAmount, due_date || now, now, now]
      )
      
      // Create order items using current schema
      for (const item of items) {
        const itemId = uuidv4()
        
        await sqliteHelpers.db.run(
          `INSERT INTO order_items 
           (id, order_id, product_id, quantity, unit_price, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            itemId, 
            orderId, 
            item.product_id || null,
            item.quantity || 1, 
            item.unit_price || 0,
            now
          ]
        )
      }
      
      await sqliteHelpers.db.run('COMMIT')
      
      // Fetch the created order with transformed format
      const order = await sqliteHelpers.db.get(
        `SELECT 
          o.*,
          COUNT(oi.id) as item_count,
          0 as manufacturing_items_count,
          o.user_id as customer_name,
          '' as customer_email,
          o.order_date as due_date,
          'normal' as priority,
          0 as requires_manufacturing,
          'not_required' as manufacturing_status,
          '' as notes
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.id = ?
        GROUP BY o.id`,
        [orderId]
      )
      
      const transformedOrder = {
        ...order,
        order_number: orderNumber,
        total_value: order.total_amount || 0
      }
      
      return NextResponse.json(transformedOrder)
    } catch (error) {
      await sqliteHelpers.db.run('ROLLBACK')
      throw error
    }
    
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json({ error: 'Failed to create order', details: error.message }, { status: 500 })
  }
}