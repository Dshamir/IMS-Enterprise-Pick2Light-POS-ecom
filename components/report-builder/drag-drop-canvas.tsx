'use client'

import React, { useState, useCallback, useRef } from 'react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Type, 
  BarChart3, 
  Table as TableIcon, 
  Image as ImageIcon,
  Trash2,
  Move,
  Settings,
  Copy,
  Eye,
  Grid3X3,
  Palette
} from 'lucide-react'

// Component types for drag and drop
export type ComponentType = 'text' | 'chart' | 'table' | 'image' | 'divider' | 'spacer'

export interface CanvasComponent {
  id: string
  type: ComponentType
  position: { x: number; y: number }
  size: { width: number; height: number }
  config: {
    // Text component config
    text?: string
    fontSize?: number
    fontWeight?: 'normal' | 'bold'
    color?: string
    alignment?: 'left' | 'center' | 'right'
    
    // Chart component config
    chartType?: 'bar' | 'line' | 'pie' | 'scatter'
    dataSource?: string
    xField?: string
    yField?: string
    title?: string
    
    // Table component config
    columns?: string[]
    dataQuery?: string
    pagination?: boolean
    
    // Image component config
    src?: string
    alt?: string
    fit?: 'contain' | 'cover' | 'fill'
    
    // Style config
    backgroundColor?: string
    borderColor?: string
    borderWidth?: number
    borderRadius?: number
    padding?: number
    margin?: number
  }
}

interface DragDropCanvasProps {
  components: CanvasComponent[]
  onComponentsChange: (components: CanvasComponent[]) => void
  onSelectComponent: (component: CanvasComponent | null) => void
  selectedComponent: CanvasComponent | null
  canvasSize: { width: number; height: number }
  gridSize: number
  showGrid: boolean
}

// Drag item types
const ItemTypes = {
  COMPONENT: 'component',
  PALETTE_ITEM: 'palette_item'
}

// Draggable component on canvas
interface DraggableComponentProps {
  component: CanvasComponent
  onMove: (id: string, position: { x: number; y: number }) => void
  onResize: (id: string, size: { width: number; height: number }) => void
  onSelect: (component: CanvasComponent) => void
  onDelete: (id: string) => void
  isSelected: boolean
  gridSize: number
}

function DraggableComponent({ 
  component, 
  onMove, 
  onResize, 
  onSelect, 
  onDelete, 
  isSelected,
  gridSize 
}: DraggableComponentProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.COMPONENT,
    item: { id: component.id, type: component.type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }))

  const snapToGrid = (pos: { x: number; y: number }) => ({
    x: Math.round(pos.x / gridSize) * gridSize,
    y: Math.round(pos.y / gridSize) * gridSize,
  })

  const handleMove = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const newPosition = snapToGrid({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
    onMove(component.id, newPosition)
  }, [component.id, onMove, gridSize])

  const renderComponentContent = () => {
    switch (component.type) {
      case 'text':
        return (
          <div 
            className="p-2 text-sm"
            style={{
              fontSize: component.config.fontSize || 14,
              fontWeight: component.config.fontWeight || 'normal',
              color: component.config.color || '#000000',
              textAlign: component.config.alignment || 'left'
            }}
          >
            {component.config.text || 'Text Component'}
          </div>
        )
      
      case 'chart':
        return (
          <div className="p-2 text-center">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <div className="text-xs text-muted-foreground">
              {component.config.title || 'Chart Component'}
            </div>
            <div className="text-xs text-muted-foreground">
              {component.config.chartType || 'bar'} chart
            </div>
          </div>
        )
      
      case 'table':
        return (
          <div className="p-2 text-center">
            <TableIcon className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <div className="text-xs text-muted-foreground">
              Table Component
            </div>
            <div className="text-xs text-muted-foreground">
              {component.config.columns?.length || 0} columns
            </div>
          </div>
        )
      
      case 'image':
        return (
          <div className="p-2 text-center">
            <ImageIcon className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <div className="text-xs text-muted-foreground">
              Image Component
            </div>
          </div>
        )
      
      default:
        return (
          <div className="p-2 text-center">
            <div className="text-xs text-muted-foreground">
              Component
            </div>
          </div>
        )
    }
  }

  return (
    <div
      ref={drag}
      className={`absolute border-2 cursor-move ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
      } ${isDragging ? 'opacity-50' : ''}`}
      style={{
        left: component.position.x,
        top: component.position.y,
        width: component.size.width,
        height: component.size.height,
        backgroundColor: component.config.backgroundColor || 'white',
        borderColor: component.config.borderColor || (isSelected ? '#3b82f6' : '#d1d5db'),
        borderWidth: component.config.borderWidth || 2,
        borderRadius: component.config.borderRadius || 4,
        padding: component.config.padding || 0,
        margin: component.config.margin || 0,
      }}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(component)
      }}
    >
      {renderComponentContent()}
      
      {/* Selection handles */}
      {isSelected && (
        <>
          <div className="absolute -top-8 left-0 flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(component.id)
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-6 p-0"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          
          {/* Resize handles */}
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 cursor-se-resize" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 cursor-ne-resize" />
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 cursor-nw-resize" />
          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 cursor-sw-resize" />
        </>
      )}
    </div>
  )
}

// Component palette item
interface PaletteItemProps {
  type: ComponentType
  icon: React.ReactNode
  label: string
  description: string
}

