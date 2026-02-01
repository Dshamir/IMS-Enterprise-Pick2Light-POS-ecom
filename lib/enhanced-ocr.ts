// Enhanced OCR with preprocessing and multiple strategies
import sharp from 'sharp'
import { join } from 'path'
import { writeFile, unlink } from 'fs/promises'
import { OCRPipelineLogger } from './ocr-pipeline-logger'

interface OCRResult {
  text: string
  confidence: number
  method: string
  preprocessingApplied: string[]
}

interface OCRConfig {
  lang: string
  oem: number
  psm: number
  preprocessingSteps: string[]
}

// Multiple OCR configurations for different image types
const OCR_STRATEGIES = [
  {
    name: 'product_labels',
    config: { lang: 'eng', oem: 1, psm: 6, preprocessingSteps: ['enhance_contrast', 'deskew'] },
    description: 'Optimized for product labels and packaging'
  },
  {
    name: 'barcodes_numbers',
    config: { lang: 'eng', oem: 1, psm: 8, preprocessingSteps: ['enhance_contrast', 'sharpen'] },
    description: 'Optimized for barcodes and serial numbers'
  },
  {
    name: 'mixed_text',
    config: { lang: 'eng', oem: 1, psm: 3, preprocessingSteps: ['denoise', 'enhance_contrast'] },
    description: 'General mixed text extraction'
  },
  {
    name: 'small_text',
    config: { lang: 'eng', oem: 1, psm: 7, preprocessingSteps: ['upscale', 'enhance_contrast', 'sharpen'] },
    description: 'Optimized for small or fine text'
  }
]

class EnhancedOCR {
  private logger: OCRPipelineLogger

  constructor(logger: OCRPipelineLogger) {
    this.logger = logger
  }

  async preprocessImage(imagePath: string, steps: string[]): Promise<string> {
    this.logger.startCheckpoint('IMAGE_PREPROCESSING')
    
    try {
      let processor = sharp(imagePath)
      const appliedSteps: string[] = []

      for (const step of steps) {
        switch (step) {
          case 'enhance_contrast':
            processor = processor.normalize()
            appliedSteps.push('contrast_enhancement')
            break
            
          case 'deskew':
            // Basic rotation correction - Sharp doesn't have auto-deskew
            // We'll implement a simple approach
            processor = processor.rotate(0) // Placeholder for more advanced deskewing
            appliedSteps.push('deskew_attempted')
            break
            
          case 'denoise':
            processor = processor.median(3)
            appliedSteps.push('noise_reduction')
            break
            
          case 'sharpen':
            processor = processor.sharpen()
            appliedSteps.push('sharpening')
            break
            
          case 'upscale':
            processor = processor.resize({ width: null, height: null, fit: 'inside', withoutEnlargement: false })
              .png({ quality: 100 })
            appliedSteps.push('upscaling')
            break
            
          default:
            console.log(`⚠️ Unknown preprocessing step: ${step}`)
        }
      }

      // Generate processed image path
      const tempPath = imagePath.replace(/\.[^.]+$/, '_processed.png')
      
      // Apply all transformations and save
      await processor.png({ quality: 100 }).toFile(tempPath)
      
      this.logger.completeCheckpoint('IMAGE_PREPROCESSING', { 
        appliedSteps, 
        originalPath: imagePath, 
        processedPath: tempPath 
      })
      
      return tempPath
    } catch (error) {
      this.logger.failCheckpoint('IMAGE_PREPROCESSING', error.message)
      throw error
    }
  }

  async performOCRWithStrategy(imagePath: string, strategy: typeof OCR_STRATEGIES[0]): Promise<OCRResult> {
    this.logger.startCheckpoint(`OCR_STRATEGY_${strategy.name.toUpperCase()}`)
    
    try {
      // Preprocess image if needed
      let processedImagePath = imagePath
      if (strategy.config.preprocessingSteps.length > 0) {
        processedImagePath = await this.preprocessImage(imagePath, strategy.config.preprocessingSteps)
      }

      // Perform OCR with enhanced error handling
      let text = ''
      try {
        const tesseract = await import('node-tesseract-ocr')
        const ocrConfig = {
          lang: strategy.config.lang,
          oem: strategy.config.oem,
          psm: strategy.config.psm
        }

        console.log(`🔍 Running OCR with ${strategy.name} strategy:`, ocrConfig)
        const startTime = Date.now()
        text = await tesseract.recognize(processedImagePath, ocrConfig)
        const duration = Date.now() - startTime
        
        console.log(`✅ OCR ${strategy.name} completed in ${duration}ms`)
      } catch (ocrError) {
        console.log(`❌ OCR ${strategy.name} failed:`, ocrError.message)
        
        // Check for specific error types
        if (ocrError.message && ocrError.message.includes('tesseract: not found')) {
          throw new Error('TESSERACT_NOT_INSTALLED: Tesseract OCR engine is not installed on the system. Please install tesseract-ocr package.')
        }
        
        throw new Error(`OCR processing failed for ${strategy.name}: ${ocrError.message}`)
      }

      // Calculate confidence based on text quality
      const confidence = this.calculateConfidence(text, strategy.name)

      // Clean up processed image if it was created
      if (processedImagePath !== imagePath) {
        try {
          await unlink(processedImagePath)
        } catch (cleanupError) {
          console.log('⚠️ Failed to cleanup processed image:', cleanupError.message)
        }
      }

      const result: OCRResult = {
        text: text?.trim() || '',
        confidence,
        method: strategy.name,
        preprocessingApplied: strategy.config.preprocessingSteps
      }

      this.logger.completeCheckpoint(`OCR_STRATEGY_${strategy.name.toUpperCase()}`, {
        textLength: result.text.length,
        confidence: result.confidence,
        preprocessing: strategy.config.preprocessingSteps
      })

      return result
    } catch (error) {
      this.logger.failCheckpoint(`OCR_STRATEGY_${strategy.name.toUpperCase()}`, error.message)
      throw error
    }
  }

