// Enhanced AI Vision for Direct Text Extraction
import sharp from 'sharp'
import { readFile } from 'fs/promises'
import { getDatabase } from './database/sqlite'
import { OCRPipelineLogger } from './ocr-pipeline-logger'

interface AIVisionResult {
  extractedText: string
  detectedObjects: string[]
  description: string
  confidence: number
  method: 'ai_vision'
  reasoning: string
}

interface AIVisionConfig {
  maxImageSize: number
  compressionQuality: number
  promptTemplate: string
}

const DEFAULT_CONFIG: AIVisionConfig = {
  maxImageSize: 1024, // Max width/height for vision API
  compressionQuality: 85,
  promptTemplate: `
# ADVANCED TEXT EXTRACTION & PRODUCT ANALYSIS

You are an expert image analyst specializing in extracting text and cataloging products. Your task is to perform COMPREHENSIVE text extraction and analysis.

## PRIMARY OBJECTIVES:
1. **EXTRACT ALL VISIBLE TEXT** - Read every piece of text, no matter how small
2. **IDENTIFY PRODUCT INFORMATION** - Brands, models, part numbers, specifications
3. **DETECT BARCODES & CODES** - Any numeric or alphanumeric codes
4. **ANALYZE PRODUCT CATEGORY** - What type of product this is

## TEXT EXTRACTION GUIDELINES:
- Read ALL text visible in the image, including:
  * Product names and brand names
  * Model numbers and part numbers  
  * Barcodes, QR codes, serial numbers
  * Specifications (voltage, size, weight, etc.)
  * Warning labels and instructions
  * Packaging text and fine print
- If text is unclear, provide your best interpretation
- Note text orientation (upside down, rotated, etc.)
- Extract text from all surfaces visible (front, back, sides)

## RESPONSE FORMAT:
Provide a JSON response with these fields:
{
  "extracted_text": "All visible text, separated by | symbols",
  "detected_objects": ["list", "of", "product", "types", "and", "components"],
  "description": "Detailed product analysis for inventory",
  "confidence": 0.95,
  "text_locations": {
    "brand": "extracted brand name",
    "model": "model/part number", 
    "barcode": "barcode or serial number",
    "specifications": "technical specs if visible"
  },
  "extraction_notes": "Notes about text quality, orientation, or challenges"
}

## QUALITY STANDARDS:
- Aim for 90%+ accuracy in text extraction
- Be thorough - missing text reduces inventory value
- If uncertain about text, include multiple interpretations
- Focus on text that helps identify and catalog the product

Analyze this product image with maximum attention to text extraction:
`
}

class EnhancedAIVision {
  private logger: OCRPipelineLogger
  private config: AIVisionConfig

