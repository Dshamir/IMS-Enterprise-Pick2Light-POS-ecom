// Dual-Path Image Processing: Enhanced OCR + AI Vision
import { EnhancedOCR, type OCRResult } from './enhanced-ocr'
import { EnhancedAIVision, type AIVisionResult } from './enhanced-ai-vision'
import { OCRPipelineLogger } from './ocr-pipeline-logger'

interface ProcessingResult {
  finalText: string
  finalDescription: string
  finalObjects: string[]
  finalConfidence: number
  method: string
  processingDetails: {
    ocrResults: OCRResult[]
    aiResults: AIVisionResult
    mergeStrategy: string
    qualityScores: Record<string, number>
  }
  processingTime: number
  success: boolean
  error?: string
}

interface ProcessingConfig {
  enableOCRPath: boolean
  enableAIPath: boolean
  preferAIForTextExtraction: boolean
  confidenceThreshold: number
  parallelProcessing: boolean
  fallbackStrategy: 'ocr_only' | 'ai_only' | 'best_confidence' | 'merge_all'
}

const DEFAULT_CONFIG: ProcessingConfig = {
  enableOCRPath: true,
  enableAIPath: true,
  preferAIForTextExtraction: true,
  confidenceThreshold: 0.7,
  parallelProcessing: true,
  fallbackStrategy: 'best_confidence'
}

export class DualPathProcessor {
  private logger: OCRPipelineLogger
  private enhancedOCR: EnhancedOCR
  private enhancedAI: EnhancedAIVision
  private config: ProcessingConfig

  constructor(config: Partial<ProcessingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.logger = new OCRPipelineLogger('DualPathProcessor')
    this.enhancedOCR = new EnhancedOCR(this.logger)
    this.enhancedAI = new EnhancedAIVision(this.logger)
  }

  async processImage(imagePath: string): Promise<ProcessingResult> {
    const startTime = Date.now()
    this.logger.startCheckpoint('DUAL_PATH_PROCESSING')
    
    try {
      console.log('🚀 Starting dual-path image processing:', imagePath)
      
      // CHECKPOINT 4A: Run OCR and AI Vision in parallel
      const results = await this.runParallelProcessing(imagePath)
      
      // CHECKPOINT 4B: Merge results intelligently
      const mergedResult = await this.mergeResults(results.ocrResults, results.aiResults)
      
      // CHECKPOINT 4C: Calculate quality metrics
      const qualityScores = this.calculateQualityScores(results.ocrResults, results.aiResults, mergedResult)
      
      const processingTime = Date.now() - startTime
      
      const finalResult: ProcessingResult = {
        finalText: mergedResult.text,
        finalDescription: mergedResult.description,
        finalObjects: mergedResult.objects,
        finalConfidence: mergedResult.confidence,
        method: mergedResult.method,
        processingDetails: {
          ocrResults: results.ocrResults,
          aiResults: results.aiResults,
          mergeStrategy: mergedResult.strategy,
          qualityScores
        },
        processingTime,
        success: true
      }

      this.logger.completeCheckpoint('DUAL_PATH_PROCESSING', {
        finalConfidence: finalResult.finalConfidence,
        finalTextLength: finalResult.finalText.length,
        finalObjectsCount: finalResult.finalObjects.length,
        mergeStrategy: mergedResult.strategy,
        processingTime,
        qualityScores
      })

      console.log('✅ Dual-path processing complete:', {
        method: finalResult.method,
        confidence: finalResult.finalConfidence,
        textLength: finalResult.finalText.length,
        objects: finalResult.finalObjects.length,
        time: processingTime + 'ms'
      })

      return finalResult

    } catch (error) {
      const processingTime = Date.now() - startTime
      this.logger.failCheckpoint('DUAL_PATH_PROCESSING', error.message)
      
      console.error('❌ Dual-path processing failed:', error)
      
      return {
        finalText: 'Error during image processing',
        finalDescription: 'Failed to process image due to technical error',
        finalObjects: ['error'],
        finalConfidence: 0.1,
        method: 'error',
        processingDetails: {
          ocrResults: [],
          aiResults: {
            extractedText: '',
            detectedObjects: [],
            description: '',
            confidence: 0,
            method: 'ai_vision',
            reasoning: 'Failed'
          },
          mergeStrategy: 'error',
          qualityScores: {}
        },
        processingTime,
        success: false,
        error: error.message
      }
    }
  }

