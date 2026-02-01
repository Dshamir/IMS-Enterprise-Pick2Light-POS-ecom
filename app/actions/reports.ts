"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"

type TimeRange = "7days" | "30days" | "90days" | "year" | "all"
type GroupBy = "day" | "week" | "month"

interface ReportFilters {
  timeRange: TimeRange
  category?: string
  productId?: string
  groupBy?: GroupBy
}

export async function getConsumptionTrends(filters: ReportFilters) {
  try {
    const supabase = createServerSupabaseClient()

    // Determine date range based on timeRange
    const now = new Date()
    let startDate: Date | null = null

    switch (filters.timeRange) {
      case "7days":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "30days":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case "90days":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case "year":
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        break
      case "all":
        startDate = null
        break
    }

    // Determine the appropriate time grouping
    const groupBy =
      filters.groupBy ||
      (filters.timeRange === "7days"
        ? "day"
        : filters.timeRange === "30days"
          ? "day"
          : filters.timeRange === "90days"
            ? "week"
            : "month")

    // Get all transactions and products, then filter in JavaScript
    const { data: allTransactions } = await supabase
      .from("inventory_transactions")
      .select("*")
      .order("created_at", { ascending: true })

    const { data: allProducts } = await supabase
      .from("products")
      .select("*")

    // Filter and process in JavaScript for SQLite compatibility
    let transactions = (allTransactions || [])
      .filter(t => t.transaction_type === "reduction")
      .filter(t => {
        if (startDate) {
          return new Date(t.created_at) >= startDate
        }
        return true
      })

    // Add product data to transactions
    transactions = transactions.map(transaction => {
      const product = (allProducts || []).find(p => p.id === transaction.product_id)
      return {
        ...transaction,
        products: product ? { name: product.name, category: product.category } : { name: 'Unknown', category: 'Unknown' }
      }
    })

    // Apply category filter if specified
    if (filters.category) {
      transactions = transactions.filter(t => t.products.category === filters.category)
    }

    // Apply product filter if specified
    if (filters.productId) {
      transactions = transactions.filter(t => t.product_id === filters.productId)
    }

    // Process the data for charting
    const processedData = processTransactionData(transactions, groupBy)

    return { data: processedData }
  } catch (error: any) {
    console.error("Error fetching consumption trends:", error)
    return { error: error.message || "Failed to fetch consumption trends" }
  }
}

export async function getTopConsumedProducts(filters: ReportFilters) {
  try {
    const supabase = createServerSupabaseClient()

    // Determine date range based on timeRange
    const now = new Date()
    let startDate: Date | null = null

    switch (filters.timeRange) {
      case "7days":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "30days":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case "90days":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case "year":
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        break
      case "all":
        startDate = null
        break
    }

    // Get all transactions and products, then filter in JavaScript
    const { data: allTransactions } = await supabase
      .from("inventory_transactions")
      .select("*")

    const { data: allProducts } = await supabase
      .from("products")
      .select("*")

    // Filter and process in JavaScript for SQLite compatibility
    let transactions = (allTransactions || [])
      .filter(t => t.transaction_type === "reduction")
      .filter(t => {
        if (startDate) {
          return new Date(t.created_at) >= startDate
        }
        return true
      })

    // Add product data to transactions
    transactions = transactions.map(transaction => {
      const product = (allProducts || []).find(p => p.id === transaction.product_id)
      return {
        ...transaction,
        products: product ? { name: product.name, category: product.category, price: product.price } : { name: 'Unknown', category: 'Unknown', price: 0 }
      }
    })

    // Apply category filter if specified
    if (filters.category) {
      transactions = transactions.filter(t => t.products.category === filters.category)
    }

    const data = transactions

    // Aggregate data by product
    const productMap = new Map()

    data.forEach((transaction) => {
      const productId = transaction.product_id
      const quantity = transaction.quantity
      const product = transaction.products

      if (!productMap.has(productId)) {
        productMap.set(productId, {
          id: productId,
          name: product.name,
          category: product.category,
          price: product.price,
          totalQuantity: 0,
          totalValue: 0,
        })
      }

      const productData = productMap.get(productId)
      productData.totalQuantity += quantity
      productData.totalValue += quantity * product.price
    })

    // Convert to array and sort by quantity
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10)

    return { data: topProducts }
  } catch (error: any) {
    console.error("Error fetching top consumed products:", error)
    return { error: error.message || "Failed to fetch top consumed products" }
  }
}

