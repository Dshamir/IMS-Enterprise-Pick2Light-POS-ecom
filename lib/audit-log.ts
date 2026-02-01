import { writeFile, appendFile, readFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

export interface AuditLogEntry {
  timestamp: string
  operation: string
  filename: string
  status: 'success' | 'partial' | 'error'
  message: string
  details?: string
  updatedCount?: number
  failedCount?: number
  errors?: string[]
}

const AUDIT_LOG_DIR = join(process.cwd(), 'data', 'audit-logs')
const DYNAMIC_UPDATES_LOG = join(AUDIT_LOG_DIR, 'dynamic-updates.log')

// Ensure audit log directory exists
async function ensureAuditLogDir() {
  if (!existsSync(AUDIT_LOG_DIR)) {
    await mkdir(AUDIT_LOG_DIR, { recursive: true })
  }
}

// Format audit log entry for file writing
function formatLogEntry(entry: AuditLogEntry): string {
  const statusIcon = entry.status === 'success' ? '✅' : 
                    entry.status === 'partial' ? '⚠️' : '❌'
  
  let logLine = `${entry.timestamp} | ${entry.operation} | ${entry.filename} | ${statusIcon} ${entry.message}`
  
  if (entry.details) {
    logLine += ` | ${entry.details}`
  }
  
  return logLine + '\n'
}

// Write audit log entry for dynamic updates
export async function logDynamicUpdate(entry: Omit<AuditLogEntry, 'timestamp' | 'operation'>) {
  try {
    await ensureAuditLogDir()
    
    const auditEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      operation: 'Dynamic Update'
    }
    
    const logEntry = formatLogEntry(auditEntry)
    await appendFile(DYNAMIC_UPDATES_LOG, logEntry)
    
    return { success: true }
  } catch (error) {
    console.error('Failed to write audit log:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Read recent audit log entries
export async function getRecentDynamicUpdates(limit: number = 10): Promise<AuditLogEntry[]> {
  try {
    if (!existsSync(DYNAMIC_UPDATES_LOG)) {
      return []
    }
    
    const logContent = await readFile(DYNAMIC_UPDATES_LOG, 'utf-8')
    const lines = logContent.trim().split('\n').filter(line => line.length > 0)
    
    // Get the last 'limit' entries and reverse to show newest first
    const recentLines = lines.slice(-limit).reverse()
    
    return recentLines.map(line => {
      const parts = line.split(' | ')
      if (parts.length < 4) return null
      
      const [timestamp, operation, filename, statusAndMessage, ...detailsParts] = parts
      const details = detailsParts.length > 0 ? detailsParts.join(' | ') : undefined
      
      // Extract status and message
      const statusIcon = statusAndMessage.charAt(0)
      const message = statusAndMessage.substring(2)
      
      const status = statusIcon === '✅' ? 'success' : 
                    statusIcon === '⚠️' ? 'partial' : 'error'
      
      return {
        timestamp,
        operation,
        filename,
        status,
        message,
        details
      } as AuditLogEntry
    }).filter(entry => entry !== null) as AuditLogEntry[]
    
  } catch (error) {
    console.error('Failed to read audit log:', error)
    return []
  }
}

// Generate audit log summary message
export function generateAuditMessage(updatedCount: number, failedCount: number, filename: string): {
  status: 'success' | 'partial' | 'error'
  message: string
  details?: string
} {
  if (failedCount === 0 && updatedCount > 0) {
    return {
      status: 'success',
      message: `Successfully updated ${updatedCount} product${updatedCount !== 1 ? 's' : ''}`,
      details: 'All products were updated without errors'
    }
  } else if (updatedCount > 0 && failedCount > 0) {
    return {
      status: 'partial',
      message: `Updated ${updatedCount} product${updatedCount !== 1 ? 's' : ''}, ${failedCount} failed`,
      details: `Partial success with ${failedCount} error${failedCount !== 1 ? 's' : ''}`
    }
  } else {
    return {
      status: 'error',
      message: `Failed to update any products from ${filename}`,
      details: `${failedCount} error${failedCount !== 1 ? 's' : ''} occurred`
    }
  }
}