  private async runParallelProcessing(imagePath: string): Promise<{
    ocrResults: OCRResult[]
    aiResults: AIVisionResult
  }> {
    this.logger.startCheckpoint('PARALLEL_PROCESSING')
    
    const tasks: Promise<any>[] = []
    
    // Run OCR path if enabled
    if (this.config.enableOCRPath) {
      console.log('🔍 Starting enhanced OCR processing...')
      tasks.push(
        this.enhancedOCR.processWithMultipleStrategies(imagePath)
          .catch(error => {
            console.error('OCR processing failed:', error)
            return []
          })
      )
    }
    
    // Run AI Vision path if enabled
    if (this.config.enableAIPath) {
      console.log('🤖 Starting AI vision processing...')
      tasks.push(
        this.enhancedAI.extractTextWithAIVision(imagePath)
          .catch(error => {
            console.error('AI vision processing failed:', error)
            return {
              extractedText: '',
              detectedObjects: [],
              description: '',
              confidence: 0,
              method: 'ai_vision',
              reasoning: `AI processing failed: ${error.message}`
            }
          })
      )
    }

    // Wait for both to complete
    const [ocrResults, aiResults] = await Promise.all(tasks)
    
    this.logger.completeCheckpoint('PARALLEL_PROCESSING', {
      ocrResultsCount: Array.isArray(ocrResults) ? ocrResults.length : 0,
      aiResultsSuccess: aiResults && aiResults.confidence > 0,
      ocrBestConfidence: Array.isArray(ocrResults) && ocrResults.length > 0 
        ? Math.max(...ocrResults.map(r => r.confidence)) 
        : 0,
      aiConfidence: aiResults ? aiResults.confidence : 0
    })

    return {
      ocrResults: Array.isArray(ocrResults) ? ocrResults : [],
      aiResults: aiResults || {
        extractedText: '',
        detectedObjects: [],
        description: '',
        confidence: 0,
        method: 'ai_vision',
        reasoning: 'AI processing unavailable'
      }
    }
  }

  private async mergeResults(
    ocrResults: OCRResult[], 
    aiResults: AIVisionResult
  ): Promise<{
    text: string
    description: string
    objects: string[]
    confidence: number
    method: string
    strategy: string
  }> {
    this.logger.startCheckpoint('RESULT_MERGING')
    
    // Get best OCR result
    const bestOCR = ocrResults.length > 0 
      ? ocrResults.reduce((best, current) => 
          current.confidence > best.confidence ? current : best
        )
      : null

    console.log('🔄 Merging results:', {
      ocrResultsCount: ocrResults.length,
      bestOCRConfidence: bestOCR?.confidence || 0,
      aiConfidence: aiResults.confidence,
      strategy: this.config.fallbackStrategy
    })

    let mergedResult: {
      text: string
      description: string
      objects: string[]
      confidence: number
      method: string
      strategy: string
    }

    // Strategy 1: Best confidence wins
    if (this.config.fallbackStrategy === 'best_confidence') {
      const ocrConfidence = bestOCR?.confidence || 0
      const aiConfidence = aiResults.confidence
      
      if (aiConfidence > ocrConfidence && aiConfidence >= this.config.confidenceThreshold) {
        mergedResult = {
          text: aiResults.extractedText,
          description: aiResults.description,
          objects: aiResults.detectedObjects,
          confidence: aiConfidence,
          method: 'ai_vision_primary',
          strategy: 'best_confidence_ai'
        }
      } else if (bestOCR && ocrConfidence >= this.config.confidenceThreshold) {
        mergedResult = {
          text: bestOCR.text,
          description: `OCR extraction (${bestOCR.method}): ${bestOCR.text}`,
          objects: this.extractObjectsFromText(bestOCR.text),
          confidence: ocrConfidence,
          method: 'ocr_primary',
          strategy: 'best_confidence_ocr'
        }
      } else {
        // Neither meets threshold - merge both
        mergedResult = this.createMergedResult(bestOCR, aiResults, 'low_confidence_merge')
      }
    }
    
    // Strategy 2: Merge all results
    else if (this.config.fallbackStrategy === 'merge_all') {
      mergedResult = this.createMergedResult(bestOCR, aiResults, 'comprehensive_merge')
    }
    
    // Strategy 3: AI only
    else if (this.config.fallbackStrategy === 'ai_only') {
      mergedResult = {
        text: aiResults.extractedText,
        description: aiResults.description,
        objects: aiResults.detectedObjects,
        confidence: aiResults.confidence,
        method: 'ai_only',
        strategy: 'ai_only'
      }
    }
    
    // Strategy 4: OCR only  
    else if (this.config.fallbackStrategy === 'ocr_only') {
      if (bestOCR) {
        mergedResult = {
          text: bestOCR.text,
          description: `OCR extraction: ${bestOCR.text}`,
          objects: this.extractObjectsFromText(bestOCR.text),
          confidence: bestOCR.confidence,
          method: 'ocr_only',
          strategy: 'ocr_only'
        }
      } else {
        mergedResult = {
          text: '',
          description: 'No OCR results available',
          objects: ['product'],
          confidence: 0.1,
          method: 'ocr_failed',
          strategy: 'ocr_only_failed'
        }
      }
    }
    
    // Default fallback
    else {
      mergedResult = this.createMergedResult(bestOCR, aiResults, 'default_merge')
    }

    this.logger.completeCheckpoint('RESULT_MERGING', {
      strategy: mergedResult.strategy,
      finalConfidence: mergedResult.confidence,
      finalTextLength: mergedResult.text.length,
      finalObjectsCount: mergedResult.objects.length,
      method: mergedResult.method
    })

    return mergedResult
  }

