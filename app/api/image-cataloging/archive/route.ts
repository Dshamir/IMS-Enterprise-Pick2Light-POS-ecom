import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/sqlite'

export async function POST(request: NextRequest) {
  try {
    const { imageIds } = await request.json()

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json(
        { error: 'Image IDs are required' },
        { status: 400 }
      )
    }

    const db = getDatabase()
    console.log(`Archiving images: ${imageIds.join(', ')}`)
    
    // Update database records to mark images as archived
    const placeholders = imageIds.map(() => '?').join(',')
    const archivedAt = new Date().toISOString()
    
    const result = db.prepare(`
      UPDATE processed_images 
      SET archived = 1, archived_at = ?, updated_at = datetime('now')
      WHERE id IN (${placeholders})
    `).run(archivedAt, ...imageIds)

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'No images found to archive' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true,
      archivedCount: result.changes,
      message: `Successfully archived ${result.changes} image(s)`,
      imageIds
    })

  } catch (error) {
    console.error('Error archiving images:', error)
    return NextResponse.json(
      { error: 'Failed to archive images' },
      { status: 500 }
    )
  }
}