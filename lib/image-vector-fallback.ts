// Simple fallback vector search using SQLite for image embeddings
// This avoids webpack compatibility issues with ChromaDB

import { getDatabase } from '@/lib/database/sqlite'

interface ImageEmbeddingData {
  imageId: string
  filename: string
  extractedText: string
  description: string
  objects: string[]
  confidence: number
  imageUrl: string
}

// Store image metadata for text-based similarity search
export async function storeImageMetadata(data: ImageEmbeddingData) {
  try {
    const db = getDatabase()
    
    // Create a simple image metadata table
    db.exec(`
      CREATE TABLE IF NOT EXISTS image_metadata (
        id TEXT PRIMARY KEY,
        filename TEXT,
        extracted_text TEXT,
        description TEXT,
        objects TEXT,
        confidence REAL,
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Store the metadata
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO image_metadata 
      (id, filename, extracted_text, description, objects, confidence, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      data.imageId,
      data.filename,
      data.extractedText,
      data.description,
      JSON.stringify(data.objects),
      data.confidence,
      data.imageUrl
    )
    
    console.log('✅ Stored image metadata for similarity search')
    return { success: true }
    
  } catch (error) {
    console.error('❌ Failed to store image metadata:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Simple text-based similarity search
export async function searchSimilarImagesByText(query: string, limit: number = 10) {
  try {
    const db = getDatabase()
    
    const searchTerm = `%${query.toLowerCase()}%`
    
    const results = db.prepare(`
      SELECT * FROM image_metadata
      WHERE LOWER(extracted_text) LIKE ? 
         OR LOWER(description) LIKE ?
         OR LOWER(objects) LIKE ?
      ORDER BY confidence DESC
      LIMIT ?
    `).all(searchTerm, searchTerm, searchTerm, limit)
    
    return {
      success: true,
      images: results.map(result => ({
        id: result.id,
        filename: result.filename,
        extractedText: result.extracted_text,
        description: result.description,
        objects: JSON.parse(result.objects || '[]'),
        confidence: result.confidence,
        imageUrl: result.image_url,
        createdAt: result.created_at
      }))
    }
    
  } catch (error) {
    console.error('❌ Failed to search similar images:', error)
    return { success: false, images: [], error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Get statistics about stored image metadata
export async function getImageMetadataStats() {
  try {
    const db = getDatabase()
    
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_images,
        AVG(confidence) as avg_confidence,
        MAX(confidence) as max_confidence,
        MIN(confidence) as min_confidence
      FROM image_metadata
    `).get() as {
      total_images: number
      avg_confidence: number
      max_confidence: number
      min_confidence: number
    }
    
    return {
      success: true,
      ...stats
    }
    
  } catch (error) {
    console.error('❌ Failed to get image metadata stats:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}