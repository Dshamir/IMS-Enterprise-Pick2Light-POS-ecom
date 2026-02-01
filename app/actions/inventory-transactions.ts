"use server"

import { revalidatePath } from "next/cache"
import { sqliteHelpers } from "@/lib/database/sqlite"

type TransactionType = "addition" | "reduction" | "adjustment"

interface TransactionData {
  productId: string
  type: TransactionType
  quantity: number
  reason?: string
  notes?: string
}

export async function recordInventoryTransaction(data: TransactionData) {
  try {
    // Get current product data using SQLite helper
    const product = sqliteHelpers.getProductById(data.productId)

    if (!product) {
      return { error: "Product not found" }
    }

    const previousQuantity = product.stock_quantity
    let newQuantity = previousQuantity

    // Calculate new quantity based on transaction type
    switch (data.type) {
      case "addition":
        newQuantity = previousQuantity + data.quantity
        break
      case "reduction":
        newQuantity = Math.max(0, previousQuantity - data.quantity)
        break
      case "adjustment":
        newQuantity = data.quantity
        break
    }

    // Update product stock quantity using SQLite helper
    const updateResult = sqliteHelpers.updateProduct(data.productId, {
      stock_quantity: newQuantity,
    })

    if (updateResult.changes === 0) {
      return { error: "Failed to update product stock" }
    }

    // Record the transaction using SQLite helper
    const transactionResult = sqliteHelpers.createInventoryTransaction({
      product_id: data.productId,
      transaction_type: data.type,
      quantity: data.type === "adjustment" ? Math.abs(newQuantity - previousQuantity) : data.quantity,
      previous_quantity: previousQuantity,
      new_quantity: newQuantity,
      reason: data.reason || null,
      notes: data.notes || null,
    })

    if (transactionResult.changes === 0) {
      // Rollback product update if transaction recording fails
      sqliteHelpers.updateProduct(data.productId, {
        stock_quantity: previousQuantity,
      })
      return { error: "Failed to record inventory transaction" }
    }

    // Revalidate product pages
    revalidatePath(`/products/${data.productId}`)
    revalidatePath(`/${product.category}`)
    revalidatePath("/dashboard")

    return {
      success: true,
      previousQuantity,
      newQuantity,
    }
  } catch (error: any) {
    console.error("Error in recordInventoryTransaction:", error)
    return { error: error.message || "An unexpected error occurred" }
  }
}

export async function updateStockLevels(
  productId: string,
  minLevel: number,
  maxLevel: number,
  reorderQuantity: number,
) {
  try {
    // Use SQLite helper to update stock levels
    const updateResult = sqliteHelpers.updateProduct(productId, {
      min_stock_level: minLevel,
      max_stock_level: maxLevel,
      reorder_quantity: reorderQuantity,
    })

    if (updateResult.changes === 0) {
      return { error: "Failed to update stock levels" }
    }

    // Revalidate product page
    revalidatePath(`/products/${productId}`)
    revalidatePath("/dashboard")

    return { success: true }
  } catch (error: any) {
    console.error("Error in updateStockLevels:", error)
    return { error: error.message || "An unexpected error occurred" }
  }
}

export async function getInventoryTransactions(productId: string, limit = 10) {
  try {
    // Use SQLite helper function instead of Supabase
    const transactions = sqliteHelpers.getRecentTransactions(limit, productId)

    return { transactions }
  } catch (error: any) {
    console.error("Error in getInventoryTransactions:", error)
    return { error: error.message || "An unexpected error occurred" }
  }
}

export async function getLowStockProducts() {
  try {
    // Use SQLite helper function
    const lowStockProducts = sqliteHelpers.getLowStockProducts()

    return { products: lowStockProducts }
  } catch (error: any) {
    console.error("Error in getLowStockProducts:", error)
    return { error: error.message || "An unexpected error occurred" }
  }
}

