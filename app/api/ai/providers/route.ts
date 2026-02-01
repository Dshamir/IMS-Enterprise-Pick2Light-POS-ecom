import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/database/sqlite"
import { encryptApiKey } from "@/lib/crypto/encryption"

// GET /api/ai/providers - List all configured providers
export async function GET() {
  try {
    const db = getDatabase()
    
    const providers = db.prepare(`
      SELECT 
        id,
        name,
        display_name,
        api_endpoint,
        default_model,
        default_temperature,
        default_max_tokens,
        is_active,
        settings,
        created_at,
        updated_at,
        CASE WHEN api_key_encrypted IS NOT NULL THEN 1 ELSE 0 END as has_api_key
      FROM ai_providers 
      ORDER BY display_name
    `).all()

    return NextResponse.json({ providers })
  } catch (error) {
    console.error("Error fetching AI providers:", error)
    return NextResponse.json(
      { error: "Failed to fetch AI providers" },
      { status: 500 }
    )
  }
}

// POST /api/ai/providers - Add new provider configuration
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      name,
      display_name,
      api_key,
      api_endpoint,
      default_model,
      default_temperature = 0.7,
      default_max_tokens = 1000,
      is_active = false,
      settings = {}
    } = body

    // Basic validation
    if (!name || !display_name || !api_key) {
      return NextResponse.json(
        { error: "Missing required fields: name, display_name, api_key" },
        { status: 400 }
      )
    }

    const db = getDatabase()
    
    // Encrypt the API key using proper encryption
    const encrypted_api_key = encryptApiKey(api_key)
    
    // Check if provider already exists
    const existingProvider = db.prepare(`
      SELECT id FROM ai_providers WHERE name = ?
    `).get(name) as any
    
    let result: any
    let providerId: string
    
    if (existingProvider) {
      // Update existing provider
      result = db.prepare(`
        UPDATE ai_providers SET
          display_name = ?,
          api_key_encrypted = ?,
          api_endpoint = ?,
          default_model = ?,
          default_temperature = ?,
          default_max_tokens = ?,
          is_active = ?,
          settings = ?,
          updated_at = datetime('now')
        WHERE name = ?
      `).run(
        display_name,
        encrypted_api_key,
        api_endpoint || null,
        default_model,
        default_temperature,
        default_max_tokens,
        is_active ? 1 : 0,
        JSON.stringify(settings),
        name
      )
      providerId = existingProvider.id
    } else {
      // Insert new provider
      result = db.prepare(`
        INSERT INTO ai_providers (
          name, display_name, api_key_encrypted, api_endpoint, 
          default_model, default_temperature, default_max_tokens, 
          is_active, settings
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        name,
        display_name,
        encrypted_api_key,
        api_endpoint || null,
        default_model,
        default_temperature,
        default_max_tokens,
        is_active ? 1 : 0,
        JSON.stringify(settings)
      )
      providerId = result.lastInsertRowid.toString()
    }

    return NextResponse.json({ 
      success: true, 
      id: providerId,
      message: existingProvider ? "AI provider updated successfully" : "AI provider created successfully"
    })
  } catch (error) {
    console.error("Error creating AI provider:", error)
    return NextResponse.json(
      { error: "Failed to create AI provider" },
      { status: 500 }
    )
  }
}