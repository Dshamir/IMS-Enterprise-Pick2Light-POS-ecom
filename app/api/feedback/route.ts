import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { product_id, search_image_hash, feedback_type, notes } = await request.json()

    if (!product_id || !feedback_type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Store the feedback with the search image hash for reference
    // but we'll filter based on product_id regardless of search image
    const { error } = await supabase.from("search_feedback").insert([
      {
        product_id,
        search_image_hash: search_image_hash || null,
        feedback_type,
        notes: notes || null,
      },
    ])

    if (error) {
      console.error("Error storing feedback:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error storing feedback:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

