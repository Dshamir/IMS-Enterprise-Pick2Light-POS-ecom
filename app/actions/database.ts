"use server"

import { getDatabase, sqliteHelpers } from "@/lib/database/sqlite"
import { revalidatePath } from "next/cache"
import path from "path"
import fs from "fs/promises"

export interface DatabaseStats {
  connected: boolean
  dbPath: string
  dbSize: string
  tableCount: number
  recordCounts: Record<string, number>
  lastBackup?: string
  error?: string
}

export interface TableSchema {
  name: string
  columns: Array<{
    name: string
    type: string
    nullable: boolean
    defaultValue: string | null
    primaryKey: boolean
  }>
  indexes: string[]
}

export async function getDatabaseStatus(): Promise<DatabaseStats> {
  try {
    const db = getDatabase()
    const dbPath = path.join(process.cwd(), 'data', 'inventory.db')
    
    // Get database file size
    let dbSize = "Unknown"
    try {
      const stats = await fs.stat(dbPath)
      const sizeInBytes = stats.size
      if (sizeInBytes < 1024) {
        dbSize = `${sizeInBytes} B`
      } else if (sizeInBytes < 1024 * 1024) {
        dbSize = `${(sizeInBytes / 1024).toFixed(2)} KB`
      } else {
        dbSize = `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`
      }
    } catch (error) {
      console.error("Error getting file size:", error)
    }

    // Get table count
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all() as { name: string }[]

    // Get record counts for each table
    const recordCounts: Record<string, number> = {}
    for (const table of tables) {
      try {
        const result = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as { count: number }
        recordCounts[table.name] = result.count
      } catch (error) {
        recordCounts[table.name] = 0
      }
    }

    // Check for last backup
    let lastBackup: string | undefined
    try {
      const backupDir = path.join(process.cwd(), 'data', 'backups')
      const files = await fs.readdir(backupDir)
      const backupFiles = files.filter(f => f.endsWith('.db')).sort().reverse()
      if (backupFiles.length > 0) {
        const backupStats = await fs.stat(path.join(backupDir, backupFiles[0]))
        lastBackup = backupStats.mtime.toISOString()
      }
    } catch (error) {
      // Backup directory doesn't exist or is empty
    }

    return {
      connected: true,
      dbPath,
      dbSize,
      tableCount: tables.length,
      recordCounts,
      lastBackup
    }
  } catch (error: any) {
    return {
      connected: false,
      dbPath: "Unknown",
      dbSize: "Unknown",
      tableCount: 0,
      recordCounts: {},
      error: error.message
    }
  }
}

export async function getDatabaseSchema(): Promise<TableSchema[]> {
  try {
    const db = getDatabase()
    
    // Get all tables
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all() as { name: string }[]

    const schemas: TableSchema[] = []

    for (const table of tables) {
      // Get column information
      const columns = db.prepare(`PRAGMA table_info(${table.name})`).all() as Array<{
        cid: number
        name: string
        type: string
        notnull: number
        dflt_value: string | null
        pk: number
      }>

      // Get indexes
      const indexes = db.prepare(`PRAGMA index_list(${table.name})`).all() as Array<{
        seq: number
        name: string
        unique: number
        origin: string
        partial: number
      }>

      schemas.push({
        name: table.name,
        columns: columns.map(col => ({
          name: col.name,
          type: col.type,
          nullable: col.notnull === 0,
          defaultValue: col.dflt_value,
          primaryKey: col.pk === 1
        })),
        indexes: indexes.map(idx => idx.name)
      })
    }

    return schemas
  } catch (error: any) {
    console.error("Error getting database schema:", error)
    return []
  }
}

