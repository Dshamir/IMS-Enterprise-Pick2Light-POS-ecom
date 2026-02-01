const Database = require('better-sqlite3');
const { join } = require('path');

const dbPath = join(process.cwd(), 'data', 'inventory.db');
const db = new Database(dbPath);

console.log('🧹 Cleaning up Image Processing Specialist duplicates...');

// Get all Image Processing Specialist agents
const duplicates = db.prepare('SELECT id, name, role, provider_id FROM ai_agents WHERE name = ? ORDER BY created_at ASC').all('Image Processing Specialist');

console.log(`Found ${duplicates.length} Image Processing Specialist agents:`);
duplicates.forEach((agent, index) => {
  console.log(`  ${index + 1}. ID: ${agent.id}, Role: ${agent.role}, Provider: ${agent.provider_id || 'None'}`);
});

if (duplicates.length > 1) {
  // Keep the first one with a provider, delete the rest
  const keepAgent = duplicates.find(a => a.provider_id) || duplicates[0];
  const deleteAgents = duplicates.filter(a => a.id !== keepAgent.id);
  
  console.log(`Keeping agent: ${keepAgent.id}`);
  
  deleteAgents.forEach(agent => {
    db.prepare('DELETE FROM ai_agents WHERE id = ?').run(agent.id);
    console.log(`❌ Deleted duplicate: ${agent.id}`);
  });
  
  // Update the remaining agent with enhanced prompt
  const enhancedImagePrompt = `You are the Image Processing Specialist AI for Nexless Inventory Management System.

CORE RESPONSIBILITIES:
- Analyze product images for text extraction and barcode reading
- Process uploaded images for inventory cataloging
- Identify products from visual characteristics
- Extract manufacturer details and product specifications from images
- Support visual search and product matching

CRITICAL INSTRUCTIONS FOR DATABASE QUERIES:
- ALWAYS execute search functions when processing images reveals product information
- When image analysis identifies products: EXECUTE database functions to find matches
- Use extracted text for product searches in inventory
- Provide product context from database when images are processed

SPECIALIZED FUNCTIONS YOU MUST USE:
- Product search: EXECUTE_FUNCTION: searchProducts("extracted_text")
- Barcode lookup: EXECUTE_FUNCTION: getProductByBarcode("detected_barcode")
- Manufacturer search: EXECUTE_FUNCTION: getInventoryByManufacturer("detected_manufacturer")
- Category filter: EXECUTE_FUNCTION: getProductsByCategory("identified_category")

RESPONSE STYLE:
- Combine image analysis results with database lookups
- Provide product matches when possible
- Include stock levels for identified products
- Suggest product cataloging when no matches found

EXAMPLES:
After analyzing image with text "Blue Ballpoint Pen":
Response: EXECUTE_FUNCTION: searchProducts("Blue Ballpoint Pen")

After detecting barcode "123456789":
Response: EXECUTE_FUNCTION: getProductByBarcode("123456789")`;

  const capabilities = JSON.stringify([
    'image_analysis',
    'text_extraction', 
    'barcode_reading',
    'product_identification',
    'visual_cataloging',
    'database_query_execution'
  ]);

  db.prepare(`
    UPDATE ai_agents 
    SET 
      role = ?,
      description = ?,
      system_prompt = ?,
      capabilities = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    'Image Analysis & OCR',
    'Processes product images with OCR and integrates with inventory database for product identification',
    enhancedImagePrompt,
    capabilities,
    keepAgent.id
  );
  
  console.log('✅ Updated Image Processing Specialist with enhanced prompt');
}

console.log('\n📊 Final agent list:');
const finalAgents = db.prepare('SELECT name, role, is_active, provider_id FROM ai_agents WHERE is_active = 1 ORDER BY name').all();
finalAgents.forEach(agent => {
  console.log(`  ✅ ${agent.name} (${agent.role}) - Provider: ${agent.provider_id || 'None'}`);
});

console.log(`\n🎉 Total active agents: ${finalAgents.length}`);

db.close();