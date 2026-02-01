import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/supabase-helpers'
import { v4 as uuidv4 } from 'uuid'
import { generateSerialNumber, getNextCounter } from '@/lib/serial-number-utils'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    // Get production run details
    const productionRun = await sqliteHelpers.db.get(
      `SELECT 
        pr.*,
        mb.name as bom_name,
        mb.description as bom_description,
        mb.quantity as bom_quantity,
        pl.name as production_line_name,
        p.name as project_name
      FROM production_runs pr
      JOIN manufacturing_boms mb ON pr.bom_id = mb.id
      LEFT JOIN production_lines pl ON mb.production_line_id = pl.id
      LEFT JOIN projects p ON mb.project_id = p.id
      WHERE pr.id = ? AND pr.status = 'completed'`,
      [id]
    )
    
    if (!productionRun) {
      return NextResponse.json({ error: 'Production run not found or not completed' }, { status: 404 })
    }
    
    // Check if product instances have already been created
    const existingInstances = await sqliteHelpers.db.all(
      `SELECT * FROM product_instances WHERE production_run_id = ?`,
      [id]
    )
    
    if (existingInstances.length > 0) {
      return NextResponse.json({ 
        message: 'Product instances already created for this production run',
        instances: existingInstances
      })
    }
    
    // Begin transaction
    await sqliteHelpers.db.run('BEGIN TRANSACTION')
    
    try {
      const createdProducts = []
      
      // Create product instances based on actual quantity produced
      for (let i = 0; i < productionRun.actual_quantity; i++) {
        const instanceId = uuidv4()
        const now = new Date().toISOString()
        
        // Get next available serial number from the pool
        const availableSerial = await sqliteHelpers.db.get(
          `SELECT * FROM serial_number_pool 
           WHERE production_run_id = ? AND status = 'allocated'
           ORDER BY sequence_number ASC
           LIMIT 1`,
          [id]
        )
        
        let serialData = {
          serialNumber: '',
          serialNumberCustom: '',
          model: '',
          partNumber: '',
          counter: i + 1
        }
        
        if (availableSerial) {
          // Use serial from pool
          serialData = {
            serialNumber: availableSerial.serial_number,
            serialNumberCustom: availableSerial.serial_number,
            model: availableSerial.model || productionRun.bom_name,
            partNumber: availableSerial.part_number || `P/N-${productionRun.bom_id.slice(0, 8)}`,
            counter: availableSerial.counter || (i + 1)
          }
          
          // Mark the serial as consumed and assign to this instance
          await sqliteHelpers.db.run(
            `UPDATE serial_number_pool 
             SET status = 'consumed', 
                 assigned_to_instance_id = ?,
                 consumed_at = ?,
                 updated_at = ?
             WHERE id = ?`,
            [instanceId, now, now, availableSerial.id]
          )
        } else {
          // Fallback to old serial generation if no pool serial available
          console.warn('No allocated serial numbers found in pool, using fallback generation')
          const fallbackSerial = generateSerialNumber(
            productionRun.bom_name,
            id,
            {
              model: productionRun.bom_name,
              partNumber: `P/N-${productionRun.bom_id.slice(0, 8)}`,
              customFormat: undefined
            },
            i
          )
          serialData = fallbackSerial
        }
        
        // Create corresponding product in main products table first
        const productId = uuidv4()
        await sqliteHelpers.db.run(
          `INSERT INTO products 
           (id, name, description, price, stock_quantity, category, unit_id, created_at, updated_at, 
            is_manufactured, bom_id, default_production_run_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            productId,
            `${productionRun.bom_name} #${i + 1}`,
            `${productionRun.bom_description || ''} - Serial: ${serialData.serialNumber}`,
            0, // Price to be set later
            1, // Stock quantity of 1 for manufactured product
            'Manufactured Products',
            'ca7e8b62cff289efd84c4cb989ab63f1', // PIECES unit
            now,
            now,
            1, // is_manufactured flag
            productionRun.bom_id,
            id // default_production_run_id
          ]
        )
        
        // Create product instance with core fields
        await sqliteHelpers.db.run(
          `INSERT INTO product_instances 
           (id, product_id, production_run_id, serial_number, serial_number_custom, 
            model, part_number, counter, instance_status, manufacture_date, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            instanceId,
            productId,
            id,
            serialData.serialNumber,
            serialData.serialNumberCustom,
            serialData.model,
            serialData.partNumber,
            serialData.counter,
            'produced',
            now,
            now,
            now
          ]
        )
        
        createdProducts.push({
          instance_id: instanceId,
          product_id: productId,
          serial_number: serialData.serialNumber,
          serial_number_custom: serialData.serialNumberCustom,
          model: serialData.model,
          part_number: serialData.partNumber,
          counter: serialData.counter,
          name: `${productionRun.bom_name} #${i + 1}`
        })
      }
      
      // Update production run to mark products as created
      await sqliteHelpers.db.run(
        `UPDATE production_runs SET 
         products_created = ?,
         updated_at = ?
         WHERE id = ?`,
        [1, new Date().toISOString(), id]
      )
      
      await sqliteHelpers.db.run('COMMIT')
      
      return NextResponse.json({
        success: true,
        message: `Successfully created ${createdProducts.length} product instances`,
        products: createdProducts,
        production_run: {
          id: productionRun.id,
          bom_name: productionRun.bom_name,
          actual_quantity: productionRun.actual_quantity
        }
      })
      
    } catch (error) {
      await sqliteHelpers.db.run('ROLLBACK')
      throw error
    }
    
  } catch (error) {
    console.error('Error creating product instances:', error)
    return NextResponse.json({ 
      error: 'Failed to create product instances',
      details: error.message 
    }, { status: 500 })
  }
}