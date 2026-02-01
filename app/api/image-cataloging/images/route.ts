import { NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/database/sqlite"

// GET /api/image-cataloging/images - Get all processed images with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'processed', 'assigned', 'all'
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    const db = getDatabase()
    
    // Ensure processed_images table has all required columns
    try {
      // Check if assigned_product_id and archived columns exist
      const tableInfo = db.prepare(`PRAGMA table_info(processed_images)`).all()
      const hasAssignedProductId = tableInfo.some((col: any) => col.name === 'assigned_product_id')
      const hasArchived = tableInfo.some((col: any) => col.name === 'archived')
      
      if (!hasAssignedProductId) {
        console.log('Adding missing assigned_product_id column to processed_images table')
        db.exec(`ALTER TABLE processed_images ADD COLUMN assigned_product_id TEXT`)
        db.exec(`ALTER TABLE processed_images ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))`)
      }
      
      if (!hasArchived) {
        console.log('Adding missing archived column to processed_images table')
        db.exec(`ALTER TABLE processed_images ADD COLUMN archived INTEGER DEFAULT 0`)
        db.exec(`ALTER TABLE processed_images ADD COLUMN archived_at TEXT`)
      }
    } catch (migrationError) {
      console.error('Migration error (table might not exist yet):', migrationError)
      // Create the table with all columns if it doesn't exist
      db.exec(`
        CREATE TABLE IF NOT EXISTS processed_images (
          id TEXT PRIMARY KEY,
          image_url TEXT,
          objects TEXT,
          extracted_text TEXT,
          description TEXT,
          confidence REAL,
          processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          assigned_product_id TEXT,
          archived INTEGER DEFAULT 0,
          archived_at TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `)
    }
    
    // Build query based on filters
    let query = `
      SELECT 
        proc.*,
        p.name as assigned_product_name,
        p.barcode as assigned_product_barcode
      FROM processed_images proc
      LEFT JOIN products p ON proc.assigned_product_id = p.id
    `
    
    const conditions = []
    const params = []
    
    // Always exclude archived images unless explicitly requested
    const includeArchived = searchParams.get('includeArchived') === 'true'
    if (!includeArchived) {
      conditions.push('(proc.archived IS NULL OR proc.archived = 0)')
    }
    
    // Status filter
    if (status && status !== 'all') {
      if (status === 'assigned') {
        conditions.push('proc.assigned_product_id IS NOT NULL')
      } else if (status === 'processed') {
        conditions.push('proc.assigned_product_id IS NULL')
      }
    }
    
    // Search filter
    if (search) {
      conditions.push(`(
        proc.extracted_text LIKE ? OR 
        proc.description LIKE ? OR 
        proc.objects LIKE ? OR
        p.name LIKE ?
      )`)
      const searchTerm = `%${search}%`
      params.push(searchTerm, searchTerm, searchTerm, searchTerm)
    }
    
    // Add conditions to query
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }
    
    query += ' ORDER BY proc.processed_at DESC'
    
    // Add pagination
    query += ' LIMIT ? OFFSET ?'
    params.push(limit, offset)
    
    const images = db.prepare(query).all(...params)
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM processed_images proc
      LEFT JOIN products p ON proc.assigned_product_id = p.id
    `
    
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ')
    }
    
    const countParams = params.slice(0, -2) // Remove limit and offset
    const totalResult = db.prepare(countQuery).get(...countParams) as { total: number }
    
    return NextResponse.json({
      success: true,
      images: images.map(img => ({
        ...img,
        objects: img.objects ? JSON.parse(img.objects) : [],
        status: img.assigned_product_id ? 'assigned' : 'processed',
        archived: Boolean(img.archived),
        assignedProduct: img.assigned_product_id ? {
          id: img.assigned_product_id,
          name: img.assigned_product_name,
          barcode: img.assigned_product_barcode
        } : null
      })),
      pagination: {
        total: totalResult.total,
        limit,
        offset,
        hasMore: offset + limit < totalResult.total
      }
    })

  } catch (error) {
    console.error("Error getting images:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to get images"
    }, { status: 500 })
  }
}

// DELETE /api/image-cataloging/images - Delete processed image
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get('imageId')
    
    if (!imageId) {
      return NextResponse.json({
        success: false,
        error: "Image ID is required"
      }, { status: 400 })
    }
    
    const db = getDatabase()
    
    // Get image info before deletion
    const image = db.prepare(`
      SELECT * FROM processed_images WHERE id = ?
    `).get(imageId)
    
    if (!image) {
      return NextResponse.json({
        success: false,
        error: "Image not found"
      }, { status: 404 })
    }
    
    // Start transaction to remove from both tables
    const transaction = db.transaction(() => {
      // Remove from product_images if assigned
      if (image.assigned_product_id) {
        db.prepare(`
          DELETE FROM product_images 
          WHERE product_id = ? AND image_url = ?
        `).run(image.assigned_product_id, image.image_url)
        
        // Update product's main image if this was the primary image
        const remainingImages = db.prepare(`
          SELECT image_url FROM product_images 
          WHERE product_id = ? 
          ORDER BY is_primary DESC, display_order ASC 
          LIMIT 1
        `).get(image.assigned_product_id)
        
        // Update or clear the product's main image
        if (remainingImages) {
          db.prepare(`
            UPDATE products 
            SET image_url = ?, updated_at = datetime('now')
            WHERE id = ?
          `).run(remainingImages.image_url, image.assigned_product_id)
        } else {
          db.prepare(`
            UPDATE products 
            SET image_url = NULL, updated_at = datetime('now')
            WHERE id = ?
          `).run(image.assigned_product_id)
        }
      }
      
      // Remove from processed_images
      db.prepare(`
        DELETE FROM processed_images WHERE id = ?
      `).run(imageId)
    })
    
    transaction()
    
    // TODO: Also delete the physical file from uploads folder
    // This would require additional file system operations
    
    return NextResponse.json({
      success: true,
      message: "Image deleted successfully"
    })

  } catch (error) {
    console.error("Error deleting image:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to delete image"
    }, { status: 500 })
  }
}