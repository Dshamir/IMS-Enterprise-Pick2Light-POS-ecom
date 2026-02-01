import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { updateProductInVectorSearch, removeProductFromVectorSearch } from "@/lib/vector-search-manager"
import { sqliteHelpers } from "@/lib/database/sqlite"
import { getDatabase } from "@/lib/database/sqlite"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      )
    }

    // Get the product using SQLite
    const product = sqliteHelpers.getProductById(id)

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }

    // Fetch assigned images from product_images table
    const db = getDatabase()
    let assignedImages = []
    
    try {
      assignedImages = db.prepare(`
        SELECT 
          pi.id as product_image_id,
          proc.id as image_id,
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
        WHERE pi.product_id = ? AND proc.id IS NOT NULL
        ORDER BY pi.display_order ASC
      `).all(product.id)
      
      // Parse objects JSON if it exists
      assignedImages = assignedImages.map(img => ({
        ...img,
        objects: img.objects ? JSON.parse(img.objects) : []
      }))
      
      console.log(`✅ Found ${assignedImages.length} assigned images for product ${product.id}`)
    } catch (error) {
      console.error('Error fetching assigned images:', error)
      assignedImages = []
    }
    
    // If no assigned images but there's a main image_url, include it
    if (assignedImages.length === 0 && product.image_url) {
      assignedImages = [{ 
        image_url: product.image_url, 
        is_primary: true,
        display_order: 0,
        objects: [],
        extracted_text: null,
        description: 'Main product image',
        confidence: null
      }]
    }

    // Get unit information for the product
    const unit = product.unit_id ? sqliteHelpers.getUnitById(product.unit_id) : null

    const productWithImages = {
      ...product,
      unit,
      images: assignedImages
    }

    return NextResponse.json(productWithImages)
  } catch (error: any) {
    console.error("Error fetching product:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const updates = await request.json()
    
    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      )
    }

    // Extract image management data from updates
    const { existingImages, newImages, ...productUpdates } = updates
    
    // Update the product using SQLite
    const result = sqliteHelpers.updateProduct(id, productUpdates)
    
    if (!result) {
      return NextResponse.json(
        { error: "Failed to update product" },
        { status: 500 }
      )
    }

    // Handle image management if data is provided
    if (existingImages !== undefined) {
      const db = getDatabase()
      
      // Get all current assigned images for this product with processed_images IDs
      const currentImages = db.prepare(`
        SELECT 
          pi.id as product_image_id,
          proc.id as processed_image_id,
          pi.image_url,
          pi.is_primary,
          pi.display_order
        FROM product_images pi
        LEFT JOIN processed_images proc ON pi.image_url = proc.image_url
        WHERE pi.product_id = ?
      `).all(id)
      
      // Find images to delete (using processed_images IDs from existingImages)
      const existingProcessedIds = existingImages.map(img => img.id)
      const imagesToDelete = currentImages.filter(img => !existingProcessedIds.includes(img.processed_image_id))
      
      // Delete removed images from product_images table
      if (imagesToDelete.length > 0) {
        const deleteStmt = db.prepare(`DELETE FROM product_images WHERE id = ?`)
        for (const img of imagesToDelete) {
          deleteStmt.run(img.product_image_id)
          console.log(`🗑️ Deleted product image: ${img.product_image_id} (${img.processed_image_id})`)
        }
      }
      
      // Update primary status for existing images (using processed_images IDs to find product_images)
      if (existingImages.length > 0) {
        const updatePrimaryStmt = db.prepare(`
          UPDATE product_images 
          SET is_primary = ? 
          WHERE id = (
            SELECT pi.id FROM product_images pi 
            LEFT JOIN processed_images proc ON pi.image_url = proc.image_url 
            WHERE proc.id = ? AND pi.product_id = ?
          )
        `)
        
        for (const img of existingImages) {
          updatePrimaryStmt.run(img.isPrimary ? 1 : 0, img.id, id)
        }
      }
      
      // Add new images if provided
      if (newImages && newImages.length > 0) {
        const insertStmt = db.prepare(`
          INSERT INTO product_images (id, product_id, image_url, is_primary, display_order, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        
        const nextDisplayOrder = Math.max(0, ...currentImages.map(img => img.display_order)) + 1
        
        for (let i = 0; i < newImages.length; i++) {
          const imageId = `img-${Date.now()}-${i}`
          const isPrimary = existingImages.length === 0 && i === 0 ? 1 : 0
          insertStmt.run(
            imageId,
            id,
            newImages[i],
            isPrimary,
            nextDisplayOrder + i,
            new Date().toISOString()
          )
        }
      }
    }

    // Get the updated product
    const product = sqliteHelpers.getProductById(id)

    if (!product) {
      return NextResponse.json(
        { error: "Product not found after update" },
        { status: 404 }
      )
    }

    // Update vector search index
    if (product?.id) {
      try {
        await updateProductInVectorSearch({
          id: product.id,
          name: product.name,
          description: product.description,
          category: product.category,
          image_url: product.image_url
        })
      } catch (vectorError) {
        console.warn("Failed to update product in vector search:", vectorError.message)
        // Don't fail the whole request if vector indexing fails
      }
    }

    return NextResponse.json(product)
  } catch (error: any) {
    console.error("Error updating product:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      )
    }

    // Delete the product using SQLite
    const result = sqliteHelpers.deleteProduct(id)
    
    if (!result) {
      return NextResponse.json(
        { error: "Failed to delete product" },
        { status: 500 }
      )
    }

    // Remove from vector search index
    try {
      await removeProductFromVectorSearch(id)
    } catch (vectorError) {
      console.warn("Failed to remove product from vector search:", vectorError)
      // Don't fail the whole request if vector removal fails
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting product:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}