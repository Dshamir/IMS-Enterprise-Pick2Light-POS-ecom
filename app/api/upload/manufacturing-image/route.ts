import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { v4 as uuidv4 } from "uuid"

type ManufacturingEntityType = 'projects' | 'production-lines' | 'manufacturing-boms' | 'production-runs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("image") as File
    const entityType = formData.get("entityType") as ManufacturingEntityType

    console.log('Manufacturing image upload request received')
    console.log('File:', file ? { name: file.name, size: file.size, type: file.type } : 'No file')
    console.log('Entity type:', entityType)

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!entityType) {
      return NextResponse.json({ error: "No entity type provided" }, { status: 400 })
    }

    // Validate entity type
    const validTypes: ManufacturingEntityType[] = ['projects', 'production-lines', 'manufacturing-boms', 'production-runs']
    if (!validTypes.includes(entityType)) {
      return NextResponse.json(
        { error: "Invalid entity type. Must be one of: projects, production-lines, manufacturing-boms, production-runs" },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed." },
        { status: 400 }
      )
    }

    // Validate file size (25MB limit)
    const maxSize = 25 * 1024 * 1024 // 25MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 25MB." },
        { status: 400 }
      )
    }

    // Create uploads directory for the specific entity type
    const uploadsDir = join(process.cwd(), "public", "uploads", entityType)
    console.log('Uploads directory:', uploadsDir)
    try {
      await mkdir(uploadsDir, { recursive: true })
      console.log('Directory created successfully or already exists')
    } catch (error) {
      console.error('Error creating directory:', error)
      // Directory might already exist, that's fine
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop() || "jpg"
    const fileName = `${uuidv4()}.${fileExt}`
    const filePath = join(uploadsDir, fileName)

    // Convert file to buffer and save
    const buffer = Buffer.from(await file.arrayBuffer())
    console.log('Writing file to:', filePath)
    await writeFile(filePath, buffer)
    console.log('File written successfully')

    // Return the public URL
    const publicUrl = `/uploads/${entityType}/${fileName}`
    console.log('Public URL:', publicUrl)

    return NextResponse.json({ 
      url: publicUrl,
      fileName: fileName,
      entityType: entityType
    })
  } catch (error) {
    console.error("Error uploading manufacturing image:", error)
    return NextResponse.json(
      { error: "Failed to upload manufacturing image" },
      { status: 500 }
    )
  }
}