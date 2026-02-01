import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("image") as File

    console.log('Image upload request received')
    console.log('File:', file ? { name: file.name, size: file.size, type: file.type } : 'No file')

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
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

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads", "products")
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
    const publicUrl = `/uploads/products/${fileName}`
    console.log('Public URL:', publicUrl)

    return NextResponse.json({ 
      url: publicUrl,
      fileName: fileName
    })
  } catch (error) {
    console.error("Error uploading image:", error)
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    )
  }
}