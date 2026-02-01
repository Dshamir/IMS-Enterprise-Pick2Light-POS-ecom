/**
 * Advanced Report Renderer with Puppeteer + D3.js
 * Enterprise-grade report generation with rich visualizations
 */

import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import * as XLSX from 'xlsx'

// Dynamic import for puppeteer to avoid SSR issues
const getPuppeteer = async () => {
  if (typeof window !== 'undefined') {
    throw new Error('Puppeteer can only be used on the server side')
  }
  try {
    const puppeteer = await import('puppeteer')
    return puppeteer.default || puppeteer
  } catch (error) {
    console.warn('Puppeteer not available, PDF generation disabled:', error)
    return null
  }
}

type Browser = any
type Page = any

// Report rendering interfaces
export interface ReportRenderOptions {
  title: string
  subtitle?: string
  format: 'pdf' | 'png' | 'html' | 'svg' | 'xlsx'
  template: 'executive' | 'technical' | 'dashboard' | 'custom'
  data: any[]
  charts: ChartDefinition[]
  layout: LayoutConfig
  styling: StylingConfig
  metadata?: ReportMetadata
  outputPath?: string
  performance?: PerformanceOptions
}

export interface ChartDefinition {
  id: string
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'histogram' | 'heatmap' | 'treemap' | 'gauge' | 'bubble'
  title: string
  data: any[]
  x?: string
  y?: string
  color?: string
  size?: string
  width: number
  height: number
  position: { x: number; y: number }
  config: ChartConfig
}

export interface ChartConfig {
  margins: { top: number; right: number; bottom: number; left: number }
  colors: string[]
  scales: {
    x: ScaleConfig
    y: ScaleConfig
  }
  axes: {
    x: AxisConfig
    y: AxisConfig
  }
  legend: LegendConfig
  animations: AnimationConfig
  interactions: InteractionConfig
}

export interface ScaleConfig {
  type: 'linear' | 'log' | 'time' | 'ordinal' | 'band'
  domain?: [number, number] | string[]
  range?: [number, number] | string[]
  nice?: boolean
  clamp?: boolean
}

export interface AxisConfig {
  show: boolean
  label: string
  tickCount: number
  tickFormat?: string
  rotate?: number
  grid: boolean
}

export interface LegendConfig {
  show: boolean
  position: 'top' | 'bottom' | 'left' | 'right'
  align: 'start' | 'center' | 'end'
  orientation: 'horizontal' | 'vertical'
}

export interface AnimationConfig {
  duration: number
  delay: number
  easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out'
  enabled: boolean
}

export interface InteractionConfig {
  hover: boolean
  tooltip: boolean
  zoom: boolean
  pan: boolean
  brush: boolean
}

export interface LayoutConfig {
  pageSize: 'A4' | 'A3' | 'letter' | 'legal' | 'tabloid'
  orientation: 'portrait' | 'landscape'
  margins: { top: number; right: number; bottom: number; left: number }
  columns: number
  spacing: number
  header: HeaderConfig
  footer: FooterConfig
  grid: GridConfig
}

export interface HeaderConfig {
  show: boolean
  height: number
  content: string
  style: string
}

export interface FooterConfig {
  show: boolean
  height: number
  content: string
  style: string
}

export interface GridConfig {
  show: boolean
  rows: number
  cols: number
  gap: number
}

export interface StylingConfig {
  theme: 'light' | 'dark' | 'corporate' | 'modern' | 'minimal'
  fontFamily: string
  fontSize: number
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
    muted: string
  }
  css: string
}

export interface ReportMetadata {
  author: string
  created: Date
  version: string
  description: string
  tags: string[]
  company: string
  department: string
}

export interface PerformanceOptions {
  timeout: number
  memory: number
  concurrency: number
  cache: boolean
  optimize: boolean
}

export interface RenderResult {
  success: boolean
  outputPath?: string
  format: string
  size: number
  duration: number
  metadata: {
    pages: number
    charts: number
    dataPoints: number
    errors: string[]
    warnings: string[]
  }
}

/**
 * Advanced Report Renderer with Puppeteer + D3.js
 */
export class ReportRenderer {
  private browser: Browser | null = null
  private isInitialized = false
  private renderQueue: Array<{ options: ReportRenderOptions; resolve: Function; reject: Function }> = []
  private activeRenders = 0
  private maxConcurrency = 3

