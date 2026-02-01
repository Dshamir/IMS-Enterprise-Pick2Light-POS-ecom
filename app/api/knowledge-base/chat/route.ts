/**
 * Knowledge Base Chat API
 * POST: Send a message and get a response
 */

import { NextRequest, NextResponse } from 'next/server'
import { chat, ChatMessage, ChatOptions, generateTitle } from '@/lib/ai/kb-chat-engine'
import { getDatabase } from '@/lib/database/sqlite'

export const dynamic = 'force-dynamic'

interface ChatRequest {
  messages: ChatMessage[]
  conversationId?: string
  options?: ChatOptions
  generateTitleFromFirst?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { messages, conversationId, options = {}, generateTitleFromFirst = false } = body

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Messages array is required' },
        { status: 400 }
      )
    }

    // Chat with KB context
    const response = await chat(messages, options)

    // Optionally generate a title from the first message
    let title: string | undefined
    if (generateTitleFromFirst && messages.length === 1) {
      title = await generateTitle(messages[0].content)
    }

    // Save to conversation history if conversationId provided
    if (conversationId) {
      try {
        const db = getDatabase()
        if (db) {
          const existingConversation = db.prepare(
            'SELECT id, messages FROM ai_conversations WHERE id = ?'
          ).get(conversationId) as { id: string; messages: string } | undefined

          const allMessages = existingConversation
            ? [...JSON.parse(existingConversation.messages), ...messages, response.message]
            : [...messages, response.message]

          if (existingConversation) {
            db.prepare(`
              UPDATE ai_conversations
              SET messages = ?,
                  model_used = ?,
                  kb_context_used = ?,
                  tools_used = ?,
                  updated_at = datetime('now')
              WHERE id = ?
            `).run(
              JSON.stringify(allMessages),
              options.modelId || 'gpt-4o',
              response.kbSearchResults && response.kbSearchResults.length > 0 ? 1 : 0,
              response.toolsInvoked ? JSON.stringify(response.toolsInvoked) : null,
              conversationId
            )
          } else {
            db.prepare(`
              INSERT INTO ai_conversations (id, title, messages, model_used, kb_context_used, tools_used, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            `).run(
              conversationId,
              title || 'New Conversation',
              JSON.stringify(allMessages),
              options.modelId || 'gpt-4o',
              response.kbSearchResults && response.kbSearchResults.length > 0 ? 1 : 0,
              response.toolsInvoked ? JSON.stringify(response.toolsInvoked) : null
            )
          }
        }
      } catch (dbError) {
        console.error('Error saving conversation:', dbError)
        // Continue without saving - don't fail the response
      }
    }

    return NextResponse.json({
      success: true,
      message: response.message,
      kbSearchResults: response.kbSearchResults,
      tokensUsed: response.tokensUsed,
      toolsInvoked: response.toolsInvoked,
      title,
      conversationId
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Chat failed' },
      { status: 500 }
    )
  }
}
