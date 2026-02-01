import { NextRequest, NextResponse } from 'next/server'

// Mock comments storage
let comments: { [reportId: string]: any[] } = {}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params
    
    // Mock comments data
    const reportComments = comments[reportId] || [
      {
        id: 'comment_1',
        reportId,
        userId: 'user_1',
        userName: 'John Doe',
        userAvatar: '',
        content: 'Great insights! The inventory analysis section is particularly useful.',
        x: null,
        y: null,
        resolved: false,
        replies: [],
        createdAt: new Date('2024-01-20T10:30:00'),
        updatedAt: new Date('2024-01-20T10:30:00')
      },
      {
        id: 'comment_2',
        reportId,
        userId: 'user_2',
        userName: 'Jane Smith',
        userAvatar: '',
        content: 'Could we add a chart showing monthly trends? That would help with forecasting.',
        x: null,
        y: null,
        resolved: false,
        replies: [
          {
            id: 'reply_1',
            reportId,
            userId: 'user_3',
            userName: 'Bob Wilson',
            userAvatar: '',
            content: 'I agree, that would be very helpful for planning.',
            x: null,
            y: null,
            resolved: false,
            replies: [],
            createdAt: new Date('2024-01-20T11:15:00'),
            updatedAt: new Date('2024-01-20T11:15:00')
          }
        ],
        createdAt: new Date('2024-01-20T11:00:00'),
        updatedAt: new Date('2024-01-20T11:00:00')
      },
      {
        id: 'comment_3',
        reportId,
        userId: 'user_4',
        userName: 'Alice Johnson',
        userAvatar: '',
        content: 'The data looks accurate. I verified it against our internal records.',
        x: null,
        y: null,
        resolved: true,
        replies: [],
        createdAt: new Date('2024-01-20T14:30:00'),
        updatedAt: new Date('2024-01-20T14:30:00')
      }
    ]
    
    return NextResponse.json({
      success: true,
      comments: reportComments
    })
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch comments'
    }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params
    const { content, userId, userName, x, y } = await request.json()
    
    if (!content || !userId || !userName) {
      return NextResponse.json({
        success: false,
        error: 'Content, userId, and userName are required'
      }, { status: 400 })
    }
    
    const newComment = {
      id: `comment_${Date.now()}`,
      reportId,
      userId,
      userName,
      userAvatar: '',
      content,
      x: x || null,
      y: y || null,
      resolved: false,
      replies: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    if (!comments[reportId]) {
      comments[reportId] = []
    }
    
    comments[reportId].push(newComment)
    
    return NextResponse.json({
      success: true,
      comment: newComment
    })
  } catch (error) {
    console.error('Error adding comment:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to add comment'
    }, { status: 500 })
  }
}