export async function createDatabaseBackup(): Promise<{ success: boolean; filename?: string; error?: string }> {
  try {
    const db = getDatabase()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `backup-${timestamp}.db`
    
    // Ensure backup directory exists
    const backupDir = path.join(process.cwd(), 'data', 'backups')
    try {
      await fs.mkdir(backupDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }

    const backupPath = path.join(backupDir, filename)
    
    // Create backup using SQLite's backup API
    const sourceDbPath = path.join(process.cwd(), 'data', 'inventory.db')
    await fs.copyFile(sourceDbPath, backupPath)
    
    // Verify backup was created
    const stats = await fs.stat(backupPath)
    if (stats.size > 0) {
      return { success: true, filename }
    } else {
      return { success: false, error: "Backup file is empty" }
    }
  } catch (error: any) {
    console.error("Error creating backup:", error)
    return { success: false, error: error.message }
  }
}

export async function getBackupList(): Promise<Array<{ filename: string; size: string; created: string }>> {
  try {
    const backupDir = path.join(process.cwd(), 'data', 'backups')
    const files = await fs.readdir(backupDir)
    const backupFiles = files.filter(f => f.endsWith('.db'))
    
    const backups = []
    for (const file of backupFiles) {
      const filePath = path.join(backupDir, file)
      const stats = await fs.stat(filePath)
      
      let size = "Unknown"
      const sizeInBytes = stats.size
      if (sizeInBytes < 1024) {
        size = `${sizeInBytes} B`
      } else if (sizeInBytes < 1024 * 1024) {
        size = `${(sizeInBytes / 1024).toFixed(2)} KB`
      } else {
        size = `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`
      }
      
      backups.push({
        filename: file,
        size,
        created: stats.mtime.toISOString()
      })
    }
    
    return backups.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
  } catch (error) {
    return []
  }
}

export async function optimizeDatabase(): Promise<{ success: boolean; message: string }> {
  try {
    const db = getDatabase()
    
    // Run VACUUM to optimize database
    db.exec('VACUUM')
    
    // Run ANALYZE to update statistics
    db.exec('ANALYZE')
    
    return { success: true, message: "Database optimized successfully" }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function testDatabaseConnection(): Promise<{ connected: boolean; message: string; responseTime?: number }> {
  try {
    const startTime = Date.now()
    const db = getDatabase()
    
    // Simple test query
    const result = db.prepare('SELECT 1 as test').get() as { test: number }
    const responseTime = Date.now() - startTime
    
    if (result.test === 1) {
      return { 
        connected: true, 
        message: "Database connection successful", 
        responseTime 
      }
    } else {
      return { 
        connected: false, 
        message: "Database test query failed" 
      }
    }
  } catch (error: any) {
    return { 
      connected: false, 
      message: `Database connection failed: ${error.message}` 
    }
  }
}

export async function exportDatabaseSchema(): Promise<{ success: boolean; schema?: string; error?: string }> {
  try {
    const db = getDatabase()
    
    // Get all tables
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all() as { name: string }[]

    let schemaSQL = `-- Database Schema Export
-- Generated on: ${new Date().toISOString()}
-- Database: SQLite Inventory Management System

`

    for (const table of tables) {
      // Get the CREATE TABLE statement
      const createTableResult = db.prepare(`
        SELECT sql FROM sqlite_master 
        WHERE type='table' AND name = ?
      `).get(table.name) as { sql: string } | undefined

      if (createTableResult?.sql) {
        schemaSQL += `${createTableResult.sql};\n\n`
      }

      // Get indexes for this table
      const indexes = db.prepare(`
        SELECT sql FROM sqlite_master 
        WHERE type='index' AND tbl_name = ? AND sql IS NOT NULL
      `).all(table.name) as { sql: string }[]

      for (const index of indexes) {
        schemaSQL += `${index.sql};\n\n`
      }
    }

    // Get views if any
    const views = db.prepare(`
      SELECT sql FROM sqlite_master 
      WHERE type='view'
      ORDER BY name
    `).all() as { sql: string }[]

    if (views.length > 0) {
      schemaSQL += `-- Views\n`
      for (const view of views) {
        schemaSQL += `${view.sql};\n\n`
      }
    }

    // Get triggers if any
    const triggers = db.prepare(`
      SELECT sql FROM sqlite_master 
      WHERE type='trigger'
      ORDER BY name
    `).all() as { sql: string }[]

    if (triggers.length > 0) {
      schemaSQL += `-- Triggers\n`
      for (const trigger of triggers) {
        schemaSQL += `${trigger.sql};\n\n`
      }
    }

    return { success: true, schema: schemaSQL }
  } catch (error: any) {
    console.error("Error exporting database schema:", error)
    return { success: false, error: error.message }
  }
}

