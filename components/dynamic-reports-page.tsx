'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Play, Download, AlertCircle, CheckCircle, Clock, BarChart3, TrendingUp, AlertTriangle, Database, Settings, Save, Brain, Sparkles, Copy, Layout, Palette } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { DataTable } from '@/components/ui/data-table'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement } from 'chart.js'
import { Bar, Pie, Line } from 'react-chartjs-2'
// Temporarily disable problematic components until dependencies are fixed
// import VisualQueryBuilder from '@/components/report-builder/visual-query-builder'
// import EnhancedQueryBuilder from '@/components/report-builder/enhanced-query-builder'
// import ChartConfigBuilder from '@/components/report-builder/chart-config-builder'
// import TemplateDesigner from '@/components/report-builder/template-designer'
// import VisualDesigner, { ReportDesign } from '@/components/report-builder/visual-designer'

// Temporary placeholder type
interface ReportDesign {
  name: string
  id: string
}
import ReportSharing from '@/components/reports/report-sharing'
import ExecutiveReportGenerator from '@/components/reports/executive-report-generator'
import AdvancedReportDemo from '@/components/reports/advanced-report-demo'
import NaturalLanguageQuery from '@/components/ai/natural-language-query'

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement)

interface ReportTemplate {
  id: string
  name: string
  description: string
  category: string
  version: string
  author: string
  tags: string[]
  isPublic: boolean
  isActive: boolean
  config?: any
  metadata: {
    estimatedRows: number
    complexity: string
    usageCount: number
    averageRating: number
  }
  createdAt?: Date
  updatedAt?: Date
}

interface ReportResult {
  success: boolean
  data?: any[]
  metadata: {
    templateId?: string
    templateName?: string
    totalRecords: number
    executionTime: number
    timestamp: Date
  }
  error?: string
  warnings?: string[]
  recommendations?: string[]
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'error'
  components: {
    queryEngine: boolean
    dataValidation: boolean
    performanceMonitoring: boolean
    configManager: boolean
    reportGenerator: boolean
  }
  metrics: {
    availableTables: number
    activeTemplates: number
    dataQualityScore: number
    cacheHitRate: number
    avgQueryTime: number
  }
  alerts: any[]
  errors: string[]
}

