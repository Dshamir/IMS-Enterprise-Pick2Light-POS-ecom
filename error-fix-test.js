// Test script to verify all TypeError fixes
const baseUrl = 'http://localhost:3002'

async function testErrorFixes() {
  console.log('🔧 Testing Error Fixes...\n')
  
  try {
    // Test 1: Analytics API data structure
    console.log('1. Testing Analytics API structure...')
    const analyticsResponse = await fetch(`${baseUrl}/api/ai/analytics?period=7d`)
    const analyticsData = await analyticsResponse.json()
    const usage = analyticsData.analytics?.usage_statistics
    
    if (usage && typeof usage.total_requests === 'number') {
      console.log('   ✅ Analytics data structure correct')
    } else {
      console.log('   ❌ Analytics data structure issue')
    }
    
    // Test 2: System Status API
    console.log('2. Testing System Status API...')
    const statusResponse = await fetch(`${baseUrl}/api/ai/system-status`)
    const statusData = await statusResponse.json()
    
    if (statusData.success && statusData.checks) {
      console.log('   ✅ System status structure correct')
    } else {
      console.log('   ❌ System status structure issue')
    }
    
    // Test 3: Agent Update API
    console.log('3. Testing Agent Update API...')
    const agentsResponse = await fetch(`${baseUrl}/api/ai/agents`)
    const agentsData = await agentsResponse.json()
    const firstAgent = agentsData.agents?.[0]
    
    if (firstAgent) {
      const updateResponse = await fetch(`${baseUrl}/api/ai/agents/${firstAgent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: firstAgent.is_active })
      })
      const updateData = await updateResponse.json()
      
      if (updateData.success) {
        console.log('   ✅ Agent update API working')
      } else {
        console.log('   ❌ Agent update API failed:', updateData.error)
      }
    } else {
      console.log('   ⚠️  No agents found to test')
    }
    
    // Test 4: Page Loading
    console.log('4. Testing AI Assistant page loading...')
    const pageResponse = await fetch(`${baseUrl}/ai-assistant`)
    
    if (pageResponse.ok) {
      console.log('   ✅ AI Assistant page loads without errors')
    } else {
      console.log('   ❌ AI Assistant page loading failed')
    }
    
    console.log('\n🎉 Error fix testing complete!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testErrorFixes()