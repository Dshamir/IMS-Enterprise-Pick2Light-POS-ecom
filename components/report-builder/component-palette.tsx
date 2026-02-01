'use client'

import React, { useState } from 'react'
import { useDrag } from 'react-dnd'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Type, 
  BarChart3, 
  Table as TableIcon, 
  Image as ImageIcon,
  Palette,
  Search,
  Grid3X3,
  Minus,
  FileText,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  Link,
  Hash,
  DollarSign,
  Percent,
  Star,
  Heart,
  Users,
  Settings,
  Zap,
  Target,
  TrendingUp,
  PieChart,
  LineChart,
  BarChart,
  ScatterChart,
  Activity,
  Database,
  Filter,
  SortAsc,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline
} from 'lucide-react'

export type ComponentType = 'text' | 'chart' | 'table' | 'image' | 'divider' | 'spacer' | 'date' | 'number' | 'currency' | 'percentage' | 'rating' | 'progress' | 'timeline' | 'card' | 'list' | 'grid' | 'filter' | 'sort' | 'search'

export interface PaletteComponent {
  id: string
  type: ComponentType
  name: string
  description: string
  category: 'basic' | 'data' | 'visualization' | 'layout' | 'interactive' | 'advanced'
  icon: React.ReactNode
  defaultConfig: Record<string, any>
  preview?: string
  tags: string[]
  complexity: 'simple' | 'medium' | 'complex'
  premium?: boolean
}

interface ComponentPaletteProps {
  onSelectComponent: (component: PaletteComponent) => void
  selectedComponent: PaletteComponent | null
  searchTerm: string
  onSearchChange: (term: string) => void
  activeCategory: string
  onCategoryChange: (category: string) => void
}

// Draggable palette item
interface DraggablePaletteItemProps {
  component: PaletteComponent
  onSelect: (component: PaletteComponent) => void
  isSelected: boolean
}

