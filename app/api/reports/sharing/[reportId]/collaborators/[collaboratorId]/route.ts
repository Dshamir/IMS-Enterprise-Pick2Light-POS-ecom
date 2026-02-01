import { NextRequest, NextResponse } from 'next/server'

// Mock collaborators storage
let collaborators: { [reportId: string]: any[] } = {}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string; collaboratorId: string }> }
) {
  try {
    const { reportId, collaboratorId } = await params
    const { role } = await request.json()
    
    if (!collaborators[reportId]) {
      return NextResponse.json({
        success: false,
        error: 'Report not found'
      }, { status: 404 })
    }
    
    const collaboratorIndex = collaborators[reportId].findIndex(c => c.id === collaboratorId)
    if (collaboratorIndex === -1) {
      return NextResponse.json({
        success: false,
        error: 'Collaborator not found'
      }, { status: 404 })
    }
    
    collaborators[reportId][collaboratorIndex].role = role
    
    return NextResponse.json({
      success: true,
      collaborator: collaborators[reportId][collaboratorIndex]
    })
  } catch (error) {
    console.error('Error updating collaborator:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update collaborator'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string; collaboratorId: string }> }
) {
  try {
    const { reportId, collaboratorId } = await params
    
    if (!collaborators[reportId]) {
      return NextResponse.json({
        success: false,
        error: 'Report not found'
      }, { status: 404 })
    }
    
    collaborators[reportId] = collaborators[reportId].filter(c => c.id !== collaboratorId)
    
    return NextResponse.json({
      success: true,
      message: 'Collaborator removed successfully'
    })
  } catch (error) {
    console.error('Error removing collaborator:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to remove collaborator'
    }, { status: 500 })
  }
}