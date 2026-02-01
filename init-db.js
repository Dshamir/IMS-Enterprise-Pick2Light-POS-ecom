const { sqliteHelpers } = require('./lib/database/sqlite');

console.log('Initializing database...');

try {
  // This will create the database and initialize all tables
  const db = sqliteHelpers.getDatabase();
  console.log('Database initialized successfully!');

  // Check if we have any products
  const products = sqliteHelpers.getAllProducts();
  console.log(`Found ${products.length} products in database`);

  // Check if we have categories
  const categories = sqliteHelpers.getAllCategories();
  console.log(`Found ${categories.length} categories in database`);

} catch (error) {
  console.error('Error initializing database:', error);
  process.exit(1);
}