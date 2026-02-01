import { NextResponse } from "next/server"
import {
  getForSaleItems,
  ForSaleListFilters,
} from "@/lib/services/forsale-service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const filters: ForSaleListFilters = {}

    // Parse query parameters
    const categoryId = searchParams.get("categoryId")
    const subcategoryId = searchParams.get("subcategoryId")
    const status = searchParams.get("status")
    const condition = searchParams.get("condition")
    const search = searchParams.get("search")
    const limit = searchParams.get("limit")
    const offset = searchParams.get("offset")

    if (categoryId) filters.categoryId = categoryId
    if (subcategoryId) filters.subcategoryId = subcategoryId
    if (status) filters.status = status as ForSaleListFilters["status"]
    if (condition) filters.condition = condition as ForSaleListFilters["condition"]
    if (search) filters.search = search
    if (limit) filters.limit = parseInt(limit, 10)
    if (offset) filters.offset = parseInt(offset, 10)

    const items = getForSaleItems(filters)

    return NextResponse.json({
      items,
      count: items.length,
    })
  } catch (error) {
    console.error("Error fetching For Sale items:", error)
    return NextResponse.json(
      { error: "Failed to fetch items" },
      { status: 500 }
    )
  }
}
