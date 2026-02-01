// Direct test of AI Vision functionality
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

async function testAIVision() {
  console.log('🤖 Testing AI Vision directly...');
  
  try {
    // Get database
    const dbPath = path.join(__dirname, 'data', 'inventory.db');
    const db = new Database(dbPath);
    
    // Get AI agent configuration
    const agent = db.prepare(`
      SELECT a.*, p.id as provider_id, p.name as provider_name, p.api_key_encrypted as api_key
      FROM ai_agents a 
      JOIN ai_providers p ON a.provider_id = p.id 
      WHERE a.name = 'Image Processing Specialist' AND a.is_active = 1 AND p.is_active = 1 
      LIMIT 1
    `).get();
    
    if (!agent) {
      console.log('❌ No active Image Processing Specialist found');
      return;
    }
    
    // Decode API key if it's base64 encoded
    let apiKey = agent.api_key;
    try {
      apiKey = Buffer.from(agent.api_key, 'base64').toString('utf8');
    } catch (decodeError) {
      // If decoding fails, use as-is
    }
    
    console.log('✅ Agent found:', {
      name: agent.name,
      provider: agent.provider_name,
      model: agent.model || 'gpt-4o',
      hasApiKey: !!agent.api_key,
      decodedKeyStart: apiKey.substring(0, 10) + '...'
    });
    
    // Test with a small base64 image (just a test)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='; // 1x1 pixel
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: agent.model || 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'What do you see in this image?'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${testImageBase64}`,
                  detail: 'low'
                }
              }
            ]
          }
        ],
        max_tokens: 100,
        temperature: 0.1,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.log('❌ OpenAI API Error:', {
        status: response.status,
        error: errorData
      });
    } else {
      const result = await response.json();
      console.log('✅ OpenAI API Success:', {
        model: result.model,
        usage: result.usage,
        response: result.choices[0].message.content
      });
    }
    
    db.close();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAIVision();