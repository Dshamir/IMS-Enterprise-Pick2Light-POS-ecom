import { createClientSupabaseClient } from "./client"
import { createServerSupabaseClient } from "./server"
import { v4 as uuidv4 } from "uuid"

// Storage bucket name
const BUCKET_NAME = "product-images"

// Initialize storage bucket if it doesn't exist (server-side)
export async function initializeStorage() {
  const supabase = createServerSupabaseClient()

  // Check if bucket exists
  const { data: buckets } = await supabase.storage.listBuckets()
  const bucketExists = buckets?.some((bucket) => bucket.name === BUCKET_NAME)

  // Create bucket if it doesn't exist
  if (!bucketExists) {
    await supabase.storage.createBucket(BUCKET_NAME, {
      public: true, // Make files publicly accessible
      fileSizeLimit: 10485760, // 10MB
    })
  }

  return { success: true }
}

// Upload a file to storage (can be used client or server-side)
export async function uploadProductImage(file: File, productId: string) {
  const supabase = createClientSupabaseClient()

  // Generate a unique filename
  const fileExt = file.name.split(".").pop()
  const fileName = `${productId}/${uuidv4()}.${fileExt}`

  // Upload the file
  const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(fileName, file, {
    cacheControl: "3600",
    upsert: false,
  })

  if (error) {
    throw new Error(`Error uploading file: ${error.message}`)
  }

  // Get the public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName)

  return { path: data.path, url: publicUrl }
}

// Delete a file from storage
export async function deleteProductImage(filePath: string) {
  const supabase = createClientSupabaseClient()

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath])

  if (error) {
    throw new Error(`Error deleting file: ${error.message}`)
  }

  return { success: true }
}

// List all images for a product
export async function listProductImages(productId: string) {
  const supabase = createClientSupabaseClient()

  const { data, error } = await supabase.storage.from(BUCKET_NAME).list(productId, {
    sortBy: { column: "name", order: "asc" },
  })

  if (error) {
    throw new Error(`Error listing files: ${error.message}`)
  }

  return data.map((file) => ({
    name: file.name,
    path: `${productId}/${file.name}`,
    url: supabase.storage.from(BUCKET_NAME).getPublicUrl(`${productId}/${file.name}`).data.publicUrl,
    size: file.metadata?.size,
    createdAt: file.created_at,
  }))
}

