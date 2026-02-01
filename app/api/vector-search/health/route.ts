import { NextResponse } from "next/server"
import { checkVectorSearchHealth } from "@/lib/vector-search-manager"

export async function GET() {
  try {
    const health = await checkVectorSearchHealth()
    
    return NextResponse.json({
      ...health,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("Error checking vector search health:", error)
    return NextResponse.json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}