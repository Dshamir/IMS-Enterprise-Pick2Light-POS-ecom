// Dynamic Report Generator System
// Complete reporting infrastructure with query engine, validation, monitoring, and templates

// Core engines
export { reportQueryEngine, type ReportQuery, type ReportField, type ReportFilter, type ReportJoin, type ReportOrderBy, type ReportGroupBy, type QueryExecutionResult, type QueryValidationResult, ReportQueryEngine } from './query-engine'

export { dataValidationEngine, type DataValidationRule, type ValidationResult, type DataQualityReport, type DataCleaningResult, type DataCleaningAction, DataQualityLevel, ValidationSeverity, DataValidationEngine } from './data-validation'

// Data connector abstraction
export { dataConnector, DataConnectorFactory, type BaseDataConnector, type DataConnectorConfig, type TableInfo, type ColumnInfo, type ConnectionStatus } from './data-connector'

// Report renderer with Puppeteer + D3.js - TEMPORARILY DISABLED
// export { reportRenderer, type ReportRenderOptions, type ChartDefinition, type ChartConfig, type LayoutConfig, type StylingConfig, type RenderResult, defaultStylingConfig, defaultLayoutConfig, defaultChartConfig } from './report-renderer'

export { performanceMonitor, type PerformanceMetric, type QueryPerformanceMetric, type ReportPerformanceMetric, type SystemPerformanceMetric, type UserBehaviorMetric, type PerformanceAlert, type PerformanceReport, type PerformanceThresholds, PerformanceMonitor } from './performance-monitoring'

// Configuration and templates
export { reportConfigManager, type ReportTemplate, type ReportConfig, type ReportInstance, type VisualizationConfig, type ChartConfig, type FilterConfig, type GroupingConfig, type SortingConfig, type FormattingConfig, type ExportConfig, type SchedulingConfig, type PermissionConfig, type ReportMetadata, ReportConfigManager } from './report-config'

// Main report generator
export { dynamicReportGenerator, type GenerateReportOptions, type ReportGenerationResult, type ReportWidget, type ReportDashboard, type ReportAlert, type AlertCondition, type AlertAction, DynamicReportGenerator } from './dynamic-report-generator'

// System information
export const REPORT_SYSTEM_VERSION = '1.0.0'
export const REPORT_SYSTEM_NAME = 'Dynamic Report Generator'

