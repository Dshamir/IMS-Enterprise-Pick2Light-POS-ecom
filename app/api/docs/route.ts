import { NextRequest, NextResponse } from 'next/server'
import { getDocumentationIndex, searchDocumentation, parseMarkdownFile } from '@/lib/docs-parser'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const slug = searchParams.get('slug')

    // Handle specific document request
    if (slug) {
      const filePath = slug.replace(/--/g, '/') + '.md'
      const doc = parseMarkdownFile(filePath)
      
      if (!doc) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        )
      }
      
      return NextResponse.json({ doc })
    }

    // Handle search request
    if (query) {
      const results = searchDocumentation(query)
      return NextResponse.json({ 
        results,
        query,
        count: results.length
      })
    }

    // Return documentation index
    const categories = getDocumentationIndex()
    const totalDocs = categories.reduce((sum, cat) => sum + cat.count, 0)
    
    return NextResponse.json({ 
      categories,
      totalDocs,
      categoriesCount: categories.length
    })
    
  } catch (error) {
    console.error('Error fetching documentation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documentation' },
      { status: 500 }
    )
  }
}