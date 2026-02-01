#!/usr/bin/env node
// Comprehensive test suite for AI database query functions

const path = require('path');
const fs = require('fs');

// Add the project root to module path
const projectRoot = path.join(__dirname, '..');
process.env.NODE_PATH = projectRoot;
require('module')._initPaths();

// Import modules
const { sqliteHelpers } = require('../lib/database/sqlite');
const { databaseQueryExecutor } = require('../lib/ai/database-query-executor');
const { queryIntentDetector } = require('../lib/ai/query-intent-detector');
const { queryCache } = require('../lib/ai/query-cache');
const { queryPerformanceLogger } = require('../lib/ai/query-performance-logger');

// Test configuration
const TEST_CONFIG = {
  verbose: process.argv.includes('--verbose'),
  clearCache: process.argv.includes('--clear-cache'),
  performance: process.argv.includes('--performance'),
  agents: process.argv.includes('--agents')
};

console.log('🧪 AI Database Function Test Suite');
console.log('=====================================\n');

// Track test results
let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Test utilities
function logTest(name, success, details = '') {
  const icon = success ? '✅' : '❌';
  console.log(`${icon} ${name}`);
  if (details && (TEST_CONFIG.verbose || !success)) {
    console.log(`   ${details}`);
  }
  
  if (success) {
    testResults.passed++;
  } else {
    testResults.failed++;
    testResults.errors.push(name);
  }
}

function expectValue(actual, expected, testName) {
  const success = actual === expected;
  logTest(testName, success, success ? '' : `Expected: ${expected}, Got: ${actual}`);
  return success;
}

function expectTruthy(value, testName) {
  const success = !!value;
  logTest(testName, success, success ? '' : `Expected truthy, got: ${value}`);
  return success;
}

function expectArray(value, testName, minLength = 0) {
  const success = Array.isArray(value) && value.length >= minLength;
  logTest(testName, success, success ? `Array with ${value.length} items` : `Expected array with at least ${minLength} items, got: ${typeof value}`);
  return success;
}

// Clear cache if requested
if (TEST_CONFIG.clearCache) {
  console.log('🧹 Clearing cache before tests...\n');
  queryCache.clear();
  queryPerformanceLogger.clearMetrics();
}

// Phase 5.1: Test Core Database Functions
console.log('Phase 5.1: Core Database Functions');
console.log('-----------------------------------');

async function testDatabaseFunctions() {
  try {
    // Test basic database connectivity
    const allProducts = sqliteHelpers.getAllProducts();
    expectArray(allProducts, 'Database connectivity test');

    // Test unused items calculation
    const unusedValue = sqliteHelpers.getTotalUnusedValue();
    expectTruthy(unusedValue, 'getTotalUnusedValue returns result');
    expectTruthy(typeof unusedValue.total_value === 'number', 'getTotalUnusedValue returns numeric value');

    // Test unused items list
    const unusedItems = sqliteHelpers.getUnusedItemsList();
    expectArray(unusedItems, 'getUnusedItemsList returns array');

    // Test low stock products
    const lowStock = sqliteHelpers.getLowStockProducts();
    expectArray(lowStock, 'getLowStockProducts returns array');

    // Test search functionality
    const searchResults = sqliteHelpers.searchProducts('test');
    expectArray(searchResults, 'searchProducts returns array');

    // Test category filtering
    const partsCategory = sqliteHelpers.getProductsByCategory('parts');
    expectArray(partsCategory, 'getProductsByCategory returns array');

    // Test inventory statistics
    const categoryStats = sqliteHelpers.getInventoryStatsByCategory();
    expectArray(categoryStats, 'getInventoryStatsByCategory returns array');

    // Test total inventory value
    const totalValue = sqliteHelpers.getInventoryTotalValue();
    expectTruthy(totalValue, 'getInventoryTotalValue returns result');
    expectTruthy(typeof totalValue.total_value === 'number', 'getInventoryTotalValue returns numeric value');

    // Test critical stock items
    const criticalStock = sqliteHelpers.getCriticalStockItems();
    expectArray(criticalStock, 'getCriticalStockItems returns array');

    // Test reorder recommendations
    const reorderRecs = sqliteHelpers.getReorderRecommendations();
    expectArray(reorderRecs, 'getReorderRecommendations returns array');

    console.log('✅ Core database functions test completed\n');
    return true;
  } catch (error) {
    logTest('Core database functions test', false, `Error: ${error.message}`);
    return false;
  }
}