  constructor(logger: OCRPipelineLogger, config: Partial<AIVisionConfig> = {}) {
    this.logger = logger
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async compressImageForVision(imagePath: string): Promise<Buffer> {
    this.logger.startCheckpoint('IMAGE_COMPRESSION_FOR_AI')
    
    try {
      const imageBuffer = await readFile(imagePath)
      this.logger.recordMetric('imageSize', imageBuffer.length)
      
      console.log(`📏 Original image size: ${imageBuffer.length} bytes`)
      
      // Optimize image for AI vision API
      const optimizedBuffer = await sharp(imageBuffer)
        .resize({ 
          width: this.config.maxImageSize, 
          height: this.config.maxImageSize, 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        .jpeg({ quality: this.config.compressionQuality })
        .toBuffer()
      
      const compressionRatio = Math.round((1 - (optimizedBuffer.length / imageBuffer.length)) * 100)
      
      this.logger.completeCheckpoint('IMAGE_COMPRESSION_FOR_AI', {
        originalSize: imageBuffer.length,
        compressedSize: optimizedBuffer.length,
        compressionRatio: `${compressionRatio}%`,
        maxDimension: this.config.maxImageSize
      })
      
      console.log(`🔍 Compressed for AI: ${optimizedBuffer.length} bytes (${compressionRatio}% reduction)`)
      
      return optimizedBuffer
    } catch (error) {
      this.logger.failCheckpoint('IMAGE_COMPRESSION_FOR_AI', error.message)
      throw error
    }
  }

  async extractTextWithAIVision(imagePath: string): Promise<AIVisionResult> {
    this.logger.startCheckpoint('AI_VISION_TEXT_EXTRACTION')
    
    try {
      // Get AI agent configuration
      const db = getDatabase()
      const agent = db.prepare(`
        SELECT a.*, p.id as provider_id, p.name as provider_name, p.api_key_encrypted as api_key
        FROM ai_agents a 
        JOIN ai_providers p ON a.provider_id = p.id 
        WHERE a.name = 'Image Processing Specialist' AND a.is_active = 1 AND p.is_active = 1 
        LIMIT 1
      `).get()

      let apiKey = process.env.OPENAI_API_KEY
      let providerName = 'OpenAI (Environment)'
      let modelName = 'gpt-4o'

      if (agent && agent.api_key) {
        // Decode API key if it's base64 encoded
        try {
          apiKey = Buffer.from(agent.api_key, 'base64').toString('utf8')
        } catch (decodeError) {
          // If decoding fails, use as-is
          apiKey = agent.api_key
        }
        providerName = agent.provider_name || 'OpenAI'
        modelName = agent.model || 'gpt-4o'
        console.log(`🤖 Using configured AI agent: ${agent.name} (${providerName}/${modelName})`)
      } else {
        console.log(`⚠️ Image Processing Specialist agent not found, using environment OpenAI API key`)
        if (!apiKey) {
          throw new Error('No OpenAI API key available. Please configure AI providers or set OPENAI_API_KEY environment variable.')
        }
      }

      // Compress image for AI
      const imageBuffer = await this.compressImageForVision(imagePath)
      const base64Image = imageBuffer.toString('base64')

      // Enhanced prompt for text extraction
      const enhancedPrompt = this.config.promptTemplate

      console.log(`🤖 Analyzing image with enhanced AI vision (${providerName}/${modelName})`)
      
      // Call OpenAI Vision API directly with enhanced prompt
      const startTime = Date.now()
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName, // Use configured model or default gpt-4o
          messages: [
            {
              role: 'system',
              content: enhancedPrompt
            },
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`,
                    detail: 'high' // High detail for better text extraction
                  }
                }
              ]
            }
          ],
          max_tokens: 1500,
          temperature: 0.1, // Low temperature for accurate text extraction
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(errorData)}`)
      }

      const result = await response.json()
      const aiDuration = Date.now() - startTime

      let parsedResponse: any
      try {
        // Try to parse as JSON first
        const content = result.choices[0].message.content
        parsedResponse = JSON.parse(content)
      } catch (parseError) {
        // If not JSON, extract text manually
        const content = result.choices[0].message.content
        parsedResponse = {
          extracted_text: content,
          detected_objects: ['product'],
          description: content,
          confidence: 0.8,
          text_locations: {},
          extraction_notes: 'Response was not in JSON format'
        }
      }

      const visionResult: AIVisionResult = {
        extractedText: parsedResponse.extracted_text || '',
        detectedObjects: parsedResponse.detected_objects || ['product'],
        description: parsedResponse.description || '',
        confidence: parsedResponse.confidence || 0.8,
        method: 'ai_vision',
        reasoning: parsedResponse.extraction_notes || 'Enhanced AI vision analysis'
      }

      this.logger.recordMetric('aiDuration', aiDuration)
      this.logger.recordMetric('aiConfidence', visionResult.confidence)
      
      this.logger.completeCheckpoint('AI_VISION_TEXT_EXTRACTION', {
        textLength: visionResult.extractedText.length,
        objectsDetected: visionResult.detectedObjects.length,
        confidence: visionResult.confidence,
        duration: aiDuration,
        model: modelName,
        reasoning: visionResult.reasoning
      })

      console.log(`✅ AI Vision extraction complete: "${visionResult.extractedText.substring(0, 100)}..." (confidence: ${visionResult.confidence})`)

      return visionResult
    } catch (error) {
      this.logger.failCheckpoint('AI_VISION_TEXT_EXTRACTION', error.message)
      throw error
    }
  }

  async analyzeImageQuality(imagePath: string): Promise<{ quality: string; recommendations: string[] }> {
    this.logger.startCheckpoint('IMAGE_QUALITY_ANALYSIS')
    
    try {
      const imageBuffer = await readFile(imagePath)
      const metadata = await sharp(imageBuffer).metadata()
      
      const recommendations: string[] = []
      let quality = 'good'

      // Size analysis
      if (metadata.width && metadata.width < 800) {
        quality = 'low'
        recommendations.push('Image resolution is low - consider higher resolution for better text extraction')
      }

      // Density analysis
      if (metadata.density && metadata.density < 150) {
        quality = quality === 'good' ? 'medium' : 'low'
        recommendations.push('Low image density may affect text clarity')
      }

      // File size analysis
      if (imageBuffer.length < 100000) { // Less than 100KB
        quality = quality === 'good' ? 'medium' : 'low'
        recommendations.push('Small file size may indicate compression artifacts')
      }

      this.logger.completeCheckpoint('IMAGE_QUALITY_ANALYSIS', {
        quality,
        width: metadata.width,
        height: metadata.height,
        density: metadata.density,
        fileSize: imageBuffer.length,
        recommendations
      })

      return { quality, recommendations }
    } catch (error) {
      this.logger.failCheckpoint('IMAGE_QUALITY_ANALYSIS', error.message)
      return { quality: 'unknown', recommendations: ['Could not analyze image quality'] }
    }
  }
}

export { EnhancedAIVision, type AIVisionResult, type AIVisionConfig }