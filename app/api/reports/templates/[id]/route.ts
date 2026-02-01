import { NextRequest, NextResponse } from 'next/server'

// Mock template storage - in a real app, this would be stored in a database
// This should be shared with the main templates route, but for simplicity we'll import it
let templates: any[] = []

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: templateId } = await params
    
    const index = templates.findIndex(t => t.id === templateId)
    if (index === -1) {
      return NextResponse.json({
        success: false,
        error: 'Template not found'
      }, { status: 404 })
    }
    
    // Remove template from array
    templates.splice(index, 1)
    
    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete template'
    }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: templateId } = await params
    
    const template = templates.find(t => t.id === templateId)
    if (!template) {
      return NextResponse.json({
        success: false,
        error: 'Template not found'
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      template
    })
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch template'
    }, { status: 500 })
  }
}