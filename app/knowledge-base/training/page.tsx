"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Plus,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Search,
  Trash2,
  Edit,
  BarChart3,
  FileText,
  Target,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"

interface TrainingItem {
  id: string
  query: string
  expected_answer: string
  context_items: string[]
  category: string | null
  difficulty: string
  is_validated: boolean
  created_at: string
}

interface EvaluationResult {
  query: string
  expectedAnswer: string
  actualAnswer: string
  isCorrect: boolean
  confidence: number
  similarity: number
  responseTimeMs: number
}

interface EvaluationRun {
  id: string
  runName: string
  totalQueries: number
  correctAnswers: number
  accuracyScore: number
  avgConfidence: number
  modelUsed: string
  results: EvaluationResult[]
  createdAt: string
}

interface Stats {
  totalItems: number
  validatedItems: number
  byCategory: Record<string, number>
  byDifficulty: Record<string, number>
}

export default function TrainingPage() {
  const [trainingData, setTrainingData] = useState<TrainingItem[]>([])
  const [evaluationRuns, setEvaluationRuns] = useState<EvaluationRun[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedRun, setSelectedRun] = useState<EvaluationRun | null>(null)

  // Form state
  const [newItem, setNewItem] = useState({
    query: '',
    expectedAnswer: '',
    category: '',
    difficulty: 'medium'
  })

  // Test playground state
  const [testQuery, setTestQuery] = useState('')
  const [testResult, setTestResult] = useState<{
    answer: string
    confidence: number
    sources: any[]
  } | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)

      const [trainingRes, evalRes] = await Promise.all([
        fetch('/api/knowledge-base/training?stats=true'),
        fetch('/api/knowledge-base/training/evaluate')
      ])

      const trainingJson = await trainingRes.json()
      const evalJson = await evalRes.json()

      if (trainingJson.success) {
        setTrainingData(trainingJson.items)
        setStats(trainingJson.stats)
      }

      if (evalJson.success) {
        setEvaluationRuns(evalJson.runs)
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load training data"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddItem = async () => {
    if (!newItem.query.trim() || !newItem.expectedAnswer.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Query and expected answer are required"
      })
      return
    }

    try {
      const response = await fetch('/api/knowledge-base/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      })

      const data = await response.json()

      if (data.success) {
        toast({ title: "Training data added" })
        setShowAddDialog(false)
        setNewItem({ query: '', expectedAnswer: '', category: '', difficulty: 'medium' })
        loadData()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add training data"
      })
    }
  }

  const handleRunEvaluation = async () => {
    try {
      setIsEvaluating(true)

      const response = await fetch('/api/knowledge-base/training/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 50 })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Evaluation complete",
          description: `Accuracy: ${(data.evaluation.accuracyScore * 100).toFixed(1)}%`
        })
        loadData()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Evaluation failed"
      })
    } finally {
      setIsEvaluating(false)
    }
  }

  const handleTestQuery = async () => {
    if (!testQuery.trim()) return

    try {
      setIsTesting(true)
      setTestResult(null)

      const response = await fetch('/api/knowledge-base/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: testQuery })
      })

      const data = await response.json()

      if (data.success) {
        setTestResult({
          answer: data.answer,
          confidence: data.confidence,
          sources: data.evidence || []
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Test query failed"
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/knowledge-base/training/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({ title: "Item deleted" })
        loadData()
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete item"
      })
    }
  }

  return (
    <div className="container py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/knowledge-base">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">KB Training & Evaluation</h1>
            <p className="text-muted-foreground">
              Train and test your knowledge base for better accuracy
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRunEvaluation} disabled={isEvaluating}>
            {isEvaluating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Run Evaluation
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Training Data
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Q&A Pairs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalItems}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Validated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.validatedItems}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(stats.byCategory).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Latest Accuracy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {evaluationRuns.length > 0
                  ? `${(evaluationRuns[0].accuracyScore * 100).toFixed(1)}%`
                  : 'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="training">
        <TabsList>
          <TabsTrigger value="training" className="gap-2">
            <FileText className="h-4 w-4" />
            Training Data
          </TabsTrigger>
          <TabsTrigger value="playground" className="gap-2">
            <Search className="h-4 w-4" />
            Test Playground
          </TabsTrigger>
          <TabsTrigger value="evaluations" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Evaluation History
          </TabsTrigger>
        </TabsList>

        {/* Training Data Tab */}
        <TabsContent value="training" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Training Q&A Pairs</CardTitle>
              <CardDescription>
                Add question-answer pairs to improve KB accuracy
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : trainingData.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No training data yet</p>
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Item
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Query</TableHead>
                      <TableHead>Expected Answer</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Validated</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trainingData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="max-w-xs truncate">{item.query}</TableCell>
                        <TableCell className="max-w-xs truncate">{item.expected_answer}</TableCell>
                        <TableCell>
                          <Badge variant={
                            item.difficulty === 'easy' ? 'default' :
                            item.difficulty === 'hard' ? 'destructive' : 'secondary'
                          }>
                            {item.difficulty}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.is_validated ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Playground Tab */}
        <TabsContent value="playground" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Test Query</CardTitle>
                <CardDescription>
                  Test how the KB answers your questions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Question</Label>
                  <Textarea
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    placeholder="Enter a test question..."
                    className="min-h-[100px]"
                  />
                </div>
                <Button
                  onClick={handleTestQuery}
                  disabled={isTesting || !testQuery.trim()}
                  className="w-full"
                >
                  {isTesting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Test Query
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Result</CardTitle>
                <CardDescription>
                  KB answer and confidence score
                </CardDescription>
              </CardHeader>
              <CardContent>
                {testResult ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={testResult.confidence >= 0.7 ? 'default' : 'secondary'}>
                        {(testResult.confidence * 100).toFixed(0)}% confidence
                      </Badge>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm">{testResult.answer}</p>
                    </div>
                    {testResult.sources.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Sources:</p>
                        <div className="space-y-1">
                          {testResult.sources.slice(0, 3).map((source: any, i: number) => (
                            <Badge key={i} variant="outline" className="mr-1">
                              {source.title || source.name || `Source ${i + 1}`}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Enter a query and click Test to see results
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Evaluations Tab */}
        <TabsContent value="evaluations" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Evaluation History</CardTitle>
              <CardDescription>
                Track accuracy over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {evaluationRuns.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No evaluations yet</p>
                  <Button onClick={handleRunEvaluation} disabled={isEvaluating}>
                    Run First Evaluation
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Queries</TableHead>
                      <TableHead>Correct</TableHead>
                      <TableHead>Accuracy</TableHead>
                      <TableHead>Avg Confidence</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead className="w-24">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluationRuns.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell>{new Date(run.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{run.totalQueries}</TableCell>
                        <TableCell>{run.correctAnswers}</TableCell>
                        <TableCell>
                          <Badge variant={run.accuracyScore >= 0.7 ? 'default' : 'secondary'}>
                            {(run.accuracyScore * 100).toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell>{(run.avgConfidence * 100).toFixed(1)}%</TableCell>
                        <TableCell>{run.modelUsed}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRun(run)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Training Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Query</Label>
              <Textarea
                value={newItem.query}
                onChange={(e) => setNewItem({ ...newItem, query: e.target.value })}
                placeholder="What is the question?"
              />
            </div>
            <div className="space-y-2">
              <Label>Expected Answer</Label>
              <Textarea
                value={newItem.expectedAnswer}
                onChange={(e) => setNewItem({ ...newItem, expectedAnswer: e.target.value })}
                placeholder="What is the correct answer?"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  placeholder="e.g., pricing, specs"
                />
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select
                  value={newItem.difficulty}
                  onValueChange={(value) => setNewItem({ ...newItem, difficulty: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddItem}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Evaluation Details Dialog */}
      <Dialog open={!!selectedRun} onOpenChange={() => setSelectedRun(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Evaluation Results</DialogTitle>
          </DialogHeader>
          {selectedRun && (
            <ScrollArea className="h-[60vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Query</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedRun.results.map((result, i) => (
                    <TableRow key={i}>
                      <TableCell className="max-w-[150px] truncate">{result.query}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{result.expectedAnswer}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{result.actualAnswer}</TableCell>
                      <TableCell>
                        {result.isCorrect ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell>{(result.confidence * 100).toFixed(0)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
