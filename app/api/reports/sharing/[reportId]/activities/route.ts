import { NextRequest, NextResponse } from 'next/server'

// Mock activities storage
let activities: { [reportId: string]: any[] } = {}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params
    
    // Mock activities data
    const reportActivities = activities[reportId] || [
      {
        id: 'activity_1',
        reportId,
        userId: 'user_1',
        userName: 'John Doe',
        action: 'viewed',
        details: 'opened the report',
        timestamp: new Date('2024-01-20T09:00:00')
      },
      {
        id: 'activity_2',
        reportId,
        userId: 'user_2',
        userName: 'Jane Smith',
        action: 'commented',
        details: 'added a comment about monthly trends',
        timestamp: new Date('2024-01-20T11:00:00')
      },
      {
        id: 'activity_3',
        reportId,
        userId: 'user_1',
        userName: 'John Doe',
        action: 'edited',
        details: 'updated the inventory analysis section',
        timestamp: new Date('2024-01-20T13:30:00')
      },
      {
        id: 'activity_4',
        reportId,
        userId: 'user_3',
        userName: 'Bob Wilson',
        action: 'exported',
        details: 'downloaded report as PDF',
        timestamp: new Date('2024-01-20T14:00:00')
      },
      {
        id: 'activity_5',
        reportId,
        userId: 'user_4',
        userName: 'Alice Johnson',
        action: 'starred',
        details: 'bookmarked this report',
        timestamp: new Date('2024-01-20T14:30:00')
      },
      {
        id: 'activity_6',
        reportId,
        userId: 'user_2',
        userName: 'Jane Smith',
        action: 'shared',
        details: 'shared report with marketing team',
        timestamp: new Date('2024-01-20T15:00:00')
      }
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    
    return NextResponse.json({
      success: true,
      activities: reportActivities
    })
  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch activities'
    }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params
    const { userId, userName, action, details } = await request.json()
    
    if (!userId || !userName || !action || !details) {
      return NextResponse.json({
        success: false,
        error: 'All fields are required'
      }, { status: 400 })
    }
    
    const newActivity = {
      id: `activity_${Date.now()}`,
      reportId,
      userId,
      userName,
      action,
      details,
      timestamp: new Date()
    }
    
    if (!activities[reportId]) {
      activities[reportId] = []
    }
    
    activities[reportId].unshift(newActivity) // Add to beginning for chronological order
    
    return NextResponse.json({
      success: true,
      activity: newActivity
    })
  } catch (error) {
    console.error('Error adding activity:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to add activity'
    }, { status: 500 })
  }
}