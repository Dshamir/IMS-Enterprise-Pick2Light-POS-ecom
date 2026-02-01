'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { 
  BarChart3, 
  PieChart, 
  LineChart, 
  TrendingUp, 
  Activity,
  Target,
  Plus,
  Trash2,
  Eye,
  Save,
  Settings,
  Palette,
  Layout,
  Grid
} from 'lucide-react'

interface ChartConfig {
  id: string
  title: string
  type: 'line' | 'bar' | 'pie' | 'area' | 'column' | 'scatter' | 'gauge' | 'donut'
  xAxis: string
  yAxis: string | string[]
  series: SeriesConfig[]
  options: ChartOptions
  size: { width: number; height: number }
  position: { x: number; y: number }
}

interface SeriesConfig {
  id: string
  name: string
  field: string
  type: 'line' | 'bar' | 'area' | 'scatter'
  color: string
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max'
  visible: boolean
}

interface ChartOptions {
  showLegend: boolean
  showGrid: boolean
  showLabels: boolean
  showTooltip: boolean
  animation: boolean
  colors: string[]
  height: number
  width?: number
  theme: 'light' | 'dark' | 'custom'
  legendPosition: 'top' | 'bottom' | 'left' | 'right'
  gridColor: string
  backgroundColor: string
  fontFamily: string
  fontSize: number
}

interface ChartConfigBuilderProps {
  fields: string[]
  data?: any[]
  onConfigChange: (config: ChartConfig[]) => void
  onPreview: (config: ChartConfig) => void
  initialConfig?: ChartConfig[]
}

const chartTypes = [
  { value: 'line', label: 'Line Chart', icon: LineChart, description: 'Show trends over time' },
  { value: 'bar', label: 'Bar Chart', icon: BarChart3, description: 'Compare values across categories' },
  { value: 'column', label: 'Column Chart', icon: BarChart3, description: 'Vertical bar chart' },
  { value: 'pie', label: 'Pie Chart', icon: PieChart, description: 'Show proportions of a whole' },
  { value: 'donut', label: 'Donut Chart', icon: PieChart, description: 'Pie chart with hollow center' },
  { value: 'area', label: 'Area Chart', icon: Activity, description: 'Filled line chart' },
  { value: 'scatter', label: 'Scatter Plot', icon: Target, description: 'Show correlation between variables' },
  { value: 'gauge', label: 'Gauge Chart', icon: TrendingUp, description: 'Show single value progress' }
]

