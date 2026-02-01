/**
 * Universal Data Connector Abstraction Layer
 * Provides a unified interface for different data sources (SQLite, PostgreSQL, MySQL, etc.)
 */

import { getDatabase } from '@/lib/database/sqlite'
import type { Database } from 'better-sqlite3'

// Base interfaces for the connector system
export interface DataConnectorConfig {
  type: 'sqlite' | 'postgresql' | 'mysql' | 'supabase' | 'mongodb' | 'rest_api' | 'csv' | 'json'
  name: string
  connectionString?: string
  host?: string
  port?: number
  database?: string
  username?: string
  password?: string
  ssl?: boolean
  options?: Record<string, any>
}

export interface TableInfo {
  name: string
  schema?: string
  columns: ColumnInfo[]
  indexes?: IndexInfo[]
  foreignKeys?: ForeignKeyInfo[]
  primaryKey?: string[]
  rowCount?: number
}

export interface ColumnInfo {
  name: string
  type: string
  sqlType: string
  nullable: boolean
  defaultValue?: any
  primaryKey: boolean
  autoIncrement: boolean
  maxLength?: number
  precision?: number
  scale?: number
}

export interface IndexInfo {
  name: string
  columns: string[]
  unique: boolean
  type: string
}

export interface ForeignKeyInfo {
  name: string
  columns: string[]
  referencedTable: string
  referencedColumns: string[]
  onDelete?: string
  onUpdate?: string
}

export interface QueryResult {
  data: any[]
  columns: string[]
  rowCount: number
  executionTime: number
  affectedRows?: number
}

export interface ConnectionStatus {
  connected: boolean
  lastChecked: Date
  error?: string
  version?: string
  serverInfo?: Record<string, any>
}

/**
 * Base abstract class for all data connectors
 */
export abstract class BaseDataConnector {
  protected config: DataConnectorConfig
  protected connectionStatus: ConnectionStatus = {
    connected: false,
    lastChecked: new Date()
  }

  constructor(config: DataConnectorConfig) {
    this.config = config
  }

  abstract connect(): Promise<void>
  abstract disconnect(): Promise<void>
  abstract testConnection(): Promise<boolean>
  abstract executeQuery(query: string, parameters?: any[]): Promise<QueryResult>
  abstract getTableList(): Promise<string[]>
  abstract getTableInfo(tableName: string): Promise<TableInfo>
  abstract executeTransaction(queries: Array<{ query: string; parameters?: any[] }>): Promise<QueryResult[]>

