// Query Execution Indicator - Shows how AI queries are being processed
import { Badge } from "@/components/ui/badge"
import { Database, Bot, Zap, AlertCircle } from "lucide-react"

interface QueryExecutionIndicatorProps {
  executionMethod?: string
  queryIntent?: {
    type: string
    confidence: number
    suggestedAgent?: string
  }
  responseTime?: number
  showDetails?: boolean
}

export function QueryExecutionIndicator({ 
  executionMethod, 
  queryIntent, 
  responseTime,
  showDetails = false 
}: QueryExecutionIndicatorProps) {
  if (!executionMethod && !queryIntent) return null

  const getIndicatorInfo = (method?: string) => {
    switch (method) {
      case 'direct_database_query':
        return {
          icon: <Zap className="h-3 w-3" />,
          text: 'Direct Query',
          variant: 'default' as const,
          color: 'text-green-600',
          description: 'Executed database query directly'
        }
      case 'ai_agent_with_intent_routing':
        return {
          icon: <Bot className="h-3 w-3" />,
          text: 'AI Agent',
          variant: 'secondary' as const,
          color: 'text-blue-600',
          description: 'Processed by AI agent with intent routing'
        }
      default:
        return {
          icon: <Database className="h-3 w-3" />,
          text: 'Database',
          variant: 'outline' as const,
          color: 'text-gray-600',
          description: 'Database query executed'
        }
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600'
    if (confidence >= 0.7) return 'text-yellow-600'
    return 'text-red-600'
  }

  const indicator = getIndicatorInfo(executionMethod)

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
      <Badge variant={indicator.variant} className="h-5 px-2 py-0">
        <span className="flex items-center gap-1">
          {indicator.icon}
          {indicator.text}
        </span>
      </Badge>
      
      {queryIntent && showDetails && (
        <>
          <span className="text-gray-400">•</span>
          <span>
            Intent: <span className="font-medium">{queryIntent.type.replace(/_/g, ' ')}</span>
          </span>
          <span className="text-gray-400">•</span>
          <span>
            Confidence: <span className={`font-medium ${getConfidenceColor(queryIntent.confidence)}`}>
              {(queryIntent.confidence * 100).toFixed(0)}%
            </span>
          </span>
        </>
      )}
      
      {responseTime && (
        <>
          <span className="text-gray-400">•</span>
          <span>{responseTime}ms</span>
        </>
      )}
    </div>
  )
}

// Simplified version for chat messages
export function SimpleExecutionBadge({ executionMethod }: { executionMethod?: string }) {
  if (executionMethod === 'direct_database_query') {
    return (
      <Badge variant="default" className="h-4 px-1.5 text-xs">
        <Zap className="h-2.5 w-2.5 mr-1" />
        Direct Query
      </Badge>
    )
  }
  
  if (executionMethod === 'ai_agent_with_intent_routing') {
    return (
      <Badge variant="secondary" className="h-4 px-1.5 text-xs">
        <Bot className="h-2.5 w-2.5 mr-1" />
        AI Agent
      </Badge>
    )
  }
  
  return null
}