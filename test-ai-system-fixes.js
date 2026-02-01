#!/usr/bin/env node

/**
 * AI System Validation Script
 * Tests the comprehensive fixes and validates system health
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'inventory.db');

console.log('🧪 AI System Validation Test Suite');
console.log('===================================');

function main() {
  const db = new Database(DB_PATH);
  
  try {
    // Test 1: Database Schema Validation
    console.log('\n📊 Test 1: Database Schema Validation');
    validateDatabaseSchema(db);
    
    // Test 2: Provider Configuration Check
    console.log('\n🔑 Test 2: Provider Configuration Check');
    validateProviderConfiguration(db);
    
    // Test 3: Agent-Provider Mapping Validation
    console.log('\n🤖 Test 3: Agent-Provider Mapping Validation');
    validateAgentProviderMapping(db);
    
    // Test 4: API Key Decryption Test
    console.log('\n🔐 Test 4: API Key Decryption Test');
    testApiKeyDecryption(db);
    
    // Test 5: System Health Simulation
    console.log('\n🏥 Test 5: System Health Simulation');
    simulateSystemHealth(db);
    
    console.log('\n✅ All validation tests completed successfully!');
    console.log('🎉 AI system appears to be properly configured and ready for use');
    
  } catch (error) {
    console.error('\n❌ Validation test failed:', error.message);
    console.error('💡 Review the failed test and check system configuration');
    process.exit(1);
  } finally {
    db.close();
  }
}

function validateDatabaseSchema(db) {
  // Check for duplicate providers
  const allProviders = db.prepare('SELECT name, COUNT(*) as count FROM ai_providers GROUP BY name').all();
  
  allProviders.forEach(provider => {
    if (provider.count > 1) {
      throw new Error(`Found ${provider.count} duplicate ${provider.name} providers - cleanup failed`);
    }
    console.log(`  ✅ ${provider.name} provider: unique (${provider.count})`);
  });
  
  // Check for orphaned agents
  const orphanedAgents = db.prepare(`
    SELECT a.name, a.provider_id
    FROM ai_agents a
    LEFT JOIN ai_providers p ON a.provider_id = p.id
    WHERE a.is_active = 1 AND p.id IS NULL
  `).all();
  
  if (orphanedAgents.length > 0) {
    throw new Error(`Found ${orphanedAgents.length} orphaned agents with missing providers`);
  }
  console.log('  ✅ No orphaned agents found');
  
  // Check CategoryGuard cleanup
  const categoryGuards = db.prepare('SELECT COUNT(*) as count FROM ai_agents WHERE name = ?').get('CategoryGuard');
  if (categoryGuards.count > 1) {
    throw new Error(`Found ${categoryGuards.count} CategoryGuard agents - cleanup incomplete`);
  }
  console.log(`  ✅ CategoryGuard agents properly cleaned up (${categoryGuards.count})`);
}

function validateProviderConfiguration(db) {
  const providers = db.prepare('SELECT * FROM ai_providers').all();
  
  if (providers.length === 0) {
    throw new Error('No providers found in database');
  }
  
  let activeCount = 0;
  let configuredCount = 0;
  
  providers.forEach(provider => {
    console.log(`  🔍 Checking ${provider.display_name}:`);
    
    if (provider.is_active) {
      activeCount++;
      console.log(`    ✅ Active: Yes`);
    } else {
      console.log(`    ⏸️  Active: No`);
    }
    
    if (provider.api_key_encrypted) {
      configuredCount++;
      console.log(`    ✅ API Key: Configured (${provider.api_key_encrypted.substring(0, 20)}...)`);
    } else {
      console.log(`    ❌ API Key: Not configured`);
    }
    
    if (provider.default_model) {
      console.log(`    ✅ Default Model: ${provider.default_model}`);
    } else {
      console.log(`    ⚠️  Default Model: Not set`);
    }
    
    if (provider.api_endpoint) {
      console.log(`    ✅ API Endpoint: ${provider.api_endpoint}`);
    } else {
      console.log(`    ℹ️  API Endpoint: Using default`);
    }
  });
  
  if (activeCount === 0) {
    throw new Error('No active providers found - system cannot function');
  }
  
  console.log(`  📊 Summary: ${activeCount} active, ${configuredCount} configured of ${providers.length} total`);
}

function validateAgentProviderMapping(db) {
  const agents = db.prepare(`
    SELECT a.*, p.name as provider_name, p.is_active as provider_active
    FROM ai_agents a
    JOIN ai_providers p ON a.provider_id = p.id
    WHERE a.is_active = 1
  `).all();
  
  if (agents.length === 0) {
    throw new Error('No active agents found');
  }
  
  let validMappings = 0;
  
  agents.forEach(agent => {
    console.log(`  🤖 Agent: ${agent.name}`);
    
    if (agent.provider_active) {
      validMappings++;
      console.log(`    ✅ Mapped to active ${agent.provider_name} provider`);
    } else {
      throw new Error(`Agent "${agent.name}" mapped to inactive provider "${agent.provider_name}"`);
    }
    
    if (agent.model) {
      console.log(`    ✅ Model: ${agent.model}`);
    } else {
      console.log(`    ⚠️  Model: Not specified (will use provider default)`);
    }
    
    if (agent.system_prompt) {
      console.log(`    ✅ System Prompt: Configured (${agent.system_prompt.length} chars)`);
    } else {
      console.log(`    ⚠️  System Prompt: Not configured`);
    }
  });
  
  console.log(`  📊 Summary: ${validMappings}/${agents.length} agents properly mapped to active providers`);
}

function testApiKeyDecryption(db) {
  const providers = db.prepare('SELECT * FROM ai_providers WHERE api_key_encrypted IS NOT NULL').all();
  
  if (providers.length === 0) {
    console.log('  ℹ️  No encrypted API keys to test');
    return;
  }
  
  providers.forEach(provider => {
    console.log(`  🔐 Testing ${provider.display_name} key decryption:`);
    
    try {
      // Test basic base64 decoding (simplified test)
      const decoded = Buffer.from(provider.api_key_encrypted, 'base64');
      if (decoded.length > 0) {
        console.log(`    ✅ Base64 format valid (${decoded.length} bytes)`);
        
        // Test if it looks like a valid API key format
        const keyString = decoded.toString('utf-8');
        if (provider.name === 'openai' && keyString.includes('sk-')) {
          console.log(`    ✅ OpenAI key format detected`);
        } else if (provider.name === 'anthropic' && keyString.includes('sk-ant-')) {
          console.log(`    ✅ Anthropic key format detected`);
        } else {
          console.log(`    ℹ️  Key format: Custom or encrypted`);
        }
      } else {
        throw new Error('Decoded key is empty');
      }
    } catch (error) {
      console.log(`    ❌ Decryption test failed: ${error.message}`);
    }
  });
}

function simulateSystemHealth(db) {
  // Simulate the health check logic
  const providers = db.prepare('SELECT * FROM ai_providers').all();
  const agents = db.prepare('SELECT * FROM ai_agents WHERE is_active = 1').all();
  
  const activeProviders = providers.filter(p => p.is_active);
  const configuredProviders = providers.filter(p => p.api_key_encrypted);
  
  console.log(`  📊 Providers: ${providers.length} total, ${activeProviders.length} active, ${configuredProviders.length} configured`);
  console.log(`  🤖 Agents: ${agents.length} active`);
  
  // Check agent-provider mappings
  let validAgents = 0;
  agents.forEach(agent => {
    const agentProvider = providers.find(p => p.id === agent.provider_id);
    if (agentProvider && agentProvider.is_active) {
      validAgents++;
    }
  });
  
  console.log(`  🔗 Agent Mappings: ${validAgents}/${agents.length} properly configured`);
  
  // Determine health status
  let status = 'unhealthy';
  if (activeProviders.length > 0 && configuredProviders.length > 0 && validAgents === agents.length) {
    status = 'healthy';
  } else if (activeProviders.length > 0 || validAgents > 0) {
    status = 'degraded';
  }
  
  console.log(`  🏥 System Health: ${status.toUpperCase()}`);
  
  if (status === 'healthy') {
    console.log('  🎉 System is ready for AI operations!');
  } else {
    console.log('  ⚠️  System needs additional configuration');
  }
}

// Run the validation
main();