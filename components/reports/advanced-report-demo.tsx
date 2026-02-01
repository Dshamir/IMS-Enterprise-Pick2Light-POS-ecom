'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'
import { 
  Download, 
  FileText, 
  Image, 
  Globe, 
  Loader2, 
  BarChart3, 
  PieChart,
  TrendingUp,
  Settings,
  Palette,
  Layout,
  Sparkles
} from 'lucide-react'

interface DemoReportProps {
  data: any[]
  onClose: () => void
}

export default function AdvancedReportDemo({ data, onClose }: DemoReportProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportConfig, setReportConfig] = useState({
    title: 'Advanced Analytics Report',
    subtitle: 'Generated with Puppeteer + D3.js',
    format: 'pdf',
    template: 'executive',
    styling: {
      theme: 'corporate',
      fontFamily: 'Arial, sans-serif',
      fontSize: 12,
      colors: {
        primary: '#3b82f6',
        secondary: '#10b981',
        accent: '#f59e0b',
        background: '#ffffff',
        text: '#1f2937',
        muted: '#6b7280'
      }
    },
    layout: {
      pageSize: 'A4',
      orientation: 'portrait',
      columns: 2,
      spacing: 20,
      margins: { top: 50, right: 50, bottom: 50, left: 50 }
    },
    charts: [
      {
        id: 'category-distribution',
        type: 'bar',
        title: 'Data Distribution by Category',
        x: 'category',
        y: 'count',
        width: 400,
        height: 300
      },
      {
        id: 'value-breakdown',
        type: 'pie',
        title: 'Value Breakdown',
        x: 'category',
        y: 'value',
        width: 400,
        height: 300
      },
      {
        id: 'trend-analysis',
        type: 'line',
        title: 'Trend Analysis',
        x: 'date',
        y: 'value',
        width: 800,
        height: 300
      }
    ]
  })

  const { toast } = useToast()

  const generateSampleData = () => {
    if (data && data.length > 0) {
      return data
    }

    // Generate sample data for demo
    return [
      { category: 'Products', count: 150, value: 25000, date: '2024-01', trend: 'up' },
      { category: 'Services', count: 45, value: 12000, date: '2024-02', trend: 'stable' },
      { category: 'Equipment', count: 23, value: 85000, date: '2024-03', trend: 'down' },
      { category: 'Supplies', count: 78, value: 5500, date: '2024-04', trend: 'up' },
      { category: 'Tools', count: 32, value: 15000, date: '2024-05', trend: 'up' }
    ]
  }

  const processChartsData = () => {
    const sampleData = generateSampleData()
    
    return reportConfig.charts.map(chart => ({
      ...chart,
      data: sampleData.map(item => ({
        [chart.x]: item[chart.x as keyof typeof item],
        [chart.y]: item[chart.y as keyof typeof item]
      }))
    }))
  }

  const generateReport = async () => {
    setIsGenerating(true)
    
    try {
      const chartsWithData = processChartsData()
      
      const response = await fetch('/api/reports/render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: reportConfig.title,
          subtitle: reportConfig.subtitle,
          format: reportConfig.format,
          template: reportConfig.template,
          data: generateSampleData(),
          charts: chartsWithData,
          styling: reportConfig.styling,
          layout: reportConfig.layout,
          metadata: {
            author: 'System Administrator',
            description: 'Demo report generated with advanced renderer',
            tags: ['demo', 'analytics', 'puppeteer', 'd3js'],
            company: 'Your Company',
            department: 'Analytics'
          }
        })
      })

      if (response.ok) {
        if (reportConfig.format === 'html') {
          const result = await response.json()
          toast({
            title: 'Report Generated',
            description: `HTML report generated successfully in ${result.result.duration}ms`
          })
        } else {
          // For PDF, PNG, SVG - download the file
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `advanced-report-${Date.now()}.${reportConfig.format}`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
          
          toast({
            title: 'Report Generated',
            description: `${reportConfig.format.toUpperCase()} report downloaded successfully`
          })
        }
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate report')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate report',
        variant: 'destructive'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const previewReport = async () => {
    try {
      const response = await fetch('/api/reports/render', {
        method: 'GET'
      })
      
      if (response.ok) {
        const info = await response.json()
        console.log('Report renderer capabilities:', info)
        toast({
          title: 'Renderer Info',
          description: `Supports ${info.capabilities.formats.length} formats and ${info.capabilities.chartTypes.length} chart types`
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to get renderer info',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-blue-600" />
            Advanced Report Generator
          </CardTitle>
          <CardDescription>
            Generate professional reports with Puppeteer + D3.js featuring rich visualizations and multiple output formats
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Configuration Panel */}
        <div className="space-y-6">
          {/* Basic Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Report Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Report Title</Label>
                <Input
                  id="title"
                  value={reportConfig.title}
                  onChange={(e) => setReportConfig(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  value={reportConfig.subtitle}
                  onChange={(e) => setReportConfig(prev => ({ ...prev, subtitle: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="format">Output Format</Label>
                  <Select value={reportConfig.format} onValueChange={(value) => setReportConfig(prev => ({ ...prev, format: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          PDF
                        </div>
                      </SelectItem>
                      <SelectItem value="png">
                        <div className="flex items-center gap-2">
                          <Image className="h-4 w-4" />
                          PNG
                        </div>
                      </SelectItem>
                      <SelectItem value="html">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          HTML
                        </div>
                      </SelectItem>
                      <SelectItem value="svg">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          SVG
                        </div>
                      </SelectItem>
                      <SelectItem value="xlsx">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Excel
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="template">Template</Label>
                  <Select value={reportConfig.template} onValueChange={(value) => setReportConfig(prev => ({ ...prev, template: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="executive">Executive</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="dashboard">Dashboard</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Styling Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Styling Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="theme">Theme</Label>
                  <Select value={reportConfig.styling.theme} onValueChange={(value) => setReportConfig(prev => ({ 
                    ...prev, 
                    styling: { ...prev.styling, theme: value }
                  }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corporate">Corporate</SelectItem>
                      <SelectItem value="modern">Modern</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="fontFamily">Font Family</Label>
                  <Select value={reportConfig.styling.fontFamily} onValueChange={(value) => setReportConfig(prev => ({ 
                    ...prev, 
                    styling: { ...prev.styling, fontFamily: value }
                  }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                      <SelectItem value="Georgia, serif">Georgia</SelectItem>
                      <SelectItem value="Times New Roman, serif">Times New Roman</SelectItem>
                      <SelectItem value="Helvetica, sans-serif">Helvetica</SelectItem>
                      <SelectItem value="Courier New, monospace">Courier New</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="fontSize">Font Size</Label>
                <Input
                  id="fontSize"
                  type="number"
                  value={reportConfig.styling.fontSize}
                  onChange={(e) => setReportConfig(prev => ({ 
                    ...prev, 
                    styling: { ...prev.styling, fontSize: parseInt(e.target.value) || 12 }
                  }))}
                  min="8"
                  max="24"
                />
              </div>
            </CardContent>
          </Card>

          {/* Layout Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="h-5 w-5" />
                Layout Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pageSize">Page Size</Label>
                  <Select value={reportConfig.layout.pageSize} onValueChange={(value) => setReportConfig(prev => ({ 
                    ...prev, 
                    layout: { ...prev.layout, pageSize: value }
                  }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">A4</SelectItem>
                      <SelectItem value="A3">A3</SelectItem>
                      <SelectItem value="letter">Letter</SelectItem>
                      <SelectItem value="legal">Legal</SelectItem>
                      <SelectItem value="tabloid">Tabloid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="orientation">Orientation</Label>
                  <Select value={reportConfig.layout.orientation} onValueChange={(value) => setReportConfig(prev => ({ 
                    ...prev, 
                    layout: { ...prev.layout, orientation: value }
                  }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">Portrait</SelectItem>
                      <SelectItem value="landscape">Landscape</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="columns">Columns</Label>
                  <Input
                    id="columns"
                    type="number"
                    value={reportConfig.layout.columns}
                    onChange={(e) => setReportConfig(prev => ({ 
                      ...prev, 
                      layout: { ...prev.layout, columns: parseInt(e.target.value) || 2 }
                    }))}
                    min="1"
                    max="4"
                  />
                </div>
                
                <div>
                  <Label htmlFor="spacing">Spacing</Label>
                  <Input
                    id="spacing"
                    type="number"
                    value={reportConfig.layout.spacing}
                    onChange={(e) => setReportConfig(prev => ({ 
                      ...prev, 
                      layout: { ...prev.layout, spacing: parseInt(e.target.value) || 20 }
                    }))}
                    min="0"
                    max="50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Configuration */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Chart Configuration
              </CardTitle>
              <CardDescription>
                Configure D3.js visualizations for your report
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportConfig.charts.map((chart, index) => (
                  <div key={chart.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">{chart.title}</h4>
                      <Badge variant="outline">{chart.type}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Chart Type</Label>
                        <Select value={chart.type} onValueChange={(value) => {
                          const newCharts = [...reportConfig.charts]
                          newCharts[index] = { ...chart, type: value }
                          setReportConfig(prev => ({ ...prev, charts: newCharts }))
                        }}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bar">Bar Chart</SelectItem>
                            <SelectItem value="line">Line Chart</SelectItem>
                            <SelectItem value="pie">Pie Chart</SelectItem>
                            <SelectItem value="scatter">Scatter Plot</SelectItem>
                            <SelectItem value="area">Area Chart</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Title</Label>
                        <Input
                          value={chart.title}
                          onChange={(e) => {
                            const newCharts = [...reportConfig.charts]
                            newCharts[index] = { ...chart, title: e.target.value }
                            setReportConfig(prev => ({ ...prev, charts: newCharts }))
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Width</Label>
                        <Input
                          type="number"
                          value={chart.width}
                          onChange={(e) => {
                            const newCharts = [...reportConfig.charts]
                            newCharts[index] = { ...chart, width: parseInt(e.target.value) || 400 }
                            setReportConfig(prev => ({ ...prev, charts: newCharts }))
                          }}
                          min="200"
                          max="1200"
                        />
                      </div>
                      
                      <div>
                        <Label>Height</Label>
                        <Input
                          type="number"
                          value={chart.height}
                          onChange={(e) => {
                            const newCharts = [...reportConfig.charts]
                            newCharts[index] = { ...chart, height: parseInt(e.target.value) || 300 }
                            setReportConfig(prev => ({ ...prev, charts: newCharts }))
                          }}
                          min="150"
                          max="800"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button onClick={previewReport} variant="outline" className="w-full">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Preview Info
                </Button>
                
                <Button onClick={generateReport} disabled={isGenerating} className="w-full">
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Generate Report
                </Button>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Features</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• High-quality PDF/PNG/SVG/Excel output</li>
                  <li>• Interactive D3.js visualizations</li>
                  <li>• Professional report templates</li>
                  <li>• Customizable styling & layout</li>
                  <li>• Multiple chart types supported</li>
                  <li>• Excel reports with multiple sheets</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}