function DraggablePaletteItem({ component, onSelect, isSelected }: DraggablePaletteItemProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'PALETTE_ITEM',
    item: { 
      componentType: component.type,
      component: component
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }))

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple':
        return 'bg-green-100 text-green-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'complex':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div
      ref={drag}
      className={`p-3 border rounded-lg cursor-grab hover:bg-gray-50 transition-colors ${
        isDragging ? 'opacity-50' : ''
      } ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
      onClick={() => onSelect(component)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {component.icon}
          <span className="text-sm font-medium">{component.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <Badge className={`text-xs ${getComplexityColor(component.complexity)}`}>
            {component.complexity}
          </Badge>
          {component.premium && (
            <Badge className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              Pro
            </Badge>
          )}
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground mb-2">{component.description}</p>
      
      {component.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {component.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {component.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{component.tags.length - 3}
            </Badge>
          )}
        </div>
      )}
      
      {component.preview && (
        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
          {component.preview}
        </div>
      )}
    </div>
  )
}

// Component definitions
const PALETTE_COMPONENTS: PaletteComponent[] = [
  // Basic Components
  {
    id: 'text',
    type: 'text',
    name: 'Text',
    description: 'Add text content, headings, and paragraphs',
    category: 'basic',
    icon: <Type className="h-4 w-4" />,
    defaultConfig: {
      text: 'New Text Component',
      fontSize: 14,
      fontWeight: 'normal',
      color: '#000000',
      alignment: 'left'
    },
    preview: 'Lorem ipsum dolor sit amet...',
    tags: ['text', 'content', 'heading', 'paragraph'],
    complexity: 'simple'
  },
  {
    id: 'image',
    type: 'image',
    name: 'Image',
    description: 'Display images, logos, and graphics',
    category: 'basic',
    icon: <ImageIcon className="h-4 w-4" />,
    defaultConfig: {
      src: '/placeholder-image.png',
      alt: 'Placeholder image',
      fit: 'contain'
    },
    preview: '[Image Preview]',
    tags: ['image', 'logo', 'graphic', 'photo'],
    complexity: 'simple'
  },
  {
    id: 'divider',
    type: 'divider',
    name: 'Divider',
    description: 'Add horizontal lines to separate content',
    category: 'basic',
    icon: <Minus className="h-4 w-4" />,
    defaultConfig: {
      thickness: 1,
      color: '#e2e8f0',
      style: 'solid'
    },
    preview: '────────────────',
    tags: ['divider', 'separator', 'line'],
    complexity: 'simple'
  },
  {
    id: 'spacer',
    type: 'spacer',
    name: 'Spacer',
    description: 'Add blank space between components',
    category: 'basic',
    icon: <Grid3X3 className="h-4 w-4" />,
    defaultConfig: {
      height: 20
    },
    preview: '[Empty Space]',
    tags: ['spacer', 'blank', 'space'],
    complexity: 'simple'
  },

  // Data Components
  {
    id: 'table',
    type: 'table',
    name: 'Data Table',
    description: 'Display structured data in rows and columns',
    category: 'data',
    icon: <TableIcon className="h-4 w-4" />,
    defaultConfig: {
      columns: ['Name', 'Description', 'Price'],
      dataQuery: 'SELECT * FROM products LIMIT 10',
      pagination: true,
      sorting: true,
      filtering: false
    },
    preview: '┌─────┬─────┬─────┐\n│ Col1│ Col2│ Col3│\n├─────┼─────┼─────┤\n│ Data│ Data│ Data│',
    tags: ['table', 'data', 'grid', 'rows', 'columns'],
    complexity: 'medium'
  },
  {
    id: 'date',
    type: 'date',
    name: 'Date Display',
    description: 'Show formatted dates and times',
    category: 'data',
    icon: <Calendar className="h-4 w-4" />,
    defaultConfig: {
      format: 'YYYY-MM-DD',
      value: new Date(),
      showTime: false
    },
    preview: '2024-01-15',
    tags: ['date', 'time', 'timestamp', 'calendar'],
    complexity: 'simple'
  },
  {
    id: 'number',
    type: 'number',
    name: 'Number Display',
    description: 'Show formatted numbers and metrics',
    category: 'data',
    icon: <Hash className="h-4 w-4" />,
    defaultConfig: {
      value: 0,
      format: '0,0',
      prefix: '',
      suffix: ''
    },
    preview: '1,234',
    tags: ['number', 'metric', 'value', 'count'],
    complexity: 'simple'
  },
  {
    id: 'currency',
    type: 'currency',
    name: 'Currency',
    description: 'Display monetary values with formatting',
    category: 'data',
    icon: <DollarSign className="h-4 w-4" />,
    defaultConfig: {
      value: 0,
      currency: 'USD',
      locale: 'en-US'
    },
    preview: '$1,234.56',
    tags: ['currency', 'money', 'price', 'cost'],
    complexity: 'simple'
  },
  {
    id: 'percentage',
    type: 'percentage',
    name: 'Percentage',
    description: 'Show percentage values with progress bars',
    category: 'data',
    icon: <Percent className="h-4 w-4" />,
    defaultConfig: {
      value: 0,
      showBar: true,
      color: '#3b82f6'
    },
    preview: '75% ████████░░',
    tags: ['percentage', 'progress', 'ratio', 'completion'],
    complexity: 'medium'
  },

  // Visualization Components
  {
    id: 'chart-bar',
    type: 'chart',
    name: 'Bar Chart',
    description: 'Compare values across categories',
    category: 'visualization',
    icon: <BarChart3 className="h-4 w-4" />,
    defaultConfig: {
      chartType: 'bar',
      title: 'Bar Chart',
      dataSource: 'products',
      xField: 'category',
      yField: 'count'
    },
    preview: '▅▇▃▆▄',
    tags: ['chart', 'bar', 'comparison', 'category'],
    complexity: 'medium'
  },
  {
    id: 'chart-line',
    type: 'chart',
    name: 'Line Chart',
    description: 'Show trends over time',
    category: 'visualization',
    icon: <LineChart className="h-4 w-4" />,
    defaultConfig: {
      chartType: 'line',
      title: 'Line Chart',
      dataSource: 'products',
      xField: 'date',
      yField: 'value'
    },
    preview: '⟋⟍⟋⟋⟍',
    tags: ['chart', 'line', 'trend', 'time'],
    complexity: 'medium'
  },
  {
    id: 'chart-pie',
    type: 'chart',
    name: 'Pie Chart',
    description: 'Show proportions of a whole',
    category: 'visualization',
    icon: <PieChart className="h-4 w-4" />,
    defaultConfig: {
      chartType: 'pie',
      title: 'Pie Chart',
      dataSource: 'products',
      valueField: 'value',
      labelField: 'category'
    },
    preview: '◐',
    tags: ['chart', 'pie', 'proportion', 'distribution'],
    complexity: 'medium'
  },
  {
    id: 'chart-scatter',
    type: 'chart',
    name: 'Scatter Plot',
    description: 'Show relationships between variables',
    category: 'visualization',
    icon: <ScatterChart className="h-4 w-4" />,
    defaultConfig: {
      chartType: 'scatter',
      title: 'Scatter Plot',
      dataSource: 'products',
      xField: 'price',
      yField: 'sales'
    },
    preview: '∵∷∴∵∷',
    tags: ['chart', 'scatter', 'correlation', 'relationship'],
    complexity: 'complex'
  },

  // Layout Components
  {
    id: 'card',
    type: 'card',
    name: 'Card',
    description: 'Group related content in a card layout',
    category: 'layout',
    icon: <FileText className="h-4 w-4" />,
    defaultConfig: {
      title: 'Card Title',
      content: 'Card content goes here',
      showHeader: true,
      showFooter: false
    },
    preview: '┌─────────────┐\n│ Card Title  │\n├─────────────┤\n│ Content...  │\n└─────────────┘',
    tags: ['card', 'container', 'group', 'layout'],
    complexity: 'medium'
  },
  {
    id: 'grid',
    type: 'grid',
    name: 'Grid Layout',
    description: 'Arrange components in a grid pattern',
    category: 'layout',
    icon: <Grid3X3 className="h-4 w-4" />,
    defaultConfig: {
      columns: 2,
      rows: 2,
      gap: 10
    },
    preview: '┌─┬─┐\n├─┼─┤\n└─┴─┘',
    tags: ['grid', 'layout', 'columns', 'rows'],
    complexity: 'complex'
  },

  // Interactive Components
  {
    id: 'filter',
    type: 'filter',
    name: 'Filter',
    description: 'Add interactive filtering controls',
    category: 'interactive',
    icon: <Filter className="h-4 w-4" />,
    defaultConfig: {
      field: 'category',
      type: 'select',
      options: []
    },
    preview: '🔍 Filter ▼',
    tags: ['filter', 'interactive', 'search', 'control'],
    complexity: 'complex',
    premium: true
  },
  {
    id: 'sort',
    type: 'sort',
    name: 'Sort Control',
    description: 'Add sorting controls for data',
    category: 'interactive',
    icon: <SortAsc className="h-4 w-4" />,
    defaultConfig: {
      field: 'name',
      direction: 'asc',
      showDirection: true
    },
    preview: '⇅ Sort',
    tags: ['sort', 'order', 'interactive', 'control'],
    complexity: 'complex',
    premium: true
  },
  {
    id: 'search',
    type: 'search',
    name: 'Search Box',
    description: 'Add search functionality',
    category: 'interactive',
    icon: <Search className="h-4 w-4" />,
    defaultConfig: {
      placeholder: 'Search...',
      fields: ['name', 'description']
    },
    preview: '🔍 Search...',
    tags: ['search', 'find', 'interactive', 'input'],
    complexity: 'complex',
    premium: true
  }
]

export default function ComponentPalette({
  onSelectComponent,
  selectedComponent,
  searchTerm,
  onSearchChange,
  activeCategory,
  onCategoryChange
}: ComponentPaletteProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['basic', 'data', 'visualization'])

  const categories = [
    { id: 'all', name: 'All Components', count: PALETTE_COMPONENTS.length },
    { id: 'basic', name: 'Basic', count: PALETTE_COMPONENTS.filter(c => c.category === 'basic').length },
    { id: 'data', name: 'Data', count: PALETTE_COMPONENTS.filter(c => c.category === 'data').length },
    { id: 'visualization', name: 'Charts', count: PALETTE_COMPONENTS.filter(c => c.category === 'visualization').length },
    { id: 'layout', name: 'Layout', count: PALETTE_COMPONENTS.filter(c => c.category === 'layout').length },
    { id: 'interactive', name: 'Interactive', count: PALETTE_COMPONENTS.filter(c => c.category === 'interactive').length },
    { id: 'advanced', name: 'Advanced', count: PALETTE_COMPONENTS.filter(c => c.category === 'advanced').length },
  ]

  const filteredComponents = PALETTE_COMPONENTS.filter(component => {
    const matchesSearch = !searchTerm || 
      component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      component.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      component.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = activeCategory === 'all' || component.category === activeCategory
    
    return matchesSearch && matchesCategory
  })

  const groupedComponents = categories.reduce((acc, category) => {
    if (category.id === 'all') return acc
    
    acc[category.id] = filteredComponents.filter(comp => comp.category === category.id)
    return acc
  }, {} as Record<string, PaletteComponent[]>)

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  return (
    <div className="w-80 border-r bg-gray-50 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center gap-2 mb-3">
          <Palette className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold">Component Palette</h3>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search components..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="p-2 border-b bg-white">
        <div className="flex flex-wrap gap-1">
          {categories.map(category => (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => onCategoryChange(category.id)}
              className="text-xs"
            >
              {category.name}
              <Badge variant="secondary" className="ml-1 text-xs">
                {category.count}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {/* Components */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeCategory === 'all' ? (
          // Show all components grouped by category
          Object.entries(groupedComponents).map(([categoryId, components]) => (
            components.length > 0 && (
              <div key={categoryId}>
                <div 
                  className="flex items-center justify-between cursor-pointer mb-2"
                  onClick={() => toggleCategory(categoryId)}
                >
                  <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                    {categories.find(c => c.id === categoryId)?.name}
                  </h4>
                  <Badge variant="secondary" className="text-xs">
                    {components.length}
                  </Badge>
                </div>
                
                {expandedCategories.includes(categoryId) && (
                  <div className="space-y-2 ml-2">
                    {components.map(component => (
                      <DraggablePaletteItem
                        key={component.id}
                        component={component}
                        onSelect={onSelectComponent}
                        isSelected={selectedComponent?.id === component.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          ))
        ) : (
          // Show filtered components
          <div className="space-y-2">
            {filteredComponents.map(component => (
              <DraggablePaletteItem
                key={component.id}
                component={component}
                onSelect={onSelectComponent}
                isSelected={selectedComponent?.id === component.id}
              />
            ))}
          </div>
        )}
        
        {filteredComponents.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No components found</p>
            <p className="text-sm">Try adjusting your search or category filter</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-white">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{filteredComponents.length} components</span>
          <span>Drag to add</span>
        </div>
      </div>
    </div>
  )
}

export { PALETTE_COMPONENTS }