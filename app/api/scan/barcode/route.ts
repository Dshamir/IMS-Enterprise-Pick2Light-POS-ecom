import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { getDatabase } from '@/lib/database/sqlite'

interface BarcodeDetectionResult {
  barcode?: string
  confidence: number
  method: string
  extractedText: string
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 })
    }

    // Convert file to buffer and save temporarily
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const tempPath = join(tmpdir(), `barcode-scan-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`)
    
    writeFileSync(tempPath, buffer)

    try {
      // Use AI vision to detect barcodes in the image
      const result = await detectBarcodeFromImage(tempPath)
      
      // Clean up temp file
      unlinkSync(tempPath)
      
      return NextResponse.json(result)
    } catch (error) {
      // Clean up temp file even if processing fails
      try {
        unlinkSync(tempPath)
      } catch (cleanupError) {
        console.warn('Failed to clean up temp file:', cleanupError)
      }
      throw error
    }
  } catch (error: any) {
    console.error('Barcode detection error:', error)
    return NextResponse.json(
      { error: 'Failed to detect barcode from image' },
      { status: 500 }
    )
  }
}

async function detectBarcodeFromImage(imagePath: string): Promise<BarcodeDetectionResult> {
  try {
    // Get AI agent configuration for barcode detection
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
      try {
        apiKey = Buffer.from(agent.api_key, 'base64').toString('utf8')
      } catch (decodeError) {
        apiKey = agent.api_key
      }
      providerName = agent.provider_name || 'OpenAI'
      modelName = agent.model || 'gpt-4o'
    }

    if (!apiKey) {
      throw new Error('No OpenAI API key available')
    }

    // Read and encode image
    const fs = require('fs')
    const imageBuffer = fs.readFileSync(imagePath)
    const base64Image = imageBuffer.toString('base64')

    // Enhanced prompt specifically for barcode detection
    const prompt = `
You are a specialized barcode detection system. Your task is to identify and extract barcodes from this image.

IMPORTANT: Look for any type of barcode or code, including:
- Traditional barcodes (UPC, EAN, Code 128, etc.)
- QR codes
- Product codes, part numbers, or serial numbers
- Any numeric or alphanumeric codes that could identify a product

Extract the EXACT barcode/code value. Do not interpret or modify it.

Respond with a JSON object in this format:
{
  "barcode": "exact_barcode_value_here",
  "confidence": 0.95,
  "method": "ai_vision_barcode_detection",
  "extractedText": "all visible text in the image",
  "location": "description of where the barcode was found"
}

If no barcode is found, set barcode to null but still extract all visible text.
Be thorough - barcodes can be small, rotated, or partially obscured.
`

    console.log(`🔍 Detecting barcode with AI vision (${providerName}/${modelName})`)
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: 'system',
            content: prompt
          },
          {
            role: 'user',
            content: [
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
        max_tokens: 1000,
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const result = await response.json()
    const content = result.choices[0].message.content

    let parsedResponse: any
    try {
      parsedResponse = JSON.parse(content)
    } catch (parseError) {
      // If not JSON, try to extract barcode from text
      parsedResponse = {
        barcode: null,
        confidence: 0.5,
        method: 'ai_vision_barcode_detection',
        extractedText: content,
        location: 'Response was not in JSON format'
      }
    }

    console.log(`✅ Barcode detection result:`, parsedResponse)

    return {
      barcode: parsedResponse.barcode || null,
      confidence: parsedResponse.confidence || 0.5,
      method: parsedResponse.method || 'ai_vision_barcode_detection',
      extractedText: parsedResponse.extractedText || ''
    }
  } catch (error) {
    console.error('AI barcode detection failed:', error)
    throw error
  }
}