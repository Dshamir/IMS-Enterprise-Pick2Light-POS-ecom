// Simple, Direct GPT-4o Vision Integration
import { readFile } from 'fs/promises'
import sharp from 'sharp'

interface VisionResult {
  extractedText: string
  confidence: number
  description: string
  success: boolean
  error?: string
}

export class SimpleGPT4oVision {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  // Convert image to base64 for OpenAI API
  private async imageToBase64(imagePath: string): Promise<string> {
    try {
      // Read and optimize image for Vision API
      const imageBuffer = await readFile(imagePath)
      
      // Resize to reasonable size for API (max 1024px width)
      const optimizedBuffer = await sharp(imageBuffer)
        .resize({ width: 1024, withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer()
      
      return optimizedBuffer.toString('base64')
    } catch (error) {
      throw new Error(`Failed to process image: ${error.message}`)
    }
  }

  // Extract text using GPT-4o Vision - exactly like your manual test
  async extractText(imagePath: string): Promise<VisionResult> {
    try {
      console.log('🤖 Starting GPT-4o Vision text extraction...')
      
      // Convert image to base64
      const base64Image = await this.imageToBase64(imagePath)
      
      // Call OpenAI Vision API with the same prompt that works
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are a precise OCR parser for part inventory management. Your job is to extract accurate, structured data from product labels.'
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Extract the following fields from the label in this image and return them exactly in this format:

Part Number: <value>  
Description: <value>  
Brand: <value>  
Model: <value>  
Unit Price: <value>  
Company: <value>

Only use the text visible on the label. Do not guess, rephrase, or add extra data. Return nothing else.`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          max_tokens: 500,
          temperature: 0.1 // Low temperature for accurate text extraction
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(errorData)}`)
      }

      const result = await response.json()
      const extractedText = result.choices[0].message.content.trim()
      
      console.log('✅ GPT-4o Vision extraction successful')
      console.log(`📝 Extracted text: "${extractedText.substring(0, 100)}..."`)

      return {
        extractedText,
        confidence: 0.95, // GPT-4o Vision is highly reliable
        description: `GPT-4o Vision extracted text from product label`,
        success: true
      }

    } catch (error) {
      console.error('❌ GPT-4o Vision extraction failed:', error.message)
      
      return {
        extractedText: '',
        confidence: 0,
        description: `GPT-4o Vision failed: ${error.message}`,
        success: false,
        error: error.message
      }
    }
  }
}