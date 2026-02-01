import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/database/sqlite"

// GET /api/debug/ai-providers - Debug AI providers in database
export async function GET() {
  try {
    const db = getDatabase()
    
    const providers = db.prepare(`
      SELECT COUNT(*) as count, name, display_name 
      FROM ai_providers 
      GROUP BY name, display_name
      ORDER BY name
    `).all()

    const totalCount = db.prepare(`
      SELECT COUNT(*) as total FROM ai_providers
    `).get() as { total: number }

    const allProviders = db.prepare(`
      SELECT * FROM ai_providers ORDER BY created_at
    `).all()

    return NextResponse.json({ 
      grouped_providers: providers,
      total_count: totalCount.total,
      all_providers: allProviders
    })
  } catch (error) {
    console.error("Error debugging AI providers:", error)
    return NextResponse.json(
      { error: "Failed to debug AI providers" },
      { status: 500 }
    )
  }
}