  constructor() {
    this.initializeBrowser()
  }

  /**
   * Initialize Puppeteer browser
   */
  private async initializeBrowser(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        throw new Error('Report renderer can only be used on the server side')
      }
      
      const puppeteerModule = await getPuppeteer()
      if (!puppeteerModule) {
        console.warn('Puppeteer not available, PDF rendering will be disabled')
        this.isInitialized = false
        return
      }
      
      this.browser = await puppeteerModule.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      })
      this.isInitialized = true
      console.log('✅ Report renderer initialized with Puppeteer')
    } catch (error) {
      console.error('❌ Failed to initialize Puppeteer:', error)
      throw error
    }
  }

  /**
   * Render a report with advanced features
   */
  async renderReport(options: ReportRenderOptions): Promise<RenderResult> {
    if (!this.isInitialized || !this.browser) {
      await this.initializeBrowser()
    }

    // If puppeteer is not available and format requires it, return error
    if (!this.browser && (options.format === 'pdf' || options.format === 'png')) {
      return {
        success: false,
        error: 'PDF/PNG rendering not available - Puppeteer not installed',
        outputPath: '',
        metadata: {
          renderTime: 0,
          fileSize: 0,
          pageCount: 0
        }
      }
    }

    return new Promise((resolve, reject) => {
      this.renderQueue.push({ options, resolve, reject })
      this.processQueue()
    })
  }

  /**
   * Process render queue with concurrency control
   */
  private async processQueue(): Promise<void> {
    if (this.activeRenders >= this.maxConcurrency || this.renderQueue.length === 0) {
      return
    }

    const { options, resolve, reject } = this.renderQueue.shift()!
    this.activeRenders++

    try {
      const result = await this.executeRender(options)
      resolve(result)
    } catch (error) {
      reject(error)
    } finally {
      this.activeRenders--
      this.processQueue()
    }
  }

  /**
   * Execute the actual rendering process
   */
  private async executeRender(options: ReportRenderOptions): Promise<RenderResult> {
    const startTime = Date.now()
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Create new page
      const page = await this.browser!.newPage()
      
      // Set viewport and performance options
      await page.setViewport({
        width: this.getPageWidth(options.layout),
        height: this.getPageHeight(options.layout),
        deviceScaleFactor: 2
      })

      // Set timeout
      page.setDefaultTimeout(options.performance?.timeout || 30000)

      // Generate HTML content
      const html = await this.generateHTML(options)
      
      // Load HTML with D3.js and other dependencies
      await page.setContent(html, { waitUntil: 'networkidle0' })

      // Wait for charts to render
      await page.waitForSelector('.chart-container', { timeout: 10000 })

      // Execute D3.js rendering
      await this.renderCharts(page, options.charts)

      // Generate output based on format
      let outputPath: string | undefined
      let size = 0

      switch (options.format) {
        case 'pdf':
          outputPath = await this.generatePDF(page, options)
          break
        case 'png':
          outputPath = await this.generatePNG(page, options)
          break
        case 'html':
          outputPath = await this.generateHTML(options, true)
          break
        case 'svg':
          outputPath = await this.generateSVG(page, options)
          break
        case 'xlsx':
          outputPath = await this.generateExcel(options)
          break
      }

      // Get file size
      if (outputPath) {
        const fs = await import('fs/promises')
        const stats = await fs.stat(outputPath)
        size = stats.size
      }

      // Close page
      await page.close()

      return {
        success: true,
        outputPath,
        format: options.format,
        size,
        duration: Date.now() - startTime,
        metadata: {
          pages: 1, // TODO: Calculate actual pages
          charts: options.charts.length,
          dataPoints: options.data.length,
          errors,
          warnings
        }
      }

    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error')
      
      return {
        success: false,
        format: options.format,
        size: 0,
        duration: Date.now() - startTime,
        metadata: {
          pages: 0,
          charts: 0,
          dataPoints: 0,
          errors,
          warnings
        }
      }
    }
  }

  /**
   * Generate HTML template with D3.js integration
   */
  private async generateHTML(options: ReportRenderOptions, saveToFile = false): Promise<string> {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${options.title}</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        ${this.generateCSS(options.styling)}
        ${this.generateLayoutCSS(options.layout)}
        .chart-container {
            margin: 20px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
            background: white;
        }
        .chart-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            text-align: center;
        }
        .chart-svg {
            width: 100%;
            height: 100%;
        }
        .axis text {
            font-size: 12px;
        }
        .axis-label {
            font-size: 14px;
            font-weight: bold;
        }
        .legend {
            font-size: 12px;
        }
        .tooltip {
            position: absolute;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
            z-index: 1000;
        }
    </style>
