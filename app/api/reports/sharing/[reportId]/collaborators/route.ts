import { NextRequest, NextResponse } from 'next/server'

// Mock collaborators storage
let collaborators: { [reportId: string]: any[] } = {}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params
    
    // Mock collaborators data
    const reportCollaborators = collaborators[reportId] || [
      {
        id: 'collab_1',
        email: 'john.doe@example.com',
        name: 'John Doe',
        avatar: '',
        role: 'editor',
        joinedAt: new Date('2024-01-15'),
        lastActive: new Date('2024-01-20'),
        status: 'active'
      },
      {
        id: 'collab_2',
        email: 'jane.smith@example.com',
        name: 'Jane Smith',
        avatar: '',
        role: 'viewer',
        joinedAt: new Date('2024-01-18'),
        lastActive: new Date('2024-01-19'),
        status: 'active'
      },
      {
        id: 'collab_3',
        email: 'bob.wilson@example.com',
        name: 'Bob Wilson',
        avatar: '',
        role: 'viewer',
        joinedAt: new Date('2024-01-20'),
        status: 'pending'
      }
    ]
    
    return NextResponse.json({
      success: true,
      collaborators: reportCollaborators
    })
  } catch (error) {
    console.error('Error fetching collaborators:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch collaborators'
    }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params
    const { email, role } = await request.json()
    
    if (!email || !role) {
      return NextResponse.json({
        success: false,
        error: 'Email and role are required'
      }, { status: 400 })
    }
    
    const newCollaborator = {
      id: `collab_${Date.now()}`,
      email,
      name: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      avatar: '',
      role,
      joinedAt: new Date(),
      status: 'pending'
    }
    
    if (!collaborators[reportId]) {
      collaborators[reportId] = []
    }
    
    collaborators[reportId].push(newCollaborator)
    
    return NextResponse.json({
      success: true,
      collaborator: newCollaborator
    })
  } catch (error) {
    console.error('Error adding collaborator:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to add collaborator'
    }, { status: 500 })
  }
}