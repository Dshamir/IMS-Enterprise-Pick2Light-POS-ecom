// Test script to verify query intent detection is working correctly
const { queryIntentDetector } = require('../lib/ai/query-intent-detector.js');

const testQueries = [
  "What is the value of unused items?",
  "Show me low stock alerts", 
  "List unused items",
  "Find blue pens",
  "What should I reorder this week?",
  "Show me total inventory value",
  "Which items need immediate attention?",
  "Search for printer paper",
  "Show me parts category",
  "Items worth over $100",
  "Recent inventory changes",
  "Products from manufacturer ABC",
  "What's in storage room A?",
  "Barcode 123456789",
  "Critical stock items"
];

console.log('🧪 Testing Query Intent Detection System\n');

testQueries.forEach((query, index) => {
  console.log(`${index + 1}. Query: "${query}"`);
  
  try {
    const intent = queryIntentDetector.detectIntent(query);
    console.log(`   Intent: ${intent.type}`);
    console.log(`   Function: ${intent.suggestedFunction}`);
    console.log(`   Agent: ${intent.suggestedAgent}`);
    console.log(`   Confidence: ${(intent.confidence * 100).toFixed(1)}%`);
    
    if (intent.parameters && Object.keys(intent.parameters).length > 0) {
      console.log(`   Parameters: ${JSON.stringify(intent.parameters)}`);
    }
    
    const functionCall = queryIntentDetector.generateFunctionCall(intent);
    console.log(`   Generated Call: ${functionCall}`);
    
    const isDataRequest = queryIntentDetector.isDataRequest(query);
    console.log(`   Data Request: ${isDataRequest ? '✅ Yes' : '❌ No'}`);
    
    if (intent.confidence < 0.7) {
      const suggestions = queryIntentDetector.suggestAlternatives(query, intent);
      if (suggestions.length > 0) {
        console.log(`   Suggestions: ${suggestions.join(', ')}`);
      }
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  console.log('');
});

console.log(`🎯 Available Intent Types: ${queryIntentDetector.getAvailableIntents().join(', ')}`);
console.log('\n✅ Query Intent Detection Test Complete!');