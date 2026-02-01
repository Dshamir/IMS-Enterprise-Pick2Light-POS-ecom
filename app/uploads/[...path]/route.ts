import { NextRequest, NextResponse } from 'next/server'
import { join } from 'path'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params
    const filePath = join(process.cwd(), 'public', 'uploads', ...path)
    
    // Security check: ensure the path is within the uploads directory
    const publicUploadsPath = join(process.cwd(), 'public', 'uploads')
    if (!filePath.startsWith(publicUploadsPath)) {
      return new NextResponse('Forbidden', { status: 403 })
    }
    
    // Check if file exists
    if (!existsSync(filePath)) {
      return new NextResponse('File not found', { status: 404 })
    }
    
    // Read the file
    const fileBuffer = await readFile(filePath)
    
    // Determine content type based on file extension
    const ext = path[path.length - 1].split('.').pop()?.toLowerCase()
    let contentType = 'application/octet-stream'
    
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg'
        break
      case 'png':
        contentType = 'image/png'
        break
      case 'gif':
        contentType = 'image/gif'
        break
      case 'webp':
        contentType = 'image/webp'
        break
    }
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Error serving upload file:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}