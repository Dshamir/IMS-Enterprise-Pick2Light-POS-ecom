import { NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/database/sqlite"
import { join } from "path"
import { storeImageMetadata } from "@/lib/image-vector-fallback"
import { OCRPipelineLogger } from "@/lib/ocr-pipeline-logger"

// POST /api/image-cataloging/process - Process image with AI
export async function POST(request: NextRequest) {
  try {
    const { imageId } = await request.json()
    
    if (!imageId) {
      return NextResponse.json({
        success: false,
        error: "Image ID is required"
      }, { status: 400 })
    }

    // Store results in database
    const db = getDatabase()
    
    // Ensure processed_images table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS processed_images (
        id TEXT PRIMARY KEY,
        image_url TEXT,
        objects TEXT,
        extracted_text TEXT,
        description TEXT,
        confidence REAL,
        processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO processed_images 
      (id, image_url, objects, extracted_text, description, confidence, processed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    
    const imageUrl = '/uploads/image-cataloging/' + imageId + '.jpg' // Mock URL - in production, get from file storage
    
    // Get the actual image URL from the uploaded files
    let actualImageUrl = '/uploads/image-cataloging/' + imageId + '.jpg' // fallback
    
    try {
      const fileRecord = db.prepare(`
        SELECT file_path FROM uploaded_files WHERE id = ?
      `).get(imageId)
      
      if (fileRecord) {
        actualImageUrl = '/' + fileRecord.file_path
        console.log('Using actual image URL:', actualImageUrl)
      }
    } catch (urlError) {
      console.error('Could not get actual image URL:', urlError)
    }

    // TODO: Implement actual AI processing
    // For now, return mock results
    const aiResults = await processImageWithAI(imageId, actualImageUrl)
    
    stmt.run(
      imageId,
      actualImageUrl,
      JSON.stringify(aiResults.objects),
      aiResults.extractedText,
      aiResults.description,
      aiResults.confidence,
      new Date().toISOString()
    )

    // Store image metadata for similarity search using SQLite fallback
    try {
      await storeImageMetadata({
        imageId: imageId,
        filename: imageId + '.jpg', // In production, get actual filename
        extractedText: aiResults.extractedText,
        description: aiResults.description,
        objects: aiResults.objects,
        confidence: aiResults.confidence,
        imageUrl: actualImageUrl
      })
      console.log('✅ Stored image metadata for similarity search')
    } catch (embeddingError) {
      console.error('⚠️ Failed to store image metadata (continuing anyway):', embeddingError)
      // Continue processing even if metadata storage fails
    }

    return NextResponse.json({
      success: true,
      message: "Image processed successfully",
      aiResults: aiResults
    })

  } catch (error) {
    console.error("Error processing image:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to process image"
    }, { status: 500 })
  }
}

// Enhanced dual-path image processing with comprehensive pipeline
async function processImageWithAI(imageId: string, actualImageUrl: string) {
  const logger = new OCRPipelineLogger(`ProcessImage_${imageId}`)
  logger.startCheckpoint('MAIN_PROCESSING')
  
  try {
    // Find the actual image file path from the uploaded files
    const imagePath = join(process.cwd(), 'public', 'uploads', 'image-cataloging')
    
    let extractedText = ''
    let confidence = 0
    let imageFile = null
    let fullImagePath = null
    
    // Get the database to find the actual file path
    const db = getDatabase()
    
    // Create uploaded_files table if it doesn't exist to track file mappings
    db.exec(`
      CREATE TABLE IF NOT EXISTS uploaded_files (
        id TEXT PRIMARY KEY,
        original_filename TEXT NOT NULL,
        stored_filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Try to find the file mapping first
    try {
      const fileRecord = db.prepare(`
        SELECT stored_filename, file_path, original_filename FROM uploaded_files WHERE id = ?
      `).get(imageId)
      
      if (fileRecord) {
        fullImagePath = join(process.cwd(), 'public', fileRecord.file_path)
        imageFile = fileRecord.stored_filename
        
        // Use simple, direct GPT-4o Vision processing
        try {
          logger.startCheckpoint('GPT4O_VISION_PROCESSING')
          console.log('🚀 Starting direct GPT-4o Vision processing for:', fileRecord.original_filename)
          
          const { processImageWithGPT4oVision } = await import('@/lib/simple-image-processor')
          const processingResult = await processImageWithGPT4oVision(fullImagePath)
          
          if (processingResult.success) {
            extractedText = processingResult.extractedText
            confidence = processingResult.confidence
            
            logger.completeCheckpoint('GPT4O_VISION_PROCESSING', {
              method: processingResult.method,
              confidence: processingResult.confidence,
              textLength: processingResult.extractedText.length
            })
            
            console.log('✅ GPT-4o Vision processing successful:', {
              file: fileRecord.original_filename,
              method: processingResult.method,
              confidence: processingResult.confidence,
              textLength: processingResult.extractedText.length,
              extractedText: processingResult.extractedText.substring(0, 100) + '...'
            })
          } else {
            throw new Error(processingResult.error || 'GPT-4o Vision processing failed')
          }
        } catch (processingError) {
          logger.failCheckpoint('GPT4O_VISION_PROCESSING', processingError.message)
          console.error('❌ GPT-4o Vision processing failed, falling back to filename analysis:', processingError)
          
          extractedText = analyzeFilename(fileRecord.original_filename) + ' (Note: GPT-4o Vision failed - ' + processingError.message + ')'
          confidence = 0.5
          
          console.log('📁 Using filename analysis fallback:', {
            file: fileRecord.original_filename,
            extracted: extractedText,
            confidence,
            reason: processingError.message
          })
        }
      }
    } catch (dbError) {
      console.log('No file record found in database for:', imageId)
    }
    
    // Fallback: search directory for files matching timestamp parts
    if (!imageFile) {
      try {
        const fs = require('fs')
        const files = fs.readdirSync(imagePath)
        const idParts = imageId.split('-')
        imageFile = files.find(file => {
          return idParts.some(part => file.includes(part))
        })
        
        if (imageFile) {
          fullImagePath = join(imagePath, imageFile)
          extractedText = analyzeFilename(imageFile)
          confidence = 0.5 // Medium confidence for stored filename
          
          console.log('Using directory search fallback:', {
            file: imageFile,
            extracted: extractedText,
            confidence
          })
        }
      } catch (fsError) {
        console.error('File system error:', fsError)
      }
    }
    
    // Final fallback if no file found
    if (!imageFile) {
      console.log('No image file found for processing:', imageId)
      extractedText = 'Image file not available for analysis'
      confidence = 0.1
    }
    
    // Enhanced results are already processed by dual-path processor
    // Extract description and objects from processed results
    let description = generateImageDescription(extractedText, imageFile)
    let objects = detectObjectsFromText(extractedText)
    
    // If dual-path processing was successful, the results are already optimized
    // The description and objects are embedded in the extractedText or can be inferred
    console.log('📊 Final processing results:', {
      extractedText: extractedText.substring(0, 200) + '...',
      confidence,
      description: description.substring(0, 100) + '...',
      objects
    })
    
    const results = {
      objects,
      extractedText,
      description,
      confidence: Math.max(confidence, 0.1) // Ensure minimum confidence
    }
    
    logger.completeCheckpoint('MAIN_PROCESSING', {
      finalConfidence: results.confidence,
      textLength: results.extractedText.length,
      objectsCount: results.objects.length
    })
    
    console.log('✅ Enhanced AI processing results:', results)
    return results
    
  } catch (error) {
    logger.failCheckpoint('MAIN_PROCESSING', error.message)
    console.error('❌ Error in enhanced AI processing:', error)
    
    return {
      objects: ['unknown'],
      extractedText: 'Error processing image with enhanced pipeline: ' + error.message,
      description: 'Unable to process image due to technical error in enhanced processing pipeline',
      confidence: 0.1
    }
  }
}

// Intelligent filename analysis function
function analyzeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'Image uploaded without filename information'
  }
  
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i, '')
  
  // Check for date-time pattern (like 20250111_153836)
  const dateTimeMatch = nameWithoutExt.match(/(\d{8})_?(\d{6})/)
  if (dateTimeMatch) {
    const dateStr = dateTimeMatch[1]
    const timeStr = dateTimeMatch[2]
    const year = dateStr.substring(0, 4)
    const month = dateStr.substring(4, 6)
    const day = dateStr.substring(6, 8)
    const hour = timeStr.substring(0, 2)
    const minute = timeStr.substring(2, 4)
    const second = timeStr.substring(4, 6)
    
    return `Image captured on ${year}-${month}-${day} at ${hour}:${minute}:${second}. Product photograph for inventory cataloging.`
  }
  
  // Split by common delimiters and clean
  const parts = nameWithoutExt.split(/[._-\s]+/)
    .filter(part => part.length > 1)
    .filter(part => !part.match(/^\d+$/)) // Remove pure numbers
    .filter(part => !part.match(/^[a-z0-9]{8,}$/i)) // Remove hash-like strings
  
  // Look for meaningful patterns
  const analysis = []
  
  // Check for product codes, part numbers
  const productCodes = parts.filter(part => 
    part.match(/^[a-z]{2,}\d+/i) || // Letters followed by numbers
    part.match(/^\d{2,}-\d+/) || // Number-dash-number
    part.match(/^[a-z]+[-_]\d+/i) // Letters-dash/underscore-numbers
  )
  
  if (productCodes.length > 0) {
    analysis.push(`Product codes detected: ${productCodes.join(', ')}`)
  }
  
  // Check for descriptive words
  const descriptiveWords = parts.filter(part => 
    part.length > 2 && 
    part.match(/^[a-z]+$/i) && 
    !['image', 'photo', 'img', 'pic', 'file', 'jpg', 'jpeg', 'png'].includes(part.toLowerCase())
  )
  
  if (descriptiveWords.length > 0) {
    analysis.push(`Product description: ${descriptiveWords.join(' ')}`)
  }
  
  // Check for dates
  const dates = parts.filter(part => 
    part.match(/^\d{4}$/) || // Year
    part.match(/^\d{8}$/) || // YYYYMMDD
    part.match(/^\d{6}$/) // YYMMDD
  )
  
  if (dates.length > 0) {
    analysis.push(`Date information: ${dates.join(', ')}`)
  }
  
  // If no meaningful content found, provide a generic but useful description
  if (analysis.length === 0) {
    if (parts.length > 0) {
      return `Product image file containing: ${parts.join(' ')}. Ready for inventory cataloging and assignment.`
    } else {
      return 'Product image uploaded for inventory management. File contains visual information for product identification and cataloging.'
    }
  }
  
  return analysis.join('; ') + '. Image ready for product assignment.'
}

// Generate description based on extracted text
function generateImageDescription(extractedText: string, imageFile?: string): string {
  if (!extractedText || extractedText.trim().length === 0) {
    return imageFile 
      ? `Image file "${imageFile}" processed but no readable content was detected`
      : 'Image processed but no readable text was detected'
  }
  
  const text = extractedText.toLowerCase()
  
  // Check if this looks like filename analysis
  if (text.includes('filename:') || text.includes('product codes:') || text.includes('description:')) {
    return `Intelligent analysis revealed: ${extractedText}`
  }
  
  let description = 'Product image analysis: '
  
  // Look for common product indicators
  const productIndicators = []
  
  if (text.includes('barcode') || text.includes('upc') || /\d{12,}/.test(text)) {
    productIndicators.push('barcode information')
  }
  
  if (text.includes('price') || text.includes('$') || text.includes('cost')) {
    productIndicators.push('pricing details')
  }
  
  if (text.includes('model') || text.includes('part') || text.includes('serial')) {
    productIndicators.push('model/part information')
  }
  
  if (text.includes('brand') || text.includes('manufacturer')) {
    productIndicators.push('brand information')
  }
  
  // Check for product codes in the text
  if (/[a-z]+[-_]?\d+/i.test(text)) {
    productIndicators.push('product identification codes')
  }
  
  if (productIndicators.length > 0) {
    description += productIndicators.join(', ')
  } else {
    description += 'extracted content from image for inventory cataloging'
  }
  
  return description
}

// Detect objects based on extracted text patterns
function detectObjectsFromText(extractedText: string): string[] {
  const objects = ['product'] // Default object
  const text = extractedText.toLowerCase()
  
  // Common product categories
  const categories = [
    { keywords: ['phone', 'mobile', 'smartphone', 'iphone', 'android'], object: 'smartphone' },
    { keywords: ['laptop', 'computer', 'pc', 'notebook'], object: 'computer' },
    { keywords: ['tablet', 'ipad'], object: 'tablet' },
    { keywords: ['book', 'manual', 'guide'], object: 'book' },
    { keywords: ['bottle', 'container', 'jar'], object: 'container' },
    { keywords: ['box', 'package', 'packaging'], object: 'package' },
    { keywords: ['tool', 'equipment', 'device'], object: 'tool' },
    { keywords: ['cable', 'wire', 'cord'], object: 'cable' },
    { keywords: ['battery', 'power', 'charger'], object: 'power_supply' },
    { keywords: ['card', 'memory', 'storage'], object: 'storage_device' }
  ]
  
  categories.forEach(category => {
    if (category.keywords.some(keyword => text.includes(keyword))) {
      objects.push(category.object)
    }
  })
  
  // Look for text patterns that suggest specific items
  if (/\d+gb|\d+mb|\d+tb/i.test(text)) {
    objects.push('storage_device')
  }
  
  if (/\d+mah|battery|power/i.test(text)) {
    objects.push('battery')
  }
  
  if (/model\s+\w+|part\s+\w+|serial\s+\w+/i.test(text)) {
    objects.push('manufactured_item')
  }
  
  return [...new Set(objects)] // Remove duplicates
}

// Server-side OCR function using node-tesseract-ocr
async function performOCR(imagePath: string): Promise<{ text: string; confidence: number }> {
  try {
    // Dynamic import to avoid build issues
    const tesseract = await import('node-tesseract-ocr')
    
    const config = {
      lang: 'eng',
      oem: 1, // LSTM OCR Engine Mode
      psm: 3, // Fully automatic page segmentation
    }
    
    console.log('🔍 Attempting OCR on image:', imagePath)
    const text = await tesseract.recognize(imagePath, config)
    
    // Estimate confidence based on text quality
    let confidence = 0.5 // Base confidence
    
    if (text && text.trim().length > 0) {
      // Higher confidence for longer text
      if (text.length > 20) confidence += 0.2
      if (text.length > 50) confidence += 0.1
      
      // Higher confidence for structured text (numbers, letters)
      if (/[A-Z0-9]/.test(text)) confidence += 0.1
      if (/\d+/.test(text)) confidence += 0.1
      
      // Lower confidence for lots of special characters
      const specialCharRatio = (text.match(/[^\w\s]/g) || []).length / text.length
      if (specialCharRatio > 0.3) confidence -= 0.2
      
      console.log('✅ OCR successful:', { textLength: text.length, confidence })
    } else {
      console.log('⚠️ OCR returned empty text')
    }
    
    return {
      text: text || '',
      confidence: Math.max(0.1, Math.min(0.95, confidence)) // Clamp between 0.1-0.95
    }
    
  } catch (error) {
    console.error('❌ OCR processing error:', error)
    
    // Check if this is a Tesseract installation issue
    if (error.message && error.message.includes('tesseract: not found')) {
      throw new Error('TESSERACT_NOT_INSTALLED: Tesseract OCR engine is not installed on the system. Please install tesseract-ocr package.')
    }
    
    throw error
  }
}

// GET /api/image-cataloging/process - Get processing status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get('imageId')
    
    if (!imageId) {
      return NextResponse.json({
        success: false,
        error: "Image ID is required"
      }, { status: 400 })
    }
    
    const db = getDatabase()
    const result = db.prepare(`
      SELECT * FROM processed_images WHERE id = ?
    `).get(imageId)
    
    if (!result) {
      return NextResponse.json({
        success: false,
        error: "Image not found"
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      image: {
        ...result,
        objects: JSON.parse(result.objects || '[]')
      }
    })
    
  } catch (error) {
    console.error("Error getting processing status:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to get processing status"
    }, { status: 500 })
  }
}

// AI-powered image analysis using OpenAI Vision API
async function getAIImageAnalysis(
  imagePath: string | null, 
  imageUrl: string, 
  extractedText: string
): Promise<{ 
  success: boolean; 
  description?: string; 
  objects?: string[]; 
  confidence?: number; 
  error?: string 
}> {
  try {
    // Get the Image Processing Specialist agent
    const db = getDatabase()
    const agent = db.prepare(`
      SELECT a.*, p.id as provider_id, p.name as provider_name
      FROM ai_agents a
      JOIN ai_providers p ON a.provider_id = p.id
      WHERE a.name = 'Image Processing Specialist' AND a.is_active = 1 AND p.is_active = 1
      LIMIT 1
    `).get()

    if (!agent) {
      console.log('⚠️ Image Processing Specialist agent not found or not active')
      return {
        success: false,
        error: 'Image Processing Specialist agent not available'
      }
    }

    // Convert image to base64 for AI analysis (works with localhost)
    let imageContent = ''
    let imageAnalysisType = 'url'
    
    try {
      if (imagePath) {
        // Read and resize image for AI analysis (to keep under token limits)
        const fs = require('fs')
        const sharp = require('sharp')
        
        const originalBuffer = fs.readFileSync(imagePath)
        console.log('📏 Original image size:', originalBuffer.length, 'bytes')
        
        // Resize image to max 1024px width, 85% quality JPEG
        const resizedBuffer = await sharp(originalBuffer)
          .resize({ width: 1024, withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer()
        
        const base64Image = resizedBuffer.toString('base64')
        const mimeType = 'image/jpeg'
        imageContent = `data:${mimeType};base64,${base64Image}`
        imageAnalysisType = 'base64'
        
        console.log('🔍 Analyzing image with Image Processing Specialist (compressed base64):', { 
          agentId: agent.id,
          providerName: agent.provider_name,
          originalSize: originalBuffer.length,
          compressedSize: resizedBuffer.length,
          compressionRatio: Math.round((1 - resizedBuffer.length / originalBuffer.length) * 100) + '%',
          mimeType
        })
      } else {
        // Fallback to URL approach
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
        imageContent = `${baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`
        imageAnalysisType = 'url'
        
        console.log('🔍 Analyzing image with Image Processing Specialist (URL):', { 
          imageUrl: imageContent,
          agentId: agent.id,
          providerName: agent.provider_name 
        })
      }
    } catch (readError) {
      console.error('❌ Error reading image file:', readError)
      // Fallback to URL approach
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      imageContent = `${baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`
      imageAnalysisType = 'url'
    }

    // Create a detailed prompt for the specialist agent
    const imagePrompt = imageAnalysisType === 'base64' 
      ? `Please analyze this inventory/product image (provided as base64 data): ${imageContent}`
      : `Please analyze this inventory/product image: ${imageContent}`
    
    const prompt = `${imagePrompt}

IMAGE ANALYSIS REQUEST:
1. **Product Identification**: What specific product, item, or object is shown?
2. **Text Content**: Any visible text, labels, barcodes, model numbers, brand names, or specifications
3. **Product Category**: What type of product is this? (electronics, tools, consumables, parts, etc.)
4. **Key Features**: Notable characteristics, condition, packaging, size indicators
5. **Inventory Context**: Any information useful for inventory management and cataloging

${extractedText ? `Additional context from OCR: "${extractedText}"` : ''}

Please provide a detailed but concise analysis suitable for inventory management. Focus on factual observations that would help with product identification and cataloging.`

    // Send message to the specialized agent
    const response = await aiProviderFactory.sendMessageToAgent(
      agent.id,
      prompt,
      [] // No conversation history for image analysis
    )

    if (!response.success) {
      console.error('❌ Image Processing Specialist failed:', response.error)
      return {
        success: false,
        error: response.error || 'AI analysis failed'
      }
    }

    const analysisText = response.response || ''
    
    // Extract structured data from AI response
    const objects = extractObjectsFromAIResponse(analysisText)
    const confidence = calculateAIConfidence(analysisText, extractedText)
    
    console.log('✅ Image Processing Specialist analysis complete:', {
      analysisLength: analysisText.length,
      extractedObjects: objects,
      confidence,
      usage: response.usage
    })

    return {
      success: true,
      description: analysisText,
      objects: objects,
      confidence: confidence
    }

  } catch (error) {
    console.error('❌ AI image analysis error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'AI analysis failed'
    }
  }
}

// Extract object categories from AI response text
function extractObjectsFromAIResponse(aiText: string): string[] {
  const text = aiText.toLowerCase()
  const objects = ['product'] // Default
  
  // Product categories based on AI analysis
  const categories = [
    { keywords: ['electronic', 'device', 'gadget', 'phone', 'computer', 'tablet'], object: 'electronics' },
    { keywords: ['tool', 'equipment', 'hardware', 'instrument'], object: 'tool' },
    { keywords: ['cable', 'wire', 'cord', 'connector'], object: 'cable' },
    { keywords: ['battery', 'power', 'charger', 'adapter'], object: 'power_supply' },
    { keywords: ['box', 'package', 'container', 'packaging'], object: 'package' },
    { keywords: ['part', 'component', 'spare', 'replacement'], object: 'part' },
    { keywords: ['consumable', 'supply', 'material'], object: 'consumable' },
    { keywords: ['book', 'manual', 'document', 'instruction'], object: 'documentation' },
    { keywords: ['liquid', 'bottle', 'container', 'chemical'], object: 'liquid' },
    { keywords: ['clothing', 'apparel', 'garment', 'uniform'], object: 'clothing' }
  ]
  
  categories.forEach(category => {
    if (category.keywords.some(keyword => text.includes(keyword))) {
      objects.push(category.object)
    }
  })
  
  // Look for specific product mentions
  if (/brand|manufacturer|logo/.test(text)) {
    objects.push('branded_product')
  }
  
  if (/barcode|qr.?code|label/.test(text)) {
    objects.push('labeled_product')
  }
  
  if (/model|serial|part.?number/.test(text)) {
    objects.push('coded_product')
  }
  
  return [...new Set(objects)] // Remove duplicates
}

// Calculate confidence based on AI analysis quality
function calculateAIConfidence(aiText: string, extractedText: string): number {
  let confidence = 0.7 // Base confidence for AI analysis
  
  // Higher confidence for detailed analysis
  if (aiText.length > 200) confidence += 0.1
  if (aiText.length > 400) confidence += 0.05
  
  // Higher confidence if AI found specific details
  if (/model|brand|part.?number|serial/i.test(aiText)) confidence += 0.1
  if (/barcode|qr.?code|label/i.test(aiText)) confidence += 0.05
  if (/specifications?|features?|dimensions?/i.test(aiText)) confidence += 0.05
  
  // Boost confidence if AI analysis aligns with OCR
  if (extractedText && extractedText.length > 10) {
    const ocrWords = extractedText.toLowerCase().split(/\s+/)
    const aiWords = aiText.toLowerCase().split(/\s+/)
    const overlap = ocrWords.filter(word => 
      word.length > 3 && aiWords.some(aiWord => aiWord.includes(word))
    ).length
    
    if (overlap > 2) confidence += 0.1
    if (overlap > 5) confidence += 0.05
  }
  
  // Cap confidence at reasonable maximum
  return Math.min(0.95, confidence)
}