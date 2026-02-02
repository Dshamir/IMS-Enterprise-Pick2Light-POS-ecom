import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { uploadToStorage } from "@/lib/storage/minio-client"

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

    // Generate unique filename
    const fileExt = file.name.split(".").pop() || "jpg"
    const fileName = `${uuidv4()}.${fileExt}`
    const storageKey = `products/${fileName}`

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    console.log('Uploading file:', storageKey)

    // Upload to storage (MinIO in production, local filesystem in development)
    const publicUrl = await uploadToStorage(buffer, storageKey, file.type)
    console.log('File uploaded successfully, URL:', publicUrl)

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