const colorPalettes = [
  { name: 'Default', colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'] },
  { name: 'Pastel', colors: ['#93C5FD', '#86EFAC', '#FDE68A', '#FCA5A5', '#C4B5FD'] },
  { name: 'Vibrant', colors: ['#1D4ED8', '#059669', '#D97706', '#DC2626', '#7C3AED'] },
  { name: 'Monochrome', colors: ['#111827', '#374151', '#6B7280', '#9CA3AF', '#D1D5DB'] },
  { name: 'Ocean', colors: ['#0EA5E9', '#0284C7', '#0369A1', '#075985', '#0C4A6E'] },
  { name: 'Sunset', colors: ['#F59E0B', '#F97316', '#EA580C', '#DC2626', '#B91C1C'] }
]

export default function ChartConfigBuilder({ 
  fields, 
  data, 
  onConfigChange, 
  onPreview, 
  initialConfig = [] 
}: ChartConfigBuilderProps) {
  const [charts, setCharts] = useState<ChartConfig[]>(initialConfig)
  const [selectedChartId, setSelectedChartId] = useState<string>('')
  const [activeTab, setActiveTab] = useState<string>('type')
  const { toast } = useToast()

  useEffect(() => {
    onConfigChange(charts)
  }, [charts, onConfigChange])

  const addChart = () => {
    const newChart: ChartConfig = {
      id: `chart_${Date.now()}`,
      title: `Chart ${charts.length + 1}`,
      type: 'bar',
      xAxis: fields[0] || '',
      yAxis: fields[1] || '',
      series: [],
      options: {
        showLegend: true,
        showGrid: true,
        showLabels: true,
        showTooltip: true,
        animation: true,
        colors: colorPalettes[0].colors,
        height: 300,
        theme: 'light',
        legendPosition: 'top',
        gridColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        fontFamily: 'Inter, sans-serif',
        fontSize: 12
      },
      size: { width: 6, height: 4 },
      position: { x: 0, y: 0 }
    }
    
    setCharts([...charts, newChart])
    setSelectedChartId(newChart.id)
  }

  const updateChart = (id: string, updates: Partial<ChartConfig>) => {
    setCharts(charts.map(chart => 
      chart.id === id ? { ...chart, ...updates } : chart
    ))
  }

  const removeChart = (id: string) => {
    setCharts(charts.filter(chart => chart.id !== id))
    if (selectedChartId === id) {
      setSelectedChartId(charts[0]?.id || '')
    }
  }

  const addSeries = (chartId: string) => {
    const newSeries: SeriesConfig = {
      id: `series_${Date.now()}`,
      name: `Series ${charts.find(c => c.id === chartId)?.series.length + 1 || 1}`,
      field: fields[0] || '',
      type: 'line',
      color: colorPalettes[0].colors[0],
      visible: true
    }
    
    updateChart(chartId, {
      series: [...(charts.find(c => c.id === chartId)?.series || []), newSeries]
    })
  }

  const updateSeries = (chartId: string, seriesId: string, updates: Partial<SeriesConfig>) => {
    const chart = charts.find(c => c.id === chartId)
    if (!chart) return

    const updatedSeries = chart.series.map(series =>
      series.id === seriesId ? { ...series, ...updates } : series
    )

    updateChart(chartId, { series: updatedSeries })
  }

  const removeSeries = (chartId: string, seriesId: string) => {
    const chart = charts.find(c => c.id === chartId)
    if (!chart) return

    const updatedSeries = chart.series.filter(series => series.id !== seriesId)
    updateChart(chartId, { series: updatedSeries })
  }

  const handlePreview = (chart: ChartConfig) => {
    onPreview(chart)
  }

  const selectedChart = charts.find(c => c.id === selectedChartId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Chart Configuration</h2>
          <p className="text-muted-foreground">Design interactive charts for your reports</p>
        </div>
        <Button onClick={addChart}>
          <Plus className="h-4 w-4 mr-2" />
          Add Chart
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {/* Chart List */}
        <Card>
          <CardHeader>
            <CardTitle>Charts</CardTitle>
            <CardDescription>Manage your charts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {charts.map(chart => (
              <div
                key={chart.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedChartId === chart.id 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:bg-muted'
                }`}
                onClick={() => setSelectedChartId(chart.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {chartTypes.find(t => t.value === chart.type)?.icon && (
                      React.createElement(chartTypes.find(t => t.value === chart.type)!.icon, {
                        className: "h-4 w-4"
                      })
                    )}
                    <span className="font-medium">{chart.title}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePreview(chart)
                      }}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeChart(chart.id)
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <Badge variant="outline" className="mt-2">
                  {chart.type}
                </Badge>
              </div>
            ))}
            {charts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No charts yet. Add your first chart to get started.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart Configuration */}
        <div className="md:col-span-3">
          {selectedChart ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="type">Type</TabsTrigger>
                <TabsTrigger value="data">Data</TabsTrigger>
                <TabsTrigger value="series">Series</TabsTrigger>
                <TabsTrigger value="style">Style</TabsTrigger>
                <TabsTrigger value="layout">Layout</TabsTrigger>
              </TabsList>

              <TabsContent value="type" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Chart Type</CardTitle>
                    <CardDescription>Choose the best visualization for your data</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      {chartTypes.map(type => (
                        <div
                          key={type.value}
                          className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                            selectedChart.type === type.value
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:bg-muted'
                          }`}
                          onClick={() => updateChart(selectedChart.id, { type: type.value as any })}
                        >
                          <div className="flex items-center gap-3">
                            <type.icon className="h-6 w-6" />
                            <div>
                              <h4 className="font-medium">{type.label}</h4>
                              <p className="text-sm text-muted-foreground">{type.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="data" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Data Configuration</CardTitle>
                    <CardDescription>Configure chart title and data fields</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="chart-title">Chart Title</Label>
                      <Input
                        id="chart-title"
                        value={selectedChart.title}
                        onChange={(e) => updateChart(selectedChart.id, { title: e.target.value })}
                        placeholder="Enter chart title"
                      />
                    </div>

                    <div>
                      <Label htmlFor="x-axis">X-Axis Field</Label>
                      <Select
                        value={selectedChart.xAxis}
                        onValueChange={(value) => updateChart(selectedChart.id, { xAxis: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select X-axis field" />
                        </SelectTrigger>
                        <SelectContent>
                          {fields.map(field => (
                            <SelectItem key={field} value={field}>
                              {field}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="y-axis">Y-Axis Field</Label>
                      <Select
                        value={selectedChart.yAxis as string}
                        onValueChange={(value) => updateChart(selectedChart.id, { yAxis: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Y-axis field" />
                        </SelectTrigger>
                        <SelectContent>
                          {fields.map(field => (
                            <SelectItem key={field} value={field}>
                              {field}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="series" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Data Series
                      <Button onClick={() => addSeries(selectedChart.id)} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Series
                      </Button>
                    </CardTitle>
                    <CardDescription>Configure data series for your chart</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedChart.series.map(series => (
                      <div key={series.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: series.color }}
                            />
                            <span className="font-medium">{series.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={series.visible}
                              onCheckedChange={(checked) => 
                                updateSeries(selectedChart.id, series.id, { visible: checked })
                              }
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSeries(selectedChart.id, series.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Series Name</Label>
                            <Input
                              value={series.name}
                              onChange={(e) => 
                                updateSeries(selectedChart.id, series.id, { name: e.target.value })
                              }
                            />
                          </div>

                          <div>
                            <Label>Field</Label>
                            <Select
                              value={series.field}
                              onValueChange={(value) => 
                                updateSeries(selectedChart.id, series.id, { field: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {fields.map(field => (
                                  <SelectItem key={field} value={field}>
                                    {field}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Series Type</Label>
                            <Select
                              value={series.type}
                              onValueChange={(value) => 
                                updateSeries(selectedChart.id, series.id, { type: value as any })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="line">Line</SelectItem>
                                <SelectItem value="bar">Bar</SelectItem>
                                <SelectItem value="area">Area</SelectItem>
                                <SelectItem value="scatter">Scatter</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Aggregation</Label>
                            <Select
                              value={series.aggregation || 'none'}
                              onValueChange={(value) => 
                                updateSeries(selectedChart.id, series.id, { aggregation: value === 'none' ? undefined : value as any })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="None" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="sum">SUM</SelectItem>
                                <SelectItem value="avg">AVG</SelectItem>
                                <SelectItem value="count">COUNT</SelectItem>
                                <SelectItem value="min">MIN</SelectItem>
                                <SelectItem value="max">MAX</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label>Color</Label>
                          <div className="flex gap-2 mt-2">
                            {colorPalettes[0].colors.map(color => (
                              <button
                                key={color}
                                className={`w-6 h-6 rounded border-2 ${
                                  series.color === color ? 'border-primary' : 'border-transparent'
                                }`}
                                style={{ backgroundColor: color }}
                                onClick={() => 
                                  updateSeries(selectedChart.id, series.id, { color })
                                }
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="style" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Chart Style</CardTitle>
                    <CardDescription>Customize the appearance of your chart</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label>Color Palette</Label>
                      <div className="grid grid-cols-3 gap-3 mt-2">
                        {colorPalettes.map(palette => (
                          <div
                            key={palette.name}
                            className={`p-3 rounded-lg border cursor-pointer ${
                              JSON.stringify(selectedChart.options.colors) === JSON.stringify(palette.colors)
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:bg-muted'
                            }`}
                            onClick={() => updateChart(selectedChart.id, {
                              options: { ...selectedChart.options, colors: palette.colors }
                            })}
                          >
                            <div className="flex gap-1 mb-2">
                              {palette.colors.map(color => (
                                <div
                                  key={color}
                                  className="w-3 h-3 rounded"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                            <p className="text-xs font-medium">{palette.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Chart Height</Label>
                        <div className="mt-2">
                          <Slider
                            value={[selectedChart.options.height]}
                            onValueChange={(value) => updateChart(selectedChart.id, {
                              options: { ...selectedChart.options, height: value[0] }
                            })}
                            max={600}
                            min={200}
                            step={50}
                          />
                          <div className="text-sm text-muted-foreground mt-1">
                            {selectedChart.options.height}px
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label>Font Size</Label>
                        <div className="mt-2">
                          <Slider
                            value={[selectedChart.options.fontSize]}
                            onValueChange={(value) => updateChart(selectedChart.id, {
                              options: { ...selectedChart.options, fontSize: value[0] }
                            })}
                            max={20}
                            min={8}
                            step={1}
                          />
                          <div className="text-sm text-muted-foreground mt-1">
                            {selectedChart.options.fontSize}px
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Chart Options</Label>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Show Legend</span>
                          <Switch
                            checked={selectedChart.options.showLegend}
                            onCheckedChange={(checked) => updateChart(selectedChart.id, {
                              options: { ...selectedChart.options, showLegend: checked }
                            })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Show Grid</span>
                          <Switch
                            checked={selectedChart.options.showGrid}
                            onCheckedChange={(checked) => updateChart(selectedChart.id, {
                              options: { ...selectedChart.options, showGrid: checked }
                            })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Show Labels</span>
                          <Switch
                            checked={selectedChart.options.showLabels}
                            onCheckedChange={(checked) => updateChart(selectedChart.id, {
                              options: { ...selectedChart.options, showLabels: checked }
                            })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Show Tooltip</span>
                          <Switch
                            checked={selectedChart.options.showTooltip}
                            onCheckedChange={(checked) => updateChart(selectedChart.id, {
                              options: { ...selectedChart.options, showTooltip: checked }
                            })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Animation</span>
                          <Switch
                            checked={selectedChart.options.animation}
                            onCheckedChange={(checked) => updateChart(selectedChart.id, {
                              options: { ...selectedChart.options, animation: checked }
                            })}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="layout" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Layout & Position</CardTitle>
                    <CardDescription>Configure chart layout and positioning</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Legend Position</Label>
                      <Select
                        value={selectedChart.options.legendPosition}
                        onValueChange={(value) => updateChart(selectedChart.id, {
                          options: { ...selectedChart.options, legendPosition: value as any }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top">Top</SelectItem>
                          <SelectItem value="bottom">Bottom</SelectItem>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Chart Width (Grid Units)</Label>
                        <Slider
                          value={[selectedChart.size.width]}
                          onValueChange={(value) => updateChart(selectedChart.id, {
                            size: { ...selectedChart.size, width: value[0] }
                          })}
                          max={12}
                          min={3}
                          step={1}
                        />
                        <div className="text-sm text-muted-foreground mt-1">
                          {selectedChart.size.width} columns
                        </div>
                      </div>

                      <div>
                        <Label>Chart Height (Grid Units)</Label>
                        <Slider
                          value={[selectedChart.size.height]}
                          onValueChange={(value) => updateChart(selectedChart.id, {
                            size: { ...selectedChart.size, height: value[0] }
                          })}
                          max={8}
                          min={2}
                          step={1}
                        />
                        <div className="text-sm text-muted-foreground mt-1">
                          {selectedChart.size.height} rows
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Label>Preview</Label>
                      <div className="mt-2 p-4 border rounded-lg bg-muted/50">
                        <div className="text-center text-muted-foreground">
                          Chart preview will appear here
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Chart Selected</CardTitle>
                <CardDescription>Add a chart to start configuring visualizations</CardDescription>
              </CardHeader>
              <CardContent className="text-center py-8">
                <Button onClick={addChart}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Chart
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}