  getConfig(): DataConnectorConfig {
    return { ...this.config }
  }

  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus }
  }

  protected normalizeColumnType(sqlType: string): string {
    const upperType = sqlType.toUpperCase()
    
    // Common type mappings
    if (upperType.includes('INT')) return 'number'
    if (upperType.includes('FLOAT') || upperType.includes('DOUBLE') || upperType.includes('DECIMAL') || upperType.includes('REAL')) return 'number'
    if (upperType.includes('BOOL')) return 'boolean'
    if (upperType.includes('DATE') || upperType.includes('TIME')) return 'date'
    if (upperType.includes('JSON')) return 'json'
    if (upperType.includes('BINARY') || upperType.includes('BLOB')) return 'binary'
    
    return 'string'
  }

  protected validateQuery(query: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const upperQuery = query.toUpperCase().trim()
    
    // Basic SQL injection prevention
    const dangerousPatterns = [
      /;\s*DROP\s+/i,
      /;\s*DELETE\s+/i,
      /;\s*UPDATE\s+.*SET/i,
      /;\s*INSERT\s+/i,
      /;\s*ALTER\s+/i,
      /;\s*CREATE\s+/i,
      /;\s*TRUNCATE\s+/i,
      /--\s*$/,
      /\/\*[\s\S]*?\*\//
    ]
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        errors.push(`Potentially dangerous SQL pattern detected: ${pattern}`)
      }
    }
    
    // Only allow SELECT statements for safety
    if (!upperQuery.startsWith('SELECT')) {
      errors.push('Only SELECT statements are allowed')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
 * SQLite Data Connector Implementation
 */
export class SQLiteDataConnector extends BaseDataConnector {
  private db: Database | null = null

  constructor(config: DataConnectorConfig) {
    super(config)
  }

  async connect(): Promise<void> {
    try {
      this.db = getDatabase()
      this.connectionStatus = {
        connected: true,
        lastChecked: new Date(),
        version: 'SQLite 3.x'
      }
    } catch (error) {
      this.connectionStatus = {
        connected: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown connection error'
      }
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      // SQLite connection is managed by the database module
      this.db = null
    }
    this.connectionStatus.connected = false
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.db) {
        await this.connect()
      }
      
      const result = this.db!.prepare('SELECT 1 as test').get()
      this.connectionStatus.connected = true
      this.connectionStatus.lastChecked = new Date()
      return true
    } catch (error) {
      this.connectionStatus.connected = false
      this.connectionStatus.error = error instanceof Error ? error.message : 'Connection test failed'
      return false
    }
  }

  async executeQuery(query: string, parameters: any[] = []): Promise<QueryResult> {
    if (!this.db) {
      throw new Error('Database not connected')
    }

    const validation = this.validateQuery(query)
    if (!validation.valid) {
      throw new Error(`Query validation failed: ${validation.errors.join(', ')}`)
    }

    const startTime = Date.now()
    
    try {
      const stmt = this.db.prepare(query)
      const data = stmt.all(...parameters)
      
      // Extract column names from first row
      const columns = data.length > 0 ? Object.keys(data[0]) : []
      
      return {
        data,
        columns,
        rowCount: data.length,
        executionTime: Date.now() - startTime
      }
    } catch (error) {
      throw new Error(`Query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getTableList(): Promise<string[]> {
    if (!this.db) {
      throw new Error('Database not connected')
    }

    try {
      const result = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type = 'table' 
        AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `).all() as { name: string }[]
      
      return result.map(row => row.name)
    } catch (error) {
      throw new Error(`Failed to get table list: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getTableInfo(tableName: string): Promise<TableInfo> {
    if (!this.db) {
      throw new Error('Database not connected')
    }

    try {
      // Get column information
      const columnInfo = this.db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
        cid: number
        name: string
        type: string
        notnull: number
        dflt_value: any
        pk: number
      }>

      const columns: ColumnInfo[] = columnInfo.map(col => ({
        name: col.name,
        type: this.normalizeColumnType(col.type),
        sqlType: col.type,
        nullable: col.notnull === 0,
        defaultValue: col.dflt_value,
        primaryKey: col.pk === 1,
        autoIncrement: col.pk === 1 && col.type.toUpperCase().includes('INTEGER')
      }))

      // Get foreign keys
      const foreignKeyInfo = this.db.prepare(`PRAGMA foreign_key_list(${tableName})`).all() as Array<{
        id: number
        seq: number
        table: string
        from: string
        to: string
        on_update: string
        on_delete: string
        match: string
      }>

      const foreignKeys: ForeignKeyInfo[] = foreignKeyInfo.map(fk => ({
        name: `fk_${tableName}_${fk.from}`,
        columns: [fk.from],
        referencedTable: fk.table,
        referencedColumns: [fk.to],
        onDelete: fk.on_delete,
        onUpdate: fk.on_update
      }))

      // Get indexes
      const indexInfo = this.db.prepare(`PRAGMA index_list(${tableName})`).all() as Array<{
        seq: number
        name: string
        unique: number
        origin: string
        partial: number
      }>

      const indexes: IndexInfo[] = []
      for (const idx of indexInfo) {
        const indexColumns = this.db.prepare(`PRAGMA index_info(${idx.name})`).all() as Array<{
          seqno: number
          cid: number
          name: string
        }>
        
        indexes.push({
          name: idx.name,
          columns: indexColumns.map(col => col.name),
          unique: idx.unique === 1,
          type: idx.origin
        })
      }

      // Get row count
      const rowCountResult = this.db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number }
      
      return {
        name: tableName,
        columns,
        foreignKeys,
        indexes,
        primaryKey: columns.filter(col => col.primaryKey).map(col => col.name),
        rowCount: rowCountResult.count
      }
    } catch (error) {
      throw new Error(`Failed to get table info for ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async executeTransaction(queries: Array<{ query: string; parameters?: any[] }>): Promise<QueryResult[]> {
    if (!this.db) {
      throw new Error('Database not connected')
    }

    const results: QueryResult[] = []
    
    const transaction = this.db.transaction(() => {
      for (const queryObj of queries) {
        const validation = this.validateQuery(queryObj.query)
        if (!validation.valid) {
          throw new Error(`Query validation failed: ${validation.errors.join(', ')}`)
        }

        const startTime = Date.now()
        const stmt = this.db!.prepare(queryObj.query)
        const data = stmt.all(...(queryObj.parameters || []))
        
        results.push({
          data,
          columns: data.length > 0 ? Object.keys(data[0]) : [],
          rowCount: data.length,
          executionTime: Date.now() - startTime
        })
      }
    })

    try {
      transaction()
      return results
    } catch (error) {
      throw new Error(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

/**
 * Data Connector Factory
 */
export class DataConnectorFactory {
  private static connectors = new Map<string, BaseDataConnector>()
  private static configs = new Map<string, DataConnectorConfig>()

  static registerConnector(name: string, config: DataConnectorConfig): void {
    this.configs.set(name, config)
    
    // Remove existing connector if it exists
    if (this.connectors.has(name)) {
      const existingConnector = this.connectors.get(name)
      existingConnector?.disconnect()
      this.connectors.delete(name)
    }
  }

  static async createConnector(name: string): Promise<BaseDataConnector> {
    const config = this.configs.get(name)
    if (!config) {
      throw new Error(`Connector configuration not found: ${name}`)
    }

    // Check if connector already exists and is connected
    const existingConnector = this.connectors.get(name)
    if (existingConnector && existingConnector.getConnectionStatus().connected) {
      return existingConnector
    }

    let connector: BaseDataConnector

    switch (config.type) {
      case 'sqlite':
        connector = new SQLiteDataConnector(config)
        break
      case 'postgresql':
        throw new Error('PostgreSQL connector not implemented yet')
      case 'mysql':
        throw new Error('MySQL connector not implemented yet')
      case 'supabase':
        throw new Error('Supabase connector not implemented yet')
      default:
        throw new Error(`Unsupported connector type: ${config.type}`)
    }

    await connector.connect()
    this.connectors.set(name, connector)
    return connector
  }

  static getConnector(name: string): BaseDataConnector | undefined {
    return this.connectors.get(name)
  }

  static async disconnectAll(): Promise<void> {
    for (const connector of this.connectors.values()) {
      await connector.disconnect()
    }
    this.connectors.clear()
  }

  static getRegisteredConnectors(): string[] {
    return Array.from(this.configs.keys())
  }

  static getConnectorConfig(name: string): DataConnectorConfig | undefined {
    return this.configs.get(name)
  }
}

// Default SQLite connector registration
DataConnectorFactory.registerConnector('default', {
  type: 'sqlite',
  name: 'default',
  database: 'inventory.db'
})

// Export singleton instance for backward compatibility
export const dataConnector = {
  async getConnector(name: string = 'default'): Promise<BaseDataConnector> {
    return await DataConnectorFactory.createConnector(name)
  },
  
  factory: DataConnectorFactory
}