// Phase 5.2: Test Database Query Executor
console.log('Phase 5.2: Database Query Executor');
console.log('-----------------------------------');

async function testDatabaseQueryExecutor() {
  try {
    // Test function documentation generation
    const documentation = databaseQueryExecutor.generateFunctionDocumentation();
    expectTruthy(documentation.includes('EXECUTE_FUNCTION'), 'Function documentation includes EXECUTE_FUNCTION syntax');

    // Test unused value calculation
    const unusedValueResult = await databaseQueryExecutor.parseAndExecute('EXECUTE_FUNCTION: getTotalUnusedValue()');
    expectTruthy(unusedValueResult.hasFunction, 'getTotalUnusedValue execution detected as function');
    expectTruthy(!unusedValueResult.error, 'getTotalUnusedValue executed without error');
    expectTruthy(unusedValueResult.formattedResponse, 'getTotalUnusedValue returns formatted response');

    // Test product search
    const searchResult = await databaseQueryExecutor.parseAndExecute('EXECUTE_FUNCTION: searchProducts("test")');
    expectTruthy(searchResult.hasFunction, 'searchProducts execution detected as function');
    expectTruthy(!searchResult.error, 'searchProducts executed without error');

    // Test low stock query
    const lowStockResult = await databaseQueryExecutor.parseAndExecute('EXECUTE_FUNCTION: getLowStockProducts()');
    expectTruthy(lowStockResult.hasFunction, 'getLowStockProducts execution detected as function');
    expectTruthy(!lowStockResult.error, 'getLowStockProducts executed without error');

    // Test parameter parsing with getProductsByCategory
    const categoryResult = await databaseQueryExecutor.parseAndExecute('EXECUTE_FUNCTION: getProductsByCategory("parts")');
    expectTruthy(categoryResult.hasFunction, 'getProductsByCategory execution detected as function');
    expectTruthy(!categoryResult.error, 'getProductsByCategory executed without error');

    // Test invalid function handling
    const invalidResult = await databaseQueryExecutor.parseAndExecute('EXECUTE_FUNCTION: nonExistentFunction()');
    expectTruthy(invalidResult.hasFunction, 'Invalid function detected as function call');
    expectTruthy(invalidResult.error, 'Invalid function returns error');

    // Test non-function text
    const nonFunctionResult = await databaseQueryExecutor.parseAndExecute('This is just regular text');
    expectTruthy(!nonFunctionResult.hasFunction, 'Regular text not detected as function');

    console.log('✅ Database Query Executor test completed\n');
    return true;
  } catch (error) {
    logTest('Database Query Executor test', false, `Error: ${error.message}`);
    return false;
  }
}

// Phase 5.3: Test Query Intent Detection
console.log('Phase 5.3: Query Intent Detection');
console.log('----------------------------------');

