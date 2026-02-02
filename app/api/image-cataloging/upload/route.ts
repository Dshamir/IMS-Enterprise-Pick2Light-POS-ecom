import { NextRequest, NextResponse } from "next/server"
import { extname } from "path"
import { getDatabase } from "@/lib/database/sqlite"
import { uploadToStorage } from "@/lib/storage/minio-client"

// POST /api/image-cataloging/upload - Upload and process images
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No files provided"
      }, { status: 400 })
    }

    // Initialize database and file tracking table
    const db = getDatabase()
    db.exec(`
      CREATE TABLE IF NOT EXISTS uploaded_files (
        id TEXT PRIMARY KEY,
        original_filename TEXT NOT NULL,
        stored_filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    const uploadedFiles = []

    for (const file of files) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        continue // Skip unsupported files
      }

      // Generate unique filename
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2)
      const extension = extname(file.name)
      const filename = `${timestamp}-${randomId}${extension}`
      const storageKey = `image-cataloging/${filename}`

      // Convert to buffer and upload to storage
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const url = await uploadToStorage(buffer, storageKey, file.type)

      const fileId = `img-${timestamp}-${randomId}`
      const relativeFilePath = `uploads/image-cataloging/${filename}`

      // Store file mapping in database
      const stmt = db.prepare(`
        INSERT INTO uploaded_files (id, original_filename, stored_filename, file_path)
        VALUES (?, ?, ?, ?)
      `)
      stmt.run(fileId, file.name, filename, relativeFilePath)

      // Create file record
      const fileRecord = {
        id: fileId,
        filename: file.name,
        storedFilename: filename,
        url: url,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
        status: 'uploaded'
      }

      uploadedFiles.push(fileRecord)
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${uploadedFiles.length} files`,
      files: uploadedFiles
    })

  } catch (error) {
    console.error("Error uploading files:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to upload files"
    }, { status: 500 })
  }
}
