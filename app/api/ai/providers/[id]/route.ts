import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/database/sqlite"
import { aiProviderFactory } from "@/lib/ai/ai-provider-factory"

// PUT /api/ai/providers/:id - Update provider configuration
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: providerId } = await params
    const body = await request.json()
    const {
      display_name,
      api_key,
      api_endpoint,
      default_model,
      default_temperature,
      default_max_tokens,
      is_active,
      settings
    } = body

    const db = getDatabase()
    
    // Build update query dynamically based on provided fields
    const updates: string[] = []
    const values: any[] = []
    
    if (display_name !== undefined) {
      updates.push('display_name = ?')
      values.push(display_name)
    }
    
    if (api_key !== undefined) {
      updates.push('api_key_encrypted = ?')
      // Simple encryption (enhance for production)
      values.push(Buffer.from(api_key).toString('base64'))
    }
    
    if (api_endpoint !== undefined) {
      updates.push('api_endpoint = ?')
      values.push(api_endpoint)
    }
    
    if (default_model !== undefined) {
      updates.push('default_model = ?')
      values.push(default_model)
    }
    
    if (default_temperature !== undefined) {
      updates.push('default_temperature = ?')
      values.push(default_temperature)
    }
    
    if (default_max_tokens !== undefined) {
      updates.push('default_max_tokens = ?')
      values.push(default_max_tokens)
    }
    
    if (is_active !== undefined) {
      updates.push('is_active = ?')
      values.push(is_active ? 1 : 0)
    }
    
    if (settings !== undefined) {
      updates.push('settings = ?')
      values.push(JSON.stringify(settings))
    }
    
    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      )
    }
    
    updates.push('updated_at = datetime(\'now\')')
    values.push(providerId)
    
    const query = `UPDATE ai_providers SET ${updates.join(', ')} WHERE id = ?`
    const result = db.prepare(query).run(...values)
    
    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      )
    }
    
    // Clear provider cache since configuration changed
    aiProviderFactory.clearCache(providerId)
    
    return NextResponse.json({
      success: true,
      message: "Provider updated successfully"
    })
  } catch (error) {
    console.error("Error updating AI provider:", error)
    return NextResponse.json(
      { error: "Failed to update provider" },
      { status: 500 }
    )
  }
}

// DELETE /api/ai/providers/:id - Delete provider
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: providerId } = await params
    const db = getDatabase()
    
    // Check if provider is being used by any agents
    const agentCount = db.prepare(`
      SELECT COUNT(*) as count FROM ai_agents WHERE provider_id = ?
    `).get(providerId) as { count: number }
    
    if (agentCount.count > 0) {
      return NextResponse.json(
        { 
          error: "Cannot delete provider that is being used by agents",
          agents_using: agentCount.count 
        },
        { status: 400 }
      )
    }
    
    const result = db.prepare(`DELETE FROM ai_providers WHERE id = ?`).run(providerId)
    
    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      )
    }
    
    // Clear provider cache
    aiProviderFactory.clearCache(providerId)
    
    return NextResponse.json({
      success: true,
      message: "Provider deleted successfully"
    })
  } catch (error) {
    console.error("Error deleting AI provider:", error)
    return NextResponse.json(
      { error: "Failed to delete provider" },
      { status: 500 }
    )
  }
}