import { NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/database/sqlite"

// POST /api/image-cataloging/assign - Assign images to product by barcode
export async function POST(request: NextRequest) {
  try {
    const { imageIds, barcode } = await request.json()
    
    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Image IDs array is required"
      }, { status: 400 })
    }
    
    if (!barcode) {
      return NextResponse.json({
        success: false,
        error: "Barcode is required"
      }, { status: 400 })
    }

    const db = getDatabase()
    
    // Ensure product_images table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS product_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id TEXT NOT NULL,
        image_url TEXT NOT NULL,
        is_primary INTEGER DEFAULT 0,
        display_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `)
    
    // Find product by barcode
    const product = db.prepare(`
      SELECT id, name, barcode FROM products WHERE barcode = ?
    `).get(barcode)
    
    if (!product) {
      return NextResponse.json({
        success: false,
        error: `No product found with barcode: ${barcode}`
      }, { status: 404 })
    }

    // Get processed images
    const placeholders = imageIds.map(() => '?').join(',')
    const images = db.prepare(`
      SELECT * FROM processed_images WHERE id IN (${placeholders})
    `).all(...imageIds)
    
    if (images.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No valid images found"
      }, { status: 404 })
    }

    // Ensure image_metadata table has product_id column
    try {
      db.exec(`ALTER TABLE image_metadata ADD COLUMN product_id TEXT`)
    } catch (e) {
      // Column probably already exists, ignore
    }
    
    // Ensure processed_images table has assigned_product_id column
    try {
      db.exec(`ALTER TABLE processed_images ADD COLUMN assigned_product_id TEXT`)
    } catch (e) {
      // Column probably already exists, ignore
    }

    // Start transaction
    const transaction = db.transaction(() => {
      // Update processed_images with assignment
      const updateProcessedStmt = db.prepare(`
        UPDATE processed_images 
        SET assigned_product_id = ?, updated_at = datetime('now')
        WHERE id = ?
      `)
      
      // Update image_metadata with product linkage
      const updateImageMetadataStmt = db.prepare(`
        UPDATE image_metadata 
        SET product_id = ? 
        WHERE id = ?
      `)
      
      // Insert into product_images table
      const insertProductImageStmt = db.prepare(`
        INSERT INTO product_images (product_id, image_url, is_primary, display_order, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `)
      
      // Get current max display_order for this product
      const maxOrderResult = db.prepare(`
        SELECT COALESCE(MAX(display_order), -1) as max_order 
        FROM product_images 
        WHERE product_id = ?
      `).get(product.id) as { max_order: number }
      
      let displayOrder = maxOrderResult.max_order + 1
      let isPrimary = false
      
      // Check if product has any images - if not, make first one primary
      const existingImagesCount = db.prepare(`
        SELECT COUNT(*) as count FROM product_images WHERE product_id = ?
      `).get(product.id) as { count: number }
      
      if (existingImagesCount.count === 0) {
        isPrimary = true
      }

      // Process each image
      for (let i = 0; i < images.length; i++) {
        const image = images[i]
        
        // Update processed image
        updateProcessedStmt.run(product.id, image.id)
        
        // Update image_metadata with product linkage
        updateImageMetadataStmt.run(product.id, image.id)
        
        // Insert into product_images
        insertProductImageStmt.run(
          product.id,
          image.image_url,
          isPrimary && i === 0 ? 1 : 0, // Only first image is primary
          displayOrder + i
        )
        
        console.log(`✅ Assigned image ${image.id} to product ${product.id} (${product.name})`)
      }
      
      // Update product's main image_url if this is the first image
      if (isPrimary && images.length > 0) {
        db.prepare(`
          UPDATE products SET image_url = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(images[0].image_url, product.id)
      }
    })
    
    // Execute transaction
    transaction()

    console.log(`✅ Successfully assigned ${images.length} images to product: ${product.name} (${product.barcode})`)
    
    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${images.length} images to product: ${product.name}`,
      product: {
        id: product.id,
        name: product.name,
        barcode: product.barcode
      },
      assignedImages: images.length,
      updatedTables: [
        'processed_images (assigned_product_id)',
        'product_images (new entries)',
        'image_metadata (product_id linkage)',
        'products (image_url if primary)'
      ]
    })

  } catch (error) {
    console.error("Error assigning images:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to assign images to product"
    }, { status: 500 })
  }
}

// GET /api/image-cataloging/assign - Get assigned images for a product
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const barcode = searchParams.get('barcode')
    
    if (!productId && !barcode) {
      return NextResponse.json({
        success: false,
        error: "Product ID or barcode is required"
      }, { status: 400 })
    }
    
    const db = getDatabase()
    let product
    
    if (barcode) {
      product = db.prepare(`
        SELECT id, name, barcode FROM products WHERE barcode = ?
      `).get(barcode)
    } else {
      product = db.prepare(`
        SELECT id, name, barcode FROM products WHERE id = ?
      `).get(productId)
    }
    
    if (!product) {
      return NextResponse.json({
        success: false,
        error: "Product not found"
      }, { status: 404 })
    }
    
    // Get assigned images
    const assignedImages = db.prepare(`
      SELECT 
        pi.id as image_id,
        pi.image_url,
        pi.is_primary,
        pi.display_order,
        pi.created_at as assigned_at,
        proc.objects,
        proc.extracted_text,
        proc.description,
        proc.confidence
      FROM product_images pi
      LEFT JOIN processed_images proc ON pi.image_url = proc.image_url
      WHERE pi.product_id = ?
      ORDER BY pi.display_order ASC
    `).all(product.id)
    
    return NextResponse.json({
      success: true,
      product,
      images: assignedImages.map(img => ({
        ...img,
        objects: img.objects ? JSON.parse(img.objects) : []
      }))
    })
    
  } catch (error) {
    console.error("Error getting assigned images:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to get assigned images"
    }, { status: 500 })
  }
}