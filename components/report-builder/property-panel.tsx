'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { 
  Settings, 
  Palette, 
  Layout, 
  Database, 
  Eye,
  Copy,
  Trash2,
  RotateCcw,
  Save,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Link,
  Image,
  BarChart3,
  Table,
  Grid3X3,
  Zap,
  Lock,
  Unlock,
  Move,
  MoreHorizontal
} from 'lucide-react'
import { CanvasComponent } from './drag-drop-canvas'

interface PropertyPanelProps {
  selectedComponent: CanvasComponent | null
  onUpdateComponent: (component: CanvasComponent) => void
  onDeleteComponent: (id: string) => void
  onDuplicateComponent: (component: CanvasComponent) => void
  availableDataSources: string[]
  availableFields: Record<string, string[]>
}

interface PropertyFieldProps {
  label: string
  description?: string
  children: React.ReactNode
}

function PropertyField({ label, description, children }: PropertyFieldProps) {
  return (
    <div className="space-y-2">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}

interface ColorPickerProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const presetColors = [
    '#000000', '#ffffff', '#ef4444', '#f97316', '#f59e0b', '#eab308',
    '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
    '#f43f5e', '#64748b', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb'
  ]

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div 
          className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
          style={{ backgroundColor: value }}
          onClick={() => {
            const input = document.createElement('input')
            input.type = 'color'
            input.value = value
            input.onchange = (e) => onChange((e.target as HTMLInputElement).value)
            input.click()
          }}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 font-mono text-sm"
        />
      </div>
      <div className="grid grid-cols-8 gap-1">
        {presetColors.map(color => (
          <div
            key={color}
            className="w-6 h-6 rounded cursor-pointer border border-gray-300"
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
          />
        ))}
      </div>
    </div>
  )
}

