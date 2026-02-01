"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { initializeStorage } from "@/lib/supabase/storage"
import { revalidatePath } from "next/cache"

// Initialize storage bucket
export async function ensureStorageBucket() {
  return await initializeStorage()
}

// Add a product image record to the database
export async function addProductImageRecord(productId: string, imageUrl: string, isPrimary = false) {
  try {
    const supabase = createServerSupabaseClient()

    // Get the highest display order for this product
    const { data: existingImages, error: orderError } = await supabase
      .from("product_images")
      .select("display_order")
      .eq("product_id", productId)
      .order("display_order", { ascending: false })
      .limit(1)

    if (orderError) {
      return { error: `Failed to get display order: ${orderError.message}` }
    }

    const nextOrder = existingImages && existingImages.length > 0 ? existingImages[0].display_order + 1 : 0

    // If this is the first image or marked as primary, update all other images to not be primary
    if (isPrimary) {
      await supabase.from("product_images").update({ is_primary: false }).eq("product_id", productId)
    }

    // If this is the first image, make it primary by default
    const shouldBePrimary = isPrimary || (existingImages && existingImages.length === 0)

    // Insert the new image record
    const { data, error } = await supabase
      .from("product_images")
      .insert({
        product_id: productId,
        image_url: imageUrl,
        is_primary: shouldBePrimary,
        display_order: nextOrder,
      })
      .select()
      .single()

    if (error) {
      return { error: `Failed to add image record: ${error.message}` }
    }

    // If this is the primary image, update the product's main image_url
    if (shouldBePrimary) {
      const { error: updateError } = await supabase.from("products").update({ image_url: imageUrl }).eq("id", productId)

      if (updateError) {
        return { error: `Failed to update product image: ${updateError.message}` }
      }
    }

    // Revalidate product pages
    revalidatePath(`/products/${productId}`)

    return { success: true, image: data }
  } catch (error: any) {
    console.error("Error in addProductImageRecord:", error)
    return { error: error.message || "An unexpected error occurred" }
  }
}

// Delete a product image record
export async function deleteProductImageRecord(imageId: string, productId: string) {
  try {
    const supabase = createServerSupabaseClient()

    // Get the image details first
    const { data: image, error: fetchError } = await supabase
      .from("product_images")
      .select("*")
      .eq("id", imageId)
      .single()

    if (fetchError) {
      return { error: `Failed to fetch image: ${fetchError.message}` }
    }

    // Delete the image record
    const { error } = await supabase.from("product_images").delete().eq("id", imageId)

    if (error) {
      return { error: `Failed to delete image: ${error.message}` }
    }

    // If this was the primary image, set another image as primary
    if (image.is_primary) {
      const { data: nextPrimaryImage, error: nextError } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", productId)
        .order("display_order", { ascending: true })
        .limit(1)
        .single()

      if (!nextError && nextPrimaryImage) {
        // Set this image as primary
        await supabase.from("product_images").update({ is_primary: true }).eq("id", nextPrimaryImage.id)

        // Update the product's main image_url
        await supabase.from("products").update({ image_url: nextPrimaryImage.image_url }).eq("id", productId)
      } else {
        // No more images, clear the product's main image_url
        await supabase.from("products").update({ image_url: null }).eq("id", productId)
      }
    }

    // Revalidate product pages
    revalidatePath(`/products/${productId}`)

    return { success: true }
  } catch (error: any) {
    console.error("Error in deleteProductImageRecord:", error)
    return { error: error.message || "An unexpected error occurred" }
  }
}

// Set an image as the primary image
export async function setPrimaryProductImage(imageId: string, productId: string) {
  try {
    const supabase = createServerSupabaseClient()

    // Get the image URL
    const { data: image, error: fetchError } = await supabase
      .from("product_images")
      .select("image_url")
      .eq("id", imageId)
      .single()

    if (fetchError) {
      return { error: `Failed to fetch image: ${fetchError.message}` }
    }

    // Update all images to not be primary
    const { error: updateAllError } = await supabase
      .from("product_images")
      .update({ is_primary: false })
      .eq("product_id", productId)

    if (updateAllError) {
      return { error: `Failed to update images: ${updateAllError.message}` }
    }

    // Set this image as primary
    const { error } = await supabase.from("product_images").update({ is_primary: true }).eq("id", imageId)

    if (error) {
      return { error: `Failed to set primary image: ${error.message}` }
    }

    // Update the product's main image_url
    const { error: productError } = await supabase
      .from("products")
      .update({ image_url: image.image_url })
      .eq("id", productId)

    if (productError) {
      return { error: `Failed to update product image: ${productError.message}` }
    }

    // Revalidate product pages
    revalidatePath(`/products/${productId}`)

    return { success: true }
  } catch (error: any) {
    console.error("Error in setPrimaryProductImage:", error)
    return { error: error.message || "An unexpected error occurred" }
  }
}

// Reorder product images
export async function reorderProductImages(productId: string, imageIds: string[]) {
  try {
    const supabase = createServerSupabaseClient()

    // Update each image's display order
    for (let i = 0; i < imageIds.length; i++) {
      const { error } = await supabase
        .from("product_images")
        .update({ display_order: i })
        .eq("id", imageIds[i])
        .eq("product_id", productId)

      if (error) {
        return { error: `Failed to reorder images: ${error.message}` }
      }
    }

    // Revalidate product pages
    revalidatePath(`/products/${productId}`)

    return { success: true }
  } catch (error: any) {
    console.error("Error in reorderProductImages:", error)
    return { error: error.message || "An unexpected error occurred" }
  }
}

