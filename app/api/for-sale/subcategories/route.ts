import { NextResponse } from "next/server"
import {
  getSubcategories,
  createSubcategory,
  getCategoryBySlug,
} from "@/lib/services/forsale-service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("categoryId")
    const categorySlug = searchParams.get("categorySlug")

    let parentCategoryId: string | undefined

    // If categorySlug provided, look up the category
    if (categorySlug) {
      const category = getCategoryBySlug(categorySlug)
      if (category) {
        parentCategoryId = category.id
      }
    } else if (categoryId) {
      parentCategoryId = categoryId
    }

    const subcategories = getSubcategories(parentCategoryId)

    return NextResponse.json({
      subcategories,
      count: subcategories.length,
    })
  } catch (error) {
    console.error("Error fetching subcategories:", error)
    return NextResponse.json(
      { error: "Failed to fetch subcategories" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { parent_category_id, name, slug, description, icon, sort_order } =
      body

    if (!parent_category_id || !name || !slug) {
      return NextResponse.json(
        { error: "parent_category_id, name, and slug are required" },
        { status: 400 }
      )
    }

    const subcategory = createSubcategory({
      parent_category_id,
      name,
      slug,
      description,
      icon,
      sort_order,
    })

    return NextResponse.json({ subcategory, success: true }, { status: 201 })
  } catch (error) {
    console.error("Error creating subcategory:", error)
    return NextResponse.json(
      { error: "Failed to create subcategory" },
      { status: 500 }
    )
  }
}
