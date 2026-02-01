import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

export async function GET() {
  try {
    const categories = sqliteHelpers.getAllCategories()
    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {  
    const { name } = await request.json()

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      )
    }

    // Validate category name
    const trimmedName = name.trim().toLowerCase()
    if (trimmedName.length === 0) {
      return NextResponse.json(
        { error: 'Category name cannot be empty' },
        { status: 400 }
      )
    }

    if (trimmedName.length > 50) {
      return NextResponse.json(
        { error: 'Category name must be 50 characters or less' },
        { status: 400 }
      )
    }

    // Check if category already exists
    const existingCategory = sqliteHelpers.getCategoryByName(trimmedName)
    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category already exists' },
        { status: 409 }
      )
    }

    // Create the category
    const result = sqliteHelpers.createCategory(trimmedName)
    
    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Failed to create category' },
        { status: 500 }
      )
    }

    // Fetch the created category
    const newCategory = sqliteHelpers.getCategoryByName(trimmedName)
    
    return NextResponse.json({ 
      message: 'Category created successfully',
      category: newCategory
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    )
  }
}