import { reportQueryEngine, type ReportQuery, type QueryExecutionResult } from './query-engine'
import { dataValidationEngine, type DataQualityReport } from './data-validation'
import { performanceMonitor } from './performance-monitoring'
import { reportConfigManager, type ReportTemplate, type ReportInstance, type ReportConfig } from './report-config'

// Dynamic report interfaces
export interface GenerateReportOptions {
  templateId?: string
  config?: ReportConfig
  parameters?: Record<string, any>
  userId?: string
  sessionId?: string
  validateData?: boolean
  useCache?: boolean
  exportFormat?: 'json' | 'csv' | 'xlsx' | 'pdf'
  includeMetadata?: boolean
}

export interface ReportGenerationResult {
  success: boolean
  data?: any[]
  metadata: {
    templateId?: string
    templateName?: string
    instanceId?: string
    totalRecords: number
    executionTime: number
    dataQuality?: DataQualityReport
    query: string
    parameters: any[]
    cacheHit: boolean
    timestamp: Date
  }
  error?: string
  warnings?: string[]
  recommendations?: string[]
}

export interface ReportWidget {
  id: string
  name: string
  type: 'metric' | 'chart' | 'table' | 'gauge' | 'progress' | 'text'
  config: ReportConfig
  size: { width: number; height: number }
  position: { x: number; y: number }
  refreshInterval?: number
  lastRefresh?: Date
  data?: any[]
  error?: string
}

export interface ReportDashboard {
  id: string
  name: string
  description: string
  widgets: ReportWidget[]
  layout: 'grid' | 'flex' | 'tabs'
  theme: 'default' | 'dark' | 'professional' | 'minimal'
  autoRefresh: boolean
  refreshInterval: number
  permissions: {
    view: string[]
    edit: string[]
    delete: string[]
  }
  metadata: {
    createdBy: string
    createdAt: Date
    lastModified: Date
    viewCount: number
    isPublic: boolean
  }
}

export interface ReportAlert {
  id: string
  name: string
  description: string
  config: ReportConfig
  conditions: AlertCondition[]
  actions: AlertAction[]
  enabled: boolean
  lastTriggered?: Date
  metadata: {
    createdBy: string
    createdAt: Date
    triggerCount: number
  }
}

export interface AlertCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal' | 'contains' | 'between'
  value: any
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max'
}

export interface AlertAction {
  type: 'email' | 'webhook' | 'notification' | 'log'
  configuration: Record<string, any>
}

/**
 * Dynamic Report Generator
 * Main orchestrator for report generation, validation, and performance monitoring
 */
export class DynamicReportGenerator {
  private dashboards: Map<string, ReportDashboard> = new Map()
  private alerts: Map<string, ReportAlert> = new Map()
  private activeInstances: Map<string, ReportInstance> = new Map()

  constructor() {
    // Initialize built-in dashboards
    this.initializeBuiltinDashboards()
    
    // Start background processes
    this.startBackgroundProcesses()
  }

