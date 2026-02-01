/**
 * Agent Chat API
 * POST: Chat with a specific agent
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAgentById, executeAgent, saveAgentConversation, AgentMessage } from '@/lib/ai/custom-agent-executor'

export const dynamic = 'force-dynamic'

interface ChatRequest {
  messages: AgentMessage[]
  conversationId?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body: ChatRequest = await request.json()
    const { messages, conversationId } = body

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Messages array is required' },
        { status: 400 }
      )
    }

    // Get agent
    const agent = getAgentById(id)
    if (!agent) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Execute agent
    const result = await executeAgent(agent, messages)

    // Save conversation
    const allMessages = [...messages, result.message]
    const savedConvId = saveAgentConversation(id, allMessages, conversationId)

    return NextResponse.json({
      success: true,
      message: result.message,
      toolsUsed: result.toolsUsed,
      kbResults: result.kbResults,
      inventoryResults: result.inventoryResults,
      conversationId: savedConvId
    })

  } catch (error) {
    console.error('Agent chat error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Chat failed' },
      { status: 500 }
    )
  }
}
