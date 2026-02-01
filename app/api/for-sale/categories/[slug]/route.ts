import { NextResponse } from "next/server"
import {
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
} from "@/lib/services/forsale-service"

interface Props {
  params: Promise<{ slug: string }>
}

export async function GET(request: Request, { params }: Props) {
  try {
    const { slug } = await params
    const category = getCategoryBySlug(slug)

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    return NextResponse.json({ category })
  } catch (error) {
    console.error("Error fetching category:", error)
    return NextResponse.json(
      { error: "Failed to fetch category" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request, { params }: Props) {
  try {
    const { slug } = await params
    const category = getCategoryBySlug(slug)

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    const body = await request.json()
    const updated = updateCategory(category.id, body)

    return NextResponse.json({ category: updated, success: true })
  } catch (error) {
    console.error("Error updating category:", error)
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: Props) {
  try {
    const { slug } = await params
    const category = getCategoryBySlug(slug)

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    const deleted = deleteCategory(category.id)

    if (!deleted) {
      return NextResponse.json(
        { error: "Failed to delete category" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting category:", error)
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    )
  }
}
