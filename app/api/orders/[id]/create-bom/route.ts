import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/supabase-helpers'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    // Get order details
    const order = await sqliteHelpers.db.get(
      `SELECT * FROM orders WHERE id = ?`,
      [id]
    )
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    
    // Get manufacturing items from the order
    const manufacturingItems = await sqliteHelpers.db.all(
      `SELECT * FROM order_items WHERE order_id = ? AND requires_manufacturing = 1`,
      [id]
    )
    
    if (manufacturingItems.length === 0) {
      return NextResponse.json({ error: 'No manufacturing items found in this order' }, { status: 400 })
    }
    
    // Begin transaction
    await sqliteHelpers.db.run('BEGIN TRANSACTION')
    
    try {
      // Create a manufacturing BOM for each unique manufacturing item
      const createdBOMs = []
      
      for (const item of manufacturingItems) {
        const bomId = uuidv4()
        const now = new Date().toISOString()
        
        // Create manufacturing BOM
        await sqliteHelpers.db.run(
          `INSERT INTO manufacturing_boms 
           (id, name, description, type, quantity, status, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            bomId,
            `${item.product_name} (Order ${order.order_number})`,
            `Manufacturing BOM for order ${order.order_number} - ${item.product_description || ''}`,
            'project', // Using project type for order-based manufacturing
            item.quantity,
            'active',
            `Created from order ${order.order_number} for customer ${order.customer_name}`,
            now,
            now
          ]
        )
        
        // Update order item with BOM reference
        await sqliteHelpers.db.run(
          `UPDATE order_items SET bom_id = ?, updated_at = ? WHERE id = ?`,
          [bomId, now, item.id]
        )
        
        // Create order-BOM link
        const linkId = uuidv4()
        await sqliteHelpers.db.run(
          `INSERT INTO order_bom_links 
           (id, order_id, order_item_id, bom_id, quantity_needed, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [linkId, id, item.id, bomId, item.quantity, now, now]
        )
        
        createdBOMs.push({
          bom_id: bomId,
          item_id: item.id,
          product_name: item.product_name,
          quantity: item.quantity
        })
      }
      
      // Update order manufacturing status
      await sqliteHelpers.db.run(
        `UPDATE orders SET manufacturing_status = 'bom_created', updated_at = ? WHERE id = ?`,
        [new Date().toISOString(), id]
      )
      
      await sqliteHelpers.db.run('COMMIT')
      
      return NextResponse.json({
        success: true,
        message: `Created ${createdBOMs.length} manufacturing BOMs`,
        boms: createdBOMs,
        order_id: id,
        order_number: order.order_number
      })
      
    } catch (error) {
      await sqliteHelpers.db.run('ROLLBACK')
      throw error
    }
    
  } catch (error) {
    console.error('Error creating BOMs from order:', error)
    return NextResponse.json({ 
      error: 'Failed to create manufacturing BOMs',
      details: error.message 
    }, { status: 500 })
  }
}