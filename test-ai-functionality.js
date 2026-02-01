#!/usr/bin/env node

/**
 * AI Functionality Integration Test
 * Tests the actual AI chat functionality to ensure agents respond properly
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000'; // Adjust if needed

console.log('🧠 AI Functionality Integration Test');
console.log('====================================');

async function main() {
  try {
    // Test 1: System Health Check
    console.log('\n🏥 Test 1: System Health Check');
    await testSystemHealth();
    
    // Test 2: Provider Connection Test
    console.log('\n🔗 Test 2: Provider Connection Test');
    await testProviderConnections();
    
    // Test 3: AI Chat Functionality
    console.log('\n💬 Test 3: AI Chat Functionality');
    await testAIChatFunctionality();
    
    console.log('\n✅ All functionality tests completed successfully!');
    console.log('🎉 AI system is fully operational and ready for production use');
    
  } catch (error) {
    console.error('\n❌ Functionality test failed:', error.message);
    if (error.response?.data) {
      console.error('📝 Response data:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('💡 Check system configuration and try again');
    process.exit(1);
  }
}

async function testSystemHealth() {
  try {
    const response = await axios.get(`${BASE_URL}/api/ai/health`);
    
    console.log(`  📊 Status Code: ${response.status}`);
    console.log(`  🏥 Health Status: ${response.data.health_status || response.data.status}`);
    console.log(`  🔌 Providers Working: ${response.data.providers.working}/${response.data.providers.total}`);
    console.log(`  🤖 Agents Configured: ${response.data.agents.properly_configured || response.data.agents.active}/${response.data.agents.total}`);
    
    if (response.data.issues && response.data.issues.length > 0) {
      console.log('  ⚠️  Issues:', response.data.issues);
    }
    
    if (response.data.recommendations && response.data.recommendations.length > 0) {
      console.log('  💡 Recommendations:', response.data.recommendations);
    }
    
    if (response.status >= 400) {
      throw new Error(`Health check failed with status ${response.status}`);
    }
    
    console.log('  ✅ System health check passed');
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to application server. Please ensure the app is running on localhost:3000');
    }
    throw error;
  }
}

async function testProviderConnections() {
  try {
    // Get list of providers
    const providersResponse = await axios.get(`${BASE_URL}/api/ai/providers`);
    const providers = providersResponse.data.providers;
    
    console.log(`  📋 Found ${providers.length} providers`);
    
    let testedCount = 0;
    let workingCount = 0;
    
    for (const provider of providers) {
      if (provider.is_active && provider.has_api_key) {
        console.log(`  🔍 Testing ${provider.display_name}...`);
        testedCount++;
        
        try {
          const testResponse = await axios.post(`${BASE_URL}/api/ai/providers/${provider.id}/test`);
          
          if (testResponse.data.success) {
            console.log(`    ✅ Connection successful`);
            if (testResponse.data.details?.models_available) {
              console.log(`    📚 Models available: ${testResponse.data.details.models_available}`);
            }
            workingCount++;
          } else {
            console.log(`    ❌ Connection failed: ${testResponse.data.error}`);
          }
        } catch (testError) {
          console.log(`    ❌ Test failed: ${testError.response?.data?.error || testError.message}`);
        }
      } else {
        console.log(`  ⏸️  Skipping ${provider.display_name} (inactive or no API key)`);
      }
    }
    
    console.log(`  📊 Provider Test Results: ${workingCount}/${testedCount} working`);
    
    if (workingCount === 0) {
      throw new Error('No working providers found - AI functionality will not work');
    }
    
    console.log('  ✅ Provider connection tests passed');
    
  } catch (error) {
    throw error;
  }
}

async function testAIChatFunctionality() {
  // Test messages to validate different AI capabilities
  const testMessages = [
    {
      message: "What is the total value of unused items?",
      expectedType: "database_query",
      description: "Database function execution test"
    },
    {
      message: "Hello! Can you help me with inventory management?",
      expectedType: "ai_response", 
      description: "General AI response test"
    },
    {
      message: "Show me low stock items",
      expectedType: "database_query",
      description: "Low stock query test"
    }
  ];
  
  for (let i = 0; i < testMessages.length; i++) {
    const test = testMessages[i];
    console.log(`  💬 Test ${i + 1}: ${test.description}`);
    console.log(`    📝 Message: "${test.message}"`);
    
    try {
      const chatResponse = await axios.post(`${BASE_URL}/api/ai/chat`, {
        message: test.message,
        session_id: `test_session_${Date.now()}`
      });
      
      if (chatResponse.data.success) {
        console.log(`    ✅ Response received (${chatResponse.data.response?.length || 0} chars)`);
        console.log(`    ⚡ Execution method: ${chatResponse.data.execution_method || 'unknown'}`);
        console.log(`    ⏱️  Response time: ${chatResponse.data.response_time_ms || 0}ms`);
        
        if (chatResponse.data.usage) {
          console.log(`    🎯 Usage: ${JSON.stringify(chatResponse.data.usage)}`);
        }
        
        // Show a preview of the response
        const preview = chatResponse.data.response?.substring(0, 100) || '';
        console.log(`    📖 Preview: "${preview}${preview.length >= 100 ? '...' : ''}"`);
        
      } else {
        console.log(`    ❌ Chat failed: ${chatResponse.data.error}`);
        throw new Error(`Chat test ${i + 1} failed: ${chatResponse.data.error}`);
      }
      
    } catch (chatError) {
      console.log(`    ❌ Request failed: ${chatError.response?.data?.error || chatError.message}`);
      throw new Error(`Chat functionality test ${i + 1} failed`);
    }
    
    // Brief pause between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('  ✅ AI chat functionality tests passed');
}

// Check if axios is available, if not provide installation instructions
try {
  require('axios');
} catch (error) {
  console.error('❌ axios package not found. Please install it:');
  console.error('npm install axios');
  process.exit(1);
}

// Run the functionality tests
main();