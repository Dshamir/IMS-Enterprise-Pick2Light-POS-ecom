import { dataConnector, type BaseDataConnector } from './data-connector'

// Types for dynamic report configuration
export interface ReportField {
  name: string
  alias?: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'json'
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'group_concat'
  format?: string
}

export interface ReportFilter {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal' | 'like' | 'in' | 'not_in' | 'between' | 'is_null' | 'is_not_null'
  value?: any
  values?: any[]
}

export interface ReportJoin {
  type: 'inner' | 'left' | 'right' | 'full'
  table: string
  alias?: string
  on: string
}

export interface ReportGroupBy {
  field: string
  alias?: string
}

export interface ReportOrderBy {
  field: string
  direction: 'asc' | 'desc'
}

export interface ReportQuery {
  table: string
  alias?: string
  fields: ReportField[]
  joins?: ReportJoin[]
  filters?: ReportFilter[]
  groupBy?: ReportGroupBy[]
  orderBy?: ReportOrderBy[]
  limit?: number
  offset?: number
}

export interface QueryExecutionResult {
  data: any[]
  totalCount: number
  executionTime: number
  query: string
  parameters: any[]
}

export interface QueryValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Dynamic Database Query Engine for Report Generation
 * Provides safe, flexible SQL query construction with validation
 */
export class ReportQueryEngine {
  private connector: BaseDataConnector | null = null
  private queryCache = new Map<string, { result: QueryExecutionResult; timestamp: number }>()
  private cacheTimeout = 5 * 60 * 1000 // 5 minutes
  private connectorName: string

  constructor(connectorName: string = 'default') {
    this.connectorName = connectorName
  }

  private async getConnector(): Promise<BaseDataConnector> {
    if (!this.connector) {
      this.connector = await dataConnector.getConnector(this.connectorName)
    }
    return this.connector
  }

