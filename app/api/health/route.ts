/**
 * Health Check Endpoint
 *
 * Provides health status for the IMS application.
 * Used by Docker, Kubernetes, and load balancers for health monitoring.
 *
 * GET /api/health
 * Returns:
 *   - 200: Application is healthy
 *   - 503: Application is unhealthy (dependencies unavailable)
 */

import { NextResponse } from 'next/server'
import { isRedisConnected } from '@/lib/cache/redis-client'
import { storageConfig } from '@/lib/storage/minio-client'

export const dynamic = 'force-dynamic'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  checks: {
    database: 'ok' | 'error'
    redis: 'ok' | 'disabled' | 'error'
    storage: 'ok' | 'local' | 'error'
    chromadb?: 'ok' | 'disabled' | 'error'
  }
}

// Track application start time
const startTime = Date.now()

export async function GET() {
  const checks: HealthStatus['checks'] = {
    database: 'ok',
    redis: 'disabled',
    storage: 'local',
  }

  let overallStatus: HealthStatus['status'] = 'healthy'

  // Check database
  try {
    const { getDatabase } = await import('@/lib/database/sqlite')
    const db = getDatabase()
    db.prepare('SELECT 1').get()
    checks.database = 'ok'
  } catch (error) {
    console.error('[Health] Database check failed:', error)
    checks.database = 'error'
    overallStatus = 'unhealthy'
  }

  // Check Redis (optional)
  try {
    if (process.env.REDIS_URL) {
      checks.redis = isRedisConnected() ? 'ok' : 'error'
      if (checks.redis === 'error') {
        overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus
      }
    } else {
      checks.redis = 'disabled'
    }
  } catch {
    checks.redis = 'error'
    overallStatus = 'degraded'
  }

  // Check storage
  try {
    if (storageConfig.hasMinioConfig) {
      // In production with MinIO, we'd do a bucket head check
      // For now, assume OK if configured
      checks.storage = 'ok'
    } else {
      checks.storage = 'local'
    }
  } catch {
    checks.storage = 'error'
    overallStatus = 'degraded'
  }

  // Check ChromaDB (optional)
  if (process.env.CHROMADB_URL) {
    try {
      const response = await fetch(`${process.env.CHROMADB_URL}/api/v1/heartbeat`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })
      checks.chromadb = response.ok ? 'ok' : 'error'
      if (checks.chromadb === 'error') {
        overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus
      }
    } catch {
      checks.chromadb = 'error'
      overallStatus = 'degraded'
    }
  }

  const health: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
  }

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200

  return NextResponse.json(health, { status: statusCode })
}
