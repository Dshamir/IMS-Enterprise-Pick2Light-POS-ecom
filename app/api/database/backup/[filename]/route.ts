import { NextRequest, NextResponse } from "next/server"
import path from "path"
import fs from "fs/promises"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params
    
    if (!filename || !filename.endsWith('.db')) {
      return NextResponse.json(
        { error: "Invalid filename" },
        { status: 400 }
      )
    }

    const backupDir = path.join(process.cwd(), 'data', 'backups')
    const backupPath = path.join(backupDir, filename)
    
    // Check if file exists
    try {
      await fs.access(backupPath)
    } catch (error) {
      return NextResponse.json(
        { error: "Backup file not found" },
        { status: 404 }
      )
    }
    
    // Read the backup file
    const data = await fs.readFile(backupPath)
    
    // Return the file as a download
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-sqlite3',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': data.length.toString(),
      },
    })
  } catch (error: any) {
    console.error("Error downloading backup:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}