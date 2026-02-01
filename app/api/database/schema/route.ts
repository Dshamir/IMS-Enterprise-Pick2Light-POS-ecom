import { NextResponse } from 'next/server'
import { exportDatabaseSchema } from '@/app/actions/database'

export async function GET() {
  try {
    const result = await exportDatabaseSchema()
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to export schema' },
        { status: 500 }
      )
    }
    
    if (!result.schema) {
      return NextResponse.json(
        { error: 'No schema data returned' },
        { status: 500 }
      )
    }
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `database-schema-${timestamp}.sql`
    
    // Return the schema as a downloadable file
    return new NextResponse(result.schema, {
      headers: {
        'Content-Type': 'application/sql',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error: any) {
    console.error('Error in schema export API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}