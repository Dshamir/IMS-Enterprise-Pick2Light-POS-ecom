import { NextRequest, NextResponse } from 'next/server'

// Mock template storage - in a real app, this would be stored in a database
let templates: any[] = [
  {
    id: 'template_1',
    name: 'Inventory Stock Levels',
    description: 'Monitor inventory levels across all categories',
    category: 'inventory',
    tags: ['stock', 'inventory', 'levels'],
    query: {
      table: 'products',
      fields: [
        { name: 'name', alias: 'Product Name', type: 'string' },
        { name: 'category', alias: 'Category', type: 'string' },
        { name: 'quantity', alias: 'Stock Quantity', type: 'number' },
        { name: 'min_stock', alias: 'Minimum Stock', type: 'number' }
      ],
      filters: [],
      joins: [],
      orderBy: [{ field: 'quantity', direction: 'asc' }],
      limit: 100
    },
    charts: [
      {
        id: 'chart_1',
        title: 'Stock Levels by Category',
        type: 'bar',
        xAxis: 'category',
        yAxis: 'quantity',
        series: [
          {
            id: 'series_1',
            name: 'Stock Quantity',
            field: 'quantity',
            type: 'bar',
            color: '#3B82F6',
            visible: true
          }
        ],
        options: {
          showLegend: true,
          showGrid: true,
          showLabels: true,
          showTooltip: true,
          animation: true,
          colors: ['#3B82F6', '#10B981', '#F59E0B'],
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
    ],
    parameters: [
      {
        id: 'param_1',
        name: 'category_filter',
        label: 'Category Filter',
        type: 'select',
        required: false,
        options: ['equipment', 'parts', 'consumables', 'tools'],
        description: 'Filter by product category'
      }
    ],
    metadata: {
      version: '1.0.0',
      author: 'System',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      isPublic: true,
      isActive: true,
      usageCount: 15,
      rating: 4.5,
      complexity: 'low',
      estimatedRows: 500
    }
  },
  {
    id: 'template_2',
    name: 'BOM Cost Analysis',
    description: 'Analyze Bill of Materials costs and component breakdown',
    category: 'manufacturing',
    tags: ['bom', 'cost', 'manufacturing', 'analysis'],
    query: {
      table: 'manufacturing_boms',
      fields: [
        { name: 'name', alias: 'BOM Name', type: 'string' },
        { name: 'total_cost', alias: 'Total Cost', type: 'number' },
        { name: 'component_count', alias: 'Component Count', type: 'number' },
        { name: 'created_at', alias: 'Created Date', type: 'date' }
      ],
      filters: [],
      joins: [],
      orderBy: [{ field: 'total_cost', direction: 'desc' }],
      limit: 50
    },
    charts: [
      {
        id: 'chart_2',
        title: 'BOM Cost Distribution',
        type: 'pie',
        xAxis: 'name',
        yAxis: 'total_cost',
        series: [
          {
            id: 'series_2',
            name: 'Total Cost',
            field: 'total_cost',
            type: 'pie',
            color: '#10B981',
            visible: true
          }
        ],
        options: {
          showLegend: true,
          showGrid: false,
          showLabels: true,
          showTooltip: true,
          animation: true,
          colors: ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
          height: 350,
          theme: 'light',
          legendPosition: 'right',
          gridColor: '#E5E7EB',
          backgroundColor: '#FFFFFF',
          fontFamily: 'Inter, sans-serif',
          fontSize: 12
        },
        size: { width: 6, height: 4 },
        position: { x: 6, y: 0 }
      }
    ],
    parameters: [
      {
        id: 'param_2',
        name: 'cost_threshold',
        label: 'Cost Threshold',
        type: 'number',
        required: false,
        defaultValue: 1000,
        description: 'Minimum cost to include in analysis'
      }
    ],
    metadata: {
      version: '1.0.0',
      author: 'System',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
      isPublic: true,
      isActive: true,
      usageCount: 8,
      rating: 4.2,
      complexity: 'medium',
      estimatedRows: 200
    }
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    
    let filteredTemplates = templates
    
    // Filter by category
    if (category && category !== 'all') {
      filteredTemplates = filteredTemplates.filter(template => 
        template.category === category
      )
    }
    
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filteredTemplates = filteredTemplates.filter(template =>
        template.name.toLowerCase().includes(searchLower) ||
        template.description.toLowerCase().includes(searchLower) ||
        template.tags.some((tag: string) => tag.toLowerCase().includes(searchLower))
      )
    }
    
    return NextResponse.json({
      success: true,
      templates: filteredTemplates
    })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch templates'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const template = await request.json()
    
    // Validate required fields
    if (!template.name || !template.query) {
      return NextResponse.json({
        success: false,
        error: 'Template name and query are required'
      }, { status: 400 })
    }
    
    // Add timestamp and generate ID if not provided
    const newTemplate = {
      ...template,
      id: template.id || `template_${Date.now()}`,
      metadata: {
        ...template.metadata,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }
    
    templates.push(newTemplate)
    
    return NextResponse.json({
      success: true,
      template: newTemplate
    })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create template'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const template = await request.json()
    
    if (!template.id) {
      return NextResponse.json({
        success: false,
        error: 'Template ID is required for updates'
      }, { status: 400 })
    }
    
    const index = templates.findIndex(t => t.id === template.id)
    if (index === -1) {
      return NextResponse.json({
        success: false,
        error: 'Template not found'
      }, { status: 404 })
    }
    
    // Update template with new data
    const updatedTemplate = {
      ...templates[index],
      ...template,
      metadata: {
        ...templates[index].metadata,
        ...template.metadata,
        updatedAt: new Date()
      }
    }
    
    templates[index] = updatedTemplate
    
    return NextResponse.json({
      success: true,
      template: updatedTemplate
    })
  } catch (error) {
    console.error('Error updating template:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update template'
    }, { status: 500 })
  }
}