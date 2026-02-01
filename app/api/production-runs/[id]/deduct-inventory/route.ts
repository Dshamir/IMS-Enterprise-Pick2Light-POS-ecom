import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/supabase-helpers'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    // Get production run details
    const productionRun = await sqliteHelpers.db.get(
      `SELECT * FROM production_runs WHERE id = ? AND status = 'completed'`,
      [id]
    )
    
    if (!productionRun) {
      return NextResponse.json({ error: 'Production run not found or not completed' }, { status: 404 })
    }
    
    // Get BOM items that need to be deducted
    const bomItems = await sqliteHelpers.db.all(
      `SELECT 
        bi.*,
        p.name as product_name,
        p.stock_quantity as current_stock
      FROM manufacturing_bom_items bi
      JOIN products p ON bi.product_id = p.id
      WHERE bi.bom_id = ?`,
      [productionRun.bom_id]
    )
    
    const deductionResults = []
    const errors = []
    
    // Begin transaction
    await sqliteHelpers.db.run('BEGIN TRANSACTION')
    
    try {
      for (const item of bomItems) {
        const totalNeeded = item.quantity * productionRun.actual_quantity
        
        // Check if we have enough stock
        if (item.current_stock < totalNeeded) {
          errors.push({
            product: item.product_name,
            needed: totalNeeded,
            available: item.current_stock,
            shortage: totalNeeded - item.current_stock
          })
          continue
        }
        
        // Deduct from inventory
        await sqliteHelpers.db.run(
          `UPDATE products SET 
           stock_quantity = stock_quantity - ?,
           updated_at = ?
           WHERE id = ?`,
          [totalNeeded, new Date().toISOString(), item.product_id]
        )
        
        // Create inventory transaction record
        const transactionId = uuidv4()
        await sqliteHelpers.db.run(
          `INSERT INTO inventory_transactions 
           (id, product_id, type, quantity, reference_id, reference_type, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            transactionId,
            item.product_id,
            'deduction',
            -totalNeeded,
            id,
            'production_run',
            `Production run deduction: ${item.product_name} (${totalNeeded} units)`,
            new Date().toISOString()
          ]
        )
        
        deductionResults.push({
          product: item.product_name,
          product_id: item.product_id,
          quantity_deducted: totalNeeded,
          remaining_stock: item.current_stock - totalNeeded
        })
      }
      
      if (errors.length > 0) {
        await sqliteHelpers.db.run('ROLLBACK')
        return NextResponse.json({ 
          error: 'Insufficient inventory for some items',
          shortages: errors
        }, { status: 400 })
      }
      
      // Update production run to mark inventory as deducted
      await sqliteHelpers.db.run(
        `UPDATE production_runs SET 
         inventory_deducted = ?,
         updated_at = ?
         WHERE id = ?`,
        [1, new Date().toISOString(), id]
      )
      
      await sqliteHelpers.db.run('COMMIT')
      
      return NextResponse.json({
        success: true,
        deductions: deductionResults,
        message: `Successfully deducted inventory for ${deductionResults.length} items`
      })
      
    } catch (error) {
      await sqliteHelpers.db.run('ROLLBACK')
      throw error
    }
    
  } catch (error) {
    console.error('Error deducting inventory:', error)
    return NextResponse.json({ 
      error: 'Failed to deduct inventory',
      details: error.message 
    }, { status: 500 })
  }
}