"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  AlertTriangle, 
  TrendingUp, 
  ShoppingCart, 
  DollarSign,
  RefreshCw,
  Loader2,
  Bot,
  Package,
  Clock,
  Target
} from "lucide-react"
import { aiService } from "@/lib/ai/ai-service"
import { useToast } from "@/hooks/use-toast"

interface AIInventoryInsightsProps {
  className?: string
}

export function AIInventoryInsights({ className }: AIInventoryInsightsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [insights, setInsights] = useState<any>(null)
  const [suggestions, setSuggestions] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadInsights()
  }, [])

  const loadInsights = async (retryCount = 0) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Add a small delay to ensure server is ready
      if (retryCount === 0) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Load both low stock analysis and reorder suggestions with individual error handling
      const lowStockPromise = aiService.analyzeLowStock().catch(error => ({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze low stock'
      }))
      
      const suggestionsPromise = aiService.getReorderSuggestions().catch(error => ({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get suggestions'
      }))

      const [lowStockResult, suggestionsResult] = await Promise.all([
        lowStockPromise,
        suggestionsPromise
      ])

      // Handle low stock analysis
      if (lowStockResult.success) {
        setInsights(lowStockResult.analysis)
      } else {
        console.warn('Low stock analysis failed:', lowStockResult.error)
        setInsights({
          message: 'Unable to load AI insights at this time',
          low_stock_count: 0,
          recommendations: []
        })
      }

      // Handle suggestions
      if (suggestionsResult.success) {
        setSuggestions(suggestionsResult.suggestions)
      } else {
        console.warn('Suggestions failed:', suggestionsResult.error)
        setSuggestions([])
      }

      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error loading AI insights:', error)
      
      // Retry once if it's a network error
      if (retryCount === 0 && error instanceof Error && error.message.includes('fetch')) {
        console.log('Retrying AI insights load...')
        setTimeout(() => loadInsights(1), 1000)
        return
      }
      
      setError(error instanceof Error ? error.message : 'Failed to load insights')
      
      // Set fallback data
      setInsights({
        message: 'AI insights temporarily unavailable. Please check your connection and try again.',
        low_stock_count: 0,
        recommendations: ['Configure AI providers to enable intelligent inventory analysis']
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    toast({
      title: "Refreshing Insights",
      description: "Analyzing current inventory with AI...",
    })
    loadInsights()
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            AI Inventory Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadInsights}
                className="ml-2"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600" />
              AI Inventory Insights
            </CardTitle>
            <CardDescription>
              AI-powered analysis of your inventory status
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Analyzing inventory with AI...</span>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
              <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {insights && (
                <>
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Package className="h-8 w-8 text-orange-600" />
                      <div>
                        <div className="text-lg font-bold">{insights.summary?.low_stock_count || 0}</div>
                        <div className="text-sm text-muted-foreground">Low Stock Items</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <AlertTriangle className="h-8 w-8 text-red-600" />
                      <div>
                        <div className="text-lg font-bold">{insights.summary?.out_of_stock_count || 0}</div>
                        <div className="text-sm text-muted-foreground">Out of Stock</div>
                      </div>
                    </div>
                  </div>

                  {/* Category Breakdown */}
                  {insights.category_breakdown && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Category Breakdown</h4>
                      {Object.entries(insights.category_breakdown).map(([category, data]: [string, any]) => (
                        <div key={category} className="flex items-center justify-between p-2 border rounded">
                          <span className="capitalize">{category}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{data.count} items</Badge>
                            {data.critical_items > 0 && (
                              <Badge variant="destructive">{data.critical_items} critical</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* AI Insights */}
                  {insights.ai_insights && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium text-blue-800 mb-2">🤖 AI Analysis</h4>
                      <p className="text-sm text-blue-700 whitespace-pre-wrap">
                        {insights.ai_insights}
                      </p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4">
              {insights?.priority_alerts?.length > 0 ? (
                insights.priority_alerts.map((alert: any, index: number) => (
                  <Alert key={index} variant={alert.level === 'critical' ? 'destructive' : 'default'}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <div className="font-medium">{alert.message}</div>
                        {alert.items?.length > 0 && (
                          <div className="text-sm">
                            Items: {alert.items.join(', ')}
                            {alert.items.length < alert.total && ' and more...'}
                          </div>
                        )}
                        <div className="text-sm text-muted-foreground">
                          Action: {alert.action_required}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No critical alerts at this time</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="suggestions" className="space-y-4">
              {suggestions?.length > 0 ? (
                <div className="space-y-3">
                  {suggestions.slice(0, 5).map((suggestion: any, index: number) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{suggestion.product_name}</h4>
                        <Badge variant={
                          suggestion.urgency_level === 'critical' ? 'destructive' :
                          suggestion.urgency_level === 'high' ? 'default' : 'secondary'
                        }>
                          {suggestion.urgency_level}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Current Stock:</span>
                          <span className="ml-2 font-medium">{suggestion.current_stock}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Suggested:</span>
                          <span className="ml-2 font-medium">{suggestion.suggested_quantity}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Days Left:</span>
                          <span className="ml-2 font-medium">{suggestion.days_of_stock_remaining}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Est. Cost:</span>
                          <span className="ml-2 font-medium">${suggestion.estimated_cost}</span>
                        </div>
                      </div>
                      
                      {suggestion.reasons?.length > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {suggestion.reasons[0]}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {suggestions.length > 5 && (
                    <div className="text-center">
                      <Button variant="outline" size="sm">
                        View All {suggestions.length} Suggestions
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No reorder suggestions at this time</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {lastUpdated && (
          <div className="mt-4 pt-4 border-t text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}