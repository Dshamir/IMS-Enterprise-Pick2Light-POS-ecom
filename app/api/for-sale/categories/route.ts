import { NextResponse } from "next/server"
import {
  getCategories,
  createCategory,
  ForSaleCategory,
} from "@/lib/services/forsale-service"

export async function GET() {
  try {
    const categories = getCategories()

    return NextResponse.json({
      categories,
      count: categories.length,
    })
  } catch (error) {
    console.error("Error fetching For Sale categories:", error)
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { name, slug, description, icon, sort_order } = body

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 }
      )
    }

    const category = createCategory({
      name,
      slug,
      description,
      icon,
      sort_order,
    })

    return NextResponse.json({ category, success: true }, { status: 201 })
  } catch (error) {
    console.error("Error creating For Sale category:", error)
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    )
  }
}
