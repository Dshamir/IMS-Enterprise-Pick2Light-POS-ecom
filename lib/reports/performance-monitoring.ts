import { getDatabase } from '@/lib/database/sqlite'
import type { Database } from 'better-sqlite3'

// Performance monitoring interfaces
export interface PerformanceMetric {
  id: string
  name: string
  type: 'query' | 'report' | 'system' | 'user'
  timestamp: Date
  duration: number
  metadata: Record<string, any>
  userId?: string
  sessionId?: string
}

export interface QueryPerformanceMetric extends PerformanceMetric {
  type: 'query'
  metadata: {
    query: string
    parameters: any[]
    resultCount: number
    cacheHit: boolean
    tables: string[]
  }
}

export interface ReportPerformanceMetric extends PerformanceMetric {
  type: 'report'
  metadata: {
    reportId: string
    reportName: string
    templateId?: string
    fieldsCount: number
    filtersCount: number
    dataPoints: number
    exportFormat?: string
  }
}

export interface SystemPerformanceMetric extends PerformanceMetric {
  type: 'system'
  metadata: {
    memoryUsage: number
    cpuUsage: number
    diskUsage: number
    activeConnections: number
    cacheSize: number
  }
}

export interface UserBehaviorMetric extends PerformanceMetric {
  type: 'user'
  metadata: {
    action: string
    page: string
    userAgent: string
    sessionDuration: number
    reportViews: number
    reportsGenerated: number
  }
}

export interface PerformanceAlert {
  id: string
  type: 'slow_query' | 'high_memory' | 'cache_miss' | 'user_error' | 'system_error'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  threshold: number
  currentValue: number
  timestamp: Date
  resolved: boolean
  metadata: Record<string, any>
}

export interface PerformanceReport {
  timeRange: {
    start: Date
    end: Date
  }
  summary: {
    totalQueries: number
    avgQueryTime: number
    slowQueries: number
    cacheHitRate: number
    totalReports: number
    avgReportTime: number
    activeUsers: number
    errorRate: number
  }
  trends: {
    queryTimes: Array<{ timestamp: Date; avgTime: number }>
    reportGenerations: Array<{ timestamp: Date; count: number }>
    userActivity: Array<{ timestamp: Date; activeUsers: number }>
    systemHealth: Array<{ timestamp: Date; memoryUsage: number; cpuUsage: number }>
  }
  topQueries: Array<{ query: string; count: number; avgTime: number }>
  topReports: Array<{ reportName: string; count: number; avgTime: number }>
  alerts: PerformanceAlert[]
  recommendations: string[]
}

export interface PerformanceThresholds {
  slowQueryThreshold: number // milliseconds
  highMemoryThreshold: number // percentage
  lowCacheHitThreshold: number // percentage
  highErrorRateThreshold: number // percentage
  alertCooldownTime: number // minutes
}

/**
 * Performance Monitoring System
 * Tracks query performance, user behavior, and system health
 */
export class PerformanceMonitor {
  private db: Database
  private metrics: Map<string, PerformanceMetric[]> = new Map()
  private alerts: PerformanceAlert[] = []
  private thresholds: PerformanceThresholds
  private metricsBuffer: PerformanceMetric[] = []
  private bufferSize = 1000
  private flushInterval = 60000 // 1 minute
  private lastFlush = Date.now()

  constructor() {
    this.db = getDatabase()
    this.initializeMonitoringTables()
    this.thresholds = {
      slowQueryThreshold: 1000, // 1 second
      highMemoryThreshold: 80, // 80%
      lowCacheHitThreshold: 70, // 70%
      highErrorRateThreshold: 5, // 5%
      alertCooldownTime: 15 // 15 minutes
    }
    
    // Start background flush process
    this.startBackgroundFlush()
  }

