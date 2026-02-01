// Simple Image Processor - Direct GPT-4o Vision Integration
import { SimpleGPT4oVision } from './simple-gpt4o-vision'
import { getDatabase } from './database/sqlite'

interface ProcessResult {
  extractedText: string
  confidence: number
  description: string
  objects: string[]
  method: string
  success: boolean
  error?: string
}

export async function processImageWithGPT4oVision(imagePath: string): Promise<ProcessResult> {
  console.log('🚀 Processing image with direct GPT-4o Vision integration')
  
  try {
    // Get OpenAI API key from environment or database
    let apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      // Try to get from database
      const db = getDatabase()
      const provider = db.prepare(`
        SELECT api_key_encrypted 
        FROM ai_providers 
        WHERE name = 'openai' AND is_active = 1 
        LIMIT 1
      `).get()
      
      if (provider && provider.api_key_encrypted) {
        try {
          // Decode base64 encoded key
          apiKey = Buffer.from(provider.api_key_encrypted, 'base64').toString('utf8')
        } catch (decodeError) {
          console.log('⚠️ Failed to decode database API key')
        }
      }
    }
    
    if (!apiKey) {
      throw new Error('No OpenAI API key available. Please set OPENAI_API_KEY environment variable.')
    }
    
    console.log('✅ OpenAI API key found, proceeding with GPT-4o Vision...')
    
    // Create vision processor
    const vision = new SimpleGPT4oVision(apiKey)
    
    // Extract text using GPT-4o Vision
    const result = await vision.extractText(imagePath)
    
    if (!result.success) {
      throw new Error(result.error || 'GPT-4o Vision extraction failed')
    }
    
    // Generate objects from extracted text
    const objects = extractObjectsFromText(result.extractedText)
    
    // Generate description
    const description = generateDescription(result.extractedText)
    
    console.log('🎉 GPT-4o Vision processing complete!')
    
    return {
      extractedText: result.extractedText,
      confidence: result.confidence,
      description,
      objects,
      method: 'gpt4o_vision',
      success: true
    }
    
  } catch (error) {
    console.error('❌ GPT-4o Vision processing failed:', error.message)
    
    return {
      extractedText: '',
      confidence: 0,
      description: `Failed to process image with GPT-4o Vision: ${error.message}`,
      objects: ['unknown'],
      method: 'gpt4o_vision_failed',
      success: false,
      error: error.message
    }
  }
}

// Extract objects from the text content
function extractObjectsFromText(text: string): string[] {
  const objects = ['product']
  const lowerText = text.toLowerCase()
  
  // Look for specific product types
  if (lowerText.includes('cable') || lowerText.includes('ffc') || lowerText.includes('fpc')) {
    objects.push('cable')
  }
  if (lowerText.includes('usb')) {
    objects.push('usb_device')
  }
  if (lowerText.includes('connector') || lowerText.includes('position')) {
    objects.push('connector')
  }
  if (lowerText.includes('molex') || lowerText.includes('drok')) {
    objects.push('electronic_component')
  }
  
  return [...new Set(objects)] // Remove duplicates
}

// Generate description from extracted text
function generateDescription(text: string): string {
  if (!text || text.trim().length === 0) {
    return 'No text could be extracted from the image'
  }
  
  const lines = text.split('\n').filter(line => line.trim().length > 0)
  
  if (lines.length === 0) {
    return 'GPT-4o Vision processed the image but no structured text was found'
  }
  
  // First line is usually the part number
  const partNumber = lines[0]
  
  // Second line is usually the description
  const productDescription = lines.length > 1 ? lines[1] : 'Product details'
  
  return `Product analysis: ${partNumber} - ${productDescription}. Text extracted using GPT-4o Vision.`
}