export async function getCategoryConsumption(filters: ReportFilters) {
  try {
    const supabase = createServerSupabaseClient()

    // Determine date range based on timeRange
    const now = new Date()
    let startDate: Date | null = null

    switch (filters.timeRange) {
      case "7days":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "30days":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case "90days":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case "year":
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        break
      case "all":
        startDate = null
        break
    }

    // Get all transactions and products, then filter in JavaScript
    const { data: allTransactions } = await supabase
      .from("inventory_transactions")
      .select("*")

    const { data: allProducts } = await supabase
      .from("products")
      .select("*")

    // Filter and process in JavaScript for SQLite compatibility
    let transactions = (allTransactions || [])
      .filter(t => t.transaction_type === "reduction")
      .filter(t => {
        if (startDate) {
          return new Date(t.created_at) >= startDate
        }
        return true
      })

    // Add product data to transactions
    transactions = transactions.map(transaction => {
      const product = (allProducts || []).find(p => p.id === transaction.product_id)
      return {
        ...transaction,
        products: product ? { category: product.category } : { category: 'Unknown' }
      }
    })

    const data = transactions

    // Aggregate data by category
    const categoryMap = new Map()

    data.forEach((transaction) => {
      const category = transaction.products.category
      const quantity = transaction.quantity

      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          category,
          totalQuantity: 0,
        })
      }

      const categoryData = categoryMap.get(category)
      categoryData.totalQuantity += quantity
    })

    // Convert to array
    const categoryData = Array.from(categoryMap.values())

    return { data: categoryData }
  } catch (error: any) {
    console.error("Error fetching category consumption:", error)
    return { error: error.message || "Failed to fetch category consumption" }
  }
}

// Add UUID validation to the getStockLevelHistory function
export async function getStockLevelHistory(productId: string, timeRange: TimeRange) {
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(productId)) {
      return { error: "Invalid product ID format" }
    }

    const supabase = createServerSupabaseClient()

    // Determine date range based on timeRange
    const now = new Date()
    let startDate: Date | null = null

    switch (timeRange) {
      case "7days":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "30days":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case "90days":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case "year":
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        break
      case "all":
        startDate = null
        break
    }

    // Get all transactions for the product, then filter in JavaScript
    const { data: allTransactions } = await supabase
      .from("inventory_transactions")
      .select("*")
      .order("created_at", { ascending: true })

    // Filter for the specific product and date range
    const data = (allTransactions || [])
      .filter(t => t.product_id === productId)
      .filter(t => {
        if (startDate) {
          return new Date(t.created_at) >= startDate
        }
        return true
      })

    // Get product details
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("name, min_stock_level, max_stock_level")
      .eq("id", productId)
      .single()

    if (productError) {
      throw productError
    }

    // Process the data for charting
    const stockHistory = data.map((transaction) => ({
      date: new Date(transaction.created_at),
      quantity: transaction.new_quantity,
      type: transaction.transaction_type,
    }))

    return {
      data: stockHistory,
      product: {
        name: product.name,
        minStockLevel: product.min_stock_level || 0,
        maxStockLevel: product.max_stock_level || 0,
      },
    }
  } catch (error: any) {
    console.error("Error fetching stock level history:", error)
    return { error: error.message || "Failed to fetch stock level history" }
  }
}

// Helper function to process transaction data for charting
function processTransactionData(transactions: any[], groupBy: GroupBy) {
  // Group transactions by time period
  const groupedData = new Map()

  transactions.forEach((transaction) => {
    const date = new Date(transaction.created_at)
    let groupKey: string

    switch (groupBy) {
      case "day":
        groupKey = date.toISOString().split("T")[0] // YYYY-MM-DD
        break
      case "week":
        // Get the week number
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
        const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
        groupKey = `${date.getFullYear()}-W${weekNumber}`
        break
      case "month":
        groupKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`
        break
    }

    if (!groupedData.has(groupKey)) {
      groupedData.set(groupKey, {
        period: groupKey,
        displayDate: formatDisplayDate(groupKey, groupBy),
        totalQuantity: 0,
        transactions: [],
      })
    }

    const group = groupedData.get(groupKey)
    group.totalQuantity += transaction.quantity
    group.transactions.push(transaction)
  })

  // Convert to array and sort by period
  return Array.from(groupedData.values()).sort((a, b) => a.period.localeCompare(b.period))
}

// Helper function to format display dates
function formatDisplayDate(period: string, groupBy: GroupBy): string {
  switch (groupBy) {
    case "day":
      // Convert YYYY-MM-DD to more readable format
      const [year, month, day] = period.split("-")
      return `${month}/${day}/${year}`
    case "week":
      // Format week number
      const [weekYear, weekNum] = period.split("-W")
      return `Week ${weekNum}, ${weekYear}`
    case "month":
      // Convert YYYY-MM to Month YYYY
      const [monthYear, monthNum] = period.split("-")
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ]
      return `${monthNames[Number.parseInt(monthNum) - 1]} ${monthYear}`
    default:
      return period
  }
}

