'use client'

import React, { useState, useCallback } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { 
  Layout, 
  Eye, 
  Save, 
  Settings, 
  Grid3X3, 
  Ruler, 
  Palette,
  Download,
  Upload,
  Undo,
  Redo,
  Play,
  Maximize,
  Minimize,
  RotateCcw,
  FileText,
  Smartphone,
  Tablet,
  Monitor,
  Printer
} from 'lucide-react'

import DragDropCanvas, { CanvasComponent } from './drag-drop-canvas'
import ComponentPalette, { PaletteComponent } from './component-palette'
import PropertyPanel from './property-panel'

interface VisualDesignerProps {
  onSave: (design: ReportDesign) => void
  onPreview: (design: ReportDesign) => void
  onExport: (design: ReportDesign, format: 'pdf' | 'png' | 'html') => void
  initialDesign?: ReportDesign
  availableDataSources?: string[]
}

export interface ReportDesign {
  id: string
  name: string
  description: string
  components: CanvasComponent[]
  canvasSize: { width: number; height: number }
  settings: {
    gridSize: number
    showGrid: boolean
    snapToGrid: boolean
    backgroundColor: string
    pageFormat: 'A4' | 'A3' | 'letter' | 'legal' | 'custom'
    orientation: 'portrait' | 'landscape'
    margins: { top: number; right: number; bottom: number; left: number }
  }
  metadata: {
    created: Date
    modified: Date
    version: string
    author: string
    tags: string[]
  }
}

const DEFAULT_DESIGN: ReportDesign = {
  id: '',
  name: 'New Report',
  description: '',
  components: [],
  canvasSize: { width: 800, height: 1200 },
  settings: {
    gridSize: 20,
    showGrid: true,
    snapToGrid: true,
    backgroundColor: '#ffffff',
    pageFormat: 'A4',
    orientation: 'portrait',
    margins: { top: 50, right: 50, bottom: 50, left: 50 }
  },
  metadata: {
    created: new Date(),
    modified: new Date(),
    version: '1.0.0',
    author: 'User',
    tags: []
  }
}

const PAGE_SIZES = {
  A4: { width: 794, height: 1123 },
  A3: { width: 1123, height: 1587 },
  letter: { width: 816, height: 1056 },
  legal: { width: 816, height: 1344 },
  custom: { width: 800, height: 1200 }
}

const DEVICE_PRESETS = [
  { name: 'Desktop', width: 1200, height: 800, icon: <Monitor className="h-4 w-4" /> },
  { name: 'Tablet', width: 768, height: 1024, icon: <Tablet className="h-4 w-4" /> },
  { name: 'Mobile', width: 375, height: 667, icon: <Smartphone className="h-4 w-4" /> },
  { name: 'Print', width: 794, height: 1123, icon: <Printer className="h-4 w-4" /> },
]