  /**
   * Execute a dynamic report query with validation and caching
   */
  async executeQuery(queryConfig: ReportQuery): Promise<QueryExecutionResult> {
    const startTime = Date.now()
    
    try {
      // Validate query configuration
      const validation = await this.validateQuery(queryConfig)
      if (!validation.valid) {
        throw new Error(`Query validation failed: ${validation.errors.join(', ')}`)
      }

      // Generate cache key
      const cacheKey = this.generateCacheKey(queryConfig)
      
      // Check cache
      const cached = this.queryCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.result
      }

      // Build SQL query
      const { query, parameters } = this.buildSQLQuery(queryConfig)
      
      // Execute query using connector
      const connector = await this.getConnector()
      const queryResult = await connector.executeQuery(query, parameters)

      // Get total count for pagination
      const totalCount = await this.getTotalCount(queryConfig)

      const result: QueryExecutionResult = {
        data: queryResult.data,
        totalCount,
        executionTime: Date.now() - startTime,
        query,
        parameters
      }

      // Cache result
      this.queryCache.set(cacheKey, { result, timestamp: Date.now() })

      return result
    } catch (error) {
      throw new Error(`Query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate query configuration for security and correctness
   */
  async validateQuery(queryConfig: ReportQuery): Promise<QueryValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate table name
    if (!queryConfig.table || typeof queryConfig.table !== 'string') {
      errors.push('Table name is required and must be a string')
    } else if (!(await this.isValidTableName(queryConfig.table))) {
      errors.push(`Invalid table name: ${queryConfig.table}`)
    }

    // Validate fields
    if (!queryConfig.fields || !Array.isArray(queryConfig.fields) || queryConfig.fields.length === 0) {
      errors.push('At least one field is required')
    } else {
      queryConfig.fields.forEach((field, index) => {
        if (!field.name || typeof field.name !== 'string') {
          errors.push(`Field ${index}: name is required and must be a string`)
        } else if (!this.isValidFieldName(field.name)) {
          errors.push(`Field ${index}: invalid field name: ${field.name}`)
        }
      })
    }

    // Validate joins
    if (queryConfig.joins) {
      for (const [index, join] of queryConfig.joins.entries()) {
        if (!join.table || !(await this.isValidTableName(join.table))) {
          errors.push(`Join ${index}: invalid table name: ${join.table}`)
        }
        if (!join.on || typeof join.on !== 'string') {
          errors.push(`Join ${index}: join condition is required`)
        }
      }
    }

    // Validate filters
    if (queryConfig.filters) {
      queryConfig.filters.forEach((filter, index) => {
        if (!filter.field || !this.isValidFieldName(filter.field)) {
          errors.push(`Filter ${index}: invalid field name: ${filter.field}`)
        }
        if (!this.isValidOperator(filter.operator)) {
          errors.push(`Filter ${index}: invalid operator: ${filter.operator}`)
        }
      })
    }

    // Performance warnings
    if (queryConfig.limit && queryConfig.limit > 10000) {
      warnings.push('Large result sets may impact performance')
    }

    if (queryConfig.groupBy && queryConfig.groupBy.length > 5) {
      warnings.push('Complex grouping may impact performance')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Build SQL query from configuration
   */
  private buildSQLQuery(queryConfig: ReportQuery): { query: string; parameters: any[] } {
    const parameters: any[] = []
    let query = 'SELECT '

    // Build SELECT clause
    const selectFields = queryConfig.fields.map(field => {
      let fieldExpression = field.name
      
      // Handle aggregation
      if (field.aggregation) {
        switch (field.aggregation) {
          case 'sum':
            fieldExpression = `SUM(${field.name})`
            break
          case 'avg':
            fieldExpression = `AVG(${field.name})`
            break
          case 'count':
            fieldExpression = `COUNT(${field.name})`
            break
          case 'min':
            fieldExpression = `MIN(${field.name})`
            break
          case 'max':
            fieldExpression = `MAX(${field.name})`
            break
          case 'group_concat':
            fieldExpression = `GROUP_CONCAT(${field.name})`
            break
        }
      }

      // Handle alias (quote if contains spaces or special characters)
      // Note: Skip aliases for wildcard (*) fields as SQL doesn't support "* AS alias"
      if (field.alias && field.name !== '*') {
        const quotedAlias = /\s/.test(field.alias) ? `"${field.alias}"` : field.alias
        fieldExpression += ` AS ${quotedAlias}`
      }

      return fieldExpression
    })

    query += selectFields.join(', ')

    // Build FROM clause
    query += ` FROM ${queryConfig.table}`
    if (queryConfig.alias) {
      query += ` AS ${queryConfig.alias}`
    }

    // Build JOIN clauses
    if (queryConfig.joins) {
      queryConfig.joins.forEach(join => {
        query += ` ${join.type.toUpperCase()} JOIN ${join.table}`
        if (join.alias) {
          query += ` AS ${join.alias}`
        }
        query += ` ON ${join.on}`
      })
    }

    // Build WHERE clause
    if (queryConfig.filters && queryConfig.filters.length > 0) {
      query += ' WHERE '
      const whereConditions = queryConfig.filters.map(filter => {
        return this.buildFilterCondition(filter, parameters)
      })
      query += whereConditions.join(' AND ')
    }

    // Build GROUP BY clause
    if (queryConfig.groupBy && queryConfig.groupBy.length > 0) {
      query += ' GROUP BY '
      const groupByFields = queryConfig.groupBy.map(group => {
        return group.alias || group.field
      })
      query += groupByFields.join(', ')
    }

    // Build ORDER BY clause
    if (queryConfig.orderBy && queryConfig.orderBy.length > 0) {
      query += ' ORDER BY '
      const orderByFields = queryConfig.orderBy.map(order => {
        return `${order.field} ${order.direction.toUpperCase()}`
      })
      query += orderByFields.join(', ')
    }

    // Build LIMIT clause
    if (queryConfig.limit) {
      query += ' LIMIT ?'
      parameters.push(queryConfig.limit)
    }

    // Build OFFSET clause
    if (queryConfig.offset) {
      query += ' OFFSET ?'
      parameters.push(queryConfig.offset)
    }

    return { query, parameters }
  }

  /**
   * Build filter condition with proper parameterization
   */
  private buildFilterCondition(filter: ReportFilter, parameters: any[]): string {
    const field = filter.field
    
    switch (filter.operator) {
      case 'equals':
        parameters.push(filter.value)
        return `${field} = ?`
      case 'not_equals':
        parameters.push(filter.value)
        return `${field} != ?`
      case 'greater_than':
        parameters.push(filter.value)
        return `${field} > ?`
      case 'less_than':
        parameters.push(filter.value)
        return `${field} < ?`
      case 'greater_equal':
        parameters.push(filter.value)
        return `${field} >= ?`
      case 'less_equal':
        parameters.push(filter.value)
        return `${field} <= ?`
      case 'like':
        parameters.push(filter.value)
        return `${field} LIKE ?`
      case 'in':
        if (!filter.values || !Array.isArray(filter.values)) {
          throw new Error('IN operator requires values array')
        }
        const inPlaceholders = filter.values.map(() => '?').join(', ')
        parameters.push(...filter.values)
        return `${field} IN (${inPlaceholders})`
      case 'not_in':
        if (!filter.values || !Array.isArray(filter.values)) {
          throw new Error('NOT IN operator requires values array')
        }
        const notInPlaceholders = filter.values.map(() => '?').join(', ')
        parameters.push(...filter.values)
        return `${field} NOT IN (${notInPlaceholders})`
      case 'between':
        if (!filter.values || !Array.isArray(filter.values) || filter.values.length !== 2) {
          throw new Error('BETWEEN operator requires exactly 2 values')
        }
        parameters.push(filter.values[0], filter.values[1])
        return `${field} BETWEEN ? AND ?`
      case 'is_null':
        return `${field} IS NULL`
      case 'is_not_null':
        return `${field} IS NOT NULL`
      default:
        throw new Error(`Unsupported operator: ${filter.operator}`)
    }
  }

  /**
   * Get total count for pagination
   */
  private async getTotalCount(queryConfig: ReportQuery): Promise<number> {
    try {
      const countQuery = { ...queryConfig }
      countQuery.fields = [{ name: 'COUNT(*)', alias: 'total_count', type: 'number' as const }]
      countQuery.orderBy = undefined
      countQuery.limit = undefined
      countQuery.offset = undefined

      const { query, parameters } = this.buildSQLQuery(countQuery)
      const connector = await this.getConnector()
      const result = await connector.executeQuery(query, parameters)
      
      return result.data[0]?.total_count || 0
    } catch (error) {
      console.error('Error getting total count:', error)
      return 0
    }
  }

  /**
   * Generate cache key for query
   */
  private generateCacheKey(queryConfig: ReportQuery): string {
    return JSON.stringify(queryConfig)
  }

  /**
   * Validate table name against available tables (security-first approach)
   */
  private async isValidTableName(tableName: string): Promise<boolean> {
    // Get valid tables using dynamic discovery
    const validTables = await this.getValidTables()
    return validTables.includes(tableName)
  }

  /**
   * Get valid tables for querying (excludes system tables for security)
   */
  private async getValidTables(): Promise<string[]> {
    try {
      const connector = await this.getConnector()
      const tables = await connector.getTableList()
      
      // Filter out system tables for security
      return tables.filter(table => 
        !table.startsWith('sqlite_') && 
        !table.startsWith('pragma_') && 
        !table.startsWith('__temp_')
      )
    } catch (error) {
      console.error('Error getting valid tables:', error)
      // Fallback to basic application tables if dynamic discovery fails
      return [
        'products', 'inventory_transactions', 'categories', 'units',
        'projects', 'production_lines', 'manufacturing_boms', 'manufacturing_bom_items',
        'production_runs', 'product_instances', 'orders', 'order_items',
        'ai_providers', 'ai_agents', 'ai_conversations', 'ai_tasks', 'ai_usage_logs',
        'users', 'settings', 'product_images', 'search_feedback'
      ]
    }
  }

  /**
   * Validate field name format
   */
  private isValidFieldName(fieldName: string): boolean {
    // Allow wildcard "*" for SELECT ALL
    if (fieldName === '*') {
      return true
    }
    
    // Allow table.field format and basic field names
    const fieldRegex = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/
    return fieldRegex.test(fieldName)
  }

  /**
   * Validate operator
   */
  private isValidOperator(operator: string): boolean {
    const validOperators = [
      'equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal',
      'like', 'in', 'not_in', 'between', 'is_null', 'is_not_null'
    ]
    return validOperators.includes(operator)
  }

  /**
   * Get available tables for query building
   */
  async getAvailableTables(): Promise<string[]> {
    return await this.getValidTables()
  }

  /**
   * Get table schema information
   */
  async getTableSchema(tableName: string): Promise<any[]> {
    if (!(await this.isValidTableName(tableName))) {
      const validTables = await this.getValidTables()
      throw new Error(`Invalid table name: ${tableName}. Available tables: ${validTables.join(', ')}`)
    }

    try {
      const connector = await this.getConnector()
      const tableInfo = await connector.getTableInfo(tableName)
      
      // Transform to legacy format for backward compatibility
      return tableInfo.columns.map((col, index) => ({
        cid: index,
        name: col.name,
        type: col.sqlType,
        notnull: col.nullable ? 0 : 1,
        dflt_value: col.defaultValue,
        pk: col.primaryKey ? 1 : 0
      }))
    } catch (error) {
      throw new Error(`Failed to get schema for table ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get foreign key relationships
   */
  async getForeignKeys(tableName: string): Promise<any[]> {
    if (!(await this.isValidTableName(tableName))) {
      throw new Error(`Invalid table name: ${tableName}`)
    }

    try {
      const connector = await this.getConnector()
      const tableInfo = await connector.getTableInfo(tableName)
      
      // Transform to legacy format for backward compatibility
      return tableInfo.foreignKeys?.map((fk, index) => ({
        id: index,
        seq: 0,
        table: fk.referencedTable,
        from: fk.columns[0],
        to: fk.referencedColumns[0],
        on_update: fk.onUpdate || 'NO ACTION',
        on_delete: fk.onDelete || 'NO ACTION',
        match: 'NONE'
      })) || []
    } catch (error) {
      throw new Error(`Failed to get foreign keys for table ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Clear query cache
   */
  clearCache(): void {
    this.queryCache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.queryCache.size,
      hitRate: 0 // TODO: Implement hit rate tracking
    }
  }

  /**
   * Get connector status
   */
  async getConnectorStatus(): Promise<ConnectionStatus> {
    try {
      const connector = await this.getConnector()
      return connector.getConnectionStatus()
    } catch (error) {
      return {
        connected: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

// Export singleton instance
export const reportQueryEngine = new ReportQueryEngine()