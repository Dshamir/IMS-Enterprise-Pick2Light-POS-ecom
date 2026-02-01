import { NextRequest, NextResponse } from 'next/server'

// Mock data storage - in a real app, this would be stored in a database
let shareSettings: any = {}
let collaborators: any[] = []
let comments: any[] = []
let activities: any[] = []

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params
    
    // Mock share settings
    const settings = shareSettings[reportId] || {
      id: `share_${reportId}`,
      reportId,
      reportName: 'Sample Report',
      shareType: 'private',
      permissions: {
        view: true,
        edit: false,
        comment: true,
        export: false,
        share: false
      },
      collaborators: [],
      allowComments: true,
      allowAnnotations: true,
      trackViews: true,
      shareUrl: `https://app.example.com/reports/shared/${reportId}?token=abc123`,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    return NextResponse.json({
      success: true,
      settings
    })
  } catch (error) {
    console.error('Error fetching share settings:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch share settings'
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params
    const settings = await request.json()
    
    // Update settings
    shareSettings[reportId] = {
      ...settings,
      updatedAt: new Date()
    }
    
    // Log activity
    activities.push({
      id: `activity_${Date.now()}`,
      reportId,
      userId: 'current-user',
      userName: 'Current User',
      action: 'edited',
      details: 'updated sharing settings',
      timestamp: new Date()
    })
    
    return NextResponse.json({
      success: true,
      settings: shareSettings[reportId]
    })
  } catch (error) {
    console.error('Error updating share settings:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update share settings'
    }, { status: 500 })
  }
}