"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { v4 as uuidv4 } from "uuid"
import { sqliteHelpers } from "@/lib/database/sqlite"

export async function createProduct(data: {
  name: string
  description?: string
  price: number
  stock_quantity?: number
  category: string
  image_url?: string
  barcode?: string
}) {
  try {
    const supabase = createServerSupabaseClient()

    const productId = uuidv4()
    const now = new Date().toISOString()

    const { error } = await supabase.from("products").insert({
      id: productId,
      name: data.name,
      description: data.description || null,
      price: data.price,
      stock_quantity: data.stock_quantity || 0,
      min_stock_level: 0,
      max_stock_level: 0,
      reorder_quantity: 0,
      category: data.category,
      image_url: data.image_url || null,
      barcode: data.barcode || null,
      created_at: now,
      updated_at: now,
    })

    if (error) {
      return { error: error.message }
    }

    revalidatePath("/products")
    revalidatePath("/dashboard")

    return { id: productId }
  } catch (error: any) {
    console.error("Error in createProduct:", error)
    return { error: error.message || "An unexpected error occurred" }
  }
}

export async function updateProduct(
  id: string,
  data: {
    name?: string
    description?: string
    price?: number
    stock_quantity?: number
    category?: string
    image_url?: string
    barcode?: string
    mfgname?: string
    mfgnum?: string
    Location?: string
    distributor?: string
  },
) {
  try {
    // Use SQLite instead of Supabase
    const result = sqliteHelpers.updateProduct(id, data)
    
    if (result.changes === 0) {
      return { error: "Product not found or no changes made" }
    }

    revalidatePath(`/products/${id}`)
    revalidatePath("/products")
    revalidatePath("/dashboard")

    return { success: true }
  } catch (error: any) {
    console.error("Error in updateProduct:", error)
    return { error: error.message || "An unexpected error occurred" }
  }
}

export async function deleteProduct(id: string) {
  try {
    const supabase = createServerSupabaseClient()

    const { error } = await supabase.from("products").delete().eq("id", id)

    if (error) {
      return { error: error.message }
    }

    revalidatePath("/products")
    revalidatePath("/dashboard")

    return { success: true }
  } catch (error: any) {
    console.error("Error in deleteProduct:", error)
    return { error: error.message || "An unexpected error occurred" }
  }
}

export async function getProductByBarcode(barcode: string) {
  try {
    // Use SQLite to get product by barcode directly
    const product = sqliteHelpers.getProductByBarcode(barcode)

    if (!product) {
      return { product: null }
    }

    return { product }
  } catch (error: any) {
    console.error("Error in getProductByBarcode:", error)
    return { error: error.message || "An unexpected error occurred" }
  }
}

