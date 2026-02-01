/**
 * Document Categories API
 *
 * GET: List all document categories
 * POST: Create a new document category
 */

import { NextResponse } from 'next/server'
import {
  getDocumentCategories,
  createCategory,
} from '@/lib/knowledge-base/document-database'

export async function GET() {
  try {
    const categories = getDocumentCategories()

    return NextResponse.json({
      categories,
      total: categories.length,
    })

  } catch (error: any) {
    console.error('Error getting categories:', error)
    return NextResponse.json(
      { error: 'Failed to get categories' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      )
    }

    // Generate slug from name if not provided
    const slug = body.slug || body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const category = createCategory({
      name: body.name.trim(),
      slug,
      description: body.description?.trim(),
      parent_id: body.parent_id,
      icon: body.icon,
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Failed to create category. Name or slug may already exist.' },
        { status: 409 }
      )
    }

    return NextResponse.json({
      success: true,
      category,
    })

  } catch (error: any) {
    console.error('Error creating category:', error)

    // Check for unique constraint violation
    if (error.message?.includes('UNIQUE constraint')) {
      return NextResponse.json(
        { error: 'A category with this name or slug already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create category' },
      { status: 500 }
    )
  }
}
