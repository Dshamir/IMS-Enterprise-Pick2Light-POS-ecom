import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params
    
    // Generate a secure share URL
    const shareToken = generateShareToken()
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reports/shared/${reportId}?token=${shareToken}`
    
    return NextResponse.json({
      success: true,
      url: shareUrl,
      token: shareToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    })
  } catch (error) {
    console.error('Error generating share URL:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to generate share URL'
    }, { status: 500 })
  }
}

function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}