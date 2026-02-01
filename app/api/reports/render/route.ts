import { NextRequest, NextResponse } from 'next/server'
import { 
  reportRenderer, 
  defaultStylingConfig, 
  defaultLayoutConfig, 
  defaultChartConfig,
  type ReportRenderOptions,
  type ChartDefinition 
} from '@/lib/reports/report-renderer'
import { readFile } from 'fs/promises'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      subtitle,
      format = 'pdf',
      template = 'executive',
      data = [],
      charts = [],
      styling = defaultStylingConfig,
      layout = defaultLayoutConfig,
      metadata = {}
    } = body

    // Validate required fields
    if (!title) {
      return NextResponse.json({
        success: false,
        error: 'Title is required'
      }, { status: 400 })
    }

    // Validate format
    if (!['pdf', 'png', 'html', 'svg', 'xlsx'].includes(format)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid format. Supported formats: pdf, png, html, svg, xlsx'
      }, { status: 400 })
    }

    // Process charts with default config
    const processedCharts: ChartDefinition[] = charts.map((chart: any) => ({
      id: chart.id || `chart-${Date.now()}`,
      type: chart.type || 'bar',
      title: chart.title || 'Chart',
      data: chart.data || [],
      x: chart.x || 'x',
      y: chart.y || 'y',
      color: chart.color,
      size: chart.size,
      width: chart.width || 400,
      height: chart.height || 300,
      position: chart.position || { x: 0, y: 0 },
      config: { ...defaultChartConfig, ...chart.config }
    }))

    // Create render options
    const renderOptions: ReportRenderOptions = {
      title,
      subtitle,
      format: format as 'pdf' | 'png' | 'html' | 'svg' | 'xlsx',
      template: template as 'executive' | 'technical' | 'dashboard' | 'custom',
      data,
      charts: processedCharts,
      layout: { ...defaultLayoutConfig, ...layout },
      styling: { ...defaultStylingConfig, ...styling },
      metadata: {
        author: metadata.author || 'System',
        created: new Date(),
        version: '1.0.0',
        description: metadata.description || 'Generated report',
        tags: metadata.tags || [],
        company: metadata.company || 'Company',
        department: metadata.department || 'Department'
      },
      performance: {
        timeout: 30000,
        memory: 512,
        concurrency: 3,
        cache: true,
        optimize: true
      }
    }

    // Render the report
    const result = await reportRenderer.renderReport(renderOptions)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to render report',
        details: result.metadata.errors
      }, { status: 500 })
    }

    // For non-HTML formats, return the file as a blob
    if (format !== 'html' && result.outputPath) {
      try {
        const fileBuffer = await readFile(result.outputPath)
        const contentType = getContentType(format)
        
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="report-${Date.now()}.${format}"`,
            'Content-Length': fileBuffer.length.toString()
          }
        })
      } catch (fileError) {
        return NextResponse.json({
          success: false,
          error: 'Failed to read generated file',
          details: fileError instanceof Error ? fileError.message : 'Unknown error'
        }, { status: 500 })
      }
    }

    // For HTML format or if no file was generated, return metadata
    return NextResponse.json({
      success: true,
      result: {
        format: result.format,
        size: result.size,
        duration: result.duration,
        metadata: result.metadata,
        outputPath: result.outputPath
      }
    })

  } catch (error) {
    console.error('Error rendering report:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return available options and examples
    const examples = {
      basicReport: {
        title: 'Inventory Report',
        subtitle: 'Monthly Summary',
        format: 'pdf',
        template: 'executive',
        data: [
          { category: 'Parts', count: 150, value: 25000 },
          { category: 'Tools', count: 45, value: 12000 },
          { category: 'Equipment', count: 23, value: 85000 }
        ],
        charts: [
          {
            id: 'inventory-by-category',
            type: 'bar',
            title: 'Inventory by Category',
            data: [
              { category: 'Parts', count: 150 },
              { category: 'Tools', count: 45 },
              { category: 'Equipment', count: 23 }
            ],
            x: 'category',
            y: 'count',
            width: 400,
            height: 300
          }
        ],
        styling: {
          theme: 'corporate',
          fontFamily: 'Arial, sans-serif',
          fontSize: 12
        },
        layout: {
          pageSize: 'A4',
          orientation: 'portrait',
          margins: { top: 50, right: 50, bottom: 50, left: 50 }
        }
      }
    }

    const capabilities = {
      formats: ['pdf', 'png', 'html', 'svg', 'xlsx'],
      templates: ['executive', 'technical', 'dashboard', 'custom'],
      chartTypes: ['bar', 'line', 'pie', 'scatter', 'area', 'histogram', 'heatmap', 'treemap', 'gauge', 'bubble'],
      themes: ['light', 'dark', 'corporate', 'modern', 'minimal'],
      pageSizes: ['A4', 'A3', 'letter', 'legal', 'tabloid'],
      orientations: ['portrait', 'landscape']
    }

    return NextResponse.json({
      success: true,
      capabilities,
      examples,
      usage: {
        endpoint: '/api/reports/render',
        method: 'POST',
        description: 'Render reports with advanced visualizations using Puppeteer + D3.js'
      }
    })

  } catch (error) {
    console.error('Error getting render info:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

function getContentType(format: string): string {
  switch (format) {
    case 'pdf':
      return 'application/pdf'
    case 'png':
      return 'image/png'
    case 'svg':
      return 'image/svg+xml'
    case 'html':
      return 'text/html'
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    default:
      return 'application/octet-stream'
  }
}