export default function PropertyPanel({
  selectedComponent,
  onUpdateComponent,
  onDeleteComponent,
  onDuplicateComponent,
  availableDataSources,
  availableFields
}: PropertyPanelProps) {
  const [activeTab, setActiveTab] = useState('properties')
  const [config, setConfig] = useState<any>({})

  // Update local config when selected component changes
  useEffect(() => {
    if (selectedComponent) {
      setConfig(selectedComponent.config || {})
    }
  }, [selectedComponent])

  const updateConfig = (updates: Partial<any>) => {
    const newConfig = { ...config, ...updates }
    setConfig(newConfig)
    
    if (selectedComponent) {
      onUpdateComponent({
        ...selectedComponent,
        config: newConfig
      })
    }
  }

  const updatePosition = (position: { x: number; y: number }) => {
    if (selectedComponent) {
      onUpdateComponent({
        ...selectedComponent,
        position
      })
    }
  }

  const updateSize = (size: { width: number; height: number }) => {
    if (selectedComponent) {
      onUpdateComponent({
        ...selectedComponent,
        size
      })
    }
  }

  const renderTextProperties = () => (
    <div className="space-y-4">
      <PropertyField label="Text Content" description="The text content to display">
        <Textarea
          value={config.text || ''}
          onChange={(e) => updateConfig({ text: e.target.value })}
          placeholder="Enter text content..."
          rows={3}
        />
      </PropertyField>

      <PropertyField label="Font Size" description="Text size in pixels">
        <div className="flex items-center gap-2">
          <Slider
            value={[config.fontSize || 14]}
            onValueChange={([value]) => updateConfig({ fontSize: value })}
            min={8}
            max={72}
            step={1}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground w-12">{config.fontSize || 14}px</span>
        </div>
      </PropertyField>

      <PropertyField label="Font Weight" description="Text weight">
        <Select value={config.fontWeight || 'normal'} onValueChange={(value) => updateConfig({ fontWeight: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="bold">Bold</SelectItem>
            <SelectItem value="lighter">Light</SelectItem>
          </SelectContent>
        </Select>
      </PropertyField>

      <PropertyField label="Text Alignment" description="Text alignment">
        <div className="flex gap-1">
          {['left', 'center', 'right'].map(align => (
            <Button
              key={align}
              variant={config.alignment === align ? "default" : "outline"}
              size="sm"
              onClick={() => updateConfig({ alignment: align })}
            >
              {align === 'left' && <AlignLeft className="h-4 w-4" />}
              {align === 'center' && <AlignCenter className="h-4 w-4" />}
              {align === 'right' && <AlignRight className="h-4 w-4" />}
            </Button>
          ))}
        </div>
      </PropertyField>

      <PropertyField label="Text Color" description="Text color">
        <ColorPicker
          value={config.color || '#000000'}
          onChange={(value) => updateConfig({ color: value })}
        />
      </PropertyField>
    </div>
  )

  const renderChartProperties = () => (
    <div className="space-y-4">
      <PropertyField label="Chart Title" description="Title displayed above the chart">
        <Input
          value={config.title || ''}
          onChange={(e) => updateConfig({ title: e.target.value })}
          placeholder="Enter chart title..."
        />
      </PropertyField>

      <PropertyField label="Chart Type" description="Type of chart to display">
        <Select value={config.chartType || 'bar'} onValueChange={(value) => updateConfig({ chartType: value })}>
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
      </PropertyField>

      <PropertyField label="Data Source" description="Table or query to get data from">
        <Select value={config.dataSource || ''} onValueChange={(value) => updateConfig({ dataSource: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select data source..." />
          </SelectTrigger>
          <SelectContent>
            {availableDataSources.map(source => (
              <SelectItem key={source} value={source}>{source}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PropertyField>

      {config.dataSource && availableFields[config.dataSource] && (
        <>
          <PropertyField label="X-Axis Field" description="Field for X-axis values">
            <Select value={config.xField || ''} onValueChange={(value) => updateConfig({ xField: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select X field..." />
              </SelectTrigger>
              <SelectContent>
                {availableFields[config.dataSource].map(field => (
                  <SelectItem key={field} value={field}>{field}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </PropertyField>

          <PropertyField label="Y-Axis Field" description="Field for Y-axis values">
            <Select value={config.yField || ''} onValueChange={(value) => updateConfig({ yField: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select Y field..." />
              </SelectTrigger>
              <SelectContent>
                {availableFields[config.dataSource].map(field => (
                  <SelectItem key={field} value={field}>{field}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </PropertyField>
        </>
      )}

      <PropertyField label="Chart Colors" description="Color scheme for the chart">
        <div className="grid grid-cols-4 gap-2">
          {(config.colors || ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']).map((color: string, index: number) => (
            <div
              key={index}
              className="w-8 h-8 rounded cursor-pointer border border-gray-300"
              style={{ backgroundColor: color }}
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'color'
                input.value = color
                input.onchange = (e) => {
                  const newColors = [...(config.colors || ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'])]
                  newColors[index] = (e.target as HTMLInputElement).value
                  updateConfig({ colors: newColors })
                }
                input.click()
              }}
            />
          ))}
        </div>
      </PropertyField>
    </div>
  )

  const renderTableProperties = () => (
    <div className="space-y-4">
      <PropertyField label="Data Query" description="SQL query to fetch table data">
        <Textarea
          value={config.dataQuery || ''}
          onChange={(e) => updateConfig({ dataQuery: e.target.value })}
          placeholder="SELECT * FROM products LIMIT 10"
          rows={3}
          className="font-mono text-sm"
        />
      </PropertyField>

      <PropertyField label="Columns" description="Comma-separated list of columns to display">
        <Input
          value={config.columns?.join(', ') || ''}
          onChange={(e) => updateConfig({ columns: e.target.value.split(',').map(s => s.trim()) })}
          placeholder="name, description, price"
        />
      </PropertyField>

      <PropertyField label="Table Options" description="Additional table features">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Switch
              checked={config.pagination || false}
              onCheckedChange={(checked) => updateConfig({ pagination: checked })}
            />
            <Label>Enable Pagination</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={config.sorting || false}
              onCheckedChange={(checked) => updateConfig({ sorting: checked })}
            />
            <Label>Enable Sorting</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={config.filtering || false}
              onCheckedChange={(checked) => updateConfig({ filtering: checked })}
            />
            <Label>Enable Filtering</Label>
          </div>
        </div>
      </PropertyField>
    </div>
  )

  const renderImageProperties = () => (
    <div className="space-y-4">
      <PropertyField label="Image Source" description="URL or path to the image">
        <Input
          value={config.src || ''}
          onChange={(e) => updateConfig({ src: e.target.value })}
          placeholder="https://example.com/image.jpg"
        />
      </PropertyField>

      <PropertyField label="Alt Text" description="Alternative text for accessibility">
        <Input
          value={config.alt || ''}
          onChange={(e) => updateConfig({ alt: e.target.value })}
          placeholder="Describe the image..."
        />
      </PropertyField>

      <PropertyField label="Image Fit" description="How the image should fit in the container">
        <Select value={config.fit || 'contain'} onValueChange={(value) => updateConfig({ fit: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="contain">Contain</SelectItem>
            <SelectItem value="cover">Cover</SelectItem>
            <SelectItem value="fill">Fill</SelectItem>
            <SelectItem value="none">None</SelectItem>
          </SelectContent>
        </Select>
      </PropertyField>
    </div>
  )

  const renderStyleProperties = () => (
    <div className="space-y-4">
      <PropertyField label="Background Color" description="Background color of the component">
        <ColorPicker
          value={config.backgroundColor || '#ffffff'}
          onChange={(value) => updateConfig({ backgroundColor: value })}
        />
      </PropertyField>

      <PropertyField label="Border" description="Border styling">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm w-12">Color</Label>
            <ColorPicker
              value={config.borderColor || '#d1d5db'}
              onChange={(value) => updateConfig({ borderColor: value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm w-12">Width</Label>
            <Slider
              value={[config.borderWidth || 1]}
              onValueChange={([value]) => updateConfig({ borderWidth: value })}
              min={0}
              max={10}
              step={1}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-12">{config.borderWidth || 1}px</span>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm w-12">Radius</Label>
            <Slider
              value={[config.borderRadius || 4]}
              onValueChange={([value]) => updateConfig({ borderRadius: value })}
              min={0}
              max={20}
              step={1}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-12">{config.borderRadius || 4}px</span>
          </div>
        </div>
      </PropertyField>

      <PropertyField label="Spacing" description="Padding and margin">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm w-16">Padding</Label>
            <Slider
              value={[config.padding || 0]}
              onValueChange={([value]) => updateConfig({ padding: value })}
              min={0}
              max={50}
              step={1}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-12">{config.padding || 0}px</span>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm w-16">Margin</Label>
            <Slider
              value={[config.margin || 0]}
              onValueChange={([value]) => updateConfig({ margin: value })}
              min={0}
              max={50}
              step={1}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-12">{config.margin || 0}px</span>
          </div>
        </div>
      </PropertyField>
    </div>
  )

  const renderLayoutProperties = () => (
    <div className="space-y-4">
      <PropertyField label="Position" description="X and Y coordinates">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-sm">X</Label>
            <Input
              type="number"
              value={selectedComponent?.position.x || 0}
              onChange={(e) => updatePosition({ 
                x: parseInt(e.target.value) || 0, 
                y: selectedComponent?.position.y || 0 
              })}
            />
          </div>
          <div>
            <Label className="text-sm">Y</Label>
            <Input
              type="number"
              value={selectedComponent?.position.y || 0}
              onChange={(e) => updatePosition({ 
                x: selectedComponent?.position.x || 0, 
                y: parseInt(e.target.value) || 0 
              })}
            />
          </div>
        </div>
      </PropertyField>

      <PropertyField label="Size" description="Width and height">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-sm">Width</Label>
            <Input
              type="number"
              value={selectedComponent?.size.width || 0}
              onChange={(e) => updateSize({ 
                width: parseInt(e.target.value) || 0, 
                height: selectedComponent?.size.height || 0 
              })}
            />
          </div>
          <div>
            <Label className="text-sm">Height</Label>
            <Input
              type="number"
              value={selectedComponent?.size.height || 0}
              onChange={(e) => updateSize({ 
                width: selectedComponent?.size.width || 0, 
                height: parseInt(e.target.value) || 0 
              })}
            />
          </div>
        </div>
      </PropertyField>

      <PropertyField label="Z-Index" description="Layer order (higher values appear on top)">
        <Input
          type="number"
          value={config.zIndex || 0}
          onChange={(e) => updateConfig({ zIndex: parseInt(e.target.value) || 0 })}
        />
      </PropertyField>
    </div>
  )

  if (!selectedComponent) {
    return (
      <div className="w-80 border-l bg-gray-50 p-4">
        <div className="text-center py-8 text-muted-foreground">
          <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No component selected</p>
          <p className="text-sm">Select a component to edit its properties</p>
        </div>
      </div>
    )
  }

  const getComponentIcon = (type: string) => {
    switch (type) {
      case 'text': return <Type className="h-4 w-4" />
      case 'chart': return <BarChart3 className="h-4 w-4" />
      case 'table': return <Table className="h-4 w-4" />
      case 'image': return <Image className="h-4 w-4" />
      default: return <Grid3X3 className="h-4 w-4" />
    }
  }

  return (
    <div className="w-80 border-l bg-gray-50 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center gap-2 mb-3">
          {getComponentIcon(selectedComponent.type)}
          <div>
            <h3 className="font-semibold capitalize">{selectedComponent.type} Component</h3>
            <p className="text-xs text-muted-foreground">ID: {selectedComponent.id}</p>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-1">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onDuplicateComponent(selectedComponent)}
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onDeleteComponent(selectedComponent.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-3 m-2">
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="style">Style</TabsTrigger>
            <TabsTrigger value="layout">Layout</TabsTrigger>
          </TabsList>

          <TabsContent value="properties" className="p-4 space-y-4">
            {selectedComponent.type === 'text' && renderTextProperties()}
            {selectedComponent.type === 'chart' && renderChartProperties()}
            {selectedComponent.type === 'table' && renderTableProperties()}
            {selectedComponent.type === 'image' && renderImageProperties()}
          </TabsContent>

          <TabsContent value="style" className="p-4 space-y-4">
            {renderStyleProperties()}
          </TabsContent>

          <TabsContent value="layout" className="p-4 space-y-4">
            {renderLayoutProperties()}
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-white">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Component Properties</span>
          <Button size="sm" variant="ghost">
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}