  private createMergedResult(
    bestOCR: OCRResult | null, 
    aiResults: AIVisionResult, 
    strategy: string
  ): {
    text: string
    description: string
    objects: string[]
    confidence: number
    method: string
    strategy: string
  } {
    // Combine text from both sources
    const texts: string[] = []
    if (bestOCR && bestOCR.text.trim()) {
      texts.push(`OCR (${bestOCR.method}): ${bestOCR.text.trim()}`)
    }
    if (aiResults.extractedText.trim()) {
      texts.push(`AI Vision: ${aiResults.extractedText.trim()}`)
    }

    // Combine objects
    const allObjects = new Set<string>()
    if (bestOCR) {
      this.extractObjectsFromText(bestOCR.text).forEach(obj => allObjects.add(obj))
    }
    aiResults.detectedObjects.forEach(obj => allObjects.add(obj))

    // Use AI description as primary, supplement with OCR if needed
    let description = aiResults.description || ''
    if (bestOCR && bestOCR.text && !description.includes(bestOCR.text)) {
      description += description ? ` | OCR detected: ${bestOCR.text}` : bestOCR.text
    }

    // Calculate merged confidence
    const ocrConf = bestOCR?.confidence || 0
    const aiConf = aiResults.confidence
    const mergedConfidence = (ocrConf + aiConf) / 2

    return {
      text: texts.join(' | '),
      description: description || 'Combined OCR and AI analysis results',
      objects: Array.from(allObjects),
      confidence: Math.max(0.1, mergedConfidence),
      method: 'merged_ocr_ai',
      strategy
    }
  }

  private extractObjectsFromText(text: string): string[] {
    const objects = ['product']
    const lowerText = text.toLowerCase()
    
    // Basic object detection from text patterns
    const patterns = [
      { regex: /phone|mobile|smartphone/i, object: 'phone' },
      { regex: /computer|laptop|pc/i, object: 'computer' },
      { regex: /cable|wire|cord/i, object: 'cable' },
      { regex: /battery|power/i, object: 'battery' },
      { regex: /tool|equipment/i, object: 'tool' },
      { regex: /book|manual/i, object: 'book' },
      { regex: /box|package/i, object: 'package' }
    ]

    patterns.forEach(pattern => {
      if (pattern.regex.test(text)) {
        objects.push(pattern.object)
      }
    })

    return [...new Set(objects)]
  }

  private calculateQualityScores(
    ocrResults: OCRResult[], 
    aiResults: AIVisionResult,
    mergedResult: any
  ): Record<string, number> {
    const scores: Record<string, number> = {}

    // OCR quality scores
    if (ocrResults.length > 0) {
      const bestOCR = ocrResults.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      )
      scores.bestOCRConfidence = bestOCR.confidence
      scores.ocrTextLength = bestOCR.text.length
      scores.ocrMethodsAttempted = ocrResults.length
    }

    // AI quality scores
    scores.aiConfidence = aiResults.confidence
    scores.aiTextLength = aiResults.extractedText.length
    scores.aiObjectsDetected = aiResults.detectedObjects.length

    // Merge quality scores
    scores.finalConfidence = mergedResult.confidence
    scores.finalTextLength = mergedResult.text.length
    
    // Text overlap score
    if (ocrResults.length > 0 && aiResults.extractedText) {
      const ocrText = ocrResults[0].text.toLowerCase()
      const aiText = aiResults.extractedText.toLowerCase()
      const ocrWords = new Set(ocrText.split(/\s+/).filter(w => w.length > 2))
      const aiWords = new Set(aiText.split(/\s+/).filter(w => w.length > 2))
      
      const intersection = new Set([...ocrWords].filter(x => aiWords.has(x)))
      const union = new Set([...ocrWords, ...aiWords])
      
      scores.textOverlapRatio = union.size > 0 ? intersection.size / union.size : 0
    }

    return scores
  }

  // Public method to get processing statistics
  getProcessingStats(): any {
    return this.logger.getCheckpointHistory()
  }
}

export { type ProcessingResult, type ProcessingConfig }