  async runMultiStrategyOCR(imagePath: string): Promise<OCRResult[]> {
    this.logger.startCheckpoint('MULTI_STRATEGY_OCR')
    
    const results: OCRResult[] = []
    const errors: string[] = []

    for (const strategy of OCR_STRATEGIES) {
      try {
        const result = await this.performOCRWithStrategy(imagePath, strategy)
        results.push(result)
        console.log(`✅ ${strategy.name}: "${result.text.substring(0, 50)}..." (confidence: ${result.confidence})`)
      } catch (error) {
        errors.push(`${strategy.name}: ${error.message}`)
        console.log(`❌ ${strategy.name} failed:`, error.message)
      }
    }

    this.logger.completeCheckpoint('MULTI_STRATEGY_OCR', {
      strategiesAttempted: OCR_STRATEGIES.length,
      successfulStrategies: results.length,
      errors
    })

    if (results.length === 0) {
      throw new Error(`All OCR strategies failed: ${errors.join('; ')}`)
    }

    return results
  }

  selectBestResult(results: OCRResult[]): OCRResult {
    this.logger.startCheckpoint('RESULT_SELECTION')
    
    if (results.length === 0) {
      throw new Error('No OCR results to select from')
    }

    if (results.length === 1) {
      this.logger.completeCheckpoint('RESULT_SELECTION', { reason: 'single_result', selected: results[0].method })
      return results[0]
    }

    // Sort by confidence, then by text length
    const sorted = results.sort((a, b) => {
      // Primary: confidence score
      if (Math.abs(a.confidence - b.confidence) > 0.1) {
        return b.confidence - a.confidence
      }
      // Secondary: text length (longer is often better for product info)
      return b.text.length - a.text.length
    })

    const selected = sorted[0]
    
    this.logger.completeCheckpoint('RESULT_SELECTION', {
      candidatesCount: results.length,
      selected: selected.method,
      selectedConfidence: selected.confidence,
      selectedTextLength: selected.text.length
    })

    return selected
  }

  // Public method for DualPathProcessor compatibility
  async processWithMultipleStrategies(imagePath: string): Promise<OCRResult[]> {
    return await this.runMultiStrategyOCR(imagePath)
  }

  private calculateConfidence(text: string, strategy: string): number {
    if (!text || text.trim().length === 0) {
      return 0.1
    }

    let confidence = 0.5 // Base confidence

    // Text length indicators
    if (text.length > 10) confidence += 0.1
    if (text.length > 30) confidence += 0.1
    if (text.length > 100) confidence += 0.1

    // Quality indicators
    const hasAlphanumeric = /[A-Za-z0-9]/.test(text)
    const hasNumbers = /\d/.test(text)
    const hasUppercase = /[A-Z]/.test(text)
    
    if (hasAlphanumeric) confidence += 0.1
    if (hasNumbers) confidence += 0.1
    if (hasUppercase) confidence += 0.05

    // Strategy-specific bonuses
    if (strategy === 'barcodes_numbers' && /\d{8,}/.test(text)) {
      confidence += 0.2 // Long numeric sequences
    }
    if (strategy === 'product_labels' && hasUppercase && hasNumbers) {
      confidence += 0.15 // Mixed case with numbers typical of labels
    }

    // Quality penalties
    const specialCharRatio = (text.match(/[^\w\s-.,]/g) || []).length / text.length
    if (specialCharRatio > 0.3) confidence -= 0.2

    const spaceRatio = (text.match(/\s/g) || []).length / text.length
    if (spaceRatio > 0.7) confidence -= 0.15 // Too many spaces indicates fragmentation

    // Clamp between 0.1 and 0.95
    return Math.max(0.1, Math.min(0.95, confidence))
  }
}

export { EnhancedOCR, OCR_STRATEGIES, type OCRResult, type OCRConfig }