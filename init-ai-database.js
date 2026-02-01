// Database initialization script for AI features
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

console.log('🔧 Initializing AI database schema...');

try {
  // Open database
  const dbPath = path.join(__dirname, 'data', 'inventory.db');
  const db = new Database(dbPath);

  // Read and execute AI schema
  const schemaPath = path.join(__dirname, 'db', 'ai_schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  // Split into individual statements and execute
  const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
  
  for (const statement of statements) {
    try {
      db.exec(statement + ';');
    } catch (error) {
      if (!error.message.includes('already exists')) {
        console.error('Error executing statement:', statement.substring(0, 100) + '...');
        console.error('Error:', error.message);
      }
    }
  }

  // Verify tables were created
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name LIKE 'ai_%'
  `).all();

  console.log('✅ AI tables created:', tables.map(t => t.name));

  // Check for agents
  const agents = db.prepare(`
    SELECT name, role FROM ai_agents WHERE is_active = 1
  `).all();

  console.log('✅ AI agents available:', agents.map(a => `${a.name} (${a.role})`));

  // Check for providers
  const providers = db.prepare(`
    SELECT name, display_name, is_active FROM ai_providers
  `).all();

  console.log('✅ AI providers:', providers.map(p => `${p.display_name} (active: ${p.is_active})`));

  db.close();
  console.log('🎉 AI database initialization complete!');

} catch (error) {
  console.error('❌ AI database initialization failed:', error.message);
  process.exit(1);
}