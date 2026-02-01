import { getDatabase } from '@/lib/database/sqlite'
import type { Database } from 'better-sqlite3'
import type { ReportQuery, ReportField, ReportFilter, ReportJoin, ReportOrderBy } from './query-engine'

// Report configuration interfaces
export interface ReportTemplate {
  id: string
  name: string
  description: string
  category: 'inventory' | 'manufacturing' | 'financial' | 'operational' | 'custom'
  version: string
  author: string
  tags: string[]
  isPublic: boolean
  isActive: boolean
  config: ReportConfig
  metadata: ReportMetadata
  createdAt: Date
  updatedAt: Date
}

export interface ReportConfig {
  query: ReportQuery
  visualization: VisualizationConfig
  filters: FilterConfig[]
  grouping: GroupingConfig
  sorting: SortingConfig
  formatting: FormattingConfig
  export: ExportConfig
  scheduling: SchedulingConfig
  permissions: PermissionConfig
}

export interface VisualizationConfig {
  type: 'table' | 'chart' | 'dashboard'
  chartType?: 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'column' | 'gauge'
  layout: 'single' | 'grid' | 'tabs'
  theme: 'default' | 'dark' | 'professional' | 'minimal'
  responsive: boolean
  pagination: {
    enabled: boolean
    pageSize: number
    pageSizes: number[]
  }
  charts: ChartConfig[]
}

export interface ChartConfig {
  id: string
  title: string
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'column' | 'gauge'
  xAxis: string
  yAxis: string | string[]
  series: SeriesConfig[]
  options: ChartOptions
}

export interface SeriesConfig {
  name: string
  field: string
  type: 'line' | 'bar' | 'area'
  color?: string
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max'
}

export interface ChartOptions {
  showLegend: boolean
  showGrid: boolean
  showLabels: boolean
  showTooltip: boolean
  animation: boolean
  colors: string[]
  height: number
  width?: number
}

export interface FilterConfig {
  id: string
  name: string
  field: string
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'range' | 'boolean'
  operator: string
  defaultValue?: any
  options?: FilterOption[]
  required: boolean
  visible: boolean
  readonly: boolean
  validation?: ValidationRule
}

export interface FilterOption {
  label: string
  value: any
  disabled?: boolean
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom'
  value?: any
  message: string
}

export interface GroupingConfig {
  enabled: boolean
  fields: string[]
  collapsible: boolean
  defaultCollapsed: boolean
  showCounts: boolean
  showSummary: boolean
  summaryFields: Array<{
    field: string
    aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max'
    format?: string
  }>
}

export interface SortingConfig {
  enabled: boolean
  multiColumn: boolean
  defaultSort: ReportOrderBy[]
  sortableFields: string[]
}

export interface FormattingConfig {
  dateFormat: string
  numberFormat: string
  currencyFormat: string
  percentageFormat: string
  fieldFormats: Record<string, FieldFormat>
  conditionalFormatting: ConditionalFormatRule[]
}

export interface FieldFormat {
  type: 'text' | 'number' | 'date' | 'currency' | 'percentage' | 'boolean'
  format?: string
  precision?: number
  prefix?: string
  suffix?: string
  transform?: 'uppercase' | 'lowercase' | 'capitalize'
}

export interface ConditionalFormatRule {
  id: string
  name: string
  field: string
  condition: string
  value: any
  format: {
    backgroundColor?: string
    textColor?: string
    fontWeight?: 'normal' | 'bold'
    fontStyle?: 'normal' | 'italic'
    textDecoration?: 'none' | 'underline' | 'line-through'
  }
}

export interface ExportConfig {
  enabled: boolean
  formats: Array<'csv' | 'xlsx' | 'pdf' | 'json' | 'xml'>
  filename: string
  includeMetadata: boolean
  includeCharts: boolean
  compression: boolean
  customHeaders: Record<string, string>
}

export interface SchedulingConfig {
  enabled: boolean
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  time: string
  timezone: string
  recipients: string[]
  format: 'csv' | 'xlsx' | 'pdf'
  includeCharts: boolean
}

