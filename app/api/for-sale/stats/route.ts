import { NextResponse } from "next/server"
import { getStats } from "@/lib/services/forsale-service"

export async function GET() {
  try {
    const stats = getStats()

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching For Sale stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}
