import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/sqlite'
import fs from 'fs'
import path from 'path'

export async function DELETE(request: NextRequest) {
  try {
    const { imageIds } = await request.json()

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json(
        { error: 'Image IDs are required' },
        { status: 400 }
      )
    }

    const db = getDatabase()
    console.log(`Deleting images: ${imageIds.join(', ')}`)
    
    // Get image information before deletion for file cleanup
    const placeholders = imageIds.map(() => '?').join(',')
    const imagesToDelete = db.prepare(`
      SELECT id, image_url, assigned_product_id
      FROM processed_images 
      WHERE id IN (${placeholders})
    `).all(...imageIds)

    if (imagesToDelete.length === 0) {
      return NextResponse.json(
        { error: 'No images found to delete' },
        { status: 404 }
      )
    }

    // Start transaction to remove from all related tables
    const transaction = db.transaction(() => {
      for (const image of imagesToDelete) {
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
      }
      
      // Remove from processed_images
      const result = db.prepare(`
        DELETE FROM processed_images WHERE id IN (${placeholders})
      `).run(...imageIds)
      
      return result
    })
    
    const result = transaction()
    
    // Delete physical files
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'image-cataloging')
    
    for (const image of imagesToDelete) {
      try {
        if (image.image_url) {
          // Extract filename from URL
          const filename = path.basename(image.image_url)
          const filePath = path.join(uploadsDir, filename)
          
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
            console.log(`Deleted file: ${filename}`)
          }
        }
      } catch (error) {
        console.error(`Error deleting file for image ${image.id}:`, error)
        // Continue with other deletions even if one fails
      }
    }

    return NextResponse.json({ 
      success: true,
      deletedCount: result.changes,
      message: `Successfully deleted ${result.changes} image(s)`
    })

  } catch (error) {
    console.error('Error deleting images:', error)
    return NextResponse.json(
      { error: 'Failed to delete images' },
      { status: 500 }
    )
  }
}