export interface PermissionConfig {
  view: string[] // User roles/IDs
  edit: string[]
  delete: string[]
  export: string[]
  schedule: string[]
  public: boolean
}

export interface ReportMetadata {
  estimatedRows: number
  lastGenerated?: Date
  generationTime?: number
  dataFreshness: number // minutes
  complexity: 'low' | 'medium' | 'high'
  tags: string[]
  documentation: string
  examples: string[]
  usageCount: number
  averageRating: number
  reviews: ReportReview[]
}

export interface ReportReview {
  userId: string
  username: string
  rating: number
  comment: string
  timestamp: Date
}

export interface ReportInstance {
  id: string
  templateId: string
  templateName: string
  userId: string
  name: string
  description: string
  config: ReportConfig
  parameters: Record<string, any>
  generatedAt: Date
  expiresAt?: Date
  status: 'generating' | 'completed' | 'failed' | 'expired'
  error?: string
  resultCount: number
  generationTime: number
  metadata: Record<string, any>
}

/**
 * Report Configuration and Template Management System
 * Handles dynamic report templates, configurations, and instances
 */
export class ReportConfigManager {
  private db: Database
  private templates: Map<string, ReportTemplate> = new Map()
  private instances: Map<string, ReportInstance> = new Map()

  constructor() {
    this.db = getDatabase()
    this.initializeConfigTables()
    this.loadBuiltinTemplates()
  }