export default function DynamicReportsPage() {
  const [activeTab, setActiveTab] = useState('templates')
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>('Initializing...')
  const [reportResult, setReportResult] = useState<ReportResult | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null)
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [reportParameters, setReportParameters] = useState<Record<string, any>>({})
  
  // Builder state
  const [builderQuery, setBuilderQuery] = useState<any>(null)
  const [builderCharts, setBuilderCharts] = useState<any[]>([])
  const [availableFields, setAvailableFields] = useState<string[]>([])
  const [builderPreviewData, setBuilderPreviewData] = useState<any[]>([])
  const [showExecutiveReportGenerator, setShowExecutiveReportGenerator] = useState(false)
  const [showAdvancedReportDemo, setShowAdvancedReportDemo] = useState(false)
  const [showVisualDesigner, setShowVisualDesigner] = useState(false)
  const [currentDesign, setCurrentDesign] = useState<ReportDesign | null>(null)
  
  // AI Assistant state
  const [aiGeneratedSQL, setAiGeneratedSQL] = useState<string>('')
  const [aiQueryExplanation, setAiQueryExplanation] = useState<string>('')
  
  const { toast } = useToast()

  useEffect(() => {
    console.log('🚀 Frontend: Component mounted, loading initial data')
    loadTemplates()
    loadCategories()
    loadSystemHealth()
  }, [])

  useEffect(() => {
    loadTemplates()
  }, [selectedCategory, searchTerm])

  const loadTemplates = async () => {
    try {
      setDebugInfo('Loading templates...')
      setIsLoading(true)
      const params = new URLSearchParams()
      params.append('action', 'templates')
      if (selectedCategory !== 'all') params.append('category', selectedCategory)
      if (searchTerm) params.append('search', searchTerm)
      
      setDebugInfo(`Calling API: /api/reports/dynamic?${params.toString()}`)
      const response = await fetch(`/api/reports/dynamic?${params}`)
      const data = await response.json()
      
      setDebugInfo(`API Response: ${response.status} ${response.ok ? 'OK' : 'ERROR'} - Templates: ${data.templates?.length || 0}`)
      
      if (response.ok) {
        setTemplates(data.templates || [])
        setDebugInfo(`SUCCESS: ${data.templates?.length || 0} templates loaded`)
      } else {
        setDebugInfo(`ERROR: ${data.error || 'Failed to load templates'}`)
        toast({
          title: 'Error',
          description: data.error || 'Failed to load templates',
          variant: 'destructive'
        })
      }
    } catch (error) {
      setDebugInfo(`EXCEPTION: ${error instanceof Error ? error.message : 'Unknown error'}`)
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/reports/dynamic?action=categories')
      const data = await response.json()
      
      if (response.ok) {
        setCategories(['all', ...data.categories])
      }
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }

  const loadSystemHealth = async () => {
    try {
      const response = await fetch('/api/reports/dynamic?action=health')
      const data = await response.json()
      
      if (response.ok) {
        setSystemHealth(data)
      }
    } catch (error) {
      console.error('Failed to load system health:', error)
    }
  }

  const generateReport = async (templateId: string) => {
    try {
      setIsLoading(true)
      setReportResult(null)
      
      const response = await fetch('/api/reports/dynamic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'generate',
          templateId,
          parameters: reportParameters,
          userId: 'user123', // TODO: Get from auth context
          validateData: true,
          useCache: true
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        setReportResult(result)
        toast({
          title: 'Success',
          description: `Report generated successfully with ${result.metadata.totalRecords} records`,
        })
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to generate report',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate report',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const exportReport = async (format: 'csv' | 'xlsx' | 'pdf' | 'json') => {
    if (!reportResult) return
    
    try {
      const response = await fetch('/api/reports/dynamic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'export',
          reportResult,
          format,
          includeMetadata: true
        })
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `report-${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        toast({
          title: 'Success',
          description: `Report exported as ${format.toUpperCase()}`,
        })
      } else {
        throw new Error('Export failed')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export report',
        variant: 'destructive'
      })
    }
  }

  // Builder handlers
  const handleBuilderQueryChange = (query: any) => {
    setBuilderQuery(query)
    
    // Extract available fields from query
    if (query && query.fields) {
      const fields = query.fields.map((field: any) => field.alias || field.name)
      setAvailableFields(fields)
    }
  }

  const handleBuilderPreview = (query: any) => {
    // This will be handled by the VisualQueryBuilder component
    console.log('Builder preview:', query)
  }

  const handleBuilderSave = (query: any, name: string) => {
    toast({
      title: 'Query Saved',
      description: `Query "${name}" has been saved successfully`,
    })
  }

  const handleChartConfigChange = (charts: any[]) => {
    setBuilderCharts(charts)
  }

  const handleChartPreview = (chart: any) => {
    toast({
      title: 'Chart Preview',
      description: `Previewing chart: ${chart.title}`,
    })
  }

  const handleTemplateSave = (template: any) => {
    toast({
      title: 'Template Saved',
      description: `Template "${template.name}" saved successfully`,
    })
  }

  const handleTemplateLoad = (template: any) => {
    setBuilderQuery(template.query)
    setBuilderCharts(template.charts)
    if (template.query && template.query.fields) {
      const fields = template.query.fields.map((field: any) => field.alias || field.name)
      setAvailableFields(fields)
    }
    toast({
      title: 'Template Loaded',
      description: `Template "${template.name}" loaded successfully`,
    })
  }

  // Visual Designer handlers
  const handleDesignSave = (design: ReportDesign) => {
    setCurrentDesign(design)
    toast({
      title: 'Design Saved',
      description: `Report design "${design.name}" saved successfully`,
    })
  }

  const handleDesignPreview = (design: ReportDesign) => {
    setCurrentDesign(design)
    toast({
      title: 'Design Preview',
      description: `Previewing design "${design.name}"`,
    })
  }

  const handleDesignExport = (design: ReportDesign, format: 'pdf' | 'png' | 'html') => {
    toast({
      title: 'Export Started',
      description: `Exporting design "${design.name}" as ${format.toUpperCase()}`,
    })
  }

  // AI Assistant handlers
  const handleAIQueryGenerated = (sql: string, explanation: string) => {
    setAiGeneratedSQL(sql)
    setAiQueryExplanation(explanation)
    
    // Optionally switch to the generate tab to show results
    toast({
      title: 'SQL Generated',
      description: 'AI has generated a SQL query. You can execute it or refine it further.',
    })
  }

  const handleAIExecuteQuery = async (sql: string) => {
    try {
      setIsLoading(true)
      setReportResult(null)
      
      // Execute the AI-generated SQL query
      const response = await fetch('/api/reports/dynamic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'execute-sql',
          sql: sql,
          userId: 'user123', // TODO: Get from auth context
          validateData: true
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        setReportResult(result)
        setActiveTab('generate') // Switch to results tab
        toast({
          title: 'Query Executed',
          description: `Successfully executed AI-generated query with ${result.metadata?.totalRecords || 0} results`,
        })
      } else {
        toast({
          title: 'Execution Failed',
          description: result.error || 'Failed to execute AI-generated query',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to execute AI-generated query',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low':
        return 'bg-green-100 text-green-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'high':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const renderReportData = () => {
    if (!reportResult || !reportResult.data) return null

    const data = reportResult.data
    const columns = Object.keys(data[0] || {}).filter(key => !key.startsWith('_'))
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Report Results</h3>
            <p className="text-sm text-muted-foreground">
              {reportResult.metadata.totalRecords} records • Generated in {reportResult.metadata.executionTime}ms
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => exportReport('csv')} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button onClick={() => exportReport('xlsx')} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button onClick={() => exportReport('json')} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              JSON
            </Button>
            <Button 
              onClick={() => setShowExecutiveReportGenerator(true)} 
              variant="default" 
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Executive Report
            </Button>
          </div>
        </div>

        {/* Warnings and Recommendations */}
        {reportResult.warnings && reportResult.warnings.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warnings:</strong>
              <ul className="mt-1 list-disc list-inside">
                {reportResult.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {reportResult.recommendations && reportResult.recommendations.length > 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Recommendations:</strong>
              <ul className="mt-1 list-disc list-inside">
                {reportResult.recommendations.map((recommendation, index) => (
                  <li key={index}>{recommendation}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Data View</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    {columns.map(column => (
                      <th key={column} className="text-left p-2 font-medium">
                        {column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 100).map((row, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      {columns.map(column => (
                        <td key={column} className="p-2">
                          {typeof row[column] === 'number' 
                            ? row[column].toLocaleString() 
                            : String(row[column] || '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.length > 100 && (
              <p className="text-sm text-muted-foreground mt-2">
                Showing first 100 rows of {data.length} total records
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dynamic Reports</h1>
          <p className="text-muted-foreground">
            Advanced reporting system with real-time data validation and performance monitoring
          </p>
          <div className="text-xs text-blue-600 mt-2">
            Debug: {debugInfo} | Templates: {templates.length} | Loading: {isLoading ? 'YES' : 'NO'}
            <Button onClick={loadTemplates} size="sm" className="ml-2">Reload Templates</Button>
          </div>
        </div>
        {systemHealth && (
          <div className="flex items-center gap-2">
            {getStatusIcon(systemHealth.status)}
            <span className="text-sm">
              System {systemHealth.status}
            </span>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="generate">Generate Report</TabsTrigger>
          <TabsTrigger value="ai-assistant">AI Assistant</TabsTrigger>
          <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
          <TabsTrigger value="dashboards">Dashboards</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex gap-4 mb-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {console.log('🎨 Frontend: Rendering templates grid with:', templates.length, 'templates')}
              {templates.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No templates found. {console.log('⚠️ Frontend: No templates to display')}
                </div>
              )}
              {templates.map((template, index) => {
                console.log(`🎨 Rendering template ${index}:`, template.name, template.id)
                return (
                <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <CardDescription>{template.description}</CardDescription>
                      </div>
                      <Badge variant="secondary">{template.category}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {template.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex justify-between items-center text-sm text-muted-foreground mb-4">
                      <span>v{template.version}</span>
                      <span>by {template.author}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mb-4">
                      <span>~{template.metadata.estimatedRows} rows</span>
                      <Badge className={getComplexityColor(template.metadata.complexity)}>
                        {template.metadata.complexity}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        Used {template.metadata.usageCount} times
                      </span>
                      <Button
                        onClick={() => {
                          setSelectedTemplate(template)
                          setActiveTab('generate')
                        }}
                        size="sm"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Generate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="generate" className="space-y-4">
          {selectedTemplate ? (
            <Card>
              <CardHeader>
                <CardTitle>Generate Report: {selectedTemplate.name}</CardTitle>
                <CardDescription>{selectedTemplate.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="category-filter">Category Filter</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="equipment">Equipment</SelectItem>
                        <SelectItem value="parts">Parts</SelectItem>
                        <SelectItem value="consumables">Consumables</SelectItem>
                        <SelectItem value="tools">Tools</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="stock-status">Stock Status Filter</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select stock status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="low">Low Stock</SelectItem>
                        <SelectItem value="out">Out of Stock</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => generateReport(selectedTemplate.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Generate Report
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Generate Report</CardTitle>
                <CardDescription>Select a template from the Templates tab to generate a report</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setActiveTab('templates')} variant="outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Browse Templates
                </Button>
              </CardContent>
            </Card>
          )}

          {reportResult && renderReportData()}
        </TabsContent>

        {/* Temporarily disabled due to dependency issues 
        <TabsContent value="builder" className="space-y-4">
          <Tabs defaultValue="enhanced-builder" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="enhanced-builder">Enhanced Builder</TabsTrigger>
              <TabsTrigger value="query-builder">Classic Builder</TabsTrigger>
              <TabsTrigger value="chart-config">Chart Design</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="enhanced-builder" className="space-y-4">
              <EnhancedQueryBuilder
                onQueryChange={handleBuilderQueryChange}
                onPreview={handleBuilderPreview}
                onSave={handleBuilderSave}
                initialQuery={builderQuery}
              />
            </TabsContent>

            <TabsContent value="query-builder" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Classic Query Builder</CardTitle>
                  <CardDescription>
                    Build custom queries with the original interface
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <VisualQueryBuilder
                    onQueryChange={handleBuilderQueryChange}
                    onPreview={handleBuilderPreview}
                    onSave={handleBuilderSave}
                    initialQuery={builderQuery}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="chart-config" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Chart Configuration</CardTitle>
                  <CardDescription>
                    Design interactive charts and visualizations for your report data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartConfigBuilder
                    fields={availableFields}
                    data={builderPreviewData}
                    onConfigChange={handleChartConfigChange}
                    onPreview={handleChartPreview}
                    initialConfig={builderCharts}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Template Designer</CardTitle>
                  <CardDescription>
                    Save and manage reusable report templates with your query and chart configurations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TemplateDesigner
                    query={builderQuery}
                    charts={builderCharts}
                    onSave={handleTemplateSave}
                    onLoad={handleTemplateLoad}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {builderQuery && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Report Configuration Summary
                </CardTitle>
                <CardDescription>
                  Ready to generate your custom report with the configured query and visualizations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-blue-600" />
                      <h4 className="font-medium">Data Source</h4>
                    </div>
                    <div className="space-y-1 text-sm pl-6">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Table:</span>
                        <span className="font-mono bg-white px-2 py-1 rounded text-xs">{builderQuery.table}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fields:</span>
                        <Badge variant="secondary">{builderQuery.fields?.length || 0} selected</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Filters:</span>
                        <Badge variant="secondary">{builderQuery.filters?.length || 0} applied</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Joins:</span>
                        <Badge variant="secondary">{builderQuery.joins?.length || 0} configured</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-green-600" />
                      <h4 className="font-medium">Visualizations</h4>
                    </div>
                    <div className="space-y-1 text-sm pl-6">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Charts:</span>
                        <Badge variant="secondary">{builderCharts.length} designed</Badge>
                      </div>
                      {builderCharts.length > 0 && (
                        <div className="mt-2">
                          <span className="text-muted-foreground text-xs">Types:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {builderCharts.map((chart, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {chart.type}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-purple-600" />
                      <h4 className="font-medium">Actions</h4>
                    </div>
                    <div className="space-y-2 pl-6">
                      <Button
                        disabled={!builderQuery.table}
                        onClick={() => {
                          toast({
                            title: 'Custom Report Generated',
                            description: 'Your custom query and charts have been processed successfully',
                          })
                        }}
                        className="w-full"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Generate Report
                      </Button>
                      <Button
                        variant="outline"
                        disabled={!builderQuery.table}
                        onClick={() => {
                          toast({
                            title: 'Template Saved',
                            description: 'Your custom configuration has been saved as a template',
                          })
                        }}
                        className="w-full"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save as Template
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ai-assistant" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-600" />
                AI-Powered Query Assistant
              </CardTitle>
              <CardDescription>
                Transform natural language into SQL queries using advanced AI. Perfect for non-technical users.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    Phase 4A: Advanced AI Integration
                  </h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Natural Language to SQL conversion with GPT-4</li>
                    <li>• Context-aware query generation with schema understanding</li>
                    <li>• Confidence scoring and alternative query suggestions</li>
                    <li>• Security validation and optimization recommendations</li>
                    <li>• Query history and pattern analysis</li>
                  </ul>
                </div>
                
                <NaturalLanguageQuery
                  onQueryGenerated={handleAIQueryGenerated}
                  onExecuteQuery={handleAIExecuteQuery}
                />
                
                {aiGeneratedSQL && (
                  <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        AI-Generated Query Ready
                      </CardTitle>
                      <CardDescription>
                        {aiQueryExplanation}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Generated SQL:</label>
                          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
                            <pre className="whitespace-pre-wrap">{aiGeneratedSQL}</pre>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleAIExecuteQuery(aiGeneratedSQL)}
                            disabled={isLoading}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4 mr-2" />
                            )}
                            Execute Query
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(aiGeneratedSQL)
                              toast({
                                title: 'Copied',
                                description: 'SQL query copied to clipboard',
                              })
                            }}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy SQL
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => toast({ title: 'Builder Disabled', description: 'Builder tab temporarily disabled for testing' })}
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Refine in Builder
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        */}

        {/* Temporarily disabled designer tab
        <TabsContent value="designer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Visual Report Designer</CardTitle>
              <CardDescription>
                Create reports with drag-and-drop interface and advanced layout controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setShowVisualDesigner(true)}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      <Layout className="h-4 w-4 mr-2" />
                      Open Visual Designer
                    </Button>
                    {currentDesign && (
                      <Badge variant="outline" className="ml-2">
                        Current: {currentDesign.name}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                      Phase 3B
                    </Badge>
                    <Badge variant="secondary">
                      Visual Designer
                    </Badge>
                  </div>
                </div>
                
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 border rounded-lg">
                    <Layout className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                    <h3 className="font-medium mb-1">Drag & Drop Canvas</h3>
                    <p className="text-sm text-muted-foreground">
                      Visual layout with grid system and component positioning
                    </p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Palette className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                    <h3 className="font-medium mb-1">Component Palette</h3>
                    <p className="text-sm text-muted-foreground">
                      Rich library of components for text, charts, tables, and more
                    </p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Settings className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <h3 className="font-medium mb-1">Property Panel</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure components with advanced styling and data binding
                    </p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Enterprise Features</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Interactive drag-and-drop interface with react-dnd</li>
                    <li>• Professional component library with 20+ components</li>
                    <li>• Advanced property panels for fine-tuned control</li>
                    <li>• Real-time preview and responsive design support</li>
                    <li>• Export to PDF, PNG, and HTML formats</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        */}

        <TabsContent value="collaboration" className="space-y-4">
          <ReportSharing
            reportId={selectedTemplate?.id || 'default-report'}
            reportName={selectedTemplate?.name || 'Sample Report'}
            isOwner={true}
            onShareUpdate={(settings) => {
              toast({
                title: 'Share Settings Updated',
                description: 'Collaboration settings have been updated successfully'
              })
            }}
          />
        </TabsContent>

        <TabsContent value="dashboards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Dashboards</CardTitle>
              <CardDescription>Interactive dashboards with live data updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Inventory Dashboard</CardTitle>
                    <CardDescription>Real-time inventory metrics and alerts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        <span className="text-sm">Auto-refresh every 30s</span>
                      </div>
                      <Button size="sm">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        View Dashboard
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Manufacturing Dashboard</CardTitle>
                    <CardDescription>Production metrics and BOM analysis</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-500" />
                        <span className="text-sm">Updates every 5 minutes</span>
                      </div>
                      <Button size="sm" variant="outline">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Coming Soon
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          {systemHealth && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                  <CardDescription>Overall system status and performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(systemHealth.status)}
                      <span className="font-medium">
                        System {systemHealth.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Data Quality</p>
                      <p className="text-2xl font-bold">{systemHealth.metrics.dataQualityScore.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Active Templates</p>
                      <p className="text-2xl font-bold">{systemHealth.metrics.activeTemplates}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Component Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    {Object.entries(systemHealth.components).map(([component, status]) => (
                      <div key={component} className="flex items-center justify-between">
                        <span className="capitalize">{component.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <div className="flex items-center gap-2">
                          {status ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-sm">{status ? 'Operational' : 'Down'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {systemHealth.errors && systemHealth.errors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>System Errors</CardTitle>
                    <CardDescription>Component initialization errors</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {systemHealth.errors.map((error, index) => (
                        <Alert key={index} variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {systemHealth.alerts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Active Alerts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {systemHealth.alerts.map((alert, index) => (
                        <Alert key={index}>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{alert.message}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Executive Report Generator Modal */}
      {showExecutiveReportGenerator && reportResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Executive Report Generator</h2>
                <Button 
                  onClick={() => setShowExecutiveReportGenerator(false)}
                  variant="ghost"
                  size="sm"
                >
                  ×
                </Button>
              </div>
              <ExecutiveReportGenerator
                data={reportResult.data}
                query={builderQuery}
                onClose={() => setShowExecutiveReportGenerator(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Visual Designer Modal */}
      {showVisualDesigner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full h-full max-w-none max-h-none m-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold">Visual Report Designer</h2>
              <Button 
                onClick={() => setShowVisualDesigner(false)}
                variant="ghost"
                size="sm"
              >
                ×
              </Button>
            </div>
            <div className="h-full">
              <VisualDesigner
                onSave={handleDesignSave}
                onPreview={handleDesignPreview}
                onExport={handleDesignExport}
                initialDesign={currentDesign || undefined}
                availableDataSources={['products', 'orders', 'customers', 'inventory']}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}