</head>
<body>
    <div class="report-container">
        ${this.generateHeader(options)}
        <div class="report-content">
            ${this.generateDataTable(options.data)}
            ${this.generateChartContainers(options.charts)}
        </div>
        ${this.generateFooter(options)}
    </div>
    
    <script>
        ${this.generateD3Scripts(options.charts)}
    </script>
</body>
</html>`

    if (saveToFile) {
      const outputPath = options.outputPath || join(process.cwd(), 'tmp', `report-${Date.now()}.html`)
      await mkdir(join(outputPath, '..'), { recursive: true })
      await writeFile(outputPath, html)
      return outputPath
    }

    return html
  }

  /**
   * Generate CSS for styling
   */
  private generateCSS(styling: StylingConfig): string {
    const themes = {
      light: {
        background: '#ffffff',
        text: '#333333',
        border: '#e0e0e0'
      },
      dark: {
        background: '#1a1a1a',
        text: '#ffffff',
        border: '#404040'
      },
      corporate: {
        background: '#f8f9fa',
        text: '#2c3e50',
        border: '#bdc3c7'
      },
      modern: {
        background: '#ffffff',
        text: '#2d3748',
        border: '#e2e8f0'
      },
      minimal: {
        background: '#ffffff',
        text: '#000000',
        border: '#cccccc'
      }
    }

    const theme = themes[styling.theme]

    return `
        body {
            font-family: ${styling.fontFamily};
            font-size: ${styling.fontSize}px;
            color: ${styling.colors.text || theme.text};
            background: ${styling.colors.background || theme.background};
            margin: 0;
            padding: 0;
        }
        .report-container {
            max-width: 100%;
            margin: 0 auto;
            padding: 20px;
        }
        ${styling.css}
    `
  }

  /**
   * Generate layout CSS
   */
  private generateLayoutCSS(layout: LayoutConfig): string {
    return `
        .report-container {
            max-width: ${this.getPageWidth(layout)}px;
            margin: ${layout.margins.top}px ${layout.margins.right}px ${layout.margins.bottom}px ${layout.margins.left}px;
        }
        .chart-grid {
            display: grid;
            grid-template-columns: repeat(${layout.columns}, 1fr);
            gap: ${layout.spacing}px;
        }
    `
  }

  /**
   * Generate header HTML
   */
  private generateHeader(options: ReportRenderOptions): string {
    if (!options.layout.header.show) return ''
    
    return `
        <div class="report-header" style="height: ${options.layout.header.height}px;">
            <h1>${options.title}</h1>
            ${options.subtitle ? `<h2>${options.subtitle}</h2>` : ''}
            ${options.layout.header.content}
        </div>
    `
  }

  /**
   * Generate footer HTML
   */
  private generateFooter(options: ReportRenderOptions): string {
    if (!options.layout.footer.show) return ''
    
    return `
        <div class="report-footer" style="height: ${options.layout.footer.height}px;">
            ${options.layout.footer.content}
            <div class="metadata">
                Generated on ${new Date().toLocaleDateString()}
                ${options.metadata?.author ? `by ${options.metadata.author}` : ''}
            </div>
        </div>
    `
  }

  /**
   * Generate data table HTML
   */
  private generateDataTable(data: any[]): string {
    if (!data || data.length === 0) return ''
    
    const columns = Object.keys(data[0])
    
    return `
        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        ${columns.map(col => `<th>${col}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${data.slice(0, 100).map(row => `
                        <tr>
                            ${columns.map(col => `<td>${row[col] || ''}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `
  }

  /**
   * Generate chart containers
   */
  private generateChartContainers(charts: ChartDefinition[]): string {
    return `
        <div class="chart-grid">
            ${charts.map(chart => `
                <div class="chart-container" id="chart-${chart.id}">
                    <div class="chart-title">${chart.title}</div>
                    <svg class="chart-svg" id="svg-${chart.id}" width="${chart.width}" height="${chart.height}"></svg>
                </div>
            `).join('')}
        </div>
    `
  }

  /**
   * Generate D3.js scripts for charts
   */
  private generateD3Scripts(charts: ChartDefinition[]): string {
    return charts.map(chart => {
      switch (chart.type) {
        case 'bar':
          return this.generateBarChart(chart)
        case 'line':
          return this.generateLineChart(chart)
        case 'pie':
          return this.generatePieChart(chart)
        default:
          return `// Chart type ${chart.type} not implemented yet`
      }
    }).join('\n\n')
  }

  /**
   * Generate bar chart D3.js code
   */
  private generateBarChart(chart: ChartDefinition): string {
    return `
        // Bar Chart: ${chart.title}
        (function() {
            const data = ${JSON.stringify(chart.data)};
            const svg = d3.select('#svg-${chart.id}');
            const margin = ${JSON.stringify(chart.config.margins)};
            const width = ${chart.width} - margin.left - margin.right;
            const height = ${chart.height} - margin.top - margin.bottom;
            
            const g = svg.append('g')
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
            
            const x = d3.scaleBand()
                .domain(data.map(d => d.${chart.x}))
                .range([0, width])
                .padding(0.1);
            
            const y = d3.scaleLinear()
                .domain([0, d3.max(data, d => d.${chart.y})])
                .range([height, 0]);
            
            g.selectAll('.bar')
                .data(data)
                .enter().append('rect')
                .attr('class', 'bar')
                .attr('x', d => x(d.${chart.x}))
                .attr('width', x.bandwidth())
                .attr('y', d => y(d.${chart.y}))
                .attr('height', d => height - y(d.${chart.y}))
                .attr('fill', '${chart.config.colors[0] || '#3b82f6'}');
            
            g.append('g')
                .attr('transform', 'translate(0,' + height + ')')
                .call(d3.axisBottom(x));
            
            g.append('g')
                .call(d3.axisLeft(y));
        })();
    `
  }

  /**
   * Generate line chart D3.js code
   */
  private generateLineChart(chart: ChartDefinition): string {
    return `
        // Line Chart: ${chart.title}
        (function() {
            const data = ${JSON.stringify(chart.data)};
            const svg = d3.select('#svg-${chart.id}');
            const margin = ${JSON.stringify(chart.config.margins)};
            const width = ${chart.width} - margin.left - margin.right;
            const height = ${chart.height} - margin.top - margin.bottom;
            
            const g = svg.append('g')
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
            
            const x = d3.scaleLinear()
                .domain(d3.extent(data, d => d.${chart.x}))
                .range([0, width]);
            
            const y = d3.scaleLinear()
                .domain(d3.extent(data, d => d.${chart.y}))
                .range([height, 0]);
            
            const line = d3.line()
                .x(d => x(d.${chart.x}))
                .y(d => y(d.${chart.y}))
                .curve(d3.curveMonotoneX);
            
            g.append('path')
                .datum(data)
                .attr('fill', 'none')
                .attr('stroke', '${chart.config.colors[0] || '#3b82f6'}')
                .attr('stroke-width', 2)
                .attr('d', line);
            
            g.append('g')
                .attr('transform', 'translate(0,' + height + ')')
                .call(d3.axisBottom(x));
            
            g.append('g')
                .call(d3.axisLeft(y));
        })();
    `
  }

  /**
   * Generate pie chart D3.js code
   */
  private generatePieChart(chart: ChartDefinition): string {
    return `
        // Pie Chart: ${chart.title}
        (function() {
            const data = ${JSON.stringify(chart.data)};
            const svg = d3.select('#svg-${chart.id}');
            const width = ${chart.width};
            const height = ${chart.height};
            const radius = Math.min(width, height) / 2;
            
            const g = svg.append('g')
                .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');
            
            const color = d3.scaleOrdinal(${JSON.stringify(chart.config.colors)});
            
            const pie = d3.pie()
                .value(d => d.${chart.y});
            
            const path = d3.arc()
                .outerRadius(radius - 10)
                .innerRadius(0);
            
            const arc = g.selectAll('.arc')
                .data(pie(data))
                .enter().append('g')
                .attr('class', 'arc');
            
            arc.append('path')
                .attr('d', path)
                .attr('fill', d => color(d.data.${chart.x}));
            
            arc.append('text')
                .attr('transform', d => 'translate(' + path.centroid(d) + ')')
                .attr('dy', '.35em')
                .style('text-anchor', 'middle')
                .text(d => d.data.${chart.x});
        })();
    `
  }

  /**
   * Render charts using D3.js
   */
  private async renderCharts(page: Page, charts: ChartDefinition[]): Promise<void> {
    // Wait for D3.js to be loaded
    await page.waitForFunction(() => typeof d3 !== 'undefined')
    
    // Execute chart rendering scripts
    for (const chart of charts) {
      await page.evaluate(`
        try {
          ${this.generateD3Scripts([chart])}
        } catch (error) {
          console.error('Error rendering chart ${chart.id}:', error);
        }
      `)
    }
    
    // Wait for charts to be rendered
    await page.waitForTimeout(2000)
  }

  /**
   * Generate PDF output
   */
  private async generatePDF(page: Page, options: ReportRenderOptions): Promise<string> {
    const outputPath = options.outputPath || join(process.cwd(), 'tmp', `report-${Date.now()}.pdf`)
    await mkdir(join(outputPath, '..'), { recursive: true })
    
    await page.pdf({
      path: outputPath,
      format: options.layout.pageSize.toLowerCase() as any,
      landscape: options.layout.orientation === 'landscape',
      printBackground: true,
      margin: {
        top: `${options.layout.margins.top}px`,
        right: `${options.layout.margins.right}px`,
        bottom: `${options.layout.margins.bottom}px`,
        left: `${options.layout.margins.left}px`
      }
    })
    
    return outputPath
  }

  /**
   * Generate PNG output
   */
  private async generatePNG(page: Page, options: ReportRenderOptions): Promise<string> {
    const outputPath = options.outputPath || join(process.cwd(), 'tmp', `report-${Date.now()}.png`)
    await mkdir(join(outputPath, '..'), { recursive: true })
    
    await page.screenshot({
      path: outputPath,
      fullPage: true,
      type: 'png'
    })
    
    return outputPath
  }

  /**
   * Generate SVG output
   */
  private async generateSVG(page: Page, options: ReportRenderOptions): Promise<string> {
    const outputPath = options.outputPath || join(process.cwd(), 'tmp', `report-${Date.now()}.svg`)
    await mkdir(join(outputPath, '..'), { recursive: true })
    
    const svg = await page.evaluate(() => {
      const svgElements = document.querySelectorAll('svg')
      if (svgElements.length > 0) {
        return svgElements[0].outerHTML
      }
      return '<svg></svg>'
    })
    
    await writeFile(outputPath, svg)
    return outputPath
  }

  /**
   * Generate Excel output
   */
  private async generateExcel(options: ReportRenderOptions): Promise<string> {
    const outputPath = options.outputPath || join(process.cwd(), 'tmp', `report-${Date.now()}.xlsx`)
    await mkdir(join(outputPath, '..'), { recursive: true })
    
    // Create new workbook
    const workbook = XLSX.utils.book_new()
    
    // Add main data sheet
    if (options.data && options.data.length > 0) {
      const worksheet = XLSX.utils.json_to_sheet(options.data)
      
      // Add some formatting
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1')
      worksheet['!cols'] = []
      
      // Auto-resize columns
      for (let col = range.s.c; col <= range.e.c; col++) {
        let maxWidth = 0
        for (let row = range.s.r; row <= range.e.r; row++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
          const cell = worksheet[cellAddress]
          if (cell && cell.v) {
            const cellLength = cell.v.toString().length
            if (cellLength > maxWidth) {
              maxWidth = cellLength
            }
          }
        }
        worksheet['!cols'][col] = { width: Math.min(maxWidth + 2, 50) }
      }
      
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')
    }
    
    // Add metadata sheet
    const metadataSheet = XLSX.utils.json_to_sheet([
      { Property: 'Title', Value: options.title },
      { Property: 'Subtitle', Value: options.subtitle || '' },
      { Property: 'Generated', Value: new Date().toISOString() },
      { Property: 'Template', Value: options.template },
      { Property: 'Format', Value: options.format },
      { Property: 'Records', Value: options.data?.length || 0 },
      { Property: 'Charts', Value: options.charts?.length || 0 },
      { Property: 'Author', Value: options.metadata?.author || 'System' },
      { Property: 'Company', Value: options.metadata?.company || '' },
      { Property: 'Department', Value: options.metadata?.department || '' },
      { Property: 'Version', Value: options.metadata?.version || '1.0.0' },
      { Property: 'Description', Value: options.metadata?.description || '' }
    ])
    XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadata')
    
    // Add chart data sheets
    if (options.charts && options.charts.length > 0) {
      options.charts.forEach((chart, index) => {
        if (chart.data && chart.data.length > 0) {
          const chartSheet = XLSX.utils.json_to_sheet(chart.data)
          const sheetName = `Chart_${index + 1}_${chart.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)}`
          XLSX.utils.book_append_sheet(workbook, chartSheet, sheetName)
        }
      })
    }
    
    // Add summary sheet
    const summaryData = []
    if (options.data && options.data.length > 0) {
      const keys = Object.keys(options.data[0])
      keys.forEach(key => {
        const values = options.data.map(row => row[key]).filter(val => val !== null && val !== undefined)
        if (values.length > 0) {
          const numericValues = values.filter(val => typeof val === 'number' || !isNaN(Number(val)))
          if (numericValues.length > 0) {
            const nums = numericValues.map(val => Number(val))
            summaryData.push({
              Field: key,
              Count: values.length,
              Min: Math.min(...nums),
              Max: Math.max(...nums),
              Average: nums.reduce((a, b) => a + b, 0) / nums.length,
              Sum: nums.reduce((a, b) => a + b, 0)
            })
          } else {
            summaryData.push({
              Field: key,
              Count: values.length,
              Min: 'N/A',
              Max: 'N/A',
              Average: 'N/A',
              Sum: 'N/A'
            })
          }
        }
      })
    }
    
    if (summaryData.length > 0) {
      const summarySheet = XLSX.utils.json_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')
    }
    
    // Write file
    XLSX.writeFile(workbook, outputPath)
    
    return outputPath
  }

  /**
   * Get page width based on layout
   */
  private getPageWidth(layout: LayoutConfig): number {
    const sizes = {
      'A4': layout.orientation === 'landscape' ? 297 : 210,
      'A3': layout.orientation === 'landscape' ? 420 : 297,
      'letter': layout.orientation === 'landscape' ? 279 : 216,
      'legal': layout.orientation === 'landscape' ? 356 : 216,
      'tabloid': layout.orientation === 'landscape' ? 432 : 279
    }
    return (sizes[layout.pageSize] || 210) * 4 // Convert mm to pixels (approximate)
  }

  /**
   * Get page height based on layout
   */
  private getPageHeight(layout: LayoutConfig): number {
    const sizes = {
      'A4': layout.orientation === 'landscape' ? 210 : 297,
      'A3': layout.orientation === 'landscape' ? 297 : 420,
      'letter': layout.orientation === 'landscape' ? 216 : 279,
      'legal': layout.orientation === 'landscape' ? 216 : 356,
      'tabloid': layout.orientation === 'landscape' ? 279 : 432
    }
    return (sizes[layout.pageSize] || 297) * 4 // Convert mm to pixels (approximate)
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.isInitialized = false
    }
  }
}

// Export singleton instance
export const reportRenderer = new ReportRenderer()

// Default configurations
export const defaultStylingConfig: StylingConfig = {
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
  },
  css: ''
}

export const defaultLayoutConfig: LayoutConfig = {
  pageSize: 'A4',
  orientation: 'portrait',
  margins: { top: 50, right: 50, bottom: 50, left: 50 },
  columns: 2,
  spacing: 20,
  header: {
    show: true,
    height: 100,
    content: '',
    style: ''
  },
  footer: {
    show: true,
    height: 50,
    content: '',
    style: ''
  },
  grid: {
    show: true,
    rows: 3,
    cols: 2,
    gap: 20
  }
}

export const defaultChartConfig: ChartConfig = {
  margins: { top: 20, right: 20, bottom: 40, left: 40 },
  colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
  scales: {
    x: { type: 'band', nice: true },
    y: { type: 'linear', nice: true }
  },
  axes: {
    x: { show: true, label: '', tickCount: 5, grid: false },
    y: { show: true, label: '', tickCount: 5, grid: true }
  },
  legend: {
    show: true,
    position: 'bottom',
    align: 'center',
    orientation: 'horizontal'
  },
  animations: {
    duration: 300,
    delay: 0,
    easing: 'ease-in-out',
    enabled: true
  },
  interactions: {
    hover: true,
    tooltip: true,
    zoom: false,
    pan: false,
    brush: false
  }
}