  /**
   * Generate report from template or configuration
   */
  async generateReport(options: GenerateReportOptions): Promise<ReportGenerationResult> {
    const startTime = Date.now()
    
    try {
      // Get configuration
      let config: ReportConfig
      let template: ReportTemplate | null = null
      
      if (options.templateId) {
        template = reportConfigManager.getTemplate(options.templateId)
        if (!template) {
          throw new Error(`Template not found: ${options.templateId}`)
        }
        config = template.config
      } else if (options.config) {
        config = options.config
      } else {
        throw new Error('Either templateId or config must be provided')
      }

      // Apply parameters to configuration
      if (options.parameters) {
        config = this.applyParameters(config, options.parameters)
      }

      // Validate configuration
      const configValidation = reportConfigManager.validateConfig(config)
      if (!configValidation.valid) {
        throw new Error(`Invalid configuration: ${configValidation.errors.join(', ')}`)
      }

      // Create report instance if using template
      let instance: ReportInstance | null = null
      if (template && options.userId) {
        instance = reportConfigManager.createInstance(
          template.id,
          options.userId,
          `${template.name} - ${new Date().toISOString()}`,
          options.parameters
        )
        this.activeInstances.set(instance.id, instance)
      }

      // Validate data quality if requested
      let dataQuality: DataQualityReport | undefined
      if (options.validateData) {
        const tables = this.extractTablesFromConfig(config)
        dataQuality = await dataValidationEngine.validateData(tables)
      }

      // Execute query with performance monitoring
      const queryResult = await reportQueryEngine.executeQuery(config.query)
      
      // Record performance metrics
      if (options.userId) {
        performanceMonitor.recordReportPerformance(
          instance?.id || 'adhoc',
          template?.name || 'Ad-hoc Report',
          queryResult.executionTime,
          config.query.fields.length,
          config.query.filters?.length || 0,
          queryResult.data.length,
          template?.id,
          options.exportFormat,
          options.userId,
          options.sessionId
        )
      }

      // Update instance status
      if (instance) {
        reportConfigManager.updateInstance(instance.id, {
          status: 'completed',
          resultCount: queryResult.data.length,
          generationTime: Date.now() - startTime
        })
      }

      // Process data according to configuration
      const processedData = this.processReportData(queryResult.data, config)

      // Generate warnings and recommendations
      const warnings = this.generateWarnings(queryResult, config, dataQuality)
      const recommendations = this.generateRecommendations(queryResult, config, dataQuality)

      return {
        success: true,
        data: processedData,
        metadata: {
          templateId: template?.id,
          templateName: template?.name,
          instanceId: instance?.id,
          totalRecords: queryResult.totalCount,
          executionTime: queryResult.executionTime,
          dataQuality,
          query: queryResult.query,
          parameters: queryResult.parameters,
          cacheHit: false, // TODO: Implement cache detection
          timestamp: new Date()
        },
        warnings,
        recommendations
      }

    } catch (error) {
      // Update instance status on error
      if (options.templateId && options.userId) {
        const instances = reportConfigManager.getUserInstances(options.userId, 'generating')
        const instance = instances[0] // Most recent
        if (instance) {
          reportConfigManager.updateInstance(instance.id, {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      return {
        success: false,
        metadata: {
          totalRecords: 0,
          executionTime: Date.now() - startTime,
          query: '',
          parameters: [],
          cacheHit: false,
          timestamp: new Date()
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Generate real-time inventory dashboard
   */
  async generateInventoryDashboard(userId: string): Promise<ReportDashboard> {
    const dashboardId = 'inventory-realtime-dashboard'
    let dashboard = this.dashboards.get(dashboardId)
    
    if (!dashboard) {
      dashboard = {
        id: dashboardId,
        name: 'Real-Time Inventory Dashboard',
        description: 'Live inventory metrics and alerts',
        widgets: [],
        layout: 'grid',
        theme: 'professional',
        autoRefresh: true,
        refreshInterval: 30000, // 30 seconds
        permissions: {
          view: ['inventory_manager', 'warehouse_staff'],
          edit: ['inventory_manager'],
          delete: ['admin']
        },
        metadata: {
          createdBy: 'system',
          createdAt: new Date(),
          lastModified: new Date(),
          viewCount: 0,
          isPublic: false
        }
      }
    }

    // Define widgets
    const widgets: ReportWidget[] = [
      // Total inventory value
      {
        id: 'total-inventory-value',
        name: 'Total Inventory Value',
        type: 'metric',
        config: {
          query: {
            table: 'products',
            fields: [
              { name: 'SUM(price * stock_quantity)', alias: 'total_value', type: 'number', aggregation: 'sum' }
            ]
          },
          visualization: { type: 'table', layout: 'single', theme: 'default', responsive: true, pagination: { enabled: false, pageSize: 1, pageSizes: [1] }, charts: [] },
          filters: [],
          grouping: { enabled: false, fields: [], collapsible: false, defaultCollapsed: false, showCounts: false, showSummary: false, summaryFields: [] },
          sorting: { enabled: false, multiColumn: false, defaultSort: [], sortableFields: [] },
          formatting: { dateFormat: 'YYYY-MM-DD', numberFormat: '#,##0.00', currencyFormat: '$#,##0.00', percentageFormat: '0.00%', fieldFormats: { 'total_value': { type: 'currency', format: '$#,##0.00' } }, conditionalFormatting: [] },
          export: { enabled: false, formats: [], filename: '', includeMetadata: false, includeCharts: false, compression: false, customHeaders: {} },
          scheduling: { enabled: false, frequency: 'daily', time: '00:00', timezone: 'UTC', recipients: [], format: 'csv', includeCharts: false },
          permissions: { view: [], edit: [], delete: [], export: [], schedule: [], public: false }
        },
        size: { width: 3, height: 2 },
        position: { x: 0, y: 0 },
        refreshInterval: 60000
      },
      
      // Low stock alerts
      {
        id: 'low-stock-count',
        name: 'Low Stock Items',
        type: 'metric',
        config: {
          query: {
            table: 'products',
            fields: [
              { name: 'COUNT(*)', alias: 'low_stock_count', type: 'number', aggregation: 'count' }
            ],
            filters: [
              { field: 'stock_quantity', operator: 'less_equal', value: 'min_stock_level' }
            ]
          },
          visualization: { type: 'table', layout: 'single', theme: 'default', responsive: true, pagination: { enabled: false, pageSize: 1, pageSizes: [1] }, charts: [] },
          filters: [],
          grouping: { enabled: false, fields: [], collapsible: false, defaultCollapsed: false, showCounts: false, showSummary: false, summaryFields: [] },
          sorting: { enabled: false, multiColumn: false, defaultSort: [], sortableFields: [] },
          formatting: { dateFormat: 'YYYY-MM-DD', numberFormat: '#,##0', currencyFormat: '$#,##0.00', percentageFormat: '0.00%', fieldFormats: {}, conditionalFormatting: [] },
          export: { enabled: false, formats: [], filename: '', includeMetadata: false, includeCharts: false, compression: false, customHeaders: {} },
          scheduling: { enabled: false, frequency: 'daily', time: '00:00', timezone: 'UTC', recipients: [], format: 'csv', includeCharts: false },
          permissions: { view: [], edit: [], delete: [], export: [], schedule: [], public: false }
        },
        size: { width: 3, height: 2 },
        position: { x: 3, y: 0 },
        refreshInterval: 60000
      },

      // Recent transactions chart
      {
        id: 'recent-transactions',
        name: 'Recent Transactions',
        type: 'chart',
        config: {
          query: {
            table: 'inventory_transactions',
            alias: 't',
            fields: [
              { name: 'DATE(t.created_at)', alias: 'date', type: 'date' },
              { name: 'COUNT(*)', alias: 'transaction_count', type: 'number', aggregation: 'count' }
            ],
            joins: [
              { type: 'inner', table: 'products', alias: 'p', on: 't.product_id = p.id' }
            ],
            filters: [
              { field: 't.created_at', operator: 'greater_than', value: 'DATE("now", "-7 days")' }
            ],
            groupBy: [{ field: 'DATE(t.created_at)' }],
            orderBy: [{ field: 'DATE(t.created_at)', direction: 'asc' }]
          },
          visualization: {
            type: 'chart',
            chartType: 'line',
            layout: 'single',
            theme: 'professional',
            responsive: true,
            pagination: { enabled: false, pageSize: 10, pageSizes: [10] },
            charts: [
              {
                id: 'transactions-chart',
                title: 'Daily Transactions',
                type: 'line',
                xAxis: 'date',
                yAxis: 'transaction_count',
                series: [
                  { name: 'Transactions', field: 'transaction_count', type: 'line', aggregation: 'count' }
                ],
                options: {
                  showLegend: true,
                  showGrid: true,
                  showLabels: true,
                  showTooltip: true,
                  animation: true,
                  colors: ['#3B82F6'],
                  height: 300
                }
              }
            ]
          },
          filters: [],
          grouping: { enabled: false, fields: [], collapsible: false, defaultCollapsed: false, showCounts: false, showSummary: false, summaryFields: [] },
          sorting: { enabled: false, multiColumn: false, defaultSort: [], sortableFields: [] },
          formatting: { dateFormat: 'YYYY-MM-DD', numberFormat: '#,##0', currencyFormat: '$#,##0.00', percentageFormat: '0.00%', fieldFormats: {}, conditionalFormatting: [] },
          export: { enabled: false, formats: [], filename: '', includeMetadata: false, includeCharts: false, compression: false, customHeaders: {} },
          scheduling: { enabled: false, frequency: 'daily', time: '00:00', timezone: 'UTC', recipients: [], format: 'csv', includeCharts: false },
          permissions: { view: [], edit: [], delete: [], export: [], schedule: [], public: false }
        },
        size: { width: 6, height: 4 },
        position: { x: 0, y: 2 },
        refreshInterval: 300000 // 5 minutes
      },

      // Category breakdown
      {
        id: 'category-breakdown',
        name: 'Inventory by Category',
        type: 'chart',
        config: {
          query: {
            table: 'products',
            fields: [
              { name: 'category', alias: 'category', type: 'string' },
              { name: 'COUNT(*)', alias: 'item_count', type: 'number', aggregation: 'count' },
              { name: 'SUM(stock_quantity)', alias: 'total_stock', type: 'number', aggregation: 'sum' }
            ],
            groupBy: [{ field: 'category' }],
            orderBy: [{ field: 'total_stock', direction: 'desc' }]
          },
          visualization: {
            type: 'chart',
            chartType: 'pie',
            layout: 'single',
            theme: 'professional',
            responsive: true,
            pagination: { enabled: false, pageSize: 10, pageSizes: [10] },
            charts: [
              {
                id: 'category-pie',
                title: 'Stock by Category',
                type: 'pie',
                xAxis: 'category',
                yAxis: 'total_stock',
                series: [
                  { name: 'Stock', field: 'total_stock', type: 'area', aggregation: 'sum' }
                ],
                options: {
                  showLegend: true,
                  showGrid: false,
                  showLabels: true,
                  showTooltip: true,
                  animation: true,
                  colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
                  height: 300
                }
              }
            ]
          },
          filters: [],
          grouping: { enabled: false, fields: [], collapsible: false, defaultCollapsed: false, showCounts: false, showSummary: false, summaryFields: [] },
          sorting: { enabled: false, multiColumn: false, defaultSort: [], sortableFields: [] },
          formatting: { dateFormat: 'YYYY-MM-DD', numberFormat: '#,##0', currencyFormat: '$#,##0.00', percentageFormat: '0.00%', fieldFormats: {}, conditionalFormatting: [] },
          export: { enabled: false, formats: [], filename: '', includeMetadata: false, includeCharts: false, compression: false, customHeaders: {} },
          scheduling: { enabled: false, frequency: 'daily', time: '00:00', timezone: 'UTC', recipients: [], format: 'csv', includeCharts: false },
          permissions: { view: [], edit: [], delete: [], export: [], schedule: [], public: false }
        },
        size: { width: 6, height: 4 },
        position: { x: 6, y: 2 },
        refreshInterval: 300000 // 5 minutes
      }
    ]

    // Refresh widget data
    for (const widget of widgets) {
      try {
        const result = await this.generateReport({
          config: widget.config,
          userId,
          useCache: true
        })
        
        widget.data = result.data
        widget.lastRefresh = new Date()
        widget.error = result.error
      } catch (error) {
        widget.error = error instanceof Error ? error.message : 'Unknown error'
      }
    }

    dashboard.widgets = widgets
    dashboard.metadata.lastModified = new Date()
    dashboard.metadata.viewCount++
    
    this.dashboards.set(dashboardId, dashboard)
    return dashboard
  }

  /**
   * Create inventory alert
   */
  async createInventoryAlert(
    name: string,
    description: string,
    conditions: AlertCondition[],
    actions: AlertAction[],
    createdBy: string
  ): Promise<ReportAlert> {
    const alert: ReportAlert = {
      id: this.generateId(),
      name,
      description,
      config: {
        query: {
          table: 'products',
          fields: [
            { name: 'id', alias: 'product_id', type: 'string' },
            { name: 'name', alias: 'product_name', type: 'string' },
            { name: 'stock_quantity', alias: 'current_stock', type: 'number' },
            { name: 'min_stock_level', alias: 'min_stock', type: 'number' }
          ]
        },
        visualization: { type: 'table', layout: 'single', theme: 'default', responsive: true, pagination: { enabled: false, pageSize: 10, pageSizes: [10] }, charts: [] },
        filters: [],
        grouping: { enabled: false, fields: [], collapsible: false, defaultCollapsed: false, showCounts: false, showSummary: false, summaryFields: [] },
        sorting: { enabled: false, multiColumn: false, defaultSort: [], sortableFields: [] },
        formatting: { dateFormat: 'YYYY-MM-DD', numberFormat: '#,##0', currencyFormat: '$#,##0.00', percentageFormat: '0.00%', fieldFormats: {}, conditionalFormatting: [] },
        export: { enabled: false, formats: [], filename: '', includeMetadata: false, includeCharts: false, compression: false, customHeaders: {} },
        scheduling: { enabled: false, frequency: 'daily', time: '00:00', timezone: 'UTC', recipients: [], format: 'csv', includeCharts: false },
        permissions: { view: [], edit: [], delete: [], export: [], schedule: [], public: false }
      },
      conditions,
      actions,
      enabled: true,
      metadata: {
        createdBy,
        createdAt: new Date(),
        triggerCount: 0
      }
    }

    this.alerts.set(alert.id, alert)
    return alert
  }

  /**
   * Export report data
   */
  async exportReport(
    reportResult: ReportGenerationResult,
    format: 'csv' | 'xlsx' | 'pdf' | 'json',
    options: { filename?: string; includeMetadata?: boolean } = {}
  ): Promise<{ data: Buffer | string; filename: string; contentType: string }> {
    if (!reportResult.success || !reportResult.data) {
      throw new Error('Cannot export failed report')
    }

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = options.filename || `report-${timestamp}.${format}`

    switch (format) {
      case 'json':
        return {
          data: JSON.stringify({
            data: reportResult.data,
            metadata: options.includeMetadata ? reportResult.metadata : undefined
          }, null, 2),
          filename,
          contentType: 'application/json'
        }

      case 'csv':
        return {
          data: this.convertToCSV(reportResult.data),
          filename,
          contentType: 'text/csv'
        }

      case 'xlsx':
        // TODO: Implement XLSX export
        throw new Error('XLSX export not implemented yet')

      case 'pdf':
        // TODO: Implement PDF export
        throw new Error('PDF export not implemented yet')

      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }

  /**
   * Get available report templates by category
   */
  getTemplatesByCategory(category: string): ReportTemplate[] {
    return reportConfigManager.getTemplates(category)
  }

  /**
   * Get report generation statistics
   */
  async getReportStatistics(userId?: string): Promise<{
    totalReports: number
    successfulReports: number
    failedReports: number
    averageExecutionTime: number
    mostUsedTemplates: Array<{ templateId: string; templateName: string; count: number }>
    dataQualityTrends: Array<{ date: string; score: number }>
  }> {
    // TODO: Implement statistics gathering from performance monitoring
    return {
      totalReports: 0,
      successfulReports: 0,
      failedReports: 0,
      averageExecutionTime: 0,
      mostUsedTemplates: [],
      dataQualityTrends: []
    }
  }

  /**
   * Apply parameters to report configuration
   */
  private applyParameters(config: ReportConfig, parameters: Record<string, any>): ReportConfig {
    const updatedConfig = JSON.parse(JSON.stringify(config)) // Deep clone
    
    // Apply parameters to filters
    if (updatedConfig.filters) {
      updatedConfig.filters = updatedConfig.filters.map(filter => {
        if (parameters[filter.id] !== undefined) {
          return {
            ...filter,
            value: parameters[filter.id]
          }
        }
        return filter
      })
    }

    // Apply parameters to query filters
    if (updatedConfig.query.filters) {
      updatedConfig.query.filters = updatedConfig.query.filters.map(filter => {
        const paramKey = filter.field.replace(/[^a-zA-Z0-9]/g, '_')
        if (parameters[paramKey] !== undefined) {
          return {
            ...filter,
            value: parameters[paramKey]
          }
        }
        return filter
      })
    }

    return updatedConfig
  }

  /**
   * Extract tables from configuration
   */
  private extractTablesFromConfig(config: ReportConfig): string[] {
    const tables = new Set<string>()
    
    tables.add(config.query.table)
    
    if (config.query.joins) {
      config.query.joins.forEach(join => {
        tables.add(join.table)
      })
    }
    
    return Array.from(tables)
  }

  /**
   * Process report data according to configuration
   */
  private processReportData(data: any[], config: ReportConfig): any[] {
    let processedData = [...data]

    // Apply formatting
    if (config.formatting) {
      processedData = processedData.map(row => {
        const formattedRow = { ...row }
        
        Object.keys(config.formatting.fieldFormats).forEach(fieldName => {
          if (formattedRow[fieldName] !== undefined) {
            const format = config.formatting.fieldFormats[fieldName]
            formattedRow[fieldName] = this.formatValue(formattedRow[fieldName], format)
          }
        })
        
        return formattedRow
      })
    }

    // Apply conditional formatting flags
    if (config.formatting?.conditionalFormatting) {
      processedData = processedData.map(row => {
        const rowWithFormatting = { ...row, _formatting: {} }
        
        config.formatting.conditionalFormatting.forEach(rule => {
          if (this.evaluateCondition(row[rule.field], rule.condition, rule.value)) {
            rowWithFormatting._formatting[rule.field] = rule.format
          }
        })
        
        return rowWithFormatting
      })
    }

    return processedData
  }

  /**
   * Format value according to field format
   */
  private formatValue(value: any, format: any): any {
    if (value === null || value === undefined) return value
    
    switch (format.type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(Number(value))
      
      case 'number':
        return new Intl.NumberFormat('en-US').format(Number(value))
      
      case 'percentage':
        return new Intl.NumberFormat('en-US', {
          style: 'percent',
          minimumFractionDigits: 2
        }).format(Number(value) / 100)
      
      case 'date':
        return new Date(value).toLocaleDateString()
      
      default:
        return value
    }
  }

  /**
   * Evaluate conditional formatting condition
   */
  private evaluateCondition(value: any, condition: string, conditionValue: any): boolean {
    switch (condition) {
      case 'equals':
        return value === conditionValue
      case 'not_equals':
        return value !== conditionValue
      case 'greater_than':
        return Number(value) > Number(conditionValue)
      case 'less_than':
        return Number(value) < Number(conditionValue)
      case 'greater_equal':
        return Number(value) >= Number(conditionValue)
      case 'less_equal':
        return Number(value) <= Number(conditionValue)
      case 'contains':
        return String(value).includes(String(conditionValue))
      default:
        return false
    }
  }

  /**
   * Generate warnings based on results
   */
  private generateWarnings(
    queryResult: QueryExecutionResult,
    config: ReportConfig,
    dataQuality?: DataQualityReport
  ): string[] {
    const warnings: string[] = []

    if (queryResult.executionTime > 5000) {
      warnings.push('Report generation took longer than expected. Consider optimizing filters or reducing data scope.')
    }

    if (queryResult.data.length === 0) {
      warnings.push('No data returned. Check your filters and data availability.')
    }

    if (dataQuality && dataQuality.overall.score < 70) {
      warnings.push('Data quality issues detected. Results may be unreliable.')
    }

    return warnings
  }

  /**
   * Generate recommendations based on results
   */
  private generateRecommendations(
    queryResult: QueryExecutionResult,
    config: ReportConfig,
    dataQuality?: DataQualityReport
  ): string[] {
    const recommendations: string[] = []

    if (queryResult.data.length > 1000) {
      recommendations.push('Consider adding pagination or filtering to improve performance.')
    }

    if (config.query.joins && config.query.joins.length > 3) {
      recommendations.push('Complex joins detected. Consider simplifying the query or using pre-aggregated data.')
    }

    if (dataQuality && dataQuality.bySeverity.errors > 0) {
      recommendations.push('Data quality errors found. Run data validation and cleanup before generating reports.')
    }

    return recommendations
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any[]): string {
    if (!data || data.length === 0) return ''

    const headers = Object.keys(data[0]).filter(key => !key.startsWith('_'))
    const csvRows = [headers.join(',')]

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header]
        return value === null || value === undefined ? '' : `"${String(value).replace(/"/g, '""')}"`
      })
      csvRows.push(values.join(','))
    }

    return csvRows.join('\n')
  }

  /**
   * Initialize built-in dashboards
   */
  private initializeBuiltinDashboards(): void {
    // Built-in dashboards will be created on-demand
  }

  /**
   * Start background processes
   */
  private startBackgroundProcesses(): void {
    // Check alerts every 5 minutes
    setInterval(async () => {
      await this.checkAlerts()
    }, 5 * 60 * 1000)

    // Cleanup expired instances every hour
    setInterval(() => {
      this.cleanupExpiredInstances()
    }, 60 * 60 * 1000)
  }

  /**
   * Check alert conditions
   */
  private async checkAlerts(): Promise<void> {
    for (const [alertId, alert] of this.alerts) {
      if (!alert.enabled) continue

      try {
        const result = await this.generateReport({
          config: alert.config,
          validateData: false,
          useCache: true
        })

        if (result.success && result.data) {
          const shouldTrigger = this.evaluateAlertConditions(result.data, alert.conditions)
          
          if (shouldTrigger) {
            await this.triggerAlert(alert, result.data)
          }
        }
      } catch (error) {
        console.error(`Error checking alert ${alertId}:`, error)
      }
    }
  }

  /**
   * Evaluate alert conditions
   */
  private evaluateAlertConditions(data: any[], conditions: AlertCondition[]): boolean {
    return conditions.every(condition => {
      const values = data.map(row => row[condition.field]).filter(v => v !== null && v !== undefined)
      
      if (values.length === 0) return false

      let testValue = values[0]
      
      if (condition.aggregation) {
        switch (condition.aggregation) {
          case 'sum':
            testValue = values.reduce((sum, val) => sum + Number(val), 0)
            break
          case 'avg':
            testValue = values.reduce((sum, val) => sum + Number(val), 0) / values.length
            break
          case 'count':
            testValue = values.length
            break
          case 'min':
            testValue = Math.min(...values.map(v => Number(v)))
            break
          case 'max':
            testValue = Math.max(...values.map(v => Number(v)))
            break
        }
      }

      return this.evaluateCondition(testValue, condition.operator, condition.value)
    })
  }

  /**
   * Trigger alert actions
   */
  private async triggerAlert(alert: ReportAlert, data: any[]): Promise<void> {
    alert.lastTriggered = new Date()
    alert.metadata.triggerCount++

    for (const action of alert.actions) {
      try {
        switch (action.type) {
          case 'log':
            console.log(`Alert triggered: ${alert.name}`, data)
            break
          case 'email':
            // TODO: Implement email notification
            console.log(`Email alert: ${alert.name}`)
            break
          case 'webhook':
            // TODO: Implement webhook notification
            console.log(`Webhook alert: ${alert.name}`)
            break
          case 'notification':
            // TODO: Implement in-app notification
            console.log(`Notification alert: ${alert.name}`)
            break
        }
      } catch (error) {
        console.error(`Error executing alert action ${action.type}:`, error)
      }
    }
  }

  /**
   * Cleanup expired instances
   */
  private cleanupExpiredInstances(): void {
    const now = new Date()
    
    for (const [instanceId, instance] of this.activeInstances) {
      if (instance.expiresAt && instance.expiresAt < now) {
        this.activeInstances.delete(instanceId)
      }
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }
}

// Export singleton instance
export const dynamicReportGenerator = new DynamicReportGenerator()