export default function VisualDesigner({
  onSave,
  onPreview,
  onExport,
  initialDesign,
  availableDataSources = []
}: VisualDesignerProps) {
  const [design, setDesign] = useState<ReportDesign>(initialDesign || DEFAULT_DESIGN)
  const [selectedComponent, setSelectedComponent] = useState<CanvasComponent | null>(null)
  const [selectedPaletteComponent, setSelectedPaletteComponent] = useState<PaletteComponent | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [showPreview, setShowPreview] = useState(false)
  const [undoStack, setUndoStack] = useState<ReportDesign[]>([])
  const [redoStack, setRedoStack] = useState<ReportDesign[]>([])
  
  const { toast } = useToast()

  // Sample data sources and fields
  const availableFields = {
    products: ['id', 'name', 'description', 'price', 'stock_quantity', 'category', 'created_at'],
    orders: ['id', 'customer_name', 'total_amount', 'status', 'created_at'],
    customers: ['id', 'name', 'email', 'phone', 'created_at'],
    inventory: ['id', 'product_id', 'quantity', 'location', 'last_updated']
  }

  const saveToHistory = useCallback((newDesign: ReportDesign) => {
    setUndoStack(prev => [...prev.slice(-19), design]) // Keep last 20 states
    setRedoStack([]) // Clear redo stack
    setDesign(newDesign)
  }, [design])

  const handleUndo = useCallback(() => {
    if (undoStack.length > 0) {
      const previousDesign = undoStack[undoStack.length - 1]
      setRedoStack(prev => [...prev, design])
      setUndoStack(prev => prev.slice(0, -1))
      setDesign(previousDesign)
    }
  }, [undoStack, design])

  const handleRedo = useCallback(() => {
    if (redoStack.length > 0) {
      const nextDesign = redoStack[redoStack.length - 1]
      setUndoStack(prev => [...prev, design])
      setRedoStack(prev => prev.slice(0, -1))
      setDesign(nextDesign)
    }
  }, [redoStack, design])

  const handleComponentsChange = useCallback((components: CanvasComponent[]) => {
    const newDesign = {
      ...design,
      components,
      metadata: {
        ...design.metadata,
        modified: new Date()
      }
    }
    saveToHistory(newDesign)
  }, [design, saveToHistory])

  const handleUpdateComponent = useCallback((updatedComponent: CanvasComponent) => {
    const newComponents = design.components.map(comp =>
      comp.id === updatedComponent.id ? updatedComponent : comp
    )
    handleComponentsChange(newComponents)
  }, [design.components, handleComponentsChange])

  const handleDeleteComponent = useCallback((id: string) => {
    const newComponents = design.components.filter(comp => comp.id !== id)
    handleComponentsChange(newComponents)
    setSelectedComponent(null)
  }, [design.components, handleComponentsChange])

  const handleDuplicateComponent = useCallback((component: CanvasComponent) => {
    const newComponent: CanvasComponent = {
      ...component,
      id: `${component.type}-${Date.now()}`,
      position: {
        x: component.position.x + 20,
        y: component.position.y + 20
      }
    }
    handleComponentsChange([...design.components, newComponent])
    setSelectedComponent(newComponent)
  }, [design.components, handleComponentsChange])

  const handleCanvasSizeChange = useCallback((size: { width: number; height: number }) => {
    const newDesign = {
      ...design,
      canvasSize: size,
      metadata: {
        ...design.metadata,
        modified: new Date()
      }
    }
    saveToHistory(newDesign)
  }, [design, saveToHistory])

  const handleSettingsChange = useCallback((settings: Partial<ReportDesign['settings']>) => {
    const newDesign = {
      ...design,
      settings: {
        ...design.settings,
        ...settings
      },
      metadata: {
        ...design.metadata,
        modified: new Date()
      }
    }
    saveToHistory(newDesign)
  }, [design, saveToHistory])

  const handleSave = useCallback(() => {
    onSave(design)
    toast({
      title: 'Design Saved',
      description: `Report design "${design.name}" has been saved successfully.`,
    })
  }, [design, onSave, toast])

  const handlePreview = useCallback(() => {
    onPreview(design)
    setShowPreview(true)
  }, [design, onPreview])

  const handleExport = useCallback((format: 'pdf' | 'png' | 'html') => {
    onExport(design, format)
    toast({
      title: 'Export Started',
      description: `Exporting report as ${format.toUpperCase()}...`,
    })
  }, [design, onExport, toast])

  const handleDevicePreset = useCallback((preset: { width: number; height: number }) => {
    handleCanvasSizeChange(preset)
  }, [handleCanvasSizeChange])

  const handlePageFormatChange = useCallback((format: keyof typeof PAGE_SIZES) => {
    const size = PAGE_SIZES[format]
    if (design.settings.orientation === 'landscape') {
      handleCanvasSizeChange({ width: size.height, height: size.width })
    } else {
      handleCanvasSizeChange(size)
    }
    handleSettingsChange({ pageFormat: format })
  }, [design.settings.orientation, handleCanvasSizeChange, handleSettingsChange])

  const handleOrientationChange = useCallback((orientation: 'portrait' | 'landscape') => {
    const currentSize = design.canvasSize
    handleCanvasSizeChange({ width: currentSize.height, height: currentSize.width })
    handleSettingsChange({ orientation })
  }, [design.canvasSize, handleCanvasSizeChange, handleSettingsChange])

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen flex flex-col bg-gray-100">
        {/* Toolbar */}
        <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleUndo} disabled={undoStack.length === 0}>
              <Undo className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleRedo} disabled={redoStack.length === 0}>
              <Redo className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-gray-300 mx-2" />
            <Button variant="ghost" size="sm" onClick={() => handleSettingsChange({ showGrid: !design.settings.showGrid })}>
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Ruler className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={design.name}
              onChange={(e) => setDesign({ ...design, name: e.target.value })}
              className="text-lg font-medium bg-transparent border-none outline-none"
              placeholder="Report Name"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {DEVICE_PRESETS.map((preset) => (
                <Button
                  key={preset.name}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDevicePreset(preset)}
                  title={preset.name}
                >
                  {preset.icon}
                </Button>
              ))}
            </div>
            <div className="w-px h-6 bg-gray-300 mx-2" />
            <Button variant="ghost" size="sm" onClick={handlePreview}>
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleExport('pdf')}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Component Palette */}
          <ComponentPalette
            onSelectComponent={setSelectedPaletteComponent}
            selectedComponent={selectedPaletteComponent}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />

          {/* Canvas */}
          <div className="flex-1 flex flex-col">
            {/* Canvas Settings */}
            <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Format:</span>
                  <select
                    value={design.settings.pageFormat}
                    onChange={(e) => handlePageFormatChange(e.target.value as keyof typeof PAGE_SIZES)}
                    className="text-sm border rounded px-2 py-1"
                  >
                    {Object.keys(PAGE_SIZES).map(format => (
                      <option key={format} value={format}>{format.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Orientation:</span>
                  <select
                    value={design.settings.orientation}
                    onChange={(e) => handleOrientationChange(e.target.value as 'portrait' | 'landscape')}
                    className="text-sm border rounded px-2 py-1"
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Grid:</span>
                  <input
                    type="number"
                    value={design.settings.gridSize}
                    onChange={(e) => handleSettingsChange({ gridSize: parseInt(e.target.value) || 20 })}
                    className="text-sm border rounded px-2 py-1 w-16"
                    min="5"
                    max="50"
                  />
                  <span className="text-sm text-muted-foreground">px</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{design.components.length} components</Badge>
                <Badge variant="outline">{design.canvasSize.width}×{design.canvasSize.height}</Badge>
              </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 overflow-auto bg-gray-200 p-4">
              <div className="mx-auto" style={{ width: 'fit-content' }}>
                <DragDropCanvas
                  components={design.components}
                  onComponentsChange={handleComponentsChange}
                  onSelectComponent={setSelectedComponent}
                  selectedComponent={selectedComponent}
                  canvasSize={design.canvasSize}
                  gridSize={design.settings.gridSize}
                  showGrid={design.settings.showGrid}
                />
              </div>
            </div>
          </div>

          {/* Property Panel */}
          <PropertyPanel
            selectedComponent={selectedComponent}
            onUpdateComponent={handleUpdateComponent}
            onDeleteComponent={handleDeleteComponent}
            onDuplicateComponent={handleDuplicateComponent}
            availableDataSources={availableDataSources}
            availableFields={availableFields}
          />
        </div>

        {/* Status Bar */}
        <div className="bg-white border-t px-4 py-2 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Ready</span>
            <span>•</span>
            <span>Version {design.metadata.version}</span>
            <span>•</span>
            <span>Modified {design.metadata.modified.toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Zoom: 100%</span>
            <span>•</span>
            <span>Grid: {design.settings.gridSize}px</span>
          </div>
        </div>
      </div>
    </DndProvider>
  )
}