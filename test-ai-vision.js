// Test script to diagnose AI Vision issues
const Database = require('better-sqlite3');
const path = require('path');

console.log('🔍 Diagnosing AI Vision configuration...');

try {
  const dbPath = path.join(__dirname, 'data', 'inventory.db');
  const db = new Database(dbPath);
  
  // Check if AI tables exist
  console.log('\n📋 Checking AI tables...');
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name LIKE 'ai_%'
  `).all();
  
  console.log('✅ AI tables found:', tables.map(t => t.name));
  
  // Check AI providers
  console.log('\n🏢 Checking AI providers...');
  try {
    const providers = db.prepare(`
      SELECT id, name, display_name, api_key_encrypted, is_active 
      FROM ai_providers 
      ORDER BY is_active DESC
    `).all();
    
    console.log('AI Providers:');
    providers.forEach(p => {
      console.log(`  - ${p.display_name} (${p.name}): active=${p.is_active}, api_key=${p.api_key_encrypted ? 'SET' : 'NOT SET'}`);
    });
  } catch (error) {
    console.error('❌ Error checking providers:', error.message);
  }
  
  // Check AI agents
  console.log('\n🤖 Checking AI agents...');
  try {
    const agents = db.prepare(`
      SELECT id, name, role, provider_id, is_active 
      FROM ai_agents 
      ORDER BY is_active DESC
    `).all();
    
    console.log('AI Agents:');
    agents.forEach(a => {
      console.log(`  - ${a.name} (${a.role}): active=${a.is_active}, provider_id=${a.provider_id}`);
    });
  } catch (error) {
    console.error('❌ Error checking agents:', error.message);
  }
  
  // Test the specific query used by AI Vision
  console.log('\n🔍 Testing AI Vision query...');
  try {
    const agent = db.prepare(`
      SELECT a.*, p.id as provider_id, p.name as provider_name, p.api_key_encrypted as api_key
      FROM ai_agents a 
      JOIN ai_providers p ON a.provider_id = p.id 
      WHERE a.name = 'Image Processing Specialist' AND a.is_active = 1 AND p.is_active = 1 
      LIMIT 1
    `).get();
    
    if (agent) {
      console.log('✅ Image Processing Specialist found:');
      console.log(`  - Agent: ${agent.name}`);
      console.log(`  - Provider: ${agent.provider_name}`);
      console.log(`  - API Key: ${agent.api_key ? 'SET' : 'NOT SET'}`);
      console.log(`  - Model: ${agent.model || 'DEFAULT'}`);
    } else {
      console.log('❌ Image Processing Specialist agent not found or not properly configured');
      
      // Check if agent exists but not active
      const inactiveAgent = db.prepare(`
        SELECT a.name, a.is_active, p.name as provider_name, p.is_active as provider_active
        FROM ai_agents a 
        LEFT JOIN ai_providers p ON a.provider_id = p.id 
        WHERE a.name = 'Image Processing Specialist'
      `).get();
      
      if (inactiveAgent) {
        console.log('⚠️ Found inactive configuration:');
        console.log(`  - Agent active: ${inactiveAgent.is_active}`);
        console.log(`  - Provider: ${inactiveAgent.provider_name || 'NONE'}`);
        console.log(`  - Provider active: ${inactiveAgent.provider_active || 'N/A'}`);
      }
    }
  } catch (error) {
    console.error('❌ Error testing AI Vision query:', error.message);
  }
  
  // Check environment variables
  console.log('\n🔧 Checking environment...');
  console.log(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET'}`);
  
  db.close();
  
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
}

console.log('\n🏁 Diagnosis complete!');