function PaletteItem({ type, icon, label, description }: PaletteItemProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.PALETTE_ITEM,
    item: { componentType: type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }))

  return (
    <div
      ref={drag}
      className={`p-3 border rounded-lg cursor-grab hover:bg-gray-50 ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

// Main canvas component
export default function DragDropCanvas({
  components,
  onComponentsChange,
  onSelectComponent,
  selectedComponent,
  canvasSize,
  gridSize,
  showGrid
}: DragDropCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)

  const [{ isOver }, drop] = useDrop(() => ({
    accept: [ItemTypes.COMPONENT, ItemTypes.PALETTE_ITEM],
    drop: (item: any, monitor) => {
      if (!canvasRef.current) return

      const rect = canvasRef.current.getBoundingClientRect()
      const clientOffset = monitor.getClientOffset()
      
      if (!clientOffset) return

      const position = {
        x: Math.round((clientOffset.x - rect.left) / gridSize) * gridSize,
        y: Math.round((clientOffset.y - rect.top) / gridSize) * gridSize,
      }

      if (item.componentType) {
        // Adding new component from palette
        const newComponent: CanvasComponent = {
          id: `${item.componentType}-${Date.now()}`,
          type: item.componentType,
          position,
          size: { width: 200, height: 100 },
          config: getDefaultConfig(item.componentType)
        }
        
        onComponentsChange([...components, newComponent])
        onSelectComponent(newComponent)
      } else if (item.id) {
        // Moving existing component
        handleComponentMove(item.id, position)
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }))

  const getDefaultConfig = (type: ComponentType) => {
    switch (type) {
      case 'text':
        return {
          text: 'New Text Component',
          fontSize: 14,
          fontWeight: 'normal' as const,
          color: '#000000',
          alignment: 'left' as const
        }
      case 'chart':
        return {
          chartType: 'bar' as const,
          title: 'New Chart',
          dataSource: 'products',
          xField: 'name',
          yField: 'stock_quantity'
        }
      case 'table':
        return {
          columns: ['name', 'description', 'price'],
          dataQuery: 'SELECT * FROM products LIMIT 10',
          pagination: true
        }
      case 'image':
        return {
          src: '/placeholder-image.png',
          alt: 'Placeholder image',
          fit: 'contain' as const
        }
      default:
        return {}
    }
  }

  const handleComponentMove = useCallback((id: string, position: { x: number; y: number }) => {
    const updatedComponents = components.map(comp =>
      comp.id === id ? { ...comp, position } : comp
    )
    onComponentsChange(updatedComponents)
  }, [components, onComponentsChange])

  const handleComponentResize = useCallback((id: string, size: { width: number; height: number }) => {
    const updatedComponents = components.map(comp =>
      comp.id === id ? { ...comp, size } : comp
    )
    onComponentsChange(updatedComponents)
  }, [components, onComponentsChange])

  const handleComponentDelete = useCallback((id: string) => {
    const updatedComponents = components.filter(comp => comp.id !== id)
    onComponentsChange(updatedComponents)
    if (selectedComponent?.id === id) {
      onSelectComponent(null)
    }
  }, [components, onComponentsChange, selectedComponent, onSelectComponent])

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onSelectComponent(null)
    }
  }, [onSelectComponent])

  const paletteItems = [
    {
      type: 'text' as ComponentType,
      icon: <Type className="h-4 w-4" />,
      label: 'Text',
      description: 'Add text content'
    },
    {
      type: 'chart' as ComponentType,
      icon: <BarChart3 className="h-4 w-4" />,
      label: 'Chart',
      description: 'Data visualization'
    },
    {
      type: 'table' as ComponentType,
      icon: <TableIcon className="h-4 w-4" />,
      label: 'Table',
      description: 'Tabular data display'
    },
    {
      type: 'image' as ComponentType,
      icon: <ImageIcon className="h-4 w-4" />,
      label: 'Image',
      description: 'Image or logo'
    }
  ]

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex gap-4 h-full">
        {/* Component Palette */}
        <div className="w-64 border-r bg-gray-50 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="h-5 w-5" />
            <h3 className="font-medium">Components</h3>
          </div>
          <div className="space-y-2">
            {paletteItems.map(item => (
              <PaletteItem
                key={item.type}
                type={item.type}
                icon={item.icon}
                label={item.label}
                description={item.description}
              />
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
          <div
            ref={(node) => {
              canvasRef.current = node
              drop(node)
            }}
            className={`relative border-2 border-dashed ${
              isOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            } ${showGrid ? 'bg-grid' : 'bg-white'}`}
            style={{
              width: canvasSize.width,
              height: canvasSize.height,
              backgroundImage: showGrid 
                ? `radial-gradient(circle, #d1d5db 1px, transparent 1px)`
                : 'none',
              backgroundSize: showGrid ? `${gridSize}px ${gridSize}px` : 'auto',
              backgroundPosition: showGrid ? '0 0' : 'auto',
            }}
            onClick={handleCanvasClick}
          >
            {/* Grid overlay */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none">
                <svg width="100%" height="100%" className="opacity-20">
                  <defs>
                    <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
                      <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="#d1d5db" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>
            )}

            {/* Canvas components */}
            {components.map(component => (
              <DraggableComponent
                key={component.id}
                component={component}
                onMove={handleComponentMove}
                onResize={handleComponentResize}
                onSelect={onSelectComponent}
                onDelete={handleComponentDelete}
                isSelected={selectedComponent?.id === component.id}
                gridSize={gridSize}
              />
            ))}

            {/* Empty state */}
            {components.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Grid3X3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-lg mb-1">Drag components here</p>
                  <p className="text-sm">Start building your report by dragging components from the palette</p>
                </div>
              </div>
            )}
          </div>

          {/* Canvas info */}
          <div className="absolute bottom-4 left-4 bg-white border rounded-lg p-2 shadow-sm">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{components.length} components</span>
              <span>Grid: {gridSize}px</span>
              <span>Canvas: {canvasSize.width}×{canvasSize.height}</span>
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  )
}