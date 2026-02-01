'use client'

import React, { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  FileText, 
  Download, 
  TrendingUp, 
  TrendingDown,
  Minus,
  AlertTriangle, 
  CheckCircle, 
  BarChart3,
  PieChart,
  Target,
  Calendar,
  User,
  Building,
  Loader2
} from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title } from 'chart.js'
import { Pie, Bar, Line } from 'react-chartjs-2'

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title)

interface ExecutiveReportData {
  title: string
  subtitle: string
  reportType: string
  dateRange: string
  preparedBy: string
  department: string
  executiveSummary: string
  keyMetrics: KPIMetric[]
  insights: string[]
  recommendations: string[]
  data: any[]
  charts: ChartConfig[]
}

interface KPIMetric {
  id: string
  name: string
  value: number
  target: number
  unit: string
  trend: 'up' | 'down' | 'stable'
  status: 'good' | 'warning' | 'critical'
  description: string
}

interface ChartConfig {
  id: string
  type: 'bar' | 'pie' | 'line' | 'gauge'
  title: string
  data: any[]
  options: any
}

interface ExecutiveReportGeneratorProps {
  data: any[]
  query: any
  onClose: () => void
}

export default function ExecutiveReportGenerator({ data, query, onClose }: ExecutiveReportGeneratorProps) {
  const [reportData, setReportData] = useState<ExecutiveReportData>({
    title: 'Executive Report',
    subtitle: 'Manufacturing & Inventory Analysis',
    reportType: 'monthly',
    dateRange: 'Current Month',
    preparedBy: 'System Administrator',
    department: 'Manufacturing Operations',
    executiveSummary: '',
    keyMetrics: [],
    insights: [],
    recommendations: [],
    data: data || [],
    charts: []
  })
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const generateExecutiveSummary = async () => {
    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/ai/executive-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: reportData.data,
          query: query,
          context: {
            reportType: reportData.reportType,
            dateRange: reportData.dateRange,
            department: reportData.department
          }
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        setReportData(prev => ({
          ...prev,
          executiveSummary: result.summary,
          keyMetrics: result.metrics,
          insights: result.insights,
          recommendations: result.recommendations
        }))
        toast({
          title: 'AI Analysis Complete',
          description: 'Executive summary and insights generated successfully'
        })
      } else {
        throw new Error('Failed to generate executive summary')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate AI analysis. Using default summary.',
        variant: 'destructive'
      })
      // Fallback to basic summary
      setReportData(prev => ({
        ...prev,
        executiveSummary: generateBasicSummary(),
        keyMetrics: generateBasicMetrics(),
        insights: generateBasicInsights(),
        recommendations: generateBasicRecommendations()
      }))
    } finally {
      setIsAnalyzing(false)
    }
  }

  const generateBasicSummary = () => {
    const recordCount = reportData.data.length
    const currentDate = new Date().toLocaleDateString()
    return `This ${reportData.reportType} report contains analysis of ${recordCount} records as of ${currentDate}. The data shows current operational status across ${reportData.department} with key performance indicators and trend analysis.`
  }

  const generateBasicMetrics = (): KPIMetric[] => {
    const metrics: KPIMetric[] = []
    
    if (reportData.data.length > 0) {
      // Total Records
      metrics.push({
        id: 'total-records',
        name: 'Total Records',
        value: reportData.data.length,
        target: Math.ceil(reportData.data.length * 1.1),
        unit: 'records',
        trend: 'up',
        status: 'good',
        description: 'Total number of records in the analysis'
      })

      // Check for common fields and generate metrics
      const firstRecord = reportData.data[0]
      if (firstRecord.price !== undefined) {
        const avgPrice = reportData.data.reduce((sum, item) => sum + (item.price || 0), 0) / reportData.data.length
        metrics.push({
          id: 'avg-price',
          name: 'Average Price',
          value: avgPrice,
          target: avgPrice * 1.05,
          unit: '$',
          trend: 'stable',
          status: 'good',
          description: 'Average price across all items'
        })
      }

      if (firstRecord.stock_quantity !== undefined) {
        const totalStock = reportData.data.reduce((sum, item) => sum + (item.stock_quantity || 0), 0)
        metrics.push({
          id: 'total-stock',
          name: 'Total Stock',
          value: totalStock,
          target: totalStock * 1.2,
          unit: 'units',
          trend: 'down',
          status: 'warning',
          description: 'Total stock quantity across all products'
        })
      }
    }

    return metrics
  }

  const generateBasicInsights = (): string[] => {
    const insights: string[] = []
    
    if (reportData.data.length > 0) {
      insights.push(`Analysis covers ${reportData.data.length} records across the reporting period.`)
      
      const fields = Object.keys(reportData.data[0])
      insights.push(`Data includes ${fields.length} key attributes for comprehensive analysis.`)
      
      if (fields.includes('category')) {
        const categories = [...new Set(reportData.data.map(item => item.category).filter(Boolean))]
        insights.push(`Operations span ${categories.length} distinct categories: ${categories.slice(0, 3).join(', ')}${categories.length > 3 ? '...' : ''}.`)
      }
      
      if (fields.includes('stock_quantity')) {
        const lowStock = reportData.data.filter(item => item.stock_quantity < item.min_stock_level).length
        if (lowStock > 0) {
          insights.push(`${lowStock} items currently below minimum stock levels, requiring immediate attention.`)
        }
      }
    }

    return insights
  }

  const generateBasicRecommendations = (): string[] => {
    const recommendations: string[] = []
    
    if (reportData.data.length > 0) {
      recommendations.push('Continue monitoring key performance indicators on a regular basis.')
      
      const fields = Object.keys(reportData.data[0])
      
      if (fields.includes('stock_quantity')) {
        const lowStock = reportData.data.filter(item => item.stock_quantity < item.min_stock_level).length
        if (lowStock > 0) {
          recommendations.push(`Review and restock ${lowStock} items currently below minimum levels.`)
        }
      }
      
      if (fields.includes('price')) {
        recommendations.push('Review pricing strategy based on current market conditions and cost analysis.')
      }
      
      recommendations.push('Implement automated alerts for critical threshold breaches.')
      recommendations.push('Schedule quarterly reviews of operational metrics and targets.')
    }

    return recommendations
  }

  const generatePDF = async () => {
    setIsGenerating(true)
    try {
      const element = reportRef.current
      if (!element) throw new Error('Report element not found')

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210
      const pageHeight = 295
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      const fileName = `${reportData.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(fileName)

      toast({
        title: 'Success',
        description: 'Executive report generated successfully'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate PDF report',
        variant: 'destructive'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Advanced Chart Rendering Functions
  const renderCategoryDistributionChart = () => {
    if (!reportData.data.length) return null
    
    const categoryData = reportData.data.reduce((acc, item) => {
      const category = item.category || 'Uncategorized'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const pieData = {
      labels: Object.keys(categoryData),
      datasets: [{
        data: Object.values(categoryData),
        backgroundColor: [
          '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
          '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
        ],
        borderWidth: 0
      }]
    }

    const pieOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: { boxWidth: 12, padding: 10 }
        }
      }
    }

    return (
      <div className="bg-white p-4 rounded-lg border">
        <h4 className="font-semibold mb-4">Category Distribution</h4>
        <div style={{ height: '200px' }}>
          <Pie data={pieData} options={pieOptions} />
        </div>
      </div>
    )
  }

  const renderStockLevelChart = () => {
    if (!reportData.data.length) return null
    
    const stockData = reportData.data.reduce((acc, item) => {
      if (!item.stock_quantity && !item.min_stock_level) return acc
      
      const stockLevel = item.stock_quantity || 0
      const minLevel = item.min_stock_level || 0
      
      if (stockLevel === 0) acc.outOfStock++
      else if (stockLevel <= minLevel) acc.lowStock++
      else acc.normal++
      
      return acc
    }, { outOfStock: 0, lowStock: 0, normal: 0 })

    const barData = {
      labels: ['Out of Stock', 'Low Stock', 'Normal'],
      datasets: [{
        label: 'Items',
        data: [stockData.outOfStock, stockData.lowStock, stockData.normal],
        backgroundColor: ['#EF4444', '#F59E0B', '#10B981'],
        borderRadius: 4
      }]
    }

    const barOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 }
        }
      }
    }

    return (
      <div className="bg-white p-4 rounded-lg border">
        <h4 className="font-semibold mb-4">Stock Level Status</h4>
        <div style={{ height: '200px' }}>
          <Bar data={barData} options={barOptions} />
        </div>
      </div>
    )
  }

  const renderValueAnalysisChart = () => {
    if (!reportData.data.length) return null
    
    const valueData = reportData.data
      .filter(item => item.price && item.stock_quantity)
      .map(item => ({
        name: item.name?.substring(0, 20) + '...' || 'Unknown',
        value: (item.price || 0) * (item.stock_quantity || 0)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    const barData = {
      labels: valueData.map(item => item.name),
      datasets: [{
        label: 'Total Value ($)',
        data: valueData.map(item => item.value),
        backgroundColor: '#3B82F6',
        borderRadius: 4
      }]
    }

    const barOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value: any) {
              return '$' + value.toLocaleString()
            }
          }
        },
        x: {
          ticks: { maxRotation: 45 }
        }
      }
    }

    return (
      <div className="bg-white p-4 rounded-lg border">
        <h4 className="font-semibold mb-4">Top 10 Items by Value</h4>
        <div style={{ height: '200px' }}>
          <Bar data={barData} options={barOptions} />
        </div>
      </div>
    )
  }

  const renderTrendAnalysisChart = () => {
    if (!reportData.data.length) return null
    
    // Create mock trend data based on current metrics
    const trendData = reportData.keyMetrics.map(metric => ({
      name: metric.name,
      current: metric.value,
      target: metric.target,
      trend: metric.trend
    }))

    const lineData = {
      labels: trendData.map(item => item.name),
      datasets: [
        {
          label: 'Current Value',
          data: trendData.map(item => item.current),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Target Value',
          data: trendData.map(item => item.target),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: false,
          borderDash: [5, 5]
        }
      ]
    }

    const lineOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: { boxWidth: 12, padding: 10 }
        }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }

    return (
      <div className="bg-white p-4 rounded-lg border">
        <h4 className="font-semibold mb-4">Performance vs Target</h4>
        <div style={{ height: '200px' }}>
          <Line data={lineData} options={lineOptions} />
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-100 text-green-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down': return <TrendingUp className="h-4 w-4 text-red-500 transform rotate-180" />
      default: return <TrendingUp className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Executive Report Configuration
          </CardTitle>
          <CardDescription>
            Configure your executive report settings and generate AI-powered insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Report Title</Label>
              <Input
                id="title"
                value={reportData.title}
                onChange={(e) => setReportData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input
                id="subtitle"
                value={reportData.subtitle}
                onChange={(e) => setReportData(prev => ({ ...prev, subtitle: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="reportType">Report Type</Label>
              <Select value={reportData.reportType} onValueChange={(value) => setReportData(prev => ({ ...prev, reportType: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily Report</SelectItem>
                  <SelectItem value="weekly">Weekly Report</SelectItem>
                  <SelectItem value="monthly">Monthly Report</SelectItem>
                  <SelectItem value="quarterly">Quarterly Report</SelectItem>
                  <SelectItem value="annual">Annual Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="preparedBy">Prepared By</Label>
              <Input
                id="preparedBy"
                value={reportData.preparedBy}
                onChange={(e) => setReportData(prev => ({ ...prev, preparedBy: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={reportData.department}
                onChange={(e) => setReportData(prev => ({ ...prev, department: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button 
              onClick={generateExecutiveSummary}
              disabled={isAnalyzing}
              className="flex-1"
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <BarChart3 className="h-4 w-4 mr-2" />
              )}
              Generate AI Analysis
            </Button>
            <Button 
              onClick={generatePDF}
              disabled={isGenerating}
              variant="outline"
              className="flex-1"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Generate PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Preview */}
      <div ref={reportRef} className="bg-white p-8 shadow-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{reportData.title}</h1>
          <h2 className="text-xl text-gray-600 mb-4">{reportData.subtitle}</h2>
          <div className="flex justify-center gap-8 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {reportData.dateRange}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              {reportData.preparedBy}
            </span>
            <span className="flex items-center gap-1">
              <Building className="h-4 w-4" />
              {reportData.department}
            </span>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Executive Summary */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Executive Summary</h3>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-gray-700 leading-relaxed">
              {reportData.executiveSummary || 'Click "Generate AI Analysis" to create an executive summary based on your data.'}
            </p>
          </div>
        </div>

        {/* Key Metrics */}
        {reportData.keyMetrics.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Key Performance Indicators</h3>
            <div className="grid grid-cols-2 gap-4">
              {reportData.keyMetrics.map(metric => (
                <div key={metric.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900">{metric.name}</h4>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(metric.trend)}
                      <Badge className={getStatusColor(metric.status)}>
                        {metric.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {metric.unit === '$' ? '$' : ''}{metric.value.toLocaleString()}{metric.unit !== '$' ? ` ${metric.unit}` : ''}
                  </div>
                  <div className="text-sm text-gray-500">
                    Target: {metric.unit === '$' ? '$' : ''}{metric.target.toLocaleString()}{metric.unit !== '$' ? ` ${metric.unit}` : ''}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{metric.description}</p>
                  
                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{Math.round((metric.value / metric.target) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          metric.status === 'good' ? 'bg-green-500' : 
                          metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(100, (metric.value / metric.target) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Advanced Analytics Dashboard */}
        {reportData.data.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Analytics Dashboard</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Distribution Chart */}
              {renderCategoryDistributionChart()}
              
              {/* Stock Level Status Chart */}
              {renderStockLevelChart()}
              
              {/* Value Analysis Chart */}
              {renderValueAnalysisChart()}
              
              {/* Trend Analysis Chart */}
              {renderTrendAnalysisChart()}
            </div>
          </div>
        )}

        {/* Key Insights */}
        {reportData.insights.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Key Insights</h3>
            <div className="space-y-3">
              {reportData.insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {reportData.recommendations.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Strategic Recommendations</h3>
            <div className="space-y-3">
              {reportData.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Target className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Summary */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Data Summary</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{reportData.data.length}</div>
                <div className="text-sm text-gray-600">Total Records</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{Object.keys(reportData.data[0] || {}).length}</div>
                <div className="text-sm text-gray-600">Data Fields</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{new Date().toLocaleDateString()}</div>
                <div className="text-sm text-gray-600">Report Date</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-8 pt-4 border-t">
          <p>Generated by Executive Report System • {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  )
}