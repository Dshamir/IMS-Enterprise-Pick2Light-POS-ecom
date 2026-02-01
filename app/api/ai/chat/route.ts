import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/database/sqlite"
import { aiProviderFactory } from "@/lib/ai/ai-provider-factory"
import { queryIntentDetector } from "@/lib/ai/query-intent-detector"
import { databaseQueryExecutor } from "@/lib/ai/database-query-executor"
import { usageLogger } from "@/lib/ai/usage-logger"
import { v4 as uuidv4 } from "uuid"

// POST /api/ai/chat - Send message to AI system
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      message,
      agent_id,
      session_id
    } = body

    // Validation
    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    const db = getDatabase()
    
    // If no agent specified, use the first active agent
    let targetAgentId = agent_id
    if (!targetAgentId) {
      const defaultAgent = db.prepare(`
        SELECT id FROM ai_agents 
        WHERE is_active = 1 
        ORDER BY created_at ASC 
        LIMIT 1
      `).get() as any
      
      if (!defaultAgent) {
        return NextResponse.json(
          { error: "No active AI agents available" },
          { status: 400 }
        )
      }
      
      targetAgentId = defaultAgent.id
    }

    // Generate session ID if not provided
    const conversationSessionId = session_id || `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    
    // Get conversation history
    let conversationHistory: any[] = []
    if (session_id) {
      const conversation = db.prepare(`
        SELECT messages FROM ai_conversations WHERE session_id = ?
      `).get(session_id) as any
      
      if (conversation && conversation.messages) {
        try {
          conversationHistory = JSON.parse(conversation.messages)
        } catch (error) {
          console.warn('Failed to parse conversation history:', error)
        }
      }
    }

    const startTime = Date.now()
    
    // Phase 3: Query Intent Detection and Pre-processing
    const queryIntent = queryIntentDetector.detectIntent(message.trim())
    console.log('Query Intent Analysis:', {
      query: message.trim(),
      intent: queryIntent
    })
    
    // Check if we can handle this query directly with high confidence
    if (queryIntent.confidence >= 0.85 && queryIntentDetector.isDataRequest(message.trim())) {
      console.log('High confidence query - attempting direct execution')
      
      // Generate function call based on intent
      const functionCall = queryIntentDetector.generateFunctionCall(queryIntent)
      
      // Try direct execution
      const directResult = await databaseQueryExecutor.parseAndExecute(functionCall)
      
      if (directResult.hasFunction && !directResult.error) {
        console.log('Direct execution successful')
        
        const duration = Date.now() - startTime
        
        // Enhanced validation of direct results
        if (!directResult.formattedResponse || directResult.formattedResponse.trim().length === 0) {
          console.log('Direct execution returned empty result, falling back to AI agent')
          // Continue to AI agent processing below
        } else {
        
        // Log usage for direct execution
        try {
          const agent = db.prepare(`
            SELECT provider_id FROM ai_agents WHERE id = ?
          `).get(targetAgentId) as any

          if (agent) {
            await usageLogger.logFromResponse(
              agent.provider_id,
              targetAgentId,
              undefined, // No model for direct DB query
              { total_tokens: 0 }, // No AI tokens used
              duration,
              'direct_database_query',
              message.trim(),
              true
            )
          }
        } catch (error) {
          console.warn('Failed to log direct execution usage:', error)
        }
        
        return NextResponse.json({
          success: true,
          response: directResult.formattedResponse,
          session_id: conversationSessionId,
          agent_id: targetAgentId,
          usage: { total_tokens: 0, direct_execution: true },
          response_time_ms: duration,
          query_intent: queryIntent,
          execution_method: 'direct_database_query'
        })
        }
      } else {
        console.log('Direct execution failed, falling back to AI agent:', directResult.error)
        
        // Enhanced error logging for troubleshooting
        if (directResult.error) {
          console.error('Direct execution error details:', {
            query: message.trim(),
            intent: queryIntent,
            functionCall,
            error: directResult.error,
            timestamp: new Date().toISOString()
          })
        }
      }
    }
    
    // Optimize agent selection based on intent
    let selectedAgentId = targetAgentId
    if (queryIntent.suggestedAgent && queryIntent.confidence >= 0.7) {
      // Try to find the suggested agent
      const suggestedAgent = db.prepare(`
        SELECT id FROM ai_agents 
        WHERE name = ? AND is_active = 1 
        LIMIT 1
      `).get(queryIntent.suggestedAgent) as any
      
      if (suggestedAgent) {
        selectedAgentId = suggestedAgent.id
        console.log(`Switched to optimized agent: ${queryIntent.suggestedAgent}`)
      }
    }
    
    // Enhanced message for AI with intent context
    let enhancedMessage = message.trim()
    if (queryIntent.confidence >= 0.7) {
      enhancedMessage = `${message.trim()}