  /**
   * Initialize configuration tables
   */
  private initializeConfigTables(): void {
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS report_templates (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          name TEXT NOT NULL,
          description TEXT,
          category TEXT NOT NULL,
          version TEXT NOT NULL,
          author TEXT NOT NULL,
          tags TEXT,
          is_public INTEGER DEFAULT 0,
          is_active INTEGER DEFAULT 1,
          config TEXT NOT NULL,
          metadata TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS report_instances (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          template_id TEXT NOT NULL,
          template_name TEXT NOT NULL,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          config TEXT NOT NULL,
          parameters TEXT,
          generated_at TEXT DEFAULT (datetime('now')),
          expires_at TEXT,
          status TEXT DEFAULT 'generating',
          error TEXT,
          result_count INTEGER DEFAULT 0,
          generation_time INTEGER DEFAULT 0,
          metadata TEXT,
          FOREIGN KEY (template_id) REFERENCES report_templates(id)
        );

        CREATE TABLE IF NOT EXISTS report_reviews (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          template_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          username TEXT NOT NULL,
          rating INTEGER NOT NULL,
          comment TEXT,
          timestamp TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (template_id) REFERENCES report_templates(id)
        );

        CREATE INDEX IF NOT EXISTS idx_templates_category ON report_templates(category);
        CREATE INDEX IF NOT EXISTS idx_templates_author ON report_templates(author);
        CREATE INDEX IF NOT EXISTS idx_templates_tags ON report_templates(tags);
        CREATE INDEX IF NOT EXISTS idx_instances_template_id ON report_instances(template_id);
        CREATE INDEX IF NOT EXISTS idx_instances_user_id ON report_instances(user_id);
        CREATE INDEX IF NOT EXISTS idx_instances_status ON report_instances(status);
        CREATE INDEX IF NOT EXISTS idx_reviews_template_id ON report_reviews(template_id);
      `)
    } catch (error) {
      console.error('Error initializing config tables:', error)
    }
  }

  /**
   * Load built-in report templates
   */
  private loadBuiltinTemplates(): void {
    const builtinTemplates: ReportTemplate[] = [
      // Inventory Reports
      {
        id: 'inventory-stock-levels',
        name: 'Current Stock Levels',
        description: 'Overview of all product stock levels with alerts for low stock',
        category: 'inventory',
        version: '1.0.0',
        author: 'System',
        tags: ['inventory', 'stock', 'alerts'],
        isPublic: true,
        isActive: true,
        config: {
          query: {
            table: 'products',
            alias: 'p',
            fields: [
              { name: 'p.name', alias: 'product_name', type: 'string' },
              { name: 'p.category', alias: 'category', type: 'string' },
              { name: 'p.stock_quantity', alias: 'current_stock', type: 'number' },
              { name: 'p.min_stock_level', alias: 'min_stock', type: 'number' },
              { name: 'p.max_stock_level', alias: 'max_stock', type: 'number' },
              { name: 'p.price', alias: 'unit_price', type: 'number' },
              { name: 'p.Location', alias: 'location', type: 'string' }
            ],
            joins: [
              { type: 'left', table: 'units', alias: 'u', on: 'p.unit_id = u.id' }
            ],
            orderBy: [
              { field: 'p.stock_quantity', direction: 'asc' }
            ]
          },
          visualization: {
            type: 'table',
            layout: 'single',
            theme: 'default',
            responsive: true,
            pagination: { enabled: true, pageSize: 25, pageSizes: [25, 50, 100] },
            charts: []
          },
          filters: [
            {
              id: 'category-filter',
              name: 'Category',
              field: 'p.category',
              type: 'select',
              operator: 'equals',
              required: false,
              visible: true,
              readonly: false,
              options: [
                { label: 'All Categories', value: '' },
                { label: 'Equipment', value: 'equipment' },
                { label: 'Parts', value: 'parts' },
                { label: 'Consumables', value: 'consumables' },
                { label: 'Tools', value: 'tools' }
              ]
            },
            {
              id: 'stock-status-filter',
              name: 'Stock Status',
              field: 'stock_status',
              type: 'select',
              operator: 'equals',
              required: false,
              visible: true,
              readonly: false,
              options: [
                { label: 'All', value: '' },
                { label: 'Low Stock', value: 'Low Stock' },
                { label: 'Out of Stock', value: 'Out of Stock' },
                { label: 'Normal', value: 'Normal' }
              ]
            }
          ],
          grouping: {
            enabled: true,
            fields: ['category'],
            collapsible: true,
            defaultCollapsed: false,
            showCounts: true,
            showSummary: true,
            summaryFields: [
              { field: 'current_stock', aggregation: 'sum' },
              { field: 'total_value', aggregation: 'sum', format: 'currency' }
            ]
          },
          sorting: {
            enabled: true,
            multiColumn: true,
            defaultSort: [{ field: 'current_stock', direction: 'asc' }],
            sortableFields: ['product_name', 'category', 'current_stock', 'total_value']
          },
          formatting: {
            dateFormat: 'YYYY-MM-DD',
            numberFormat: '#,##0.00',
            currencyFormat: '$#,##0.00',
            percentageFormat: '0.00%',
            fieldFormats: {
              'total_value': { type: 'currency', format: '$#,##0.00' },
              'current_stock': { type: 'number', format: '#,##0' }
            },
            conditionalFormatting: [
              {
                id: 'low-stock-warning',
                name: 'Low Stock Warning',
                field: 'stock_status',
                condition: 'equals',
                value: 'Low Stock',
                format: { backgroundColor: '#FFF3CD', textColor: '#856404' }
              },
              {
                id: 'out-of-stock-alert',
                name: 'Out of Stock Alert',
                field: 'stock_status',
                condition: 'equals',
                value: 'Out of Stock',
                format: { backgroundColor: '#F8D7DA', textColor: '#721C24', fontWeight: 'bold' }
              }
            ]
          },
          export: {
            enabled: true,
            formats: ['csv', 'xlsx', 'pdf'],
            filename: 'inventory-stock-levels-{date}',
            includeMetadata: true,
            includeCharts: false,
            compression: false,
            customHeaders: {}
          },
          scheduling: {
            enabled: true,
            frequency: 'daily',
            time: '09:00',
            timezone: 'UTC',
            recipients: [],
            format: 'xlsx',
            includeCharts: false
          },
          permissions: {
            view: ['inventory_manager', 'warehouse_staff'],
            edit: ['inventory_manager'],
            delete: ['admin'],
            export: ['inventory_manager', 'warehouse_staff'],
            schedule: ['inventory_manager'],
            public: false
          }
        },
        metadata: {
          estimatedRows: 1000,
          dataFreshness: 5,
          complexity: 'low',
          tags: ['inventory', 'stock', 'alerts'],
          documentation: 'This report provides a comprehensive overview of all product stock levels with visual indicators for low stock and out-of-stock items.',
          examples: ['Daily inventory review', 'Stock replenishment planning', 'Warehouse management'],
          usageCount: 0,
          averageRating: 0,
          reviews: []
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Manufacturing Reports
      {
        id: 'manufacturing-bom-analysis',
        name: 'BOM Cost Analysis',
        description: 'Detailed analysis of Bill of Materials costs and component availability',
        category: 'manufacturing',
        version: '1.0.0',
        author: 'System',
        tags: ['manufacturing', 'bom', 'cost', 'analysis'],
        isPublic: true,
        isActive: true,
        config: {
          query: {
            table: 'manufacturing_boms',
            alias: 'b',
            fields: [
              { name: 'b.name', alias: 'bom_name', type: 'string' },
              { name: 'b.type', alias: 'bom_type', type: 'string' },
              { name: 'b.quantity', alias: 'bom_quantity', type: 'number' },
              { name: 'p.name', alias: 'project_name', type: 'string' },
              { name: 'pl.name', alias: 'production_line', type: 'string' },
              { name: 'bi.id', alias: 'item_count', type: 'number', aggregation: 'count' },
              { name: 'bi.quantity', alias: 'total_cost', type: 'number', aggregation: 'sum' },
              { name: 'pr.price', alias: 'avg_price', type: 'number', aggregation: 'avg' }
            ],
            joins: [
              { type: 'left', table: 'projects', alias: 'p', on: 'b.project_id = p.id' },
              { type: 'left', table: 'production_lines', alias: 'pl', on: 'b.production_line_id = pl.id' },
              { type: 'left', table: 'manufacturing_bom_items', alias: 'bi', on: 'b.id = bi.bom_id' },
              { type: 'left', table: 'products', alias: 'pr', on: 'bi.product_id = pr.id' }
            ],
            groupBy: [
              { field: 'b.id' },
              { field: 'b.name' },
              { field: 'b.type' },
              { field: 'b.quantity' },
              { field: 'p.name' },
              { field: 'pl.name' }
            ],
            orderBy: [
              { field: 'total_cost', direction: 'desc' }
            ]
          },
          visualization: {
            type: 'dashboard',
            layout: 'grid',
            theme: 'professional',
            responsive: true,
            pagination: { enabled: true, pageSize: 20, pageSizes: [20, 50, 100] },
            charts: [
              {
                id: 'cost-distribution',
                title: 'BOM Cost Distribution',
                type: 'pie',
                xAxis: 'bom_name',
                yAxis: 'total_cost',
                series: [
                  { name: 'Total Cost', field: 'total_cost', type: 'area', aggregation: 'sum' }
                ],
                options: {
                  showLegend: true,
                  showGrid: false,
                  showLabels: true,
                  showTooltip: true,
                  animation: true,
                  colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
                  height: 300
                }
              },
              {
                id: 'cost-trends',
                title: 'BOM Costs by Type',
                type: 'column',
                xAxis: 'bom_type',
                yAxis: 'total_cost',
                series: [
                  { name: 'Total Cost', field: 'total_cost', type: 'bar', aggregation: 'sum' }
                ],
                options: {
                  showLegend: false,
                  showGrid: true,
                  showLabels: true,
                  showTooltip: true,
                  animation: true,
                  colors: ['#6366F1'],
                  height: 300
                }
              }
            ]
          },
          filters: [
            {
              id: 'bom-type-filter',
              name: 'BOM Type',
              field: 'b.type',
              type: 'select',
              operator: 'equals',
              required: false,
              visible: true,
              readonly: false,
              options: [
                { label: 'All Types', value: '' },
                { label: 'Project', value: 'project' },
                { label: 'Production Line', value: 'production_line' }
              ]
            },
            {
              id: 'cost-range-filter',
              name: 'Cost Range',
              field: 'total_cost',
              type: 'range',
              operator: 'between',
              required: false,
              visible: true,
              readonly: false
            }
          ],
          grouping: {
            enabled: true,
            fields: ['bom_type'],
            collapsible: true,
            defaultCollapsed: false,
            showCounts: true,
            showSummary: true,
            summaryFields: [
              { field: 'total_cost', aggregation: 'sum', format: 'currency' },
              { field: 'item_count', aggregation: 'avg', format: 'number' }
            ]
          },
          sorting: {
            enabled: true,
            multiColumn: true,
            defaultSort: [{ field: 'total_cost', direction: 'desc' }],
            sortableFields: ['bom_name', 'bom_type', 'total_cost', 'unit_cost', 'item_count']
          },
          formatting: {
            dateFormat: 'YYYY-MM-DD',
            numberFormat: '#,##0.00',
            currencyFormat: '$#,##0.00',
            percentageFormat: '0.00%',
            fieldFormats: {
              'total_cost': { type: 'currency', format: '$#,##0.00' },
              'unit_cost': { type: 'currency', format: '$#,##0.00' },
              'item_count': { type: 'number', format: '#,##0' }
            },
            conditionalFormatting: [
              {
                id: 'high-cost-alert',
                name: 'High Cost Alert',
                field: 'total_cost',
                condition: 'greater_than',
                value: 10000,
                format: { backgroundColor: '#FEF3C7', textColor: '#92400E', fontWeight: 'bold' }
              }
            ]
          },
          export: {
            enabled: true,
            formats: ['csv', 'xlsx', 'pdf'],
            filename: 'bom-cost-analysis-{date}',
            includeMetadata: true,
            includeCharts: true,
            compression: false,
            customHeaders: {}
          },
          scheduling: {
            enabled: true,
            frequency: 'weekly',
            time: '08:00',
            timezone: 'UTC',
            recipients: [],
            format: 'xlsx',
            includeCharts: true
          },
          permissions: {
            view: ['manufacturing_manager', 'production_planner'],
            edit: ['manufacturing_manager'],
            delete: ['admin'],
            export: ['manufacturing_manager', 'production_planner'],
            schedule: ['manufacturing_manager'],
            public: false
          }
        },
        metadata: {
          estimatedRows: 500,
          dataFreshness: 15,
          complexity: 'medium',
          tags: ['manufacturing', 'bom', 'cost', 'analysis'],
          documentation: 'This report provides comprehensive analysis of Bill of Materials costs, component availability, and manufacturing economics.',
          examples: ['Production cost planning', 'Material cost optimization', 'Manufacturing budgeting'],
          usageCount: 0,
          averageRating: 0,
          reviews: []
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    // Store templates in memory and database
    builtinTemplates.forEach(template => {
      this.templates.set(template.id, template)
      this.saveTemplate(template)
    })
  }

  /**
   * Get all report templates
   */
  getTemplates(category?: string, isPublic?: boolean): ReportTemplate[] {
    let templates = Array.from(this.templates.values())
    
    if (category) {
      templates = templates.filter(t => t.category === category)
    }
    
    if (isPublic !== undefined) {
      templates = templates.filter(t => t.isPublic === isPublic)
    }
    
    return templates.filter(t => t.isActive)
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): ReportTemplate | null {
    return this.templates.get(id) || null
  }

  /**
   * Save report template
   */
  saveTemplate(template: ReportTemplate): void {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO report_templates (
          id, name, description, category, version, author, tags, is_public, is_active, config, metadata, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `)
      
      stmt.run(
        template.id,
        template.name,
        template.description,
        template.category,
        template.version,
        template.author,
        JSON.stringify(template.tags),
        template.isPublic ? 1 : 0,
        template.isActive ? 1 : 0,
        JSON.stringify(template.config),
        JSON.stringify(template.metadata)
      )
      
      // Update in-memory cache
      this.templates.set(template.id, template)
    } catch (error) {
      throw new Error(`Failed to save template: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Create new report template
   */
  createTemplate(
    name: string,
    description: string,
    category: ReportTemplate['category'],
    config: ReportConfig,
    author: string,
    tags: string[] = []
  ): ReportTemplate {
    const template: ReportTemplate = {
      id: this.generateId(),
      name,
      description,
      category,
      version: '1.0.0',
      author,
      tags,
      isPublic: false,
      isActive: true,
      config,
      metadata: {
        estimatedRows: 0,
        dataFreshness: 5,
        complexity: 'medium',
        tags,
        documentation: '',
        examples: [],
        usageCount: 0,
        averageRating: 0,
        reviews: []
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    this.saveTemplate(template)
    return template
  }

  /**
   * Update report template
   */
  updateTemplate(id: string, updates: Partial<ReportTemplate>): ReportTemplate {
    const template = this.templates.get(id)
    if (!template) {
      throw new Error(`Template not found: ${id}`)
    }
    
    const updatedTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date()
    }
    
    this.saveTemplate(updatedTemplate)
    return updatedTemplate
  }

  /**
   * Delete report template
   */
  deleteTemplate(id: string): void {
    try {
      this.db.prepare('DELETE FROM report_templates WHERE id = ?').run(id)
      this.templates.delete(id)
    } catch (error) {
      throw new Error(`Failed to delete template: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Clone report template
   */
  cloneTemplate(id: string, name: string, author: string): ReportTemplate {
    const template = this.templates.get(id)
    if (!template) {
      throw new Error(`Template not found: ${id}`)
    }
    
    const clonedTemplate: ReportTemplate = {
      ...template,
      id: this.generateId(),
      name,
      author,
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    this.saveTemplate(clonedTemplate)
    return clonedTemplate
  }

  /**
   * Create report instance
   */
  createInstance(
    templateId: string,
    userId: string,
    name: string,
    parameters: Record<string, any> = {}
  ): ReportInstance {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }
    
    const instance: ReportInstance = {
      id: this.generateId(),
      templateId,
      templateName: template.name,
      userId,
      name,
      description: template.description,
      config: template.config,
      parameters,
      generatedAt: new Date(),
      status: 'generating',
      resultCount: 0,
      generationTime: 0,
      metadata: {}
    }
    
    // Save to database
    this.saveInstance(instance)
    
    // Update template usage count
    template.metadata.usageCount++
    this.saveTemplate(template)
    
    return instance
  }

  /**
   * Save report instance
   */
  private saveInstance(instance: ReportInstance): void {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO report_instances (
          id, template_id, template_name, user_id, name, description, config, parameters,
          generated_at, expires_at, status, error, result_count, generation_time, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      
      stmt.run(
        instance.id,
        instance.templateId,
        instance.templateName,
        instance.userId,
        instance.name,
        instance.description,
        JSON.stringify(instance.config),
        JSON.stringify(instance.parameters),
        instance.generatedAt.toISOString(),
        instance.expiresAt?.toISOString() || null,
        instance.status,
        instance.error || null,
        instance.resultCount,
        instance.generationTime,
        JSON.stringify(instance.metadata)
      )
      
      // Update in-memory cache
      this.instances.set(instance.id, instance)
    } catch (error) {
      throw new Error(`Failed to save instance: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get report instance
   */
  getInstance(id: string): ReportInstance | null {
    return this.instances.get(id) || null
  }

  /**
   * Update report instance
   */
  updateInstance(id: string, updates: Partial<ReportInstance>): ReportInstance {
    const instance = this.instances.get(id)
    if (!instance) {
      throw new Error(`Instance not found: ${id}`)
    }
    
    const updatedInstance = {
      ...instance,
      ...updates
    }
    
    this.saveInstance(updatedInstance)
    return updatedInstance
  }

  /**
   * Get user report instances
   */
  getUserInstances(userId: string, status?: string): ReportInstance[] {
    try {
      let query = 'SELECT * FROM report_instances WHERE user_id = ?'
      const params = [userId]
      
      if (status) {
        query += ' AND status = ?'
        params.push(status)
      }
      
      query += ' ORDER BY generated_at DESC'
      
      const rows = this.db.prepare(query).all(...params)
      return rows.map(row => this.parseInstanceRow(row))
    } catch (error) {
      throw new Error(`Failed to get user instances: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Add template review
   */
  addTemplateReview(templateId: string, userId: string, username: string, rating: number, comment: string): void {
    try {
      this.db.prepare(`
        INSERT INTO report_reviews (template_id, user_id, username, rating, comment)
        VALUES (?, ?, ?, ?, ?)
      `).run(templateId, userId, username, rating, comment)
      
      // Update template average rating
      const template = this.templates.get(templateId)
      if (template) {
        const reviews = this.getTemplateReviews(templateId)
        template.metadata.averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        this.saveTemplate(template)
      }
    } catch (error) {
      throw new Error(`Failed to add review: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get template reviews
   */
  getTemplateReviews(templateId: string): ReportReview[] {
    try {
      const rows = this.db.prepare(`
        SELECT * FROM report_reviews WHERE template_id = ? ORDER BY timestamp DESC
      `).all(templateId)
      
      return rows.map(row => ({
        userId: row.user_id,
        username: row.username,
        rating: row.rating,
        comment: row.comment,
        timestamp: new Date(row.timestamp)
      }))
    } catch (error) {
      throw new Error(`Failed to get reviews: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Parse database row to ReportInstance
   */
  private parseInstanceRow(row: any): ReportInstance {
    return {
      id: row.id,
      templateId: row.template_id,
      templateName: row.template_name,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      config: JSON.parse(row.config),
      parameters: JSON.parse(row.parameters),
      generatedAt: new Date(row.generated_at),
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      status: row.status,
      error: row.error,
      resultCount: row.result_count,
      generationTime: row.generation_time,
      metadata: JSON.parse(row.metadata)
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  /**
   * Validate report configuration
   */
  validateConfig(config: ReportConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // Validate query configuration
    if (!config.query) {
      errors.push('Query configuration is required')
    } else {
      if (!config.query.table) {
        errors.push('Query table is required')
      }
      if (!config.query.fields || config.query.fields.length === 0) {
        errors.push('Query fields are required')
      }
    }
    
    // Validate visualization configuration
    if (!config.visualization) {
      errors.push('Visualization configuration is required')
    } else {
      if (!['table', 'chart', 'dashboard'].includes(config.visualization.type)) {
        errors.push('Invalid visualization type')
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Get template categories
   */
  getCategories(): string[] {
    return ['inventory', 'manufacturing', 'financial', 'operational', 'custom']
  }

  /**
   * Search templates
   */
  searchTemplates(query: string): ReportTemplate[] {
    const searchTerm = query.toLowerCase()
    return Array.from(this.templates.values()).filter(template => 
      template.name.toLowerCase().includes(searchTerm) ||
      template.description.toLowerCase().includes(searchTerm) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    )
  }

  /**
   * Get template statistics
   */
  getTemplateStatistics(): {
    totalTemplates: number
    publicTemplates: number
    categoryCounts: Record<string, number>
    topUsedTemplates: Array<{ id: string; name: string; usageCount: number }>
  } {
    const templates = Array.from(this.templates.values())
    const categoryCounts: Record<string, number> = {}
    
    templates.forEach(template => {
      categoryCounts[template.category] = (categoryCounts[template.category] || 0) + 1
    })
    
    const topUsedTemplates = templates
      .sort((a, b) => b.metadata.usageCount - a.metadata.usageCount)
      .slice(0, 10)
      .map(template => ({
        id: template.id,
        name: template.name,
        usageCount: template.metadata.usageCount
      }))
    
    return {
      totalTemplates: templates.length,
      publicTemplates: templates.filter(t => t.isPublic).length,
      categoryCounts,
      topUsedTemplates
    }
  }
}

// Export singleton instance
export const reportConfigManager = new ReportConfigManager()