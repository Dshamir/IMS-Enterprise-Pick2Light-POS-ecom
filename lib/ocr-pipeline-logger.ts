// OCR Pipeline Logger with Checkpoint Tracking
interface CheckpointLog {
  checkpoint: string
  timestamp: string
  status: 'started' | 'completed' | 'failed'
  metrics?: Record<string, any>
  error?: string
  duration?: number
}

interface ProcessingMetrics {
  imageSize: number
  ocrDuration: number
  aiDuration: number
  totalDuration: number
  ocrConfidence: number
  aiConfidence: number
  textLength: number
  extractedObjects: string[]
  errors: string[]
}

class OCRPipelineLogger {
  private logs: CheckpointLog[] = []
  private startTime: number = 0
  private metrics: Partial<ProcessingMetrics> = {}

  startCheckpoint(checkpoint: string): void {
    this.startTime = Date.now()
    const log: CheckpointLog = {
      checkpoint,
      timestamp: new Date().toISOString(),
      status: 'started'
    }
    this.logs.push(log)
    console.log(`🚀 CHECKPOINT ${checkpoint}: STARTED`)
  }

  completeCheckpoint(checkpoint: string, metrics?: Record<string, any>): void {
    const duration = Date.now() - this.startTime
    const log: CheckpointLog = {
      checkpoint,
      timestamp: new Date().toISOString(),
      status: 'completed',
      metrics,
      duration
    }
    this.logs.push(log)
    console.log(`✅ CHECKPOINT ${checkpoint}: COMPLETED (${duration}ms)`, metrics || '')
  }

  failCheckpoint(checkpoint: string, error: string): void {
    const duration = Date.now() - this.startTime
    const log: CheckpointLog = {
      checkpoint,
      timestamp: new Date().toISOString(),
      status: 'failed',
      error,
      duration
    }
    this.logs.push(log)
    console.log(`❌ CHECKPOINT ${checkpoint}: FAILED (${duration}ms) - ${error}`)
  }

  recordMetric(key: keyof ProcessingMetrics, value: any): void {
    this.metrics[key] = value
  }

  getMetrics(): Partial<ProcessingMetrics> {
    return { ...this.metrics }
  }

  getLogs(): CheckpointLog[] {
    return [...this.logs]
  }

  generateReport(): string {
    const report = [
      '📊 OCR PIPELINE PROCESSING REPORT',
      '=' .repeat(50),
      '',
      '🔍 CHECKPOINTS:',
      ...this.logs.map(log => 
        `${log.status === 'completed' ? '✅' : log.status === 'failed' ? '❌' : '🔄'} ${log.checkpoint}: ${log.status.toUpperCase()} ${log.duration ? `(${log.duration}ms)` : ''}`
      ),
      '',
      '📈 METRICS:',
      ...Object.entries(this.metrics).map(([key, value]) => 
        `  ${key}: ${JSON.stringify(value)}`
      ),
      '',
      '🎯 PERFORMANCE SUMMARY:',
      `  Total Duration: ${this.metrics.totalDuration || 'N/A'}ms`,
      `  OCR Confidence: ${this.metrics.ocrConfidence || 'N/A'}`,
      `  AI Confidence: ${this.metrics.aiConfidence || 'N/A'}`,
      `  Text Extracted: ${this.metrics.textLength || 0} chars`,
      `  Objects Detected: ${this.metrics.extractedObjects?.length || 0}`,
      `  Errors: ${this.metrics.errors?.length || 0}`,
      ''
    ]
    return report.join('\n')
  }
}

export { OCRPipelineLogger, type ProcessingMetrics, type CheckpointLog }