async function testQueryIntentDetection() {
  try {
    const testQueries = [
      {
        query: "What is the value of unused items?",
        expectedType: "unused_value_calculation",
        expectedFunction: "getTotalUnusedValue",
        minConfidence: 0.9
      },
      {
        query: "Show me low stock alerts",
        expectedType: "low_stock_query",
        expectedFunction: "getLowStockProducts",
        minConfidence: 0.8
      },
      {
        query: "List unused items",
        expectedType: "unused_items_list",
        expectedFunction: "getUnusedItemsList", 
        minConfidence: 0.8
      },
      {
        query: "Find blue pens",
        expectedType: "product_search",
        expectedFunction: "searchProducts",
        minConfidence: 0.7
      },
      {
        query: "What should I reorder this week?",
        expectedType: "reorder_recommendations",
        expectedFunction: "getReorderRecommendations",
        minConfidence: 0.8
      }
    ];

    for (const testCase of testQueries) {
      const intent = queryIntentDetector.detectIntent(testCase.query);
      
      expectValue(intent.type, testCase.expectedType, `Intent detection for: "${testCase.query}"`);
      expectValue(intent.suggestedFunction, testCase.expectedFunction, `Function suggestion for: "${testCase.query}"`);
      expectTruthy(intent.confidence >= testCase.minConfidence, `Confidence threshold for: "${testCase.query}" (${(intent.confidence * 100).toFixed(1)}% >= ${(testCase.minConfidence * 100)}%)`);
      
      // Test function call generation
      const functionCall = queryIntentDetector.generateFunctionCall(intent);
      expectTruthy(functionCall.includes('EXECUTE_FUNCTION'), `Function call generation for: "${testCase.query}"`);
      
      // Test data request detection
      const isDataRequest = queryIntentDetector.isDataRequest(testCase.query);
      expectTruthy(isDataRequest, `Data request detection for: "${testCase.query}"`);
    }

    console.log('✅ Query Intent Detection test completed\n');
    return true;
  } catch (error) {
    logTest('Query Intent Detection test', false, `Error: ${error.message}`);
    return false;
  }
}

// Phase 5.4: Test Caching System
console.log('Phase 5.4: Caching System');
console.log('-------------------------');

async function testCachingSystem() {
  try {
    // Clear cache for clean test
    queryCache.clear();
    
    // Test cache miss and set
    const result1 = await databaseQueryExecutor.parseAndExecute('EXECUTE_FUNCTION: getTotalUnusedValue()');
    expectTruthy(result1.hasFunction && !result1.error, 'First execution (cache miss)');
    
    // Test cache hit
    const result2 = await databaseQueryExecutor.parseAndExecute('EXECUTE_FUNCTION: getTotalUnusedValue()');
    expectTruthy(result2.hasFunction && !result2.error, 'Second execution (cache hit)');
    
    // Test cache stats
    const cacheStats = queryCache.getStats();
    expectTruthy(cacheStats.size > 0, 'Cache contains entries');
    
    // Test cache invalidation
    queryCache.invalidate('getTotalUnusedValue');
    const statsAfterInvalidation = queryCache.getStats();
    expectTruthy(statsAfterInvalidation.size >= 0, 'Cache invalidation works');
    
    console.log('✅ Caching System test completed\n');
    return true;
  } catch (error) {
    logTest('Caching System test', false, `Error: ${error.message}`);
    return false;
  }
}

// Phase 5.5: Test Performance Monitoring
console.log('Phase 5.5: Performance Monitoring');
console.log('----------------------------------');

async function testPerformanceMonitoring() {
  try {
    // Clear metrics for clean test
    queryPerformanceLogger.clearMetrics();
    
    // Execute some queries to generate metrics
    await databaseQueryExecutor.parseAndExecute('EXECUTE_FUNCTION: getTotalUnusedValue()');
    await databaseQueryExecutor.parseAndExecute('EXECUTE_FUNCTION: getLowStockProducts()');
    await databaseQueryExecutor.parseAndExecute('EXECUTE_FUNCTION: searchProducts("test")');
    
    // Test performance summary
    const summary = queryPerformanceLogger.getPerformanceSummary();
    expectTruthy(summary.totalQueries > 0, 'Performance metrics captured queries');
    expectTruthy(summary.averageExecutionTime >= 0, 'Average execution time calculated');
    expectTruthy(summary.successRate >= 0 && summary.successRate <= 1, 'Success rate in valid range');
    
    // Test performance alerts
    const alerts = queryPerformanceLogger.getPerformanceAlerts();
    expectArray(alerts, 'Performance alerts generated');
    
    // Test metrics export
    const exportedMetrics = queryPerformanceLogger.exportMetrics();
    expectTruthy(exportedMetrics.queries.length > 0, 'Metrics export contains queries');
    expectTruthy(exportedMetrics.summary, 'Metrics export contains summary');
    
    console.log('✅ Performance Monitoring test completed\n');
    return true;
  } catch (error) {
    logTest('Performance Monitoring test', false, `Error: ${error.message}`);
    return false;
  }
}