QUERY INTENT DETECTED: ${queryIntent.type}
SUGGESTED FUNCTION: EXECUTE_FUNCTION: ${queryIntent.suggestedFunction}(${queryIntent.parameters ? Object.values(queryIntent.parameters).map(v => typeof v === 'string' ? `"${v}"` : v).join(', ') : ''})
CONFIDENCE: ${(queryIntent.confidence * 100).toFixed(1)}%

Please execute the suggested function to provide accurate data.`
    }
    
    // Send message to AI agent
    const aiResponse = await aiProviderFactory.sendMessageToAgent(
      selectedAgentId,
      enhancedMessage,
      conversationHistory
    )
    
    const duration = Date.now() - startTime
    
    if (!aiResponse.success) {
      // Enhanced fallback system for AI failures
      console.error('AI agent failed, attempting fallback options:', {
        selectedAgentId,
        originalAgentId: targetAgentId,
        queryIntent,
        error: aiResponse.error
      })
      
      // Try fallback functions from intent detection
      if (queryIntent.fallbackFunctions && queryIntent.fallbackFunctions.length > 0) {
        console.log('Attempting fallback function execution...')
        
        for (const fallbackFunction of queryIntent.fallbackFunctions) {
          try {
            const fallbackCall = `EXECUTE_FUNCTION: ${fallbackFunction}()`
            const fallbackResult = await databaseQueryExecutor.parseAndExecute(fallbackCall)
            
            if (fallbackResult.hasFunction && !fallbackResult.error && fallbackResult.formattedResponse) {
              console.log(`Fallback function ${fallbackFunction} succeeded`)
              
              // Get agent name for better error messaging
              const agentInfo = db.prepare(`
                SELECT name FROM ai_agents WHERE id = ?
              `).get(selectedAgentId) as any
              const agentName = agentInfo?.name || 'AI Assistant'
              
              // Create intelligent fallback response with repair guidance
              const intelligentResponse = `${fallbackResult.formattedResponse}

⚠️ **Note:** The ${agentName} agent appears to be having issues. You can check and repair agent settings here: [AI Assistant Settings](/ai-assistant/settings)`
              
              return NextResponse.json({
                success: true,
                response: intelligentResponse,
                session_id: conversationSessionId,
                agent_id: selectedAgentId,
                usage: { total_tokens: 0, fallback_execution: true },
                response_time_ms: Date.now() - startTime,
                query_intent: queryIntent,
                execution_method: 'fallback_database_query',
                fallback_function: fallbackFunction
              })
            }
          } catch (fallbackError) {
            console.warn(`Fallback function ${fallbackFunction} failed:`, fallbackError)
          }
        }
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: aiResponse.error || "Failed to get AI response",
          query_intent: queryIntent,
          fallback_attempted: queryIntent.fallbackFunctions?.length > 0
        },
        { status: 500 }
      )
    }

    // Update conversation history
    const userMessage = {
      id: uuidv4(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString(),
      agent_id: targetAgentId
    }
    
    const assistantMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: aiResponse.response || '',
      timestamp: new Date().toISOString(),
      agent_id: targetAgentId
    }
    
    const updatedHistory = [
      ...conversationHistory,
      userMessage,
      assistantMessage
    ]

    // Save conversation
    try {
      if (session_id) {
        // Update existing conversation
        db.prepare(`
          UPDATE ai_conversations 
          SET messages = ?, updated_at = datetime('now')
          WHERE session_id = ?
        `).run(JSON.stringify(updatedHistory), session_id)
      } else {
        // Create new conversation
        db.prepare(`
          INSERT INTO ai_conversations (session_id, messages, created_at, updated_at)
          VALUES (?, ?, datetime('now'), datetime('now'))
        `).run(conversationSessionId, JSON.stringify(updatedHistory))
      }
    } catch (error) {
      console.warn('Failed to save conversation:', error)
    }

    // Log usage
    try {
      const agent = db.prepare(`
        SELECT provider_id, model FROM ai_agents WHERE id = ?
      `).get(selectedAgentId) as any

      if (agent) {
        await usageLogger.logFromResponse(
          agent.provider_id,
          selectedAgentId,
          agent.model,
          aiResponse.usage,
          duration,
          'chat',
          message.trim(),
          aiResponse.success,
          aiResponse.success ? undefined : 'ai_response_failed'
        )
      }
    } catch (error) {
      console.warn('Failed to log usage:', error)
    }

    // Include query suggestions for low confidence queries
    let querySuggestions: string[] = []
    if (queryIntent.confidence < 0.7) {
      querySuggestions = queryIntentDetector.suggestAlternatives(message.trim(), queryIntent)
    }

    return NextResponse.json({
      success: true,
      response: aiResponse.response,
      session_id: conversationSessionId,
      agent_id: selectedAgentId,
      usage: aiResponse.usage,
      response_time_ms: duration,
      query_intent: queryIntent,
      query_suggestions: querySuggestions,
      execution_method: 'ai_agent_with_intent_routing'
    })
  } catch (error) {
    console.error("Error in AI chat:", error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Chat request failed" 
      },
      { status: 500 }
    )
  }
}