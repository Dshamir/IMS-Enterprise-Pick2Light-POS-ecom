'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Play, Loader2, Plus, Table, BarChart3, PieChart, Settings, Eye, Palette } from 'lucide-react'
import ProfessionalReportDesigner from '@/components/reports/professional-report-designer'

interface SimpleTemplate {
  id: string
  name: string
  description: string
  category: string
}

interface TableInfo {
  name: string
  columns: Array<{
    name: string
    type: string
    nullable: boolean
    primaryKey: boolean
  }>
  columnCount: number
}

interface ReportResult {
  success: boolean
  data?: any[]
  metadata?: {
    totalRecords: number
    executionTime: number
    dataQuality?: { overall: { score: number } }
  }
  error?: string
}

export default function SimpleReportsPage() {
  const [templates, setTemplates] = useState<SimpleTemplate[]>([])
  const [tables, setTables] = useState<TableInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState('Loading...')
  const [activeTab, setActiveTab] = useState('templates')
  
  // Report Builder State
  const [selectedTable, setSelectedTable] = useState('')
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [reportTitle, setReportTitle] = useState('')
  const [reportResult, setReportResult] = useState<ReportResult | null>(null)

  const loadTemplates = async () => {
    try {
      setIsLoading(true)
      setDebugInfo('Making API call...')
      
      const response = await fetch('/api/reports/dynamic?action=templates')
      const data = await response.json()
      
      setDebugInfo(`API Response: ${response.status} - Templates: ${data.templates?.length || 0}`)
      
      if (response.ok && data.templates) {
        setTemplates(data.templates)
        setDebugInfo(`SUCCESS: ${data.templates.length} templates loaded and displayed`)
      } else {
        setDebugInfo(`ERROR: ${data.error || 'No templates received'}`)
      }
    } catch (error) {
      setDebugInfo(`EXCEPTION: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const loadTables = async () => {
    try {
      const response = await fetch('/api/reports/dynamic?action=tables')
      const data = await response.json()
      
      if (response.ok && data.tables) {
        setTables(data.tables)
        setDebugInfo(prev => prev + ` | Tables: ${data.tables.length}`)
      }
    } catch (error) {
      console.error('Failed to load tables:', error)
    }
  }

  const buildCustomReport = async () => {
    if (!selectedTable || selectedColumns.length === 0) {
      alert('Please select a table and at least one column')
      return
    }

    try {
      setIsLoading(true)
      setDebugInfo('Building custom report...')
      
      const query = {
        table: selectedTable,
        fields: selectedColumns.map(col => ({ name: col, alias: col.replace('.', '_'), type: 'auto' })),
        limit: 100
      }
      
      const response = await fetch('/api/reports/dynamic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          query
        })
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        setReportResult(result)
        setDebugInfo(`CUSTOM REPORT: ${result.data.length} records generated`)
        alert(`Custom report generated!\\n\\nRecords: ${result.data.length}\\nExecution time: ${result.metadata.executionTime}ms`)
      } else {
        setDebugInfo(`CUSTOM REPORT ERROR: ${result.error}`)
        alert(`Report generation failed: ${result.error}`)
      }
    } catch (error) {
      setDebugInfo(`CUSTOM REPORT EXCEPTION: ${error}`)
      alert(`Report generation failed: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
    loadTables()
  }, [])

  const generateReport = async (templateId: string) => {
    try {
      setDebugInfo(`Generating report for ${templateId}...`)
      
      const response = await fetch('/api/reports/dynamic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          templateId,
          userId: 'user123',
          validateData: true
        })
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        setDebugInfo(`REPORT GENERATED: ${result.metadata.totalRecords} records`)
        alert(`Report generated successfully!\n\nRecords: ${result.metadata.totalRecords}\nExecution time: ${result.metadata.executionTime}ms\n\nData quality: ${result.metadata.dataQuality?.overall.score.toFixed(1)}%`)
      } else {
        setDebugInfo(`REPORT ERROR: ${result.error}`)
        alert(`Report generation failed: ${result.error}`)
      }
    } catch (error) {
      setDebugInfo(`REPORT EXCEPTION: ${error}`)
      alert(`Report generation failed: ${error}`)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Professional Visual Report Designer</h1>
        <p className="text-muted-foreground mt-2">
          Complete visual report design system with drag-and-drop interface, professional layout tools, and database integration
        </p>
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="text-sm">
            <strong>System:</strong> {debugInfo}
          </div>
          <div className="text-sm mt-1">
            <strong>Templates:</strong> {templates.length} | <strong>Tables:</strong> {tables.length} | <strong>Loading:</strong> {isLoading ? 'YES' : 'NO'}
          </div>
          <Button onClick={() => { loadTemplates(); loadTables(); }} size="sm" className="mt-2">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Refresh Data
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Quick Reports
          </TabsTrigger>
          <TabsTrigger value="designer" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Visual Designer
          </TabsTrigger>
          <TabsTrigger value="builder" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Simple Builder
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.length === 0 && !isLoading && (
              <div className="col-span-full text-center py-8 text-red-600 bg-red-50 border border-red-200 rounded">
                <h3 className="font-semibold">No Templates Found</h3>
                <p>The API is working but no templates are being displayed.</p>
              </div>
            )}
            
            {templates.map((template, index) => (
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
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      Template #{index + 1}
                    </span>
                    <Button
                      onClick={() => generateReport(template.id)}
                      size="sm"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Generate Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {templates.length > 0 && (
            <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded">
              <h3 className="font-semibold text-green-800">✅ QUICK REPORTS READY</h3>
              <p className="text-green-700">
                Found {templates.length} pre-built templates. Click "Generate Report" for instant results.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="designer">
          <ProfessionalReportDesigner />
        </TabsContent>

        <TabsContent value="builder">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Simple Report Builder
              </CardTitle>
              <CardDescription>
                Basic table/column selection for quick custom reports (for advanced design, use Visual Designer tab)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="report-title">Report Title</Label>
                    <Input
                      id="report-title"
                      placeholder="Enter report title..."
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="table-select">Data Source (Table)</Label>
                    <Select value={selectedTable} onValueChange={setSelectedTable}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a table..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tables.map((table) => (
                          <SelectItem key={table.name} value={table.name}>
                            <div className="flex items-center gap-2">
                              <Table className="h-4 w-4" />
                              {table.name} ({table.columnCount} columns)
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedTable && (
                    <div>
                      <Label>Available Columns ({tables.find(t => t.name === selectedTable)?.columns.length || 0})</Label>
                      <div className="mt-2 max-h-60 overflow-y-auto border rounded p-2 space-y-1">
                        {tables.find(t => t.name === selectedTable)?.columns.map((col) => (
                          <div key={col.name} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`col-${col.name}`}
                              checked={selectedColumns.includes(col.name)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedColumns([...selectedColumns, col.name])
                                } else {
                                  setSelectedColumns(selectedColumns.filter(c => c !== col.name))
                                }
                              }}
                            />
                            <label htmlFor={`col-${col.name}`} className="text-sm cursor-pointer flex items-center gap-2">
                              <span className="font-mono text-xs bg-gray-100 px-1 rounded">{col.type}</span>
                              {col.name}
                              {col.primaryKey && <Badge variant="outline" className="text-xs">PK</Badge>}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t">
                <Button
                  onClick={buildCustomReport}
                  disabled={!selectedTable || selectedColumns.length === 0 || isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                  Build Custom Report
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedTable('')
                    setSelectedColumns([])
                    setReportTitle('')
                    setReportResult(null)
                  }}
                >
                  Clear Selection
                </Button>
              </div>

              {selectedColumns.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <h4 className="font-semibold text-sm">Selected Fields ({selectedColumns.length}):</h4>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedColumns.map((col) => (
                      <Badge key={col} variant="secondary" className="text-xs">
                        {col}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Report Results
              </CardTitle>
              <CardDescription>
                View generated reports and data analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportResult ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{reportResult.data?.length || 0}</div>
                        <p className="text-xs text-muted-foreground">Records</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{reportResult.metadata?.executionTime || 0}ms</div>
                        <p className="text-xs text-muted-foreground">Execution Time</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">
                          {reportResult.metadata?.dataQuality?.overall?.score?.toFixed(1) || 'N/A'}%
                        </div>
                        <p className="text-xs text-muted-foreground">Data Quality</p>
                      </CardContent>
                    </Card>
                  </div>

                  {reportResult.data && reportResult.data.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b">
                        <h4 className="font-semibold">Data Preview (First 10 rows)</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              {Object.keys(reportResult.data[0]).map((key) => (
                                <th key={key} className="text-left p-2 border-r">{key}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {reportResult.data.slice(0, 10).map((row, idx) => (
                              <tr key={idx} className="border-b hover:bg-gray-50">
                                {Object.values(row).map((value, cellIdx) => (
                                  <td key={cellIdx} className="p-2 border-r">
                                    {value?.toString() || 'NULL'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No report results yet. Generate a report to see data here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}