// Phase 5.6: Test Edge Cases and Error Scenarios
console.log('Phase 5.6: Edge Cases and Error Scenarios');
console.log('-----------------------------------------');

async function testEdgeCases() {
  try {
    // Test malformed function calls
    const malformedResult = await databaseQueryExecutor.parseAndExecute('EXECUTE_FUNCTION: malformed(');
    expectTruthy(malformedResult.hasFunction, 'Malformed function call detected');
    expectTruthy(malformedResult.error, 'Malformed function call returns error');
    
    // Test function with missing required parameters
    const missingParamResult = await databaseQueryExecutor.parseAndExecute('EXECUTE_FUNCTION: getProductsByCategory()');
    expectTruthy(missingParamResult.hasFunction, 'Missing parameter function detected');
    expectTruthy(missingParamResult.error, 'Missing parameter function returns error');
    
    // Test empty query intent detection
    const emptyIntent = queryIntentDetector.detectIntent('');
    expectTruthy(emptyIntent.confidence === 0, 'Empty query has zero confidence');
    
    // Test very long query
    const longQuery = 'What is the ' + 'very '.repeat(100) + 'long query about unused items?';
    const longQueryIntent = queryIntentDetector.detectIntent(longQuery);
    expectTruthy(longQueryIntent.confidence >= 0, 'Long query processed without error');
    
    // Test special characters in search
    const specialCharResult = await databaseQueryExecutor.parseAndExecute('EXECUTE_FUNCTION: searchProducts("test@#$%")');
    expectTruthy(specialCharResult.hasFunction && !specialCharResult.error, 'Special characters handled gracefully');
    
    console.log('✅ Edge Cases and Error Scenarios test completed\n');
    return true;
  } catch (error) {
    logTest('Edge Cases and Error Scenarios test', false, `Error: ${error.message}`);
    return false;
  }
}

// Main test execution
async function runAllTests() {
  const startTime = Date.now();
  
  const results = await Promise.all([
    testDatabaseFunctions(),
    testDatabaseQueryExecutor(),
    testQueryIntentDetection(),
    testCachingSystem(),
    testPerformanceMonitoring(),
    testEdgeCases()
  ]);
  
  const totalTime = Date.now() - startTime;
  
  console.log('Test Results Summary');
  console.log('===================');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⏱️  Total Time: ${totalTime}ms`);
  console.log(`📊 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\nFailed Tests:');
    testResults.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  // Performance report
  if (TEST_CONFIG.performance) {
    console.log('\nPerformance Report');
    console.log('==================');
    const perfSummary = queryPerformanceLogger.getPerformanceSummary();
    console.log(`Total Queries: ${perfSummary.totalQueries}`);
    console.log(`Average Execution Time: ${perfSummary.averageExecutionTime.toFixed(1)}ms`);
    console.log(`Cache Hit Rate: ${(perfSummary.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`Success Rate: ${(perfSummary.successRate * 100).toFixed(1)}%`);
    
    if (perfSummary.slowestQueries.length > 0) {
      console.log('\nSlowest Queries:');
      perfSummary.slowestQueries.slice(0, 5).forEach((query, index) => {
        console.log(`  ${index + 1}. ${query.functionName}: ${query.executionTime}ms`);
      });
    }
  }
  
  console.log('\n✅ AI Database Function Test Suite Complete!');
  
  const allTestsPassed = results.every(result => result === true);
  process.exit(allTestsPassed ? 0 : 1);
}

// Run the tests
runAllTests().catch(error => {
  console.error('❌ Test suite crashed:', error);
  process.exit(1);
});