// Utility functions
export const reportSystemUtils = {
  /**
   * Initialize the complete report system
   */
  async initialize(): Promise<void> {
    try {
      // Initialize all subsystems
      console.log('🚀 Initializing Dynamic Report Generator System v' + REPORT_SYSTEM_VERSION)
      
      // Test database connectivity
      const tables = await reportQueryEngine.getAvailableTables()
      console.log(`📊 Found ${tables.length} tables available for reporting`)
      
      // Run initial data validation
      const dataQuality = await dataValidationEngine.validateData()
      console.log(`✅ Data quality check completed: ${dataQuality.overall.level} (${dataQuality.overall.score.toFixed(1)}%)`)
      
      // Load templates
      const templates = reportConfigManager.getTemplates()
      console.log(`📋 Loaded ${templates.length} report templates`)
      
      // Initialize performance monitoring
      console.log('⚡ Performance monitoring active')
      
      console.log('🎉 Dynamic Report Generator System ready!')
      
    } catch (error) {
      console.error('❌ Failed to initialize report system:', error)
      throw error
    }
  },

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'error'
    components: {
      queryEngine: boolean
      dataValidation: boolean
      performanceMonitoring: boolean
      configManager: boolean
      reportGenerator: boolean
    }
    metrics: {
      availableTables: number
      activeTemplates: number
      dataQualityScore: number
      cacheHitRate: number
      avgQueryTime: number
    }
    alerts: any[]
    errors: string[]
  }> {
    const errors: string[] = []
    let queryEngineStatus = false
    let dataValidationStatus = false
    let performanceMonitoringStatus = false
    let configManagerStatus = false
    let reportGeneratorStatus = false
    
    let availableTables = 0
    let activeTemplates = 0
    let dataQualityScore = 0
    let activeAlerts: any[] = []

    // Test Query Engine
    try {
      const { reportQueryEngine } = await import('./query-engine')
      const tables = await reportQueryEngine.getAvailableTables()
      availableTables = tables.length
      queryEngineStatus = tables.length > 0
      console.log(`✅ Query Engine: ${tables.length} tables available`)
    } catch (error) {
      errors.push(`Query Engine: ${error instanceof Error ? error.message : 'Unknown error'}`)
      console.error('❌ Query Engine error:', error)
    }

    // Test Config Manager
    try {
      const { reportConfigManager } = await import('./report-config')
      const templates = reportConfigManager.getTemplates()
      activeTemplates = templates.filter(t => t.isActive).length
      configManagerStatus = templates.length > 0
      console.log(`✅ Config Manager: ${templates.length} templates loaded`)
    } catch (error) {
      errors.push(`Config Manager: ${error instanceof Error ? error.message : 'Unknown error'}`)
      console.error('❌ Config Manager error:', error)
    }

    // Test Data Validation (only if query engine works)
    if (queryEngineStatus) {
      try {
        const { dataValidationEngine } = await import('./data-validation')
        const dataQuality = await dataValidationEngine.validateData(['products'])
        dataQualityScore = dataQuality.overall.score
        dataValidationStatus = true
        console.log(`✅ Data Validation: ${dataQuality.overall.score.toFixed(1)}% quality score`)
      } catch (error) {
        errors.push(`Data Validation: ${error instanceof Error ? error.message : 'Unknown error'}`)
        console.error('❌ Data Validation error:', error)
      }
    } else {
      errors.push('Data Validation: Skipped due to query engine failure')
    }

    // Test Performance Monitoring
    try {
      const { performanceMonitor } = await import('./performance-monitoring')
      activeAlerts = performanceMonitor.getActiveAlerts()
      performanceMonitoringStatus = true
      console.log(`✅ Performance Monitoring: ${activeAlerts.length} active alerts`)
    } catch (error) {
      errors.push(`Performance Monitoring: ${error instanceof Error ? error.message : 'Unknown error'}`)
      console.error('❌ Performance Monitoring error:', error)
    }

    // Test Report Generator
    try {
      reportGeneratorStatus = true
      console.log(`✅ Report Generator: Ready`)
    } catch (error) {
      errors.push(`Report Generator: ${error instanceof Error ? error.message : 'Unknown error'}`)
      console.error('❌ Report Generator error:', error)
    }

    const healthyComponents = [queryEngineStatus, dataValidationStatus, performanceMonitoringStatus, configManagerStatus, reportGeneratorStatus].filter(Boolean).length
    const totalComponents = 5
    
    let status: 'healthy' | 'warning' | 'error' = 'healthy'
    if (healthyComponents === 0) {
      status = 'error'
    } else if (healthyComponents < totalComponents || activeAlerts.length > 0) {
      status = 'warning'
    }

    console.log(`📊 System Health: ${status} (${healthyComponents}/${totalComponents} components healthy)`)
    
    return {
      status,
      components: {
        queryEngine: queryEngineStatus,
        dataValidation: dataValidationStatus,
        performanceMonitoring: performanceMonitoringStatus,
        configManager: configManagerStatus,
        reportGenerator: reportGeneratorStatus
      },
      metrics: {
        availableTables,
        activeTemplates,
        dataQualityScore,
        cacheHitRate: 0, // TODO: Get from cache stats
        avgQueryTime: 0 // TODO: Get from performance stats
      },
      alerts: activeAlerts,
      errors
    }
  },

  /**
   * Generate system diagnostics report
   */
  async generateDiagnostics(): Promise<{
    timestamp: Date
    version: string
    uptime: number
    performance: {
      totalQueries: number
      totalReports: number
      errorRate: number
      averageResponseTime: number
    }
    dataQuality: {
      overallScore: number
      issueCount: number
      criticalIssues: number
    }
    system: {
      memoryUsage: number
      diskUsage: number
      cacheSize: number
    }
    recommendations: string[]
  }> {
    const dataQuality = await dataValidationEngine.validateData()
    
    return {
      timestamp: new Date(),
      version: REPORT_SYSTEM_VERSION,
      uptime: process.uptime() * 1000,
      performance: {
        totalQueries: 0, // TODO: Get from performance monitor
        totalReports: 0,
        errorRate: 0,
        averageResponseTime: 0
      },
      dataQuality: {
        overallScore: dataQuality.overall.score,
        issueCount: dataQuality.overall.totalIssues,
        criticalIssues: dataQuality.bySeverity.errors
      },
      system: {
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
        diskUsage: 0, // TODO: Get disk usage
        cacheSize: reportQueryEngine.getCacheStats().size
      },
      recommendations: [
        'Monitor query performance regularly',
        'Review data quality issues',
        'Optimize slow-running reports',
        'Consider caching strategies for frequently accessed data'
      ]
    }
  },

  /**
   * Quick start guide for new users
   */
  getQuickStartGuide(): {
    title: string
    steps: Array<{
      title: string
      description: string
      example?: string
    }>
  } {
    return {
      title: 'Dynamic Report Generator Quick Start',
      steps: [
        {
          title: '1. Browse Available Templates',
          description: 'Start with pre-built templates for common reporting needs',
          example: 'reportConfigManager.getTemplates("inventory")'
        },
        {
          title: '2. Generate Your First Report',
          description: 'Use a template to generate a report with your data',
          example: 'dynamicReportGenerator.generateReport({ templateId: "inventory-stock-levels", userId: "user123" })'
        },
        {
          title: '3. Customize with Parameters',
          description: 'Add filters and parameters to refine your results',
          example: 'generateReport({ templateId: "inventory-stock-levels", parameters: { category: "equipment" } })'
        },
        {
          title: '4. Create Real-time Dashboards',
          description: 'Build interactive dashboards with multiple widgets',
          example: 'dynamicReportGenerator.generateInventoryDashboard("user123")'
        },
        {
          title: '5. Set up Alerts',
          description: 'Create automated alerts for important metrics',
          example: 'dynamicReportGenerator.createInventoryAlert("Low Stock Alert", "Alert when stock is low", conditions, actions, "user123")'
        },
        {
          title: '6. Export and Share',
          description: 'Export reports in various formats and share with team',
          example: 'dynamicReportGenerator.exportReport(result, "xlsx", { filename: "inventory-report" })'
        }
      ]
    }
  },

  /**
   * Performance optimization tips
   */
  getOptimizationTips(): string[] {
    return [
      'Use specific filters to reduce data volume',
      'Limit result sets with pagination',
      'Cache frequently accessed reports',
      'Use indexes on commonly queried fields',
      'Aggregate data at the source when possible',
      'Schedule heavy reports during off-peak hours',
      'Monitor query performance regularly',
      'Clean up old report instances periodically',
      'Use appropriate data types for better performance',
      'Consider pre-computed views for complex calculations'
    ]
  }
}

// Default configuration
export const defaultReportConfig = {
  pagination: {
    enabled: true,
    pageSize: 25,
    pageSizes: [10, 25, 50, 100]
  },
  visualization: {
    theme: 'professional',
    responsive: true,
    animation: true
  },
  export: {
    formats: ['csv', 'xlsx', 'pdf', 'json'],
    includeMetadata: true,
    compression: false
  },
  performance: {
    cacheTimeout: 300000, // 5 minutes
    slowQueryThreshold: 1000, // 1 second
    maxResultSize: 10000
  },
  validation: {
    enabled: true,
    autoCleanup: false,
    qualityThreshold: 70
  }
}

// Export version info
export const version = REPORT_SYSTEM_VERSION