  /**
   * Initialize monitoring tables
   */
  private initializeMonitoringTables(): void {
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS performance_metrics (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          duration INTEGER NOT NULL,
          metadata TEXT,
          user_id TEXT,
          session_id TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS performance_alerts (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          type TEXT NOT NULL,
          severity TEXT NOT NULL,
          message TEXT NOT NULL,
          threshold REAL NOT NULL,
          current_value REAL NOT NULL,
          timestamp TEXT NOT NULL,
          resolved INTEGER DEFAULT 0,
          metadata TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_metrics_type_timestamp ON performance_metrics(type, timestamp);
        CREATE INDEX IF NOT EXISTS idx_metrics_user_id ON performance_metrics(user_id);
        CREATE INDEX IF NOT EXISTS idx_alerts_type_resolved ON performance_alerts(type, resolved);
        CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON performance_alerts(timestamp);
      `)
    } catch (error) {
      console.error('Error initializing monitoring tables:', error)
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    // Add to buffer
    this.metricsBuffer.push(metric)
    
    // Check for immediate alerts
    this.checkThresholds(metric)
    
    // Flush buffer if needed
    if (this.metricsBuffer.length >= this.bufferSize || 
        Date.now() - this.lastFlush > this.flushInterval) {
      this.flushMetrics()
    }
  }

  /**
   * Record query performance
   */
  recordQueryPerformance(
    query: string,
    parameters: any[],
    duration: number,
    resultCount: number,
    cacheHit: boolean,
    tables: string[],
    userId?: string,
    sessionId?: string
  ): void {
    const metric: QueryPerformanceMetric = {
      id: this.generateId(),
      name: 'database_query',
      type: 'query',
      timestamp: new Date(),
      duration,
      metadata: {
        query: this.sanitizeQuery(query),
        parameters: parameters.map(p => typeof p === 'string' ? p.substring(0, 100) : p),
        resultCount,
        cacheHit,
        tables
      },
      userId,
      sessionId
    }
    
    this.recordMetric(metric)
  }

  /**
   * Record report generation performance
   */
  recordReportPerformance(
    reportId: string,
    reportName: string,
    duration: number,
    fieldsCount: number,
    filtersCount: number,
    dataPoints: number,
    templateId?: string,
    exportFormat?: string,
    userId?: string,
    sessionId?: string
  ): void {
    const metric: ReportPerformanceMetric = {
      id: this.generateId(),
      name: 'report_generation',
      type: 'report',
      timestamp: new Date(),
      duration,
      metadata: {
        reportId,
        reportName,
        templateId,
        fieldsCount,
        filtersCount,
        dataPoints,
        exportFormat
      },
      userId,
      sessionId
    }
    
    this.recordMetric(metric)
  }

  /**
   * Record system performance
   */
  recordSystemPerformance(
    memoryUsage: number,
    cpuUsage: number,
    diskUsage: number,
    activeConnections: number,
    cacheSize: number
  ): void {
    const metric: SystemPerformanceMetric = {
      id: this.generateId(),
      name: 'system_health',
      type: 'system',
      timestamp: new Date(),
      duration: 0,
      metadata: {
        memoryUsage,
        cpuUsage,
        diskUsage,
        activeConnections,
        cacheSize
      }
    }
    
    this.recordMetric(metric)
  }

  /**
   * Record user behavior
   */
  recordUserBehavior(
    action: string,
    page: string,
    userAgent: string,
    sessionDuration: number,
    reportViews: number,
    reportsGenerated: number,
    userId?: string,
    sessionId?: string
  ): void {
    const metric: UserBehaviorMetric = {
      id: this.generateId(),
      name: 'user_behavior',
      type: 'user',
      timestamp: new Date(),
      duration: sessionDuration,
      metadata: {
        action,
        page,
        userAgent,
        sessionDuration,
        reportViews,
        reportsGenerated
      },
      userId,
      sessionId
    }
    
    this.recordMetric(metric)
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(
    startDate: Date,
    endDate: Date
  ): Promise<PerformanceReport> {
    const timeRange = { start: startDate, end: endDate }
    
    try {
      // Get summary metrics
      const summary = await this.getSummaryMetrics(startDate, endDate)
      
      // Get trends
      const trends = await this.getTrendData(startDate, endDate)
      
      // Get top queries and reports
      const topQueries = await this.getTopQueries(startDate, endDate)
      const topReports = await this.getTopReports(startDate, endDate)
      
      // Get recent alerts
      const alerts = await this.getRecentAlerts(startDate, endDate)
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(summary, trends, alerts)
      
      return {
        timeRange,
        summary,
        trends,
        topQueries,
        topReports,
        alerts,
        recommendations
      }
    } catch (error) {
      throw new Error(`Failed to generate performance report: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get summary metrics
   */
  private async getSummaryMetrics(startDate: Date, endDate: Date): Promise<PerformanceReport['summary']> {
    const startIso = startDate.toISOString()
    const endIso = endDate.toISOString()
    
    const queryMetrics = this.db.prepare(`
      SELECT 
        COUNT(*) as totalQueries,
        AVG(duration) as avgQueryTime,
        COUNT(CASE WHEN duration > ? THEN 1 END) as slowQueries,
        COUNT(CASE WHEN json_extract(metadata, '$.cacheHit') = 1 THEN 1 END) * 100.0 / COUNT(*) as cacheHitRate
      FROM performance_metrics
      WHERE type = 'query' AND timestamp BETWEEN ? AND ?
    `).get(this.thresholds.slowQueryThreshold, startIso, endIso) as any
    
    const reportMetrics = this.db.prepare(`
      SELECT 
        COUNT(*) as totalReports,
        AVG(duration) as avgReportTime
      FROM performance_metrics
      WHERE type = 'report' AND timestamp BETWEEN ? AND ?
    `).get(startIso, endIso) as any
    
    const userMetrics = this.db.prepare(`
      SELECT 
        COUNT(DISTINCT user_id) as activeUsers
      FROM performance_metrics
      WHERE user_id IS NOT NULL AND timestamp BETWEEN ? AND ?
    `).get(startIso, endIso) as any
    
    return {
      totalQueries: queryMetrics?.totalQueries || 0,
      avgQueryTime: queryMetrics?.avgQueryTime || 0,
      slowQueries: queryMetrics?.slowQueries || 0,
      cacheHitRate: queryMetrics?.cacheHitRate || 0,
      totalReports: reportMetrics?.totalReports || 0,
      avgReportTime: reportMetrics?.avgReportTime || 0,
      activeUsers: userMetrics?.activeUsers || 0,
      errorRate: 0 // TODO: Implement error tracking
    }
  }

  /**
   * Get trend data
   */
  private async getTrendData(startDate: Date, endDate: Date): Promise<PerformanceReport['trends']> {
    const startIso = startDate.toISOString()
    const endIso = endDate.toISOString()
    
    const queryTimes = this.db.prepare(`
      SELECT 
        DATE(timestamp) as day,
        AVG(duration) as avgTime
      FROM performance_metrics
      WHERE type = 'query' AND timestamp BETWEEN ? AND ?
      GROUP BY DATE(timestamp)
      ORDER BY day
    `).all(startIso, endIso).map((row: any) => ({
      timestamp: new Date(row.day),
      avgTime: row.avgTime
    }))
    
    const reportGenerations = this.db.prepare(`
      SELECT 
        DATE(timestamp) as day,
        COUNT(*) as count
      FROM performance_metrics
      WHERE type = 'report' AND timestamp BETWEEN ? AND ?
      GROUP BY DATE(timestamp)
      ORDER BY day
    `).all(startIso, endIso).map((row: any) => ({
      timestamp: new Date(row.day),
      count: row.count
    }))
    
    const userActivity = this.db.prepare(`
      SELECT 
        DATE(timestamp) as day,
        COUNT(DISTINCT user_id) as activeUsers
      FROM performance_metrics
      WHERE user_id IS NOT NULL AND timestamp BETWEEN ? AND ?
      GROUP BY DATE(timestamp)
      ORDER BY day
    `).all(startIso, endIso).map((row: any) => ({
      timestamp: new Date(row.day),
      activeUsers: row.activeUsers
    }))
    
    return {
      queryTimes,
      reportGenerations,
      userActivity,
      systemHealth: [] // TODO: Implement system health tracking
    }
  }

  /**
   * Get top queries by frequency and performance
   */
  private async getTopQueries(startDate: Date, endDate: Date): Promise<Array<{ query: string; count: number; avgTime: number }>> {
    const startIso = startDate.toISOString()
    const endIso = endDate.toISOString()
    
    return this.db.prepare(`
      SELECT 
        json_extract(metadata, '$.query') as query,
        COUNT(*) as count,
        AVG(duration) as avgTime
      FROM performance_metrics
      WHERE type = 'query' AND timestamp BETWEEN ? AND ?
      GROUP BY json_extract(metadata, '$.query')
      ORDER BY count DESC, avgTime DESC
      LIMIT 10
    `).all(startIso, endIso).map((row: any) => ({
      query: row.query,
      count: row.count,
      avgTime: row.avgTime
    }))
  }

  /**
   * Get top reports by frequency and performance
   */
  private async getTopReports(startDate: Date, endDate: Date): Promise<Array<{ reportName: string; count: number; avgTime: number }>> {
    const startIso = startDate.toISOString()
    const endIso = endDate.toISOString()
    
    return this.db.prepare(`
      SELECT 
        json_extract(metadata, '$.reportName') as reportName,
        COUNT(*) as count,
        AVG(duration) as avgTime
      FROM performance_metrics
      WHERE type = 'report' AND timestamp BETWEEN ? AND ?
      GROUP BY json_extract(metadata, '$.reportName')
      ORDER BY count DESC, avgTime DESC
      LIMIT 10
    `).all(startIso, endIso).map((row: any) => ({
      reportName: row.reportName,
      count: row.count,
      avgTime: row.avgTime
    }))
  }

  /**
   * Get recent alerts
   */
  private async getRecentAlerts(startDate: Date, endDate: Date): Promise<PerformanceAlert[]> {
    const startIso = startDate.toISOString()
    const endIso = endDate.toISOString()
    
    return this.db.prepare(`
      SELECT *
      FROM performance_alerts
      WHERE timestamp BETWEEN ? AND ?
      ORDER BY timestamp DESC
      LIMIT 50
    `).all(startIso, endIso).map((row: any) => ({
      id: row.id,
      type: row.type,
      severity: row.severity,
      message: row.message,
      threshold: row.threshold,
      currentValue: row.current_value,
      timestamp: new Date(row.timestamp),
      resolved: row.resolved === 1,
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    }))
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    summary: PerformanceReport['summary'],
    trends: PerformanceReport['trends'],
    alerts: PerformanceAlert[]
  ): string[] {
    const recommendations: string[] = []
    
    // Query performance recommendations
    if (summary.avgQueryTime > this.thresholds.slowQueryThreshold) {
      recommendations.push('Consider optimizing slow queries by adding indexes or restructuring queries')
    }
    
    if (summary.cacheHitRate < this.thresholds.lowCacheHitThreshold) {
      recommendations.push('Cache hit rate is low - consider increasing cache size or improving cache strategy')
    }
    
    if (summary.slowQueries > summary.totalQueries * 0.1) {
      recommendations.push('High percentage of slow queries detected - review query optimization')
    }
    
    // Report performance recommendations
    if (summary.avgReportTime > 5000) {
      recommendations.push('Report generation time is high - consider pre-aggregating data or using incremental updates')
    }
    
    // User behavior recommendations
    if (summary.activeUsers > 0 && summary.totalReports / summary.activeUsers > 10) {
      recommendations.push('High reports per user ratio - consider implementing report scheduling to reduce load')
    }
    
    // Alert-based recommendations
    const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.resolved)
    if (criticalAlerts.length > 0) {
      recommendations.push('Critical alerts detected - immediate attention required')
    }
    
    return recommendations
  }

  /**
   * Check performance thresholds and generate alerts
   */
  private checkThresholds(metric: PerformanceMetric): void {
    switch (metric.type) {
      case 'query':
        this.checkQueryThresholds(metric as QueryPerformanceMetric)
        break
      case 'system':
        this.checkSystemThresholds(metric as SystemPerformanceMetric)
        break
    }
  }

  /**
   * Check query performance thresholds
   */
  private checkQueryThresholds(metric: QueryPerformanceMetric): void {
    if (metric.duration > this.thresholds.slowQueryThreshold) {
      this.createAlert({
        type: 'slow_query',
        severity: metric.duration > this.thresholds.slowQueryThreshold * 5 ? 'critical' : 'medium',
        message: `Slow query detected: ${metric.duration}ms`,
        threshold: this.thresholds.slowQueryThreshold,
        currentValue: metric.duration,
        metadata: {
          query: metric.metadata.query,
          tables: metric.metadata.tables
        }
      })
    }
  }

  /**
   * Check system performance thresholds
   */
  private checkSystemThresholds(metric: SystemPerformanceMetric): void {
    if (metric.metadata.memoryUsage > this.thresholds.highMemoryThreshold) {
      this.createAlert({
        type: 'high_memory',
        severity: metric.metadata.memoryUsage > 95 ? 'critical' : 'high',
        message: `High memory usage: ${metric.metadata.memoryUsage}%`,
        threshold: this.thresholds.highMemoryThreshold,
        currentValue: metric.metadata.memoryUsage,
        metadata: {
          cacheSize: metric.metadata.cacheSize,
          activeConnections: metric.metadata.activeConnections
        }
      })
    }
  }

  /**
   * Create performance alert
   */
  private createAlert(alertData: Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const alert: PerformanceAlert = {
      id: this.generateId(),
      timestamp: new Date(),
      resolved: false,
      ...alertData
    }
    
    // Check cooldown period
    const recentAlert = this.alerts.find(a => 
      a.type === alert.type && 
      Date.now() - a.timestamp.getTime() < this.thresholds.alertCooldownTime * 60000
    )
    
    if (recentAlert) {
      return // Skip alert due to cooldown
    }
    
    this.alerts.push(alert)
    
    // Persist to database
    this.db.prepare(`
      INSERT INTO performance_alerts (id, type, severity, message, threshold, current_value, timestamp, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      alert.id,
      alert.type,
      alert.severity,
      alert.message,
      alert.threshold,
      alert.currentValue,
      alert.timestamp.toISOString(),
      JSON.stringify(alert.metadata)
    )
  }

  /**
   * Flush metrics buffer to database
   */
  private flushMetrics(): void {
    if (this.metricsBuffer.length === 0) return
    
    try {
      const transaction = this.db.transaction(() => {
        const stmt = this.db.prepare(`
          INSERT INTO performance_metrics (id, name, type, timestamp, duration, metadata, user_id, session_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        
        for (const metric of this.metricsBuffer) {
          stmt.run(
            metric.id,
            metric.name,
            metric.type,
            metric.timestamp.toISOString(),
            metric.duration,
            JSON.stringify(metric.metadata),
            metric.userId || null,
            metric.sessionId || null
          )
        }
      })
      
      transaction()
      this.metricsBuffer = []
      this.lastFlush = Date.now()
    } catch (error) {
      console.error('Error flushing metrics:', error)
    }
  }

  /**
   * Start background flush process
   */
  private startBackgroundFlush(): void {
    setInterval(() => {
      this.flushMetrics()
    }, this.flushInterval)
  }

  /**
   * Sanitize query for logging
   */
  private sanitizeQuery(query: string): string {
    return query.replace(/\s+/g, ' ').trim().substring(0, 500)
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds }
  }

  /**
   * Get current performance thresholds
   */
  getThresholds(): PerformanceThresholds {
    return { ...this.thresholds }
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      
      // Update in database
      this.db.prepare(`
        UPDATE performance_alerts 
        SET resolved = 1 
        WHERE id = ?
      `).run(alertId)
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(a => !a.resolved)
  }

  /**
   * Clear old metrics (cleanup)
   */
  cleanupOldMetrics(daysToKeep: number = 30): void {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
    
    this.db.prepare(`
      DELETE FROM performance_metrics 
      WHERE timestamp < ?
    `).run(cutoffDate.toISOString())
    
    this.db.prepare(`
      DELETE FROM performance_alerts 
      WHERE timestamp < ? AND resolved = 1
    `).run(cutoffDate.toISOString())
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor()