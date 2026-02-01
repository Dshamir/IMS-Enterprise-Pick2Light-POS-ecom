'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { 
  Sparkles, 
  Database, 
  Play, 
  Copy, 
  ThumbsUp, 
  ThumbsDown,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Loader2,
  BarChart3,
  History,
  Zap,
  Brain,
  Target,
  TrendingUp
} from 'lucide-react'

interface NLQueryResult {
  success: boolean
  sql: string
  explanation: string
  confidence: number
  alternatives: {
    sql: string
    explanation: string
    confidence: number
  }[]
  optimizations: string[]
  warnings: string[]
  estimatedComplexity: 'low' | 'medium' | 'high'
  estimatedRows: number
  usedTables: string[]
  requiredPermissions: string[]
}

interface QueryExample {
  naturalLanguage: string
  expectedSQL: string
  category: string
}

interface NaturalLanguageQueryProps {
  onQueryGenerated: (sql: string, explanation: string) => void
  onExecuteQuery: (sql: string) => void
}

export default function NaturalLanguageQuery({
  onQueryGenerated,
  onExecuteQuery
}: NaturalLanguageQueryProps) {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<NLQueryResult | null>(null)
  const [examples, setExamples] = useState<QueryExample[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [queryHistory, setQueryHistory] = useState<string[]>([])
  const [selectedExample, setSelectedExample] = useState<QueryExample | null>(null)
  
  const { toast } = useToast()

  useEffect(() => {
    loadExamples()
    loadQueryHistory()
  }, [])

  const loadExamples = async () => {
    try {
      const response = await fetch('/api/ai/nl-to-sql')
      const data = await response.json()
      
      if (response.ok) {
        setExamples(data.examples || [])
      }
    } catch (error) {
      console.error('Failed to load examples:', error)
    }
  }

  const loadQueryHistory = () => {
    const history = localStorage.getItem('nl-query-history')
    if (history) {
      setQueryHistory(JSON.parse(history))
    }
  }

  const saveToHistory = (query: string) => {
    const newHistory = [query, ...queryHistory.filter(h => h !== query)].slice(0, 10)
    setQueryHistory(newHistory)
    localStorage.setItem('nl-query-history', JSON.stringify(newHistory))
  }

  const generateSQL = async () => {
    if (!query.trim()) {
      toast({
        title: 'Query Required',
        description: 'Please enter a natural language query',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/ai/nl-to-sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          naturalLanguage: query,
          includeHistory: true
        })
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
        saveToHistory(query)
        onQueryGenerated(data.sql, data.explanation)
        
        toast({
          title: 'SQL Generated',
          description: `Generated with ${Math.round(data.confidence * 100)}% confidence`,
        })
      } else {
        toast({
          title: 'Generation Failed',
          description: data.error || 'Failed to generate SQL',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to connect to AI service',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleExampleClick = (example: QueryExample) => {
    setQuery(example.naturalLanguage)
    setSelectedExample(example)
  }

  const handleCopySQL = (sql: string) => {
    navigator.clipboard.writeText(sql)
    toast({
      title: 'Copied',
      description: 'SQL query copied to clipboard',
    })
  }

  const handleExecuteSQL = () => {
    if (result?.sql) {
      onExecuteQuery(result.sql)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const examplesByCategory = examples.reduce((acc, example) => {
    if (!acc[example.category]) acc[example.category] = []
    acc[example.category].push(example)
    return acc
  }, {} as Record<string, QueryExample[]>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            Natural Language to SQL
          </CardTitle>
          <CardDescription>
            Transform plain English into powerful SQL queries using advanced AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Describe what you want to query in plain English
              </label>
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., Show me all products with low stock levels..."
                rows={3}
                className="resize-none"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button onClick={generateSQL} disabled={isLoading || !query.trim()}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate SQL
              </Button>
              
              {result && (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => handleCopySQL(result.sql)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy SQL
                  </Button>
                  <Button 
                    variant="default" 
                    onClick={handleExecuteSQL}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Execute Query
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Generated SQL Query</span>
              <div className="flex items-center gap-2">
                <Badge className={getConfidenceColor(result.confidence)}>
                  {Math.round(result.confidence * 100)}% confidence
                </Badge>
                <Badge className={getComplexityColor(result.estimatedComplexity)}>
                  {result.estimatedComplexity} complexity
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* SQL Query */}
            <div>
              <label className="text-sm font-medium mb-2 block">SQL Query:</label>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm relative">
                <pre className="whitespace-pre-wrap">{result.sql}</pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-200"
                  onClick={() => handleCopySQL(result.sql)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Explanation */}
            <div>
              <label className="text-sm font-medium mb-2 block">Explanation:</label>
              <p className="text-muted-foreground">{result.explanation}</p>
            </div>

            {/* Query Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 border rounded">
                <Database className="h-6 w-6 mx-auto mb-1 text-blue-500" />
                <div className="text-sm text-muted-foreground">Tables Used</div>
                <div className="font-medium">{result.usedTables.length}</div>
              </div>
              <div className="text-center p-3 border rounded">
                <Target className="h-6 w-6 mx-auto mb-1 text-green-500" />
                <div className="text-sm text-muted-foreground">Est. Rows</div>
                <div className="font-medium">{result.estimatedRows.toLocaleString()}</div>
              </div>
              <div className="text-center p-3 border rounded">
                <TrendingUp className="h-6 w-6 mx-auto mb-1 text-purple-500" />
                <div className="text-sm text-muted-foreground">Complexity</div>
                <div className="font-medium capitalize">{result.estimatedComplexity}</div>
              </div>
              <div className="text-center p-3 border rounded">
                <Zap className="h-6 w-6 mx-auto mb-1 text-yellow-500" />
                <div className="text-sm text-muted-foreground">Confidence</div>
                <div className="font-medium">{Math.round(result.confidence * 100)}%</div>
              </div>
            </div>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warnings:</strong>
                  <ul className="mt-1 list-disc list-inside">
                    {result.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Optimizations */}
            {result.optimizations.length > 0 && (
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>
                  <strong>Optimization Suggestions:</strong>
                  <ul className="mt-1 list-disc list-inside">
                    {result.optimizations.map((optimization, index) => (
                      <li key={index}>{optimization}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Alternatives */}
            {result.alternatives.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Alternative Queries:</label>
                <div className="space-y-2">
                  {result.alternatives.map((alt, index) => (
                    <div key={index} className="border rounded p-3">
                      <div className="flex justify-between items-center mb-2">
                        <Badge variant="outline">
                          {Math.round(alt.confidence * 100)}% confidence
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopySQL(alt.sql)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <pre className="text-sm bg-gray-50 p-2 rounded font-mono">{alt.sql}</pre>
                      <p className="text-sm text-muted-foreground mt-2">{alt.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Examples and History */}
      <Tabs defaultValue="examples" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="examples">Examples</TabsTrigger>
          <TabsTrigger value="history">Recent Queries</TabsTrigger>
        </TabsList>

        <TabsContent value="examples" className="space-y-4">
          {Object.entries(examplesByCategory).map(([category, categoryExamples]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-lg capitalize">{category} Queries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {categoryExamples.map((example, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleExampleClick(example)}
                    >
                      <div className="font-medium text-sm">{example.naturalLanguage}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-1">
                        {example.expectedSQL}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Queries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {queryHistory.length > 0 ? (
                <div className="space-y-2">
                  {queryHistory.map((historyQuery, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setQuery(historyQuery)}
                    >
                      <div className="text-sm">{historyQuery}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recent queries</p>
                  <p className="text-sm">Your query history will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}