// Test imports to debug the issue
console.log('Testing imports...')

try {
  console.log('1. Importing query engine...')
  const { reportQueryEngine } = require('./query-engine')
  console.log('2. Query engine imported:', typeof reportQueryEngine)
  
  console.log('3. Importing config manager...')
  const { reportConfigManager } = require('./report-config')
  console.log('4. Config manager imported:', typeof reportConfigManager)
  
  console.log('5. Importing performance monitor...')
  const { performanceMonitor } = require('./performance-monitoring')
  console.log('6. Performance monitor imported:', typeof performanceMonitor)
  
  console.log('7. Importing data validation...')
  const { dataValidationEngine } = require('./data-validation')
  console.log('8. Data validation imported:', typeof dataValidationEngine)
  
  console.log('9. Testing query engine methods...')
  const tables = reportQueryEngine.getAvailableTables()
  console.log('10. Available tables:', tables.length)
  
  console.log('11. Testing config manager methods...')
  const templates = reportConfigManager.getTemplates()
  console.log('12. Available templates:', templates.length)
  
  console.log('✅ All imports successful!')
} catch (error) {
  console.error('❌ Import error:', error)
}