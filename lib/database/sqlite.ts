import Database from 'better-sqlite3'
import { join } from 'path'
import * as path from 'path'
import * as fs from 'fs'
import { randomBytes } from 'crypto'
import type { Database as DatabaseTypes } from '@/lib/database.types'

let db: Database.Database | null = null

/**
 * Generate a unique ID matching SQLite's hex(randomblob(16)) format
 * Returns a 32-character hex string (lowercase)
 */
export function generateId(): string {
  return randomBytes(16).toString('hex')
}

export function getDatabase() {
  if (!db) {
    const dbPath = join(process.cwd(), 'data', 'inventory.db')
    db = new Database(dbPath)
    initializeTables()
  }
  return db
}

function initializeTables() {
  if (!db) return

  // Enable foreign keys
  db.pragma('foreign_keys = ON')

  // Create core tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      email TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      stock_quantity INTEGER DEFAULT 0,
      min_stock_level INTEGER DEFAULT 0,
      max_stock_level INTEGER DEFAULT 100,
      reorder_quantity INTEGER DEFAULT 10,
      unit_id TEXT REFERENCES units(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      image_url TEXT,
      category TEXT NOT NULL,
      feature_vector TEXT, -- JSON string for vector storage
      barcode TEXT
    );

    CREATE TABLE IF NOT EXISTS product_images (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      product_id TEXT NOT NULL,
      image_url TEXT NOT NULL,
      is_primary INTEGER DEFAULT 0,
      display_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      product_id TEXT NOT NULL,
      transaction_type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      previous_quantity INTEGER NOT NULL,
      new_quantity INTEGER NOT NULL,
      reason TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      total_amount REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS search_feedback (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      product_id TEXT NOT NULL,
      search_image_hash TEXT,
      feedback_type TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      symbol TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity);
    CREATE INDEX IF NOT EXISTS idx_products_unit_id ON products(unit_id);
    CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product_id ON inventory_transactions(product_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON inventory_transactions(created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
  `)

  // Add some sample data if the database is empty
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number }
  if (productCount.count === 0) {
    insertSampleData()
  }

  // Initialize default categories if the table is empty
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number }
  if (categoryCount.count === 0) {
    insertDefaultCategories()
  }

  // Initialize default units if the table is empty
  const unitCount = db.prepare('SELECT COUNT(*) as count FROM units').get() as { count: number }
  if (unitCount.count === 0) {
    insertDefaultUnits()
  }

  // Check and add unit_id column to products table if it doesn't exist
  migrateProductsTableSchema()

  // Initialize AI tables (non-destructive)
  initializeAITables()

  // Initialize BOM tables (non-destructive)
  initializeBOMTables()

  // Apply production line field migration (non-destructive)
  applyProductionLineFieldMigration()

  // Apply inventory deducted column migration (non-destructive)
  applyInventoryDeductedMigration()

  // Apply product instances and manufacturing fields migration (non-destructive)
  applyProductInstancesMigration()

  // Apply products created column migration (non-destructive)
  applyProductsCreatedMigration()

  // Apply orders migration (non-destructive)
  applyOrdersMigration()

  // Apply serial number pool updated_at migration (non-destructive)
  applySerialPoolUpdatedAtMigration()

  // Apply serial number templates migration (non-destructive)
  applySerialNumberTemplatesMigration()

  // Apply serial number registry migration (non-destructive)
  applySerialNumberRegistryMigration()

  // Apply template placeholder fields migration (non-destructive)
  applyTemplatePlaceholderFieldsMigration()

  // Apply manufacturing image support migration
  applyManufacturingImageSupportMigration()

  // Apply LED system migration
  applyLEDSystemMigration()

  // Apply navigation menu migration
  applyNavigationMenuMigration()

  // Apply navigation themes migration
  applyNavigationThemesMigration()

  // Apply custom themes migration
  applyCustomThemesMigration()

  // Apply warehouse hierarchy and device defaults migration (025)
  applyWarehouseHierarchyMigration()

  // Apply WLED connectivity fields migration
  applyWLEDConnectivityFieldsMigration()

  // Apply LED animation parameters migration
  applyLEDAnimationParametersMigration()

  // Apply locate override color migration (026)
  applyLocateOverrideColorMigration()

  // Apply AI Command Center migration
  applyCommandCenterMigration()

  // Apply AI Usage Logs schema migration (026)
  applyAIUsageLogsSchemaMigration()

  // Migrate existing products to default unit
  migrateProductsToDefaultUnit()

  console.log('✅ Database initialization complete')
}

function initializeAITables() {
  if (!db) return

  try {
    // Check if AI tables already exist to avoid re-running schema
    const tablesExist = db.prepare(`
      SELECT COUNT(*) as count 
      FROM sqlite_master 
      WHERE type='table' AND name IN ('ai_providers', 'ai_agents', 'ai_conversations', 'ai_tasks', 'ai_usage_logs')
    `).get() as { count: number }

    if (tablesExist.count >= 5) {
      console.log('✅ AI tables already exist, checking for updates...')
      // Check if new columns exist and add them if needed
      try {
        const checkType = db.prepare(`PRAGMA table_info(ai_agents)`).all()
        const hasTypeColumn = checkType.some((col: any) => col.name === 'type')
        const hasOrchestratorColumn = checkType.some((col: any) => col.name === 'orchestrator_id')
        
        if (!hasTypeColumn) {
          console.log('🔄 Adding type column to ai_agents...')
          db.exec(`ALTER TABLE ai_agents ADD COLUMN type VARCHAR(20) DEFAULT 'individual'`)
          db.exec(`UPDATE ai_agents SET type = 'individual' WHERE type IS NULL`)
        }
        
        if (!hasOrchestratorColumn) {
          console.log('🔄 Adding orchestrator_id column to ai_agents...')
          db.exec(`ALTER TABLE ai_agents ADD COLUMN orchestrator_id TEXT REFERENCES ai_agents(id)`)
        }
        
        // Create indexes if they don't exist
        db.exec(`CREATE INDEX IF NOT EXISTS idx_ai_agents_orchestrator ON ai_agents(orchestrator_id)`)
        db.exec(`CREATE INDEX IF NOT EXISTS idx_ai_agents_type ON ai_agents(type)`)
      } catch (error) {
        console.log('⚠️ Could not update AI agent schema:', error)
      }
      return
    }

    // Read and execute AI schema
    const fs = require('fs')
    const path = require('path')
    const aiSchemaPath = path.join(process.cwd(), 'db', 'ai_schema.sql')
    
    if (fs.existsSync(aiSchemaPath)) {
      const aiSchema = fs.readFileSync(aiSchemaPath, 'utf8')
      db.exec(aiSchema)
      console.log('✅ AI schema initialized successfully')
    } else {
      console.log('⚠️ AI schema file not found, skipping AI table initialization')
    }
  } catch (error) {
    console.error('❌ Error initializing AI tables:', error)
    // Don't throw - AI features are optional and shouldn't break core system
  }
}

function initializeBOMTables() {
  if (!db) return

  try {
    // Check if manufacturing BOM tables exist
    const manufacturingBOMTablesExist = db.prepare(`
      SELECT COUNT(*) as count 
      FROM sqlite_master 
      WHERE type='table' AND name IN ('projects', 'production_lines', 'manufacturing_boms', 'manufacturing_bom_items', 'production_runs')
    `).get() as { count: number }

    if (manufacturingBOMTablesExist.count < 5) {
      // Read and execute manufacturing BOM migration
      const fs = require('fs')
      const path = require('path')
      const manufacturingBOMSchemaPath = path.join(process.cwd(), 'db', 'migrations', '004_manufacturing_bom_redesign.sql')
      
      if (fs.existsSync(manufacturingBOMSchemaPath)) {
        const manufacturingBOMSchema = fs.readFileSync(manufacturingBOMSchemaPath, 'utf8')
        db.exec(manufacturingBOMSchema)
        console.log('✅ Manufacturing BOM tables initialized successfully')
      } else {
        console.log('⚠️ Manufacturing BOM migration file not found')
      }
    } else {
      console.log('✅ Manufacturing BOM tables already exist')
    }
  } catch (error) {
    console.error('❌ Error initializing manufacturing BOM tables:', error)
  }
}

function insertSampleData() {
  if (!db) return

  // Get default unit (UNITS) for sample products
  const defaultUnit = db.prepare('SELECT id FROM units WHERE name = ?').get('UNITS') as { id: string } | undefined
  const defaultUnitId = defaultUnit?.id || null

  const insertProduct = db.prepare(`
    INSERT INTO products (name, description, price, stock_quantity, min_stock_level, max_stock_level, reorder_quantity, category, barcode, unit_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const sampleProducts = [
    ['Laptop Computer', 'High-performance laptop for office work', 999.99, 15, 5, 50, 10, 'equipment', '123456789012', defaultUnitId],
    ['Printer Paper', 'A4 white printer paper, 500 sheets per pack', 8.99, 100, 20, 200, 50, 'consumables', '234567890123', defaultUnitId],
    ['Blue Pens', 'Ballpoint pens, blue ink, pack of 10', 12.50, 45, 10, 100, 25, 'consumables', '345678901234', defaultUnitId],
    ['Monitor Stand', 'Adjustable monitor stand for ergonomic viewing', 45.00, 8, 3, 25, 5, 'equipment', '456789012345', defaultUnitId],
    ['Coffee Filters', 'Paper coffee filters, box of 100', 6.75, 25, 5, 50, 15, 'consumables', '567890123456', defaultUnitId],
    ['USB Cables', 'USB-C to USB-A cables, 6ft length', 15.99, 30, 8, 60, 20, 'parts', '678901234567', defaultUnitId],
    ['Desk Lamp', 'LED desk lamp with adjustable brightness', 89.99, 2, 3, 15, 5, 'equipment', '789012345678', defaultUnitId],
    ['Sticky Notes', 'Yellow sticky notes, 3x3 inch, pack of 12', 18.50, 75, 15, 150, 30, 'consumables', '890123456789', defaultUnitId]
  ]

  for (const product of sampleProducts) {
    insertProduct.run(...product)
  }

  // Add some sample inventory transactions
  const insertTransaction = db.prepare(`
    INSERT INTO inventory_transactions (product_id, transaction_type, quantity, previous_quantity, new_quantity, reason, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  // Get product IDs for sample transactions
  const productIds = db.prepare('SELECT id FROM products LIMIT 5').all() as { id: string }[]
  
  const sampleTransactions = [
    [productIds[0]?.id, 'reduction', 5, 20, 15, 'Used for office setup', 'Allocated to new employee', new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()],
    [productIds[1]?.id, 'addition', 50, 100, 150, 'Restocking', 'Weekly supply order', new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()],
    [productIds[2]?.id, 'reduction', 10, 45, 35, 'Office use', 'Distributed to teams', new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString()],
    [productIds[3]?.id, 'reduction', 2, 8, 6, 'Setup new workstation', 'IT equipment deployment', new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString()],
    [productIds[4]?.id, 'reduction', 8, 25, 17, 'Kitchen supplies', 'Monthly usage', new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString()]
  ]

  for (const transaction of sampleTransactions) {
    if (transaction[0]) { // Only insert if we have a valid product ID
      insertTransaction.run(...transaction)
    }
  }
}

function insertDefaultCategories() {
  if (!db) return

  const insertCategory = db.prepare(`
    INSERT INTO categories (name)
    VALUES (?)
  `)

  const defaultCategories = [
    'equipment',
    'parts', 
    'consumables',
    'tools',
    'safety',
    'maintenance',
    'other'
  ]

  for (const category of defaultCategories) {
    insertCategory.run(category)
  }
}

function insertDefaultUnits() {
  if (!db) return

  const insertUnit = db.prepare(`
    INSERT INTO units (name, display_name, symbol)
    VALUES (?, ?, ?)
  `)

  const defaultUnits = [
    ['UNITS', 'Units', 'unit'],
    ['FT', 'Feet', 'ft'],
    ['FT2', 'Square Feet', 'ft²'],
    ['GRAMS', 'Grams', 'g'],
    ['INCHES', 'Inches', 'in'],
    ['ML', 'Milliliters', 'ml'],
    ['METERS', 'Meters', 'm'],
    ['LITERS', 'Liters', 'L'],
    ['KILOGRAMS', 'Kilograms', 'kg'],
    ['POUNDS', 'Pounds', 'lb'],
    ['OUNCES', 'Ounces', 'oz'],
    ['PIECES', 'Pieces', 'pcs'],
    ['PAIRS', 'Pairs', 'pr'],
    ['SETS', 'Sets', 'set'],
    ['BOXES', 'Boxes', 'box'],
    ['PACKS', 'Packs', 'pack']
  ]

  for (const unit of defaultUnits) {
    insertUnit.run(...unit)
  }
}

function migrateProductsTableSchema() {
  if (!db) {
    console.log('⚠️ Database not available for schema migration')
    return
  }

  try {
    console.log('🔍 Checking products table schema...')
    
    // Check if the products table already has the unit_id column
    const tableInfo = db.prepare('PRAGMA table_info(products)').all() as Array<{
      cid: number
      name: string
      type: string
      notnull: number
      dflt_value: string | null
      pk: number
    }>
    
    console.log('📋 Current products table columns:', tableInfo.map(col => col.name))
    
    const hasUnitIdColumn = tableInfo.some(column => column.name === 'unit_id')
    
    if (!hasUnitIdColumn) {
      console.log('🔄 Adding unit_id column to products table...')
      
      // Add the unit_id column to the existing products table
      db.exec(`ALTER TABLE products ADD COLUMN unit_id TEXT REFERENCES units(id)`)
      
      // Create the index for the new column
      db.exec(`CREATE INDEX IF NOT EXISTS idx_products_unit_id ON products(unit_id)`)
      
      console.log('✅ Added unit_id column to products table')
      
      // Verify the column was added
      const updatedTableInfo = db.prepare('PRAGMA table_info(products)').all() as Array<{
        cid: number
        name: string
        type: string
        notnull: number
        dflt_value: string | null
        pk: number
      }>
      
      const hasUnitIdColumnAfter = updatedTableInfo.some(column => column.name === 'unit_id')
      console.log('✅ Verification: unit_id column exists after migration:', hasUnitIdColumnAfter)
    } else {
      console.log('✅ unit_id column already exists in products table')
    }
  } catch (error) {
    console.error('❌ Error migrating products table schema:', error)
  }
}

function applyProductionLineFieldMigration() {
  if (!db) return

  try {
    // Check if the new fields have been added to production_lines table
    const tableInfo = db.prepare('PRAGMA table_info(production_lines)').all() as Array<{
      cid: number
      name: string
      type: string
      notnull: number
      dflt_value: string | null
      pk: number
    }>

    const hasHourlyRate = tableInfo.some(column => column.name === 'hourly_rate')
    const hasShiftHours = tableInfo.some(column => column.name === 'shift_hours')
    const hasDepartment = tableInfo.some(column => column.name === 'department')

    if (!hasHourlyRate || !hasShiftHours || !hasDepartment) {
      console.log('🔄 Applying production line field migration...')
      
      // Read and execute the migration
      const fs = require('fs')
      const path = require('path')
      const migrationPath = path.join(process.cwd(), 'db', 'migrations', '005_add_production_line_fields.sql')
      
      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
        db.exec(migrationSQL)
        console.log('✅ Production line field migration applied successfully')
      } else {
        console.log('⚠️ Production line field migration file not found')
      }
    } else {
      console.log('✅ Production line fields already exist')
    }
  } catch (error) {
    console.error('❌ Error applying production line field migration:', error)
  }
}

function applyInventoryDeductedMigration() {
  if (!db) return

  try {
    // Check if the inventory_deducted column exists in production_runs table
    const tableInfo = db.prepare('PRAGMA table_info(production_runs)').all() as Array<{
      cid: number
      name: string
      type: string
      notnull: number
      dflt_value: string | null
      pk: number
    }>

    const hasInventoryDeductedColumn = tableInfo.some(column => column.name === 'inventory_deducted')

    if (!hasInventoryDeductedColumn) {
      console.log('🔄 Applying inventory deducted column migration...')
      
      // Read and execute the migration
      const fs = require('fs')
      const path = require('path')
      const migrationPath = path.join(process.cwd(), 'db', 'migrations', '006_add_inventory_deducted_column.sql')
      
      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
        db.exec(migrationSQL)
        console.log('✅ Inventory deducted column migration applied successfully')
      } else {
        console.log('⚠️ Inventory deducted column migration file not found')
      }
    } else {
      console.log('✅ Inventory deducted column already exists')
    }
  } catch (error) {
    console.error('❌ Error applying inventory deducted column migration:', error)
  }
}

function applyProductInstancesMigration() {
  if (!db) return

  try {
    // Check if the new fields have been added to products table
    const tableInfo = db.prepare('PRAGMA table_info(products)').all() as Array<{
      cid: number
      name: string
      type: string
      notnull: number
      dflt_value: string | null
      pk: number
    }>

    const hasIsManufactured = tableInfo.some(column => column.name === 'is_manufactured')
    const hasBomId = tableInfo.some(column => column.name === 'bom_id')
    const hasDefaultProductionRunId = tableInfo.some(column => column.name === 'default_production_run_id')

    // Check if product_instances table exists
    const productInstancesExists = db.prepare(`
      SELECT COUNT(*) as count 
      FROM sqlite_master 
      WHERE type='table' AND name='product_instances'
    `).get() as { count: number }

    if (!hasIsManufactured || !hasBomId || !hasDefaultProductionRunId || productInstancesExists.count === 0) {
      console.log('🔄 Applying product instances and manufacturing fields migration...')
      
      // Read and execute the migration
      const fs = require('fs')
      const path = require('path')
      const migrationPath = path.join(process.cwd(), 'db', 'migrations', '007_add_product_instances_and_manufacturing_fields.sql')
      
      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
        db.exec(migrationSQL)
        console.log('✅ Product instances and manufacturing fields migration applied successfully')
      } else {
        console.log('⚠️ Product instances migration file not found')
      }
    } else {
      console.log('✅ Product instances and manufacturing fields already exist')
    }
  } catch (error) {
    console.error('❌ Error applying product instances migration:', error)
  }
}

function applyProductsCreatedMigration() {
  if (!db) return

  try {
    // Check if the products_created column exists in production_runs table
    const tableInfo = db.prepare('PRAGMA table_info(production_runs)').all() as Array<{
      cid: number
      name: string
      type: string
      notnull: number
      dflt_value: string | null
      pk: number
    }>

    const hasProductsCreatedColumn = tableInfo.some(column => column.name === 'products_created')

    if (!hasProductsCreatedColumn) {
      console.log('🔄 Applying products created column migration...')
      
      // Read and execute the migration
      const fs = require('fs')
      const path = require('path')
      const migrationPath = path.join(process.cwd(), 'db', 'migrations', '008_add_products_created_column.sql')
      
      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
        db.exec(migrationSQL)
        console.log('✅ Products created column migration applied successfully')
      } else {
        console.log('⚠️ Products created column migration file not found')
      }
    } else {
      console.log('✅ Products created column already exists')
    }
  } catch (error) {
    console.error('❌ Error applying products created column migration:', error)
  }
}

function migrateProductsToDefaultUnit() {
  if (!db) return

  try {
    // First check if the unit_id column exists
    const tableInfo = db.prepare('PRAGMA table_info(products)').all() as Array<{
      cid: number
      name: string
      type: string
      notnull: number
      dflt_value: string | null
      pk: number
    }>
    
    const hasUnitIdColumn = tableInfo.some(column => column.name === 'unit_id')
    
    if (!hasUnitIdColumn) {
      console.log('⚠️ unit_id column not found, skipping migration')
      return
    }

    // Get the default unit (UNITS)
    const defaultUnit = db.prepare('SELECT id FROM units WHERE name = ?').get('UNITS') as { id: string } | undefined
    
    if (!defaultUnit) {
      console.log('⚠️ Default unit not found, skipping migration')
      return
    }

    // Check if there are products without units
    const productsWithoutUnits = db.prepare('SELECT COUNT(*) as count FROM products WHERE unit_id IS NULL').get() as { count: number }
    
    if (productsWithoutUnits.count > 0) {
      console.log(`🔄 Migrating ${productsWithoutUnits.count} products to default unit...`)
      
      // Update products without units to use the default unit
      const updateStmt = db.prepare('UPDATE products SET unit_id = ? WHERE unit_id IS NULL')
      const result = updateStmt.run(defaultUnit.id)
      
      console.log(`✅ Updated ${result.changes} products to use default unit`)
    }
  } catch (error) {
    console.error('❌ Error migrating products to default unit:', error)
  }
}

// Helper functions for common database operations
export const sqliteHelpers = {
  // Products
  getAllProducts: () => {
    try {
      const db = getDatabase()
      return db.prepare(`
        SELECT 
          p.*,
          u.name as unit_name,
          u.display_name as unit_display_name,
          u.symbol as unit_symbol,
          p.is_manufactured,
          p.bom_id,
          p.default_production_run_id
        FROM products p
        LEFT JOIN units u ON p.unit_id = u.id
        ORDER BY p.name
      `).all()
    } catch (error: any) {
      console.error('Error in getAllProducts:', error)
      return []
    }
  },

  getProductById: (id: string) => {
    try {
      const db = getDatabase()
      return db.prepare('SELECT * FROM products WHERE id = ?').get(id)
    } catch (error: any) {
      console.error('Error in getProductById:', error)
      return null
    }
  },

  getProductByBarcode: (barcode: string) => {
    try {
      const db = getDatabase()
      return db.prepare('SELECT * FROM products WHERE barcode = ?').get(barcode)
    } catch (error: any) {
      console.error('Error in getProductByBarcode:', error)
      return null
    }
  },

  getProductsByCategory: (category: string) => {
    try {
      const db = getDatabase()
      return db.prepare('SELECT * FROM products WHERE category = ? ORDER BY name').all(category)
    } catch (error: any) {
      console.error('Error in getProductsByCategory:', error)
      return []
    }
  },

  getLowStockProducts: () => {
    try {
      const db = getDatabase()
      return db.prepare('SELECT * FROM products WHERE stock_quantity <= min_stock_level ORDER BY stock_quantity ASC').all()
    } catch (error: any) {
      console.error('Error in getLowStockProducts:', error)
      return []
    }
  },

  createProduct: (product: DatabaseTypes['public']['Tables']['products']['Insert']) => {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO products (name, description, price, stock_quantity, min_stock_level, max_stock_level, reorder_quantity, category, image_url, barcode, unit_id, mfgname, mfgnum, Location, loc_tag, distributor, Product_url_1, Product_url_2, Product_url_3, is_manufactured, bom_id, default_production_run_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    return stmt.run(
      product.name,
      product.description || null,
      product.price,
      product.stock_quantity || 0,
      product.min_stock_level || 0,
      product.max_stock_level || 100,
      product.reorder_quantity || 10,
      product.category,
      product.image_url || null,
      product.barcode || null,
      product.unit_id || null,
      product.mfgname || null,
      product.mfgnum || null,
      product.Location || null,
      product.loc_tag || null,
      product.distributor || null,
      product.Product_url_1 || null,
      product.Product_url_2 || null,
      product.Product_url_3 || null,
      product.is_manufactured || 0,
      product.bom_id || null,
      product.default_production_run_id || null
    )
  },

  updateProduct: (id: string, updates: DatabaseTypes['public']['Tables']['products']['Update']) => {
    const db = getDatabase()
    const fields = Object.keys(updates).filter(key => key !== 'id' && updates[key as keyof typeof updates] !== undefined)
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updates[field as keyof typeof updates])
    
    const stmt = db.prepare(`UPDATE products SET ${setClause}, updated_at = datetime('now') WHERE id = ?`)
    return stmt.run(...values, id)
  },

  updateProductByBarcode: (barcode: string, updates: Record<string, any>) => {
    const db = getDatabase()
    const fields = Object.keys(updates).filter(key => key !== 'barcode' && updates[key] !== undefined)
    
    if (fields.length === 0) {
      throw new Error('No valid fields to update')
    }
    
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updates[field])
    
    const stmt = db.prepare(`UPDATE products SET ${setClause}, updated_at = datetime('now') WHERE barcode = ?`)
    return stmt.run(...values, barcode)
  },

  dynamicUpdateProducts: (updateData: Array<{barcode: string, updates: Record<string, any>}>) => {
    const db = getDatabase()
    const results = {
      updated: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Begin transaction for better performance and consistency
    const transaction = db.transaction(() => {
      for (const item of updateData) {
        const { barcode, updates } = item
        
        if (!barcode) {
          results.failed++
          results.errors.push(`Row missing barcode: ${JSON.stringify(updates)}`)
          continue
        }

        try {
          // Check if product exists
          const existingProduct = db.prepare('SELECT id FROM products WHERE barcode = ?').get(barcode)
          if (!existingProduct) {
            results.failed++
            results.errors.push(`Product with barcode '${barcode}' not found`)
            continue
          }

          // Perform the update
          const result = sqliteHelpers.updateProductByBarcode(barcode, updates)
          if (result.changes > 0) {
            results.updated++
          } else {
            results.failed++
            results.errors.push(`No changes made for barcode '${barcode}'`)
          }
        } catch (error: any) {
          results.failed++
          results.errors.push(`Error updating barcode '${barcode}': ${error.message}`)
        }
      }
    })

    transaction()
    return results
  },

  deleteProduct: (id: string) => {
    const db = getDatabase()
    return db.prepare('DELETE FROM products WHERE id = ?').run(id)
  },

  // Inventory transactions
  createInventoryTransaction: (transaction: DatabaseTypes['public']['Tables']['inventory_transactions']['Insert']) => {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO inventory_transactions (product_id, transaction_type, quantity, previous_quantity, new_quantity, reason, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    return stmt.run(
      transaction.product_id,
      transaction.transaction_type,
      transaction.quantity,
      transaction.previous_quantity,
      transaction.new_quantity,
      transaction.reason || null,
      transaction.notes || null
    )
  },

  getInventoryTransactions: (productId?: string) => {
    const db = getDatabase()
    if (productId) {
      return db.prepare('SELECT * FROM inventory_transactions WHERE product_id = ? ORDER BY created_at DESC').all(productId)
    }
    return db.prepare('SELECT * FROM inventory_transactions ORDER BY created_at DESC').all()
  },

  // Search functionality
  searchProducts: (query: string) => {
    const db = getDatabase()
    const searchTerm = `%${query}%`
    return db.prepare(`
      SELECT * FROM products 
      WHERE name LIKE ? OR description LIKE ? OR category LIKE ? OR barcode LIKE ? 
         OR mfgname LIKE ? OR mfgnum LIKE ? OR Location LIKE ? OR distributor LIKE ?
      ORDER BY name
    `).all(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm)
  },

  // Settings functionality
  getSetting: (key: string) => {
    const db = getDatabase()
    const result = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
    return result?.value || null
  },

  setSetting: (key: string, value: string) => {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at) 
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET 
        value = excluded.value,
        updated_at = datetime('now')
    `)
    return stmt.run(key, value)
  },

  getAllSettings: () => {
    const db = getDatabase()
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string, value: string }[]
    return rows.reduce((acc, row) => {
      acc[row.key] = row.value
      return acc
    }, {} as Record<string, string>)
  },

  deleteSetting: (key: string) => {
    const db = getDatabase()
    return db.prepare('DELETE FROM settings WHERE key = ?').run(key)
  },

  // Enhanced query functions for AI agents
  getTotalUnusedValue: () => {
    const db = getDatabase()
    const result = db.prepare(`
      SELECT 
        COALESCE(SUM(CAST(price AS REAL) * CAST(stock_quantity AS INTEGER)), 0) AS total_unused_value,
        COUNT(*) AS unused_count
      FROM products 
      WHERE UPPER(name) LIKE '%UNUSED%' 
         OR UPPER(description) LIKE '%UNUSED%'
    `).get() as { total_unused_value: number; unused_count: number }
    
    return {
      total_value: result.total_unused_value || 0,
      count: result.unused_count || 0
    }
  },

  getUnusedItemsList: () => {
    const db = getDatabase()
    return db.prepare(`
      SELECT 
        id,
        name, 
        description, 
        price, 
        stock_quantity,
        category,
        Location,
        (CAST(price AS REAL) * CAST(stock_quantity AS INTEGER)) AS item_value
      FROM products 
      WHERE UPPER(name) LIKE '%UNUSED%' 
         OR UPPER(description) LIKE '%UNUSED%'
      ORDER BY name
    `).all()
  },

  getProductsByLocation: (location: string) => {
    const db = getDatabase()
    return db.prepare(`
      SELECT * FROM products 
      WHERE UPPER(Location) LIKE UPPER(?) 
      ORDER BY name
    `).all(`%${location}%`)
  },

  getInventoryByManufacturer: (manufacturer: string) => {
    const db = getDatabase()
    return db.prepare(`
      SELECT * FROM products 
      WHERE UPPER(mfgname) LIKE UPPER(?) 
      ORDER BY name
    `).all(`%${manufacturer}%`)
  },

  getRecentTransactions: (limit: number = 10, productId?: string) => {
    const db = getDatabase()
    if (productId) {
      return db.prepare(`
        SELECT 
          t.*,
          p.name as product_name,
          p.category
        FROM inventory_transactions t
        JOIN products p ON t.product_id = p.id
        WHERE t.product_id = ?
        ORDER BY t.created_at DESC 
        LIMIT ?
      `).all(productId, limit)
    } else {
      return db.prepare(`
        SELECT 
          t.*,
          p.name as product_name,
          p.category
        FROM inventory_transactions t
        JOIN products p ON t.product_id = p.id
        ORDER BY t.created_at DESC 
        LIMIT ?
      `).all(limit)
    }
  },

  getInventoryStatsByCategory: () => {
    const db = getDatabase()
    return db.prepare(`
      SELECT 
        category,
        COUNT(*) as total_items,
        SUM(stock_quantity) as total_stock,
        SUM(CAST(price AS REAL) * CAST(stock_quantity AS INTEGER)) as total_value,
        AVG(CAST(price AS REAL)) as avg_price,
        SUM(CASE WHEN stock_quantity <= min_stock_level THEN 1 ELSE 0 END) as low_stock_count,
        SUM(CASE WHEN stock_quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_count
      FROM products 
      GROUP BY category
      ORDER BY category
    `).all()
  },

  getCriticalStockItems: () => {
    const db = getDatabase()
    return db.prepare(`
      SELECT 
        *,
        CASE 
          WHEN stock_quantity = 0 THEN 'OUT_OF_STOCK'
          WHEN stock_quantity <= (min_stock_level * 0.3) THEN 'CRITICAL'
          WHEN stock_quantity <= (min_stock_level * 0.5) THEN 'VERY_LOW'
          ELSE 'LOW'
        END as urgency_level
      FROM products 
      WHERE stock_quantity <= (min_stock_level * 0.5)
      ORDER BY 
        CASE urgency_level
          WHEN 'OUT_OF_STOCK' THEN 1
          WHEN 'CRITICAL' THEN 2
          WHEN 'VERY_LOW' THEN 3
          ELSE 4
        END,
        stock_quantity ASC
    `).all()
  },

  getHighValueItems: (threshold: number = 100) => {
    const db = getDatabase()
    return db.prepare(`
      SELECT 
        *,
        (CAST(price AS REAL) * CAST(stock_quantity AS INTEGER)) as total_value
      FROM products 
      WHERE (CAST(price AS REAL) * CAST(stock_quantity AS INTEGER)) >= ?
      ORDER BY total_value DESC
    `).all(threshold)
  },

  getProductsByPriceRange: (minPrice: number, maxPrice: number) => {
    const db = getDatabase()
    return db.prepare(`
      SELECT * FROM products 
      WHERE CAST(price AS REAL) BETWEEN ? AND ?
      ORDER BY price DESC
    `).all(minPrice, maxPrice)
  },

  getReorderRecommendations: () => {
    const db = getDatabase()
    return db.prepare(`
      SELECT 
        *,
        (min_stock_level - stock_quantity) as shortage,
        reorder_quantity,
        (CAST(price AS REAL) * CAST(reorder_quantity AS INTEGER)) as reorder_cost
      FROM products 
      WHERE stock_quantity <= min_stock_level
      ORDER BY 
        CASE 
          WHEN stock_quantity = 0 THEN 1
          ELSE 2
        END,
        (min_stock_level - stock_quantity) DESC
    `).all()
  },

  getInventoryTotalValue: () => {
    const db = getDatabase()
    const result = db.prepare(`
      SELECT 
        SUM(CAST(price AS REAL) * CAST(stock_quantity AS INTEGER)) as total_value,
        COUNT(*) as total_items,
        SUM(stock_quantity) as total_stock_units
      FROM products
    `).get() as { total_value: number; total_items: number; total_stock_units: number }
    
    return {
      total_value: result.total_value || 0,
      total_items: result.total_items || 0,
      total_stock_units: result.total_stock_units || 0
    }
  },

  // Categories
  getAllCategories: () => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM categories ORDER BY name').all()
  },

  getCategoryByName: (name: string) => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM categories WHERE name = ?').get(name)
  },

  createCategory: (name: string) => {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO categories (name)
      VALUES (?)
    `)
    return stmt.run(name)
  },

  deleteCategory: (id: string) => {
    const db = getDatabase()
    return db.prepare('DELETE FROM categories WHERE id = ?').run(id)
  },

  // Units
  getAllUnits: () => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM units ORDER BY display_name').all()
  },

  getUnitById: (id: string) => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM units WHERE id = ?').get(id)
  },

  getUnitByName: (name: string) => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM units WHERE name = ?').get(name)
  },

  createUnit: (name: string, displayName: string, symbol: string) => {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO units (name, display_name, symbol)
      VALUES (?, ?, ?)
    `)
    return stmt.run(name, displayName, symbol)
  },

  updateUnit: (id: string, name: string, displayName: string, symbol: string) => {
    const db = getDatabase()
    const stmt = db.prepare(`
      UPDATE units 
      SET name = ?, display_name = ?, symbol = ?, updated_at = datetime('now')
      WHERE id = ?
    `)
    return stmt.run(name, displayName, symbol, id)
  },

  deleteUnit: (id: string) => {
    const db = getDatabase()
    return db.prepare('DELETE FROM units WHERE id = ?').run(id)
  },

  // Helper function to resolve unit name or ID to actual UUID
  resolveUnitId: (unitNameOrId: string) => {
    const db = getDatabase()
    
    // First try to get by ID (UUID format)
    let unit = db.prepare('SELECT id FROM units WHERE id = ?').get(unitNameOrId)
    
    // If not found, try to get by name
    if (!unit) {
      unit = db.prepare('SELECT id FROM units WHERE name = ?').get(unitNameOrId)
    }
    
    return unit ? (unit as { id: string }).id : null
  },

  // Helper function to validate unit name or ID
  isValidUnitReference: (unitNameOrId: string) => {
    const db = getDatabase()
    
    // Check if it's a valid UUID
    const unitById = db.prepare('SELECT id FROM units WHERE id = ?').get(unitNameOrId)
    if (unitById) return true
    
    // Check if it's a valid name
    const unitByName = db.prepare('SELECT id FROM units WHERE name = ?').get(unitNameOrId)
    return !!unitByName
  },

  // Manufacturing BOM Functions
  // Projects
  getAllProjects: () => {
    const db = getDatabase()
    return db.prepare(`
      SELECT * FROM projects 
      ORDER BY created_at DESC
    `).all()
  },

  getProjectById: (id: string) => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM projects WHERE id = ?').get(id)
  },

  createProject: (project: { name: string; description?: string; client?: string; start_date?: string; end_date?: string; budget?: number; notes?: string; status?: string }) => {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO projects (name, description, client, start_date, end_date, budget, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    return stmt.run(
      project.name,
      project.description || null,
      project.client || null,
      project.start_date || null,
      project.end_date || null,
      project.budget || 0,
      project.notes || null,
      project.status || 'active'
    )
  },

  updateProject: (id: string, updates: Record<string, any>) => {
    const db = getDatabase()
    const fields = Object.keys(updates).filter(key => key !== 'id' && updates[key] !== undefined)
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updates[field])
    
    const stmt = db.prepare(`UPDATE projects SET ${setClause}, updated_at = datetime('now') WHERE id = ?`)
    return stmt.run(...values, id)
  },

  deleteProject: (id: string) => {
    const db = getDatabase()
    return db.prepare('DELETE FROM projects WHERE id = ?').run(id)
  },

  // Production Lines
  getAllProductionLines: () => {
    const db = getDatabase()
    return db.prepare(`
      SELECT * FROM production_lines 
      ORDER BY created_at DESC
    `).all()
  },

  getProductionLineById: (id: string) => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM production_lines WHERE id = ?').get(id)
  },

  createProductionLine: (line: { name: string; description?: string; schedule_type?: string; capacity?: number; status?: string; location?: string; notes?: string; hourly_rate?: number; shift_hours?: number; department?: string }) => {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO production_lines (name, description, schedule_type, capacity, status, location, notes, hourly_rate, shift_hours, department)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    return stmt.run(
      line.name,
      line.description || null,
      line.schedule_type || 'continuous',
      line.capacity || 1,
      line.status || 'active',
      line.location || null,
      line.notes || null,
      line.hourly_rate || 0,
      line.shift_hours || 8,
      line.department || null
    )
  },

  updateProductionLine: (id: string, updates: Record<string, any>) => {
    const db = getDatabase()
    const fields = Object.keys(updates).filter(key => key !== 'id' && updates[key] !== undefined)
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updates[field])
    
    const stmt = db.prepare(`UPDATE production_lines SET ${setClause}, updated_at = datetime('now') WHERE id = ?`)
    return stmt.run(...values, id)
  },

  deleteProductionLine: (id: string) => {
    const db = getDatabase()
    return db.prepare('DELETE FROM production_lines WHERE id = ?').run(id)
  },

  // Manufacturing BOMs
  getAllManufacturingBOMs: () => {
    const db = getDatabase()
    return db.prepare(`
      SELECT 
        b.*,
        p.name as project_name,
        p.client as project_client,
        pl.name as production_line_name,
        pl.location as production_line_location,
        COUNT(bi.id) as item_count,
        COALESCE(SUM(bi.quantity * pr.price), 0) as total_cost,
        CASE 
          WHEN b.quantity > 0 THEN COALESCE(SUM(bi.quantity * pr.price), 0) / b.quantity
          ELSE 0
        END as unit_cost
      FROM manufacturing_boms b
      LEFT JOIN projects p ON b.project_id = p.id
      LEFT JOIN production_lines pl ON b.production_line_id = pl.id
      LEFT JOIN manufacturing_bom_items bi ON b.id = bi.bom_id
      LEFT JOIN products pr ON bi.product_id = pr.id
      GROUP BY b.id, p.id, pl.id
      ORDER BY b.created_at DESC
    `).all()
  },

  getManufacturingBOMById: (id: string) => {
    const db = getDatabase()
    return db.prepare(`
      SELECT 
        b.*,
        p.name as project_name,
        p.client as project_client,
        pl.name as production_line_name,
        pl.location as production_line_location,
        COUNT(bi.id) as item_count,
        COALESCE(SUM(bi.quantity * pr.price), 0) as total_cost,
        CASE 
          WHEN b.quantity > 0 THEN COALESCE(SUM(bi.quantity * pr.price), 0) / b.quantity
          ELSE 0
        END as unit_cost
      FROM manufacturing_boms b
      LEFT JOIN projects p ON b.project_id = p.id
      LEFT JOIN production_lines pl ON b.production_line_id = pl.id
      LEFT JOIN manufacturing_bom_items bi ON b.id = bi.bom_id
      LEFT JOIN products pr ON bi.product_id = pr.id
      WHERE b.id = ?
      GROUP BY b.id, p.id, pl.id
    `).get(id)
  },

  createManufacturingBOM: (bom: { name: string; description?: string; type: 'project' | 'production_line'; project_id?: string; production_line_id?: string; quantity?: number; notes?: string }) => {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO manufacturing_boms (name, description, type, project_id, production_line_id, quantity, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `)
    const result = stmt.get(
      bom.name,
      bom.description || null,
      bom.type,
      bom.project_id || null,
      bom.production_line_id || null,
      bom.quantity || 1,
      bom.notes || null
    ) as { id: string }
    
    return { id: result.id, changes: 1 }
  },

  updateManufacturingBOM: (id: string, updates: Record<string, any>) => {
    const db = getDatabase()
    const fields = Object.keys(updates).filter(key => key !== 'id' && updates[key] !== undefined)
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updates[field])
    
    const stmt = db.prepare(`UPDATE manufacturing_boms SET ${setClause}, updated_at = datetime('now') WHERE id = ?`)
    return stmt.run(...values, id)
  },

  deleteManufacturingBOM: (id: string) => {
    const db = getDatabase()
    return db.prepare('DELETE FROM manufacturing_boms WHERE id = ?').run(id)
  },

  // BOM Items
  getBOMItems: (bomId: string) => {
    const db = getDatabase()
    return db.prepare(`
      SELECT 
        i.*,
        p.name as product_name,
        p.description as product_description,
        p.price as product_price,
        p.stock_quantity as product_stock,
        u.display_name as unit_name,
        u.symbol as unit_symbol
      FROM manufacturing_bom_items i
      JOIN products p ON i.product_id = p.id
      LEFT JOIN units u ON p.unit_id = u.id
      WHERE i.bom_id = ?
      ORDER BY i.created_at
    `).all(bomId)
  },

  createBOMItem: (item: { bom_id: string; product_id: string; quantity: number; notes?: string }) => {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO manufacturing_bom_items (bom_id, product_id, quantity, notes)
      VALUES (?, ?, ?, ?)
    `)
    return stmt.run(
      item.bom_id,
      item.product_id,
      item.quantity,
      item.notes || null
    )
  },

  updateBOMItem: (id: string, updates: { quantity?: number; notes?: string }) => {
    const db = getDatabase()
    const fields = Object.keys(updates).filter(key => updates[key as keyof typeof updates] !== undefined)
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updates[field as keyof typeof updates])
    
    const stmt = db.prepare(`UPDATE manufacturing_bom_items SET ${setClause}, updated_at = datetime('now') WHERE id = ?`)
    return stmt.run(...values, id)
  },

  deleteBOMItem: (id: string) => {
    const db = getDatabase()
    return db.prepare('DELETE FROM manufacturing_bom_items WHERE id = ?').run(id)
  },

  // BOM Calculations
  calculateBOMCost: (bomId: string) => {
    const db = getDatabase()
    return db.prepare(`
      SELECT 
        SUM(i.quantity * p.price) as total_cost,
        COUNT(i.id) as item_count
      FROM manufacturing_bom_items i
      JOIN products p ON i.product_id = p.id
      WHERE i.bom_id = ?
    `).get(bomId) as { total_cost: number; item_count: number }
  },

  checkBOMAvailability: (bomId: string) => {
    const db = getDatabase()
    return db.prepare(`
      SELECT 
        i.product_id,
        p.name as product_name,
        i.quantity as required_quantity,
        p.stock_quantity as available_quantity,
        CASE 
          WHEN p.stock_quantity >= i.quantity THEN 'available'
          WHEN p.stock_quantity > 0 THEN 'partial'
          ELSE 'unavailable'
        END as availability_status
      FROM manufacturing_bom_items i
      JOIN products p ON i.product_id = p.id
      WHERE i.bom_id = ?
    `).all(bomId)
  },

  // Production Runs
  getProductionRuns: (bomId?: string) => {
    const db = getDatabase()
    if (bomId) {
      return db.prepare(`
        SELECT 
          pr.*,
          b.name as bom_name,
          b.type as bom_type
        FROM production_runs pr
        JOIN manufacturing_boms b ON pr.bom_id = b.id
        WHERE pr.bom_id = ?
        ORDER BY pr.created_at DESC
      `).all(bomId)
    } else {
      return db.prepare(`
        SELECT 
          pr.*,
          b.name as bom_name,
          b.type as bom_type
        FROM production_runs pr
        JOIN manufacturing_boms b ON pr.bom_id = b.id
        ORDER BY pr.created_at DESC
      `).all()
    }
  },

  createProductionRun: (run: { bom_id: string; planned_quantity: number; start_date?: string; notes?: string }) => {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO production_runs (bom_id, planned_quantity, start_date, notes)
      VALUES (?, ?, ?, ?)
    `)
    return stmt.run(
      run.bom_id,
      run.planned_quantity,
      run.start_date || null,
      run.notes || null
    )
  },

  updateProductionRun: (id: string, updates: Record<string, any>) => {
    const db = getDatabase()
    const fields = Object.keys(updates).filter(key => key !== 'id' && updates[key] !== undefined)
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updates[field])
    
    const stmt = db.prepare(`UPDATE production_runs SET ${setClause}, updated_at = datetime('now') WHERE id = ?`)
    return stmt.run(...values, id)
  },

  getProductionRunById: (id: string) => {
    const db = getDatabase()
    return db.prepare(`
      SELECT 
        pr.*,
        b.name as bom_name,
        b.type as bom_type
      FROM production_runs pr
      JOIN manufacturing_boms b ON pr.bom_id = b.id
      WHERE pr.id = ?
    `).get(id)
  },

  // Product Instances
  getProductInstances: (productId?: string, productionRunId?: string) => {
    const db = getDatabase()
    let query = `
      SELECT 
        pi.*,
        p.name as product_name,
        p.description as product_description,
        pr.planned_quantity as production_run_planned_quantity,
        pr.actual_quantity as production_run_actual_quantity,
        pr.status as production_run_status
      FROM product_instances pi
      JOIN products p ON pi.product_id = p.id
      JOIN production_runs pr ON pi.production_run_id = pr.id
    `
    
    const params = []
    const conditions = []
    
    if (productId) {
      conditions.push('pi.product_id = ?')
      params.push(productId)
    }
    
    if (productionRunId) {
      conditions.push('pi.production_run_id = ?')
      params.push(productionRunId)
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }
    
    query += ' ORDER BY pi.created_at DESC'
    
    return db.prepare(query).all(...params)
  },

  getProductInstanceById: (id: string) => {
    const db = getDatabase()
    return db.prepare(`
      SELECT 
        pi.*,
        p.name as product_name,
        p.description as product_description,
        pr.planned_quantity as production_run_planned_quantity,
        pr.actual_quantity as production_run_actual_quantity,
        pr.status as production_run_status
      FROM product_instances pi
      JOIN products p ON pi.product_id = p.id
      JOIN production_runs pr ON pi.production_run_id = pr.id
      WHERE pi.id = ?
    `).get(id)
  },

  getProductInstanceBySerial: (serialNumber: string, productId?: string) => {
    const db = getDatabase()
    let query = `
      SELECT 
        pi.*,
        p.name as product_name,
        p.description as product_description
      FROM product_instances pi
      JOIN products p ON pi.product_id = p.id
      WHERE pi.serial_number = ?
    `
    
    const params = [serialNumber]
    
    if (productId) {
      query += ' AND pi.product_id = ?'
      params.push(productId)
    }
    
    return db.prepare(query).get(...params)
  },

  createProductInstance: (instance: DatabaseTypes['public']['Tables']['product_instances']['Insert']) => {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO product_instances (
        product_id, production_run_id, serial_number, batch_number, instance_status,
        manufacture_date, qa_date, release_date, shipped_date, tracking_number, customer_id,
        quality_notes, defect_reason, repair_notes, location, warranty_start_date, warranty_end_date,
        maintenance_schedule, last_maintenance_date, next_maintenance_date, metadata
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    return stmt.run(
      instance.product_id,
      instance.production_run_id,
      instance.serial_number || null,
      instance.batch_number || null,
      instance.instance_status || 'produced',
      instance.manufacture_date || null,
      instance.qa_date || null,
      instance.release_date || null,
      instance.shipped_date || null,
      instance.tracking_number || null,
      instance.customer_id || null,
      instance.quality_notes || null,
      instance.defect_reason || null,
      instance.repair_notes || null,
      instance.location || null,
      instance.warranty_start_date || null,
      instance.warranty_end_date || null,
      instance.maintenance_schedule || null,
      instance.last_maintenance_date || null,
      instance.next_maintenance_date || null,
      instance.metadata || null
    )
  },

  updateProductInstance: (id: string, updates: DatabaseTypes['public']['Tables']['product_instances']['Update']) => {
    const db = getDatabase()
    const fields = Object.keys(updates).filter(key => key !== 'id' && updates[key as keyof typeof updates] !== undefined)
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updates[field as keyof typeof updates])
    
    const stmt = db.prepare(`UPDATE product_instances SET ${setClause}, updated_at = datetime('now') WHERE id = ?`)
    return stmt.run(...values, id)
  },

  deleteProductInstance: (id: string) => {
    const db = getDatabase()
    return db.prepare('DELETE FROM product_instances WHERE id = ?').run(id)
  },

  getProductInstancesByStatus: (status: string) => {
    const db = getDatabase()
    return db.prepare(`
      SELECT 
        pi.*,
        p.name as product_name,
        p.description as product_description
      FROM product_instances pi
      JOIN products p ON pi.product_id = p.id
      WHERE pi.instance_status = ?
      ORDER BY pi.created_at DESC
    `).all(status)
  },

  getProductInstancesByBatch: (batchNumber: string) => {
    const db = getDatabase()
    return db.prepare(`
      SELECT 
        pi.*,
        p.name as product_name,
        p.description as product_description
      FROM product_instances pi
      JOIN products p ON pi.product_id = p.id
      WHERE pi.batch_number = ?
      ORDER BY pi.created_at DESC
    `).all(batchNumber)
  },

  getProductInstancesForMaintenance: (daysFromNow: number = 30) => {
    const db = getDatabase()
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + daysFromNow)
    const futureDateStr = futureDate.toISOString().split('T')[0]
    
    return db.prepare(`
      SELECT 
        pi.*,
        p.name as product_name,
        p.description as product_description
      FROM product_instances pi
      JOIN products p ON pi.product_id = p.id
      WHERE pi.next_maintenance_date IS NOT NULL 
        AND pi.next_maintenance_date <= ?
        AND pi.instance_status NOT IN ('defective', 'returned')
      ORDER BY pi.next_maintenance_date ASC
    `).all(futureDateStr)
  },

  getManufacturedProducts: () => {
    const db = getDatabase()
    return db.prepare(`
      SELECT 
        p.*,
        u.name as unit_name,
        u.display_name as unit_display_name,
        u.symbol as unit_symbol,
        mb.name as bom_name
      FROM products p
      LEFT JOIN units u ON p.unit_id = u.id
      LEFT JOIN manufacturing_boms mb ON p.bom_id = mb.id
      WHERE p.is_manufactured = 1
      ORDER BY p.name
    `).all()
  },

  getProductInstanceSummary: (productId: string) => {
    const db = getDatabase()
    return db.prepare(`
      SELECT
        instance_status,
        COUNT(*) as count,
        COUNT(CASE WHEN serial_number IS NOT NULL THEN 1 END) as serialized_count
      FROM product_instances
      WHERE product_id = ?
      GROUP BY instance_status
      ORDER BY instance_status
    `).all(productId)
  },

  // LED System Functions

  // WLED Devices
  getAllWLEDDevices: () => {
    const db = getDatabase()
    return db.prepare(`
      SELECT * FROM wled_devices
      ORDER BY device_name ASC
    `).all()
  },

  getWLEDDeviceById: (id: string) => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM wled_devices WHERE id = ?').get(id)
  },

  createWLEDDevice: (device: { device_name: string; ip_address: string; total_leds: number; status?: 'online' | 'offline' }) => {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO wled_devices (device_name, ip_address, total_leds, status)
      VALUES (?, ?, ?, ?)
    `)
    return stmt.run(
      device.device_name,
      device.ip_address,
      device.total_leds,
      device.status || 'online'
    )
  },

  updateWLEDDevice: (id: string, updates: { device_name?: string; ip_address?: string; total_leds?: number; status?: 'online' | 'offline'; signal_strength?: number; last_seen?: string }) => {
    const db = getDatabase()
    const fields = Object.keys(updates).filter(key => updates[key as keyof typeof updates] !== undefined)
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updates[field as keyof typeof updates])

    const stmt = db.prepare(`UPDATE wled_devices SET ${setClause}, updated_at = datetime('now') WHERE id = ?`)
    return stmt.run(...values, id)
  },

  deleteWLEDDevice: (id: string) => {
    const db = getDatabase()
    return db.prepare('DELETE FROM wled_devices WHERE id = ?').run(id)
  },

  getWLEDDeviceByIP: (ipAddress: string) => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM wled_devices WHERE ip_address = ?').get(ipAddress)
  },

  // LED Segments
  getLEDSegmentsByDeviceId: (deviceId: string) => {
    const db = getDatabase()
    return db.prepare(`
      SELECT
        ls.*,
        p.name as product_name
      FROM led_segments ls
      LEFT JOIN products p ON ls.product_id = p.id
      WHERE ls.wled_device_id = ?
      ORDER BY ls.start_led ASC
    `).all(deviceId)
  },
  getLEDSegmentsByProductId: (productId: string) => {
    const db = getDatabase()
    return db.prepare(`
      SELECT
        ls.*,
        wd.device_name,
        wd.ip_address,
        wd.total_leds,
        wd.status
      FROM led_segments ls
      LEFT JOIN wled_devices wd ON ls.wled_device_id = wd.id
      WHERE ls.product_id = ? AND ls.is_active = 1
      ORDER BY ls.created_at ASC
    `).all(productId)
  },

  getLEDSegmentById: (id: string) => {
    const db = getDatabase()
    return db.prepare(`
      SELECT
        ls.*,
        wd.device_name,
        wd.ip_address,
        wd.total_leds
      FROM led_segments ls
      LEFT JOIN wled_devices wd ON ls.wled_device_id = wd.id
      WHERE ls.id = ?
    `).get(id)
  },

  validateLEDSegmentRange: (deviceId: string, startLed: number, ledCount: number, excludeProductId?: string) => {
    const db = getDatabase()
    const endLed = startLed + ledCount - 1

    let query = `
      SELECT
        ls.product_id,
        ls.start_led,
        ls.led_count,
        p.name as product_name
      FROM led_segments ls
      JOIN products p ON ls.product_id = p.id
      WHERE ls.wled_device_id = ?
        AND ls.is_active = 1
        AND (
          (ls.start_led <= ? AND (ls.start_led + ls.led_count - 1) >= ?)
          OR (ls.start_led <= ? AND (ls.start_led + ls.led_count - 1) >= ?)
          OR (ls.start_led >= ? AND ls.start_led <= ?)
        )
    `

    const params = [deviceId, startLed, startLed, endLed, endLed, startLed, endLed]

    if (excludeProductId) {
      query += ' AND ls.product_id != ?'
      params.push(excludeProductId)
    }

    const conflicts = db.prepare(query).all(...params)

    if (conflicts.length > 0) {
      return {
        valid: false,
        message: 'LED range conflicts with existing segments',
        conflicts: conflicts
      }
    }

    return { valid: true }
  },

  createLEDSegment: (segment: {
    product_id: string
    wled_device_id: string
    start_led: number
    led_count?: number
    location_color?: string
    location_behavior?: string
    stock_mode?: string
    stock_color_1?: string
    stock_color_2?: string
    stock_color_3?: string
    stock_color_4?: string
    stock_behavior?: string
    alert_mode?: string
    alert_color_1?: string
    alert_color_2?: string
    alert_color_3?: string
    alert_color_4?: string
    alert_behavior?: string
    segment_behavior?: string
    animation_speed?: number
    animation_intensity?: number
    animation_duration?: number
  }) => {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO led_segments (
        product_id, wled_device_id, start_led, led_count,
        location_color, location_behavior,
        stock_mode, stock_color_1, stock_color_2, stock_color_3, stock_color_4, stock_behavior,
        alert_mode, alert_color_1, alert_color_2, alert_color_3, alert_color_4, alert_behavior,
        segment_behavior, animation_speed, animation_intensity, animation_duration
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    return stmt.run(
      segment.product_id,
      segment.wled_device_id,
      segment.start_led,
      segment.led_count || 12,
      segment.location_color || '#FF5733',
      segment.location_behavior || 'solid',
      segment.stock_mode || 'auto',
      segment.stock_color_1 || '#4CAF50',
      segment.stock_color_2 || '#4CAF50',
      segment.stock_color_3 || '#4CAF50',
      segment.stock_color_4 || '#4CAF50',
      segment.stock_behavior || 'solid',
      segment.alert_mode || 'auto',
      segment.alert_color_1 || '#333333',
      segment.alert_color_2 || '#333333',
      segment.alert_color_3 || '#333333',
      segment.alert_color_4 || '#333333',
      segment.alert_behavior || 'solid',
      segment.segment_behavior || 'none',
      segment.animation_speed || 128,
      segment.animation_intensity || 128,
      segment.animation_duration || 3000
    )
  },

  updateLEDSegment: (id: string, updates: Record<string, any>) => {
    const db = getDatabase()
    const fields = Object.keys(updates).filter(key => key !== 'id' && updates[key] !== undefined)
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updates[field])

    const stmt = db.prepare(`UPDATE led_segments SET ${setClause}, updated_at = datetime('now') WHERE id = ?`)
    return stmt.run(...values, id)
  },

  deleteLEDSegment: (id: string) => {
    const db = getDatabase()
    return db.prepare('DELETE FROM led_segments WHERE id = ?').run(id)
  },

  deleteLEDSegmentsByProductId: (productId: string) => {
    const db = getDatabase()
    return db.prepare('DELETE FROM led_segments WHERE product_id = ?').run(productId)
  },

  saveLEDSegmentsForProduct: (productId: string, segments: any[]) => {
    const db = getDatabase()

    // Use transaction for consistency
    const transaction = db.transaction(() => {
      // Delete existing segments for this product
      db.prepare('DELETE FROM led_segments WHERE product_id = ?').run(productId)

      // Insert new segments
      for (const segment of segments) {
        // Validate segment first
        const validation = sqliteHelpers.validateLEDSegmentRange(
          segment.wled_device_id,
          segment.start_led,
          segment.led_count || 12,
          productId
        )

        if (!validation.valid) {
          throw new Error(validation.message)
        }

        sqliteHelpers.createLEDSegment({
          ...segment,
          product_id: productId
        })
      }
    })

    try {
      transaction()
      return { success: true, segments_saved: segments.length }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // Navigation Menu Functions

  getAllNavigationItems: () => {
    const db = getDatabase()
    return db.prepare(`
      SELECT * FROM navigation_items
      ORDER BY display_order ASC
    `).all()
  },

  getNavigationItemById: (id: string) => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM navigation_items WHERE id = ?').get(id)
  },

  getTopLevelNavigationItems: () => {
    const db = getDatabase()
    return db.prepare(`
      SELECT * FROM navigation_items
      WHERE parent_id IS NULL AND is_visible = 1
      ORDER BY display_order ASC
    `).all()
  },

  getChildNavigationItems: (parentId: string) => {
    const db = getDatabase()
    return db.prepare(`
      SELECT * FROM navigation_items
      WHERE parent_id = ? AND is_visible = 1
      ORDER BY display_order ASC
    `).all(parentId)
  },

  createNavigationItem: (data: {
    name: string
    href?: string
    icon_name: string
    parent_id?: string | null
    display_order?: number
    is_visible?: number
    is_group?: number
    badge_key?: string | null
    highlight?: number
    theme?: string | null
    theme_variant?: string | null
  }) => {
    const db = getDatabase()
    const id = generateId()
    const stmt = db.prepare(`
      INSERT INTO navigation_items (
        id, name, href, icon_name, parent_id, display_order,
        is_visible, is_group, badge_key, highlight, theme, theme_variant
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(
      id,
      data.name,
      data.href || null,
      data.icon_name,
      data.parent_id || null,
      data.display_order ?? 0,
      data.is_visible ?? 1,
      data.is_group ?? 0,
      data.badge_key || null,
      data.highlight ?? 0,
      data.theme || 'standard',
      data.theme_variant || 'light'
    )
    return id
  },

  updateNavigationItem: (id: string, updates: Record<string, any>) => {
    const db = getDatabase()
    const fields = Object.keys(updates).filter(key => updates[key] !== undefined)
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updates[field])

    const stmt = db.prepare(`UPDATE navigation_items SET ${setClause}, updated_at = datetime('now') WHERE id = ?`)
    return stmt.run(...values, id)
  },

  deleteNavigationItem: (id: string) => {
    const db = getDatabase()
    return db.prepare('DELETE FROM navigation_items WHERE id = ?').run(id)
  },

  reorderNavigationItems: (updates: Array<{ id: string; display_order: number }>) => {
    const db = getDatabase()
    const transaction = db.transaction(() => {
      const stmt = db.prepare('UPDATE navigation_items SET display_order = ?, updated_at = datetime(\'now\') WHERE id = ?')
      for (const update of updates) {
        stmt.run(update.display_order, update.id)
      }
    })
    transaction()
  },

  moveNavigationItemToGroup: (itemId: string, parentId: string | null) => {
    const db = getDatabase()
    const stmt = db.prepare('UPDATE navigation_items SET parent_id = ?, updated_at = datetime(\'now\') WHERE id = ?')
    return stmt.run(parentId, itemId)
  },

  resetNavigationToDefault: () => {
    const db = getDatabase()
    const transaction = db.transaction(() => {
      // Clear existing navigation items
      db.prepare('DELETE FROM navigation_items').run()

      // Re-run the seed data from migration
      const migrationPath = path.join(process.cwd(), 'db', 'migrations', '022_navigation_menu.sql')
      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')
        // Extract only the INSERT statements
        const insertStatements = migrationSQL
          .split(';')
          .filter(stmt => stmt.trim().startsWith('INSERT INTO navigation_items'))
          .join(';')
        if (insertStatements) {
          db.exec(insertStatements)
        }
      }
    })
    transaction()
  },

  // Custom Themes Functions
  getAllCustomThemes: () => {
    const db = getDatabase()
    return db.prepare(`
      SELECT * FROM custom_themes
      WHERE is_active = 1
      ORDER BY is_system_theme DESC, theme_name ASC
    `).all()
  },

  getCustomThemeById: (id: string) => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM custom_themes WHERE id = ?').get(id)
  },

  getCustomThemeBySlug: (slug: string) => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM custom_themes WHERE theme_slug = ? AND is_active = 1').get(slug)
  },

  createCustomTheme: (data: {
    theme_name: string
    theme_slug: string
    display_name: string
    description?: string | null
    supports_light_variant: number
    supports_dark_variant: number
    light_colors: string | null
    dark_colors?: string | null
    custom_css?: string | null
    theme_source?: string
  }) => {
    const db = getDatabase()
    const id = generateId()
    const stmt = db.prepare(`
      INSERT INTO custom_themes (
        id, theme_name, theme_slug, display_name, description,
        supports_light_variant, supports_dark_variant,
        light_colors, dark_colors, custom_css, is_system_theme, theme_source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `)
    stmt.run(
      id,
      data.theme_name,
      data.theme_slug,
      data.display_name,
      data.description || null,
      data.supports_light_variant,
      data.supports_dark_variant,
      data.light_colors,
      data.dark_colors || null,
      data.custom_css || null,
      data.theme_source || 'created'
    )
    return id
  },

  updateCustomTheme: (id: string, updates: Record<string, any>) => {
    const db = getDatabase()
    const fields = Object.keys(updates).filter(key => updates[key] !== undefined)
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updates[field])

    const stmt = db.prepare(`UPDATE custom_themes SET ${setClause}, updated_at = datetime('now') WHERE id = ?`)
    return stmt.run(...values, id)
  },

  deleteCustomTheme: (id: string) => {
    const db = getDatabase()
    return db.prepare('DELETE FROM custom_themes WHERE id = ? AND is_system_theme = 0').run(id)
  },
}

function applyOrdersMigration() {
  if (!db) return

  try {
    console.log('🔄 Applying orders migration...')
    
    // Check if orders table exists and has order_date column
    const ordersTableInfo = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='orders'
    `).get()
    
    if (ordersTableInfo) {
      // Check if order_date column exists
      const columnInfo = db.prepare(`
        PRAGMA table_info(orders)
      `).all()
      
      const hasOrderDate = columnInfo.some(col => col.name === 'order_date')
      
      if (!hasOrderDate) {
        console.log('⚠️ Orders table exists but missing order_date column, adding it...')
        db.exec(`
          ALTER TABLE orders ADD COLUMN order_date TEXT DEFAULT (datetime('now'));
        `)
        console.log('✅ Added order_date column to orders table')
      } else {
        console.log('✅ Orders table already has order_date column')
      }
    } else {
      // Read the migration SQL file
      const migrationPath = path.join(process.cwd(), 'db', 'migrations', '009_add_orders_table.sql')
      
      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')
        
        // Execute the migration
        db.exec(migrationSQL)
        console.log('✅ Orders migration applied successfully')
      } else {
        console.log('⚠️ Orders migration file not found, skipping...')
      }
    }
  } catch (error) {
    console.error('❌ Error applying orders migration:', error)
  }
}

function applySerialPoolUpdatedAtMigration() {
  if (!db) return

  try {
    // Check if the updated_at column already exists in serial_number_pool table
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='serial_number_pool'
    `).get()

    if (!tableExists) {
      console.log('⚠️ serial_number_pool table does not exist, skipping migration')
      return
    }

    const tableInfo = db.prepare('PRAGMA table_info(serial_number_pool)').all() as Array<{
      cid: number
      name: string
      type: string
      notnull: number
      dflt_value: string | null
      pk: number
    }>

    const hasUpdatedAtColumn = tableInfo.some(column => column.name === 'updated_at')

    if (!hasUpdatedAtColumn) {
      console.log('🔄 Applying serial number pool updated_at migration...')
      
      // Read and execute the migration
      const migrationPath = path.join(process.cwd(), 'db', 'migrations', '014_add_updated_at_to_serial_pool.sql')
      
      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
        db.exec(migrationSQL)
        console.log('✅ Serial number pool updated_at migration applied successfully')
      } else {
        console.log('⚠️ Serial number pool updated_at migration file not found')
      }
    } else {
      console.log('✅ Serial number pool updated_at column already exists')
    }
  } catch (error) {
    console.error('❌ Error applying serial number pool updated_at migration:', error)
  }
}

function applySerialNumberTemplatesMigration() {
  if (!db) return

  try {
    // Check if the serial_number_templates table exists
    const templatesTableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='serial_number_templates'
    `).get()

    // Check if the serial_number_pool table exists
    const poolTableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='serial_number_pool'
    `).get()

    if (!templatesTableExists || !poolTableExists) {
      console.log('🔄 Applying serial number templates migration...')
      
      // Read and execute the migration
      const migrationPath = path.join(process.cwd(), 'db', 'migrations', '013_add_serial_number_templates.sql')
      
      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
        db.exec(migrationSQL)
        console.log('✅ Serial number templates migration applied successfully')
      } else {
        console.log('⚠️ Serial number templates migration file not found')
      }
    } else {
      console.log('✅ Serial number templates and pool tables already exist')
    }
  } catch (error) {
    console.error('❌ Error applying serial number templates migration:', error)
  }
}

function applySerialNumberRegistryMigration() {
  if (!db) return

  try {
    // Check if the serial_number_registry table exists
    const registryTableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='serial_number_registry'
    `).get()

    if (!registryTableExists) {
      console.log('🔄 Applying serial number registry migration...')
      
      // Read and execute the migration
      const migrationPath = path.join(process.cwd(), 'db', 'migrations', '015_add_serial_number_registry.sql')
      
      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
        db.exec(migrationSQL)
        console.log('✅ Serial number registry migration applied successfully')
      } else {
        console.log('⚠️ Serial number registry migration file not found')
      }
    } else {
      console.log('✅ Serial number registry table already exists')
    }
  } catch (error) {
    console.error('❌ Error applying serial number registry migration:', error)
  }
}

function applyTemplatePlaceholderFieldsMigration() {
  if (!db) return

  try {
    // Check if the new fields exist in serial_number_templates table
    const tableInfo = db.prepare('PRAGMA table_info(serial_number_templates)').all() as Array<{
      cid: number
      name: string
      type: string
      notnull: number
      dflt_value: string | null
      pk: number
    }>

    const hasNumWellsColumn = tableInfo.some(column => column.name === 'num_wells_pattern')
    const hasKindColumn = tableInfo.some(column => column.name === 'kind_pattern')
    const hasColorCodeColumn = tableInfo.some(column => column.name === 'color_code_pattern')

    if (!hasNumWellsColumn || !hasKindColumn || !hasColorCodeColumn) {
      console.log('🔄 Applying template placeholder fields migration...')
      
      // Read and execute the migration
      const migrationPath = path.join(process.cwd(), 'db', 'migrations', '016_add_template_placeholder_fields.sql')
      
      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
        db.exec(migrationSQL)
        console.log('✅ Template placeholder fields migration applied successfully')
      } else {
        console.log('⚠️ Template placeholder fields migration file not found')
      }
    } else {
      console.log('✅ Template placeholder fields already exist')
    }
  } catch (error) {
    console.error('❌ Error applying template placeholder fields migration:', error)
  }
}

function applyManufacturingImageSupportMigration() {
  if (!db) return

  try {
    // Check if image_url columns exist in manufacturing tables
    const projectsTableInfo = db.prepare('PRAGMA table_info(projects)').all() as Array<{
      cid: number
      name: string
      type: string
      notnull: number
      dflt_value: string | null
      pk: number
    }>

    const hasProjectsImageUrl = projectsTableInfo.some(column => column.name === 'image_url')

    if (!hasProjectsImageUrl) {
      console.log('🔄 Applying manufacturing image support migration...')
      
      // Read and execute the migration
      const migrationPath = path.join(process.cwd(), 'db', 'migrations', '017_add_image_support_to_manufacturing.sql')
      
      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
        db.exec(migrationSQL)
        console.log('✅ Manufacturing image support migration applied successfully')
      } else {
        console.log('⚠️ Manufacturing image support migration file not found')
      }
    } else {
      console.log('✅ Manufacturing image support already exists')
    }
  } catch (error) {
    console.error('❌ Error applying manufacturing image support migration:', error)
  }
}

function applyLEDSystemMigration() {
  if (!db) return

  try {
    // Check if WLED tables exist
    const wledDevicesExists = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='wled_devices'
    `).get()

    const ledSegmentsExists = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='led_segments'
    `).get()

    if (!wledDevicesExists || !ledSegmentsExists) {
      console.log('🔄 Applying LED system migration...')

      // Create WLED devices table
      db.exec(`
        CREATE TABLE IF NOT EXISTS wled_devices (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          device_name TEXT NOT NULL,
          ip_address TEXT NOT NULL UNIQUE,
          total_leds INTEGER NOT NULL,
          status TEXT DEFAULT 'online' CHECK (status IN ('online', 'offline')),
          signal_strength INTEGER DEFAULT NULL,
          last_seen TEXT DEFAULT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );
      `)

      // Create LED segments table
      db.exec(`
        CREATE TABLE IF NOT EXISTS led_segments (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          product_id TEXT NOT NULL,
          wled_device_id TEXT NOT NULL,
          start_led INTEGER NOT NULL,
          led_count INTEGER DEFAULT 12,

          -- Location Section (LEDs 0-3)
          location_color TEXT DEFAULT '#FF5733',
          location_behavior TEXT DEFAULT 'solid' CHECK (location_behavior IN ('solid', 'flash', 'flash-solid', 'chaser-loop', 'chaser-twice', 'off')),

          -- Stock Status Section (LEDs 4-7)
          stock_mode TEXT DEFAULT 'auto' CHECK (stock_mode IN ('auto', 'manual')),
          stock_color_1 TEXT DEFAULT '#4CAF50',
          stock_color_2 TEXT DEFAULT '#4CAF50',
          stock_color_3 TEXT DEFAULT '#4CAF50',
          stock_color_4 TEXT DEFAULT '#4CAF50',
          stock_behavior TEXT DEFAULT 'solid' CHECK (stock_behavior IN ('solid', 'flash', 'flash-solid', 'chaser-loop', 'chaser-twice', 'off')),

          -- Alert Section (LEDs 8-11)
          alert_mode TEXT DEFAULT 'auto' CHECK (alert_mode IN ('auto', 'manual')),
          alert_color_1 TEXT DEFAULT '#333333',
          alert_color_2 TEXT DEFAULT '#333333',
          alert_color_3 TEXT DEFAULT '#333333',
          alert_color_4 TEXT DEFAULT '#333333',
          alert_behavior TEXT DEFAULT 'solid' CHECK (alert_behavior IN ('solid', 'flash', 'flash-solid', 'chaser-loop', 'chaser-twice', 'off')),

          -- Segment-wide Behavior Override
          segment_behavior TEXT DEFAULT 'none' CHECK (segment_behavior IN ('none', 'solid', 'flash', 'flash-solid', 'chaser-loop', 'chaser-twice')),

          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),

          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          FOREIGN KEY (wled_device_id) REFERENCES wled_devices(id) ON DELETE CASCADE
        );
      `)

      // Create indexes for better performance
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_led_segments_product_id ON led_segments(product_id);
        CREATE INDEX IF NOT EXISTS idx_led_segments_device_id ON led_segments(wled_device_id);
        CREATE INDEX IF NOT EXISTS idx_wled_devices_status ON wled_devices(status);
      `)

      // Insert sample WLED devices
      db.exec(`
        INSERT OR IGNORE INTO wled_devices (device_name, ip_address, total_leds, status) VALUES
        ('Warehouse A', '192.168.1.100', 60, 'online'),
        ('Warehouse B', '192.168.1.101', 48, 'online'),
        ('Workshop', '192.168.1.102', 36, 'online');
      `)

      console.log('✅ LED system migration applied successfully')
    } else {
      console.log('✅ LED system tables already exist')
    }
  } catch (error) {
    console.error('❌ Error applying LED system migration:', error)
  }
}

function applyWLEDConnectivityFieldsMigration() {
  if (!db) return

  try {
    // Check if the wled_devices table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='wled_devices'
    `).get()

    if (!tableExists) {
      console.log('⚠️ wled_devices table does not exist, skipping connectivity fields migration')
      return
    }

    // Check if the columns already exist
    const tableInfo = db.prepare('PRAGMA table_info(wled_devices)').all() as Array<{
      cid: number
      name: string
      type: string
      notnull: number
      dflt_value: string | null
      pk: number
    }>

    const hasSignalStrength = tableInfo.some(column => column.name === 'signal_strength')
    const hasLastSeen = tableInfo.some(column => column.name === 'last_seen')

    if (!hasSignalStrength || !hasLastSeen) {
      console.log('🔄 Adding connectivity fields to wled_devices table...')

      if (!hasSignalStrength) {
        db.exec(`ALTER TABLE wled_devices ADD COLUMN signal_strength INTEGER DEFAULT NULL`)
        console.log('✅ Added signal_strength column')
      }

      if (!hasLastSeen) {
        db.exec(`ALTER TABLE wled_devices ADD COLUMN last_seen TEXT DEFAULT NULL`)
        console.log('✅ Added last_seen column')
      }

      console.log('✅ WLED connectivity fields migration applied successfully')
    } else {
      console.log('✅ WLED connectivity fields already exist')
    }
  } catch (error) {
    console.error('❌ Error applying WLED connectivity fields migration:', error)
  }
}

function applyLEDAnimationParametersMigration() {
  if (!db) return

  try {
    // Check if the led_segments table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='led_segments'
    `).get()

    if (!tableExists) {
      console.log('⚠️ led_segments table does not exist, skipping animation parameters migration')
      return
    }

    // Check if the columns already exist
    const tableInfo = db.prepare('PRAGMA table_info(led_segments)').all() as Array<{
      cid: number
      name: string
      type: string
      notnull: number
      dflt_value: string | null
      pk: number
    }>

    const hasAnimationSpeed = tableInfo.some(column => column.name === 'animation_speed')
    const hasAnimationIntensity = tableInfo.some(column => column.name === 'animation_intensity')
    const hasAnimationDuration = tableInfo.some(column => column.name === 'animation_duration')

    if (!hasAnimationSpeed || !hasAnimationIntensity || !hasAnimationDuration) {
      console.log('🔄 Adding animation parameter fields to led_segments table...')

      if (!hasAnimationSpeed) {
        db.exec(`ALTER TABLE led_segments ADD COLUMN animation_speed INTEGER DEFAULT 128`)
        console.log('✅ Added animation_speed column')
      }

      if (!hasAnimationIntensity) {
        db.exec(`ALTER TABLE led_segments ADD COLUMN animation_intensity INTEGER DEFAULT 128`)
        console.log('✅ Added animation_intensity column')
      }

      if (!hasAnimationDuration) {
        db.exec(`ALTER TABLE led_segments ADD COLUMN animation_duration INTEGER DEFAULT 3000`)
        console.log('✅ Added animation_duration column')
      }

      console.log('✅ LED animation parameters migration applied successfully')
    } else {
      console.log('✅ LED animation parameters already exist')
    }
  } catch (error) {
    console.error('❌ Error applying LED animation parameters migration:', error)
  }
}

function applyCommandCenterMigration() {
  if (!db) return

  try {
    // Check if Command Center tables exist
    const ccTablesExist = db.prepare(`
      SELECT COUNT(*) as count
      FROM sqlite_master
      WHERE type='table' AND name IN (
        'command_center_config',
        'warehouse_zones',
        'automation_rules',
        'accuracy_metrics',
        'voice_commands',
        'command_center_features'
      )
    `).get() as { count: number }

    if (ccTablesExist.count < 6) {
      console.log('🔄 Applying AI Command Center migration...')

      const migrationPath = path.join(process.cwd(), 'db', 'migrations', '020_ai_command_center.sql')

      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
        db.exec(migrationSQL)
        console.log('✅ AI Command Center migration applied successfully')
      } else {
        console.log('⚠️ AI Command Center migration file not found')
      }
    } else {
      console.log('✅ AI Command Center tables already exist')
    }
  } catch (error) {
    console.error('❌ Error applying AI Command Center migration:', error)
  }

  // Apply Warehouse Zone Rotation migration
  try {
    const rotationColumnExists = db.prepare(`
      SELECT COUNT(*) as count
      FROM pragma_table_info('warehouse_zones')
      WHERE name='rotation_degrees'
    `).get() as { count: number }

    if (rotationColumnExists.count === 0) {
      console.log('🔄 Applying Warehouse Zone Rotation migration...')

      const migrationPath = path.join(process.cwd(), 'db', 'migrations', '021_warehouse_zone_rotation.sql')

      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
        db.exec(migrationSQL)
        console.log('✅ Warehouse Zone Rotation migration applied successfully')
      } else {
        console.log('⚠️ Warehouse Zone Rotation migration file not found')
      }
    } else {
      console.log('✅ Warehouse Zone rotation column already exists')
    }
  } catch (error) {
    console.error('❌ Error applying Warehouse Zone Rotation migration:', error)
  }
}

function applyNavigationMenuMigration() {
  if (!db) return

  try {
    // Check if navigation_items table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='navigation_items'
    `).get()

    if (!tableExists) {
      console.log('🔄 Applying Navigation Menu migration...')

      const migrationPath = path.join(process.cwd(), 'db', 'migrations', '022_navigation_menu.sql')

      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
        db.exec(migrationSQL)
        console.log('✅ Navigation Menu migration applied successfully')
      } else {
        console.log('⚠️ Navigation Menu migration file not found')
      }
    } else {
      console.log('✅ Navigation Menu table already exists')
    }
  } catch (error) {
    console.error('❌ Error applying Navigation Menu migration:', error)
  }
}

function applyNavigationThemesMigration() {
  if (!db) return

  try {
    // Check if theme columns exist in navigation_items table
    const themeColumnExists = db.prepare(`
      SELECT COUNT(*) as count
      FROM pragma_table_info('navigation_items')
      WHERE name='theme'
    `).get() as { count: number }

    if (themeColumnExists.count === 0) {
      console.log('🔄 Applying Navigation Themes migration...')

      const migrationPath = path.join(process.cwd(), 'db', 'migrations', '023_navigation_themes.sql')

      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
        db.exec(migrationSQL)
        console.log('✅ Navigation Themes migration applied successfully')
      } else {
        console.log('⚠️ Navigation Themes migration file not found at:', migrationPath)
      }
    } else {
      console.log('✅ Navigation theme columns already exist')
    }
  } catch (error) {
    console.error('❌ Error applying Navigation Themes migration:', error)
  }
}

function applyCustomThemesMigration() {
  if (!db) return

  try {
    // Check if custom_themes table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='custom_themes'
    `).get()

    if (!tableExists) {
      console.log('🔄 Applying Custom Themes migration...')

      const migrationPath = path.join(process.cwd(), 'db', 'migrations', '024_custom_themes.sql')

      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
        db.exec(migrationSQL)
        console.log('✅ Custom Themes migration applied successfully')
      } else {
        console.log('⚠️ Custom Themes migration file not found at:', migrationPath)
      }
    } else {
      console.log('✅ Custom Themes table already exists')
    }
  } catch (error) {
    console.error('❌ Error applying Custom Themes migration:', error)
  }
}

function applyWarehouseHierarchyMigration() {
  if (!db) return

  try {
    // Check if warehouses table exists (main indicator of migration 025)
    const warehousesTableExists = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='warehouses'
    `).get()

    // Check if device defaults columns exist in wled_devices
    const deviceDefaultsExist = db.prepare(`
      SELECT COUNT(*) as count
      FROM pragma_table_info('wled_devices')
      WHERE name IN ('default_animation_speed', 'auto_sync_enabled', 'warehouse_id')
    `).get() as { count: number }

    if (!warehousesTableExists || deviceDefaultsExist.count < 3) {
      console.log('🔄 Applying Warehouse Hierarchy & Device Defaults migration (025)...')

      const migrationPath = path.join(process.cwd(), 'db', 'migrations', '025_warehouse_hierarchy_and_device_defaults.sql')

      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
        db.exec(migrationSQL)
        console.log('✅ Warehouse Hierarchy migration applied successfully')
        console.log('   📊 Added: warehouses table, device defaults, sync tracking, CSV import staging')
      } else {
        console.log('⚠️ Warehouse Hierarchy migration file not found at:', migrationPath)
      }
    } else {
      console.log('✅ Warehouse Hierarchy system already exists')
    }
  } catch (error) {
    console.error('❌ Error applying Warehouse Hierarchy migration:', error)
  }
}

function applyLocateOverrideColorMigration() {
  if (!db) return

  try {
    // Check if the led_segments table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='led_segments'
    `).get()

    if (!tableExists) {
      console.log('⚠️ led_segments table does not exist, skipping locate override color migration')
      return
    }

    // Check if the columns already exist
    const tableInfo = db.prepare('PRAGMA table_info(led_segments)').all() as Array<{
      cid: number
      name: string
      type: string
      notnull: number
      dflt_value: string | null
      pk: number
    }>

    const hasLocateOverrideColor = tableInfo.some(column => column.name === 'locate_override_color')
    const hasLocateOverrideBehavior = tableInfo.some(column => column.name === 'locate_override_behavior')
    const hasLocateOverrideEnabled = tableInfo.some(column => column.name === 'locate_override_enabled')

    if (!hasLocateOverrideColor || !hasLocateOverrideBehavior || !hasLocateOverrideEnabled) {
      console.log('🔄 Applying Locate Override Color migration (026)...')

      const migrationPath = path.join(process.cwd(), 'db', 'migrations', '026_locate_override_color.sql')

      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
        db.exec(migrationSQL)
        console.log('✅ Locate Override Color migration applied successfully')
        console.log('   🎨 Added: locate_override_color, locate_override_behavior, locate_override_enabled')
      } else {
        console.log('⚠️ Locate Override Color migration file not found at:', migrationPath)
      }
    } else {
      console.log('✅ Locate Override Color fields already exist')
    }
  } catch (error) {
    console.error('❌ Error applying Locate Override Color migration:', error)
  }
}

function applyAIUsageLogsSchemaMigration() {
  if (!db) return

  try {
    // Check if ai_usage_logs table has the new schema
    const columns = db.prepare(`PRAGMA table_info(ai_usage_logs)`).all() as any[]
    const hasModelUsed = columns.some((col: any) => col.name === 'model_used')
    const hasTotalTokens = columns.some((col: any) => col.name === 'total_tokens')
    const hasOperationType = columns.some((col: any) => col.name === 'operation_type')

    if (hasModelUsed && hasTotalTokens && hasOperationType) {
      console.log('✅ AI usage logs schema already updated')
      return
    }

    console.log('🔄 Applying AI Usage Logs schema migration (026)...')
    console.log(`   📊 Current columns: ${columns.map((c: any) => c.name).join(', ')}`)

    const migrationPath = path.join(process.cwd(), 'db', 'migrations', '026_ai_usage_logs_schema_update.sql')

    if (fs.existsSync(migrationPath)) {
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

      // Count existing records before migration
      const beforeCount = db.prepare('SELECT COUNT(*) as count FROM ai_usage_logs').get() as { count: number }
      console.log(`   💾 Preserving ${beforeCount.count} historical records...`)

      db.exec(migrationSQL)

      // Verify migration succeeded
      const afterCount = db.prepare('SELECT COUNT(*) as count FROM ai_usage_logs').get() as { count: number }
      const newColumns = db.prepare(`PRAGMA table_info(ai_usage_logs)`).all() as any[]

      console.log('✅ AI Usage Logs schema migration completed successfully')
      console.log(`   ✓ Records preserved: ${afterCount.count}/${beforeCount.count}`)
      console.log(`   ✓ Columns after migration: ${newColumns.length} (was ${columns.length})`)
      console.log(`   ✓ New columns: model_used, prompt_tokens, completion_tokens, total_tokens, estimated_cost, operation_type, user_message_preview, success, error_type`)
    } else {
      console.log('⚠️ AI Usage Logs migration file not found at:', migrationPath)
    }
  } catch (error) {
    console.error('❌ Error applying AI Usage Logs migration:', error)
  }
}

// ===========================
// COMMAND CENTER HELPERS
// ===========================

/**
 * Get all Command Center configuration entries
 */
export function getAllCommandCenterConfig(): any[] {
  if (!db) return []
  try {
    const stmt = db.prepare('SELECT * FROM command_center_config ORDER BY category, key')
    return stmt.all()
  } catch (error) {
    console.error('Error getting command center config:', error)
    return []
  }
}

/**
 * Get a specific Command Center configuration entry
 */
export function getCommandCenterConfig(key: string): any | null {
  if (!db) return null
  try {
    const stmt = db.prepare('SELECT * FROM command_center_config WHERE key = ?')
    return stmt.get(key) || null
  } catch (error) {
    console.error('Error getting command center config:', error)
    return null
  }
}

/**
 * Update a Command Center configuration entry
 */
export function updateCommandCenterConfig(key: string, value: string): boolean {
  if (!db) return false
  try {
    const stmt = db.prepare(`
      UPDATE command_center_config
      SET value = ?, updated_at = datetime('now')
      WHERE key = ?
    `)
    const result = stmt.run(value, key)
    return result.changes > 0
  } catch (error) {
    console.error('Error updating command center config:', error)
    return false
  }
}

/**
 * Get all Command Center features
 */
export function getAllCommandCenterFeatures(): any[] {
  if (!db) return []
  try {
    const stmt = db.prepare('SELECT * FROM command_center_features ORDER BY sort_order')
    return stmt.all()
  } catch (error) {
    console.error('Error getting command center features:', error)
    return []
  }
}

/**
 * Get a specific Command Center feature
 */
export function getCommandCenterFeature(featureKey: string): any | null {
  if (!db) return null
  try {
    const stmt = db.prepare('SELECT * FROM command_center_features WHERE feature_key = ?')
    return stmt.get(featureKey) || null
  } catch (error) {
    console.error('Error getting command center feature:', error)
    return null
  }
}

/**
 * Update a Command Center feature
 */
export function updateCommandCenterFeature(featureKey: string, isEnabled: boolean): boolean {
  if (!db) return false
  try {
    const stmt = db.prepare(`
      UPDATE command_center_features
      SET is_enabled = ?, updated_at = datetime('now')
      WHERE feature_key = ?
    `)
    const result = stmt.run(isEnabled ? 1 : 0, featureKey)
    return result.changes > 0
  } catch (error) {
    console.error('Error updating command center feature:', error)
    return false
  }
}

/**
 * Get all warehouse zones
 */
export function getAllWarehouseZones(): any[] {
  if (!db) return []
  try {
    const stmt = db.prepare('SELECT * FROM warehouse_zones ORDER BY position_x')
    return stmt.all()
  } catch (error) {
    console.error('Error getting warehouse zones:', error)
    return []
  }
}

/**
 * Get active warehouse zones
 */
export function getActiveWarehouseZones(): any[] {
  if (!db) return []
  try {
    const stmt = db.prepare('SELECT * FROM warehouse_zones WHERE is_active = 1 ORDER BY position_x')
    return stmt.all()
  } catch (error) {
    console.error('Error getting active warehouse zones:', error)
    return []
  }
}

/**
 * Get a specific warehouse zone
 */
export function getWarehouseZone(id: string): any | null {
  if (!db) return null
  try {
    const stmt = db.prepare('SELECT * FROM warehouse_zones WHERE id = ?')
    return stmt.get(id) || null
  } catch (error) {
    console.error('Error getting warehouse zone:', error)
    return null
  }
}

/**
 * Create a new warehouse zone
 */
export function createWarehouseZone(zone: any): string | null {
  if (!db) return null
  try {
    const stmt = db.prepare(`
      INSERT INTO warehouse_zones (
        id, zone_name, zone_type, aisles, shelves_per_aisle, bins_per_shelf,
        position_x, position_y, position_z,
        dimensions_width, dimensions_height, dimensions_depth,
        color_code, rotation_degrees, wled_device_id, rfid_scanner_type, rfid_scanner_range,
        is_active, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const id = generateId()
    stmt.run(
      id, zone.zone_name, zone.zone_type, zone.aisles, zone.shelves_per_aisle, zone.bins_per_shelf,
      zone.position_x || 0, zone.position_y || 0, zone.position_z || 0,
      zone.dimensions_width || 10, zone.dimensions_height || 10, zone.dimensions_depth || 10,
      zone.color_code, zone.rotation_degrees || 0, zone.wled_device_id || null, zone.rfid_scanner_type, zone.rfid_scanner_range || 5.0,
      zone.is_active ? 1 : 0, zone.notes || null
    )
    return id
  } catch (error) {
    console.error('Error creating warehouse zone:', error)
    return null
  }
}

/**
 * Update a warehouse zone
 */
export function updateWarehouseZone(id: string, zone: any): boolean {
  if (!db) {
    console.error('Database not initialized in updateWarehouseZone')
    return false
  }
  try {
    console.log('updateWarehouseZone - Updating zone:', id)
    console.log('updateWarehouseZone - Zone data:', zone)

    const stmt = db.prepare(`
      UPDATE warehouse_zones
      SET zone_name = ?, zone_type = ?, aisles = ?, shelves_per_aisle = ?, bins_per_shelf = ?,
          position_x = ?, position_y = ?, position_z = ?,
          dimensions_width = ?, dimensions_height = ?, dimensions_depth = ?,
          color_code = ?, rotation_degrees = ?, wled_device_id = ?, rfid_scanner_type = ?, rfid_scanner_range = ?,
          is_active = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `)

    const is_active_value = zone.is_active ? 1 : 0
    console.log('updateWarehouseZone - is_active value:', is_active_value, 'from:', zone.is_active)

    const result = stmt.run(
      zone.zone_name, zone.zone_type, zone.aisles, zone.shelves_per_aisle, zone.bins_per_shelf,
      zone.position_x, zone.position_y, zone.position_z,
      zone.dimensions_width, zone.dimensions_height, zone.dimensions_depth,
      zone.color_code, zone.rotation_degrees || 0, zone.wled_device_id, zone.rfid_scanner_type, zone.rfid_scanner_range,
      is_active_value, zone.notes, id
    )

    console.log('updateWarehouseZone - Result changes:', result.changes)
    return result.changes > 0
  } catch (error) {
    console.error('Error updating warehouse zone:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack)
    }
    return false
  }
}

/**
 * Delete a warehouse zone
 */
export function deleteWarehouseZone(id: string): boolean {
  if (!db) return false
  try {
    const stmt = db.prepare('DELETE FROM warehouse_zones WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  } catch (error) {
    console.error('Error deleting warehouse zone:', error)
    return false
  }
}

// ===========================
// WAREHOUSE HELPERS (Migration 025)
// ===========================

/**
 * Get all warehouses
 */
export function getAllWarehouses(): any[] {
  if (!db) return []
  try {
    const stmt = db.prepare('SELECT * FROM warehouses ORDER BY warehouse_name ASC')
    return stmt.all()
  } catch (error) {
    console.error('Error getting all warehouses:', error)
    return []
  }
}

/**
 * Get active warehouses only
 */
export function getActiveWarehouses(): any[] {
  if (!db) return []
  try {
    const stmt = db.prepare('SELECT * FROM warehouses WHERE is_active = 1 ORDER BY warehouse_name ASC')
    return stmt.all()
  } catch (error) {
    console.error('Error getting active warehouses:', error)
    return []
  }
}

/**
 * Get warehouse by ID
 */
export function getWarehouseById(id: string): any | null {
  if (!db) return null
  try {
    const stmt = db.prepare('SELECT * FROM warehouses WHERE id = ?')
    return stmt.get(id) || null
  } catch (error) {
    console.error('Error getting warehouse by ID:', error)
    return null
  }
}

/**
 * Get warehouse by code
 */
export function getWarehouseByCode(code: string): any | null {
  if (!db) return null
  try {
    const stmt = db.prepare('SELECT * FROM warehouses WHERE warehouse_code = ?')
    return stmt.get(code) || null
  } catch (error) {
    console.error('Error getting warehouse by code:', error)
    return null
  }
}

/**
 * Create a new warehouse
 */
export function createWarehouse(warehouse: {
  warehouse_name: string
  warehouse_code: string
  address?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
  phone?: string
  is_active?: boolean
  notes?: string
}): any {
  if (!db) return { success: false, error: 'Database not initialized' }
  try {
    const stmt = db.prepare(`
      INSERT INTO warehouses (warehouse_name, warehouse_code, address, city, state, country, postal_code, phone, is_active, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const result = stmt.run(
      warehouse.warehouse_name,
      warehouse.warehouse_code,
      warehouse.address || null,
      warehouse.city || null,
      warehouse.state || null,
      warehouse.country || 'USA',
      warehouse.postal_code || null,
      warehouse.phone || null,
      warehouse.is_active !== false ? 1 : 0,
      warehouse.notes || null
    )
    return { success: true, id: result.lastInsertRowid }
  } catch (error) {
    console.error('Error creating warehouse:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Update warehouse
 */
export function updateWarehouse(id: string, updates: any): boolean {
  if (!db) return false
  try {
    const fields = Object.keys(updates).filter(key => updates[key] !== undefined)
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updates[field])

    const stmt = db.prepare(`UPDATE warehouses SET ${setClause}, updated_at = datetime('now') WHERE id = ?`)
    const result = stmt.run(...values, id)
    return result.changes > 0
  } catch (error) {
    console.error('Error updating warehouse:', error)
    return false
  }
}

/**
 * Delete warehouse
 */
export function deleteWarehouse(id: string): boolean {
  if (!db) return false
  try {
    const stmt = db.prepare('DELETE FROM warehouses WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  } catch (error) {
    console.error('Error deleting warehouse:', error)
    return false
  }
}

/**
 * Get zones for a specific warehouse
 */
export function getZonesByWarehouse(warehouseId: string): any[] {
  if (!db) return []
  try {
    const stmt = db.prepare('SELECT * FROM warehouse_zones WHERE warehouse_id = ? ORDER BY zone_name ASC')
    return stmt.all(warehouseId)
  } catch (error) {
    console.error('Error getting zones by warehouse:', error)
    return []
  }
}

/**
 * Get WLED devices for a specific warehouse
 */
export function getDevicesByWarehouse(warehouseId: string): any[] {
  if (!db) return []
  try {
    const stmt = db.prepare('SELECT * FROM wled_devices WHERE warehouse_id = ? ORDER BY device_name ASC')
    return stmt.all(warehouseId)
  } catch (error) {
    console.error('Error getting devices by warehouse:', error)
    return []
  }
}

/**
 * Get WLED devices for a specific zone
 */
export function getDevicesByZone(zoneId: string): any[] {
  if (!db) return []
  try {
    const stmt = db.prepare('SELECT * FROM wled_devices WHERE zone_id = ? ORDER BY device_name ASC')
    return stmt.all(zoneId)
  } catch (error) {
    console.error('Error getting devices by zone:', error)
    return []
  }
}

/**
 * Get LED segments count by sync status for a device
 */
export function getSegmentSyncStats(deviceId: string): any {
  if (!db) return { synced: 0, pending: 0, failed: 0, total: 0 }
  try {
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN sync_status = 'synced' THEN 1 ELSE 0 END) as synced,
        SUM(CASE WHEN sync_status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM led_segments
      WHERE wled_device_id = ?
    `)
    return stmt.get(deviceId) || { synced: 0, pending: 0, failed: 0, total: 0 }
  } catch (error) {
    console.error('Error getting segment sync stats:', error)
    return { synced: 0, pending: 0, failed: 0, total: 0 }
  }
}

/**
 * Get all pending sync segments for a device (for auto-sync)
 */
export function getPendingSyncSegments(deviceId: string): any[] {
  if (!db) return []
  try {
    const stmt = db.prepare(`
      SELECT * FROM led_segments
      WHERE wled_device_id = ? AND sync_status = 'pending'
      ORDER BY start_led ASC
    `)
    return stmt.all(deviceId)
  } catch (error) {
    console.error('Error getting pending sync segments:', error)
    return []
  }
}

/**
 * Mark segments as synced (bulk update)
 */
export function markSegmentsAsSynced(segmentIds: string[]): boolean {
  if (!db || segmentIds.length === 0) return false
  try {
    const placeholders = segmentIds.map(() => '?').join(',')
    const stmt = db.prepare(`
      UPDATE led_segments
      SET sync_status = 'synced',
          last_synced_at = datetime('now'),
          sync_attempts = 0
      WHERE id IN (${placeholders})
    `)
    const result = stmt.run(...segmentIds)
    return result.changes > 0
  } catch (error) {
    console.error('Error marking segments as synced:', error)
    return false
  }
}

/**
 * Mark segments as failed (increment retry counter)
 */
export function markSegmentsAsFailed(segmentIds: string[]): boolean {
  if (!db || segmentIds.length === 0) return false
  try {
    const placeholders = segmentIds.map(() => '?').join(',')
    const stmt = db.prepare(`
      UPDATE led_segments
      SET sync_status = 'failed',
          sync_attempts = sync_attempts + 1
      WHERE id IN (${placeholders})
    `)
    const result = stmt.run(...segmentIds)
    return result.changes > 0
  } catch (error) {
    console.error('Error marking segments as failed:', error)
    return false
  }
}

/**
 * Update device last_sync_at timestamp
 */
export function updateDeviceSyncTimestamp(deviceId: string): boolean {
  if (!db) return false
  try {
    const stmt = db.prepare(`
      UPDATE wled_devices
      SET last_sync_at = datetime('now')
      WHERE id = ?
    `)
    const result = stmt.run(deviceId)
    return result.changes > 0
  } catch (error) {
    console.error('Error updating device sync timestamp:', error)
    return false
  }
}

// ===========================
// CSV IMPORT STAGING HELPERS
// ===========================

/**
 * Create CSV import batch
 */
export function createImportBatch(batchId: string, rows: any[]): any {
  if (!db) return { success: false, error: 'Database not initialized' }
  try {
    const stmt = db.prepare(`
      INSERT INTO led_import_staging (
        import_batch_id, row_number, product_sku, product_name, warehouse_code, zone_name,
        device_name, device_ip, start_led, led_count, location_color, location_behavior, use_device_defaults
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const insertMany = db.transaction((rowsData: any[]) => {
      for (const row of rowsData) {
        stmt.run(
          batchId,
          row.row_number,
          row.product_sku,
          row.product_name || null,
          row.warehouse_code || null,
          row.zone_name || null,
          row.device_name || null,
          row.device_ip,
          row.start_led,
          row.led_count || 12,
          row.location_color || '#FF5733',
          row.location_behavior || 'solid',
          row.use_device_defaults !== false ? 1 : 0
        )
      }
    })

    insertMany(rows)
    return { success: true, batch_id: batchId, row_count: rows.length }
  } catch (error) {
    console.error('Error creating import batch:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Get import batch rows
 */
export function getImportBatchRows(batchId: string): any[] {
  if (!db) return []
  try {
    const stmt = db.prepare(`
      SELECT * FROM led_import_staging
      WHERE import_batch_id = ?
      ORDER BY row_number ASC
    `)
    return stmt.all(batchId)
  } catch (error) {
    console.error('Error getting import batch rows:', error)
    return []
  }
}

/**
 * Update import row validation status
 */
export function updateImportRowValidation(
  rowId: string,
  status: string,
  errors: string[] | null,
  warnings: string[] | null,
  resolvedIds: any
): boolean {
  if (!db) return false
  try {
    const stmt = db.prepare(`
      UPDATE led_import_staging
      SET validation_status = ?,
          validation_errors = ?,
          validation_warnings = ?,
          resolved_product_id = ?,
          resolved_warehouse_id = ?,
          resolved_zone_id = ?,
          resolved_device_id = ?
      WHERE id = ?
    `)
    const result = stmt.run(
      status,
      errors ? JSON.stringify(errors) : null,
      warnings ? JSON.stringify(warnings) : null,
      resolvedIds.product_id || null,
      resolvedIds.warehouse_id || null,
      resolvedIds.zone_id || null,
      resolvedIds.device_id || null,
      rowId
    )
    return result.changes > 0
  } catch (error) {
    console.error('Error updating import row validation:', error)
    return false
  }
}

/**
 * Mark import row as processed
 */
export function markImportRowProcessed(rowId: string, createdSegmentId: string): boolean {
  if (!db) return false
  try {
    const stmt = db.prepare(`
      UPDATE led_import_staging
      SET processed = 1,
          processed_at = datetime('now'),
          created_segment_id = ?
      WHERE id = ?
    `)
    const result = stmt.run(createdSegmentId, rowId)
    return result.changes > 0
  } catch (error) {
    console.error('Error marking import row as processed:', error)
    return false
  }
}

/**
 * Delete import batch (cleanup)
 */
export function deleteImportBatch(batchId: string): boolean {
  if (!db) return false
  try {
    const stmt = db.prepare('DELETE FROM led_import_staging WHERE import_batch_id = ?')
    const result = stmt.run(batchId)
    return result.changes > 0
  } catch (error) {
    console.error('Error deleting import batch:', error)
    return false
  }
}

/**
 * Get import batch statistics
 */
export function getImportBatchStats(batchId: string): any {
  if (!db) return { total: 0, valid: 0, invalid: 0, duplicate: 0, warning: 0, processed: 0 }
  try {
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN validation_status = 'valid' THEN 1 ELSE 0 END) as valid,
        SUM(CASE WHEN validation_status = 'invalid' THEN 1 ELSE 0 END) as invalid,
        SUM(CASE WHEN validation_status = 'duplicate' THEN 1 ELSE 0 END) as duplicate,
        SUM(CASE WHEN validation_status = 'warning' THEN 1 ELSE 0 END) as warning,
        SUM(CASE WHEN processed = 1 THEN 1 ELSE 0 END) as processed
      FROM led_import_staging
      WHERE import_batch_id = ?
    `)
    return stmt.get(batchId) || { total: 0, valid: 0, invalid: 0, duplicate: 0, warning: 0, processed: 0 }
  } catch (error) {
    console.error('Error getting import batch stats:', error)
    return { total: 0, valid: 0, invalid: 0, duplicate: 0, warning: 0, processed: 0 }
  }
}

/**
 * Get all automation rules
 */
export function getAllAutomationRules(): any[] {
  if (!db) return []
  try {
    const stmt = db.prepare('SELECT * FROM automation_rules ORDER BY priority, created_at DESC')
    return stmt.all()
  } catch (error) {
    console.error('Error getting automation rules:', error)
    return []
  }
}

/**
 * Get active automation rules
 */
export function getActiveAutomationRules(): any[] {
  if (!db) return []
  try {
    const stmt = db.prepare('SELECT * FROM automation_rules WHERE is_active = 1 ORDER BY priority')
    return stmt.all()
  } catch (error) {
    console.error('Error getting active automation rules:', error)
    return []
  }
}

/**
 * Get accuracy metrics
 */
export function getAccuracyMetrics(limit: number = 100): any[] {
  if (!db) return []
  try {
    const stmt = db.prepare(`
      SELECT am.*, wz.zone_name
      FROM accuracy_metrics am
      LEFT JOIN warehouse_zones wz ON am.zone_id = wz.id
      ORDER BY am.calculated_at DESC
      LIMIT ?
    `)
    return stmt.all(limit)
  } catch (error) {
    console.error('Error getting accuracy metrics:', error)
    return []
  }
}

/**
 * Create accuracy metric entry
 */
export function createAccuracyMetric(metric: any): string | null {
  if (!db) return null
  try {
    const stmt = db.prepare(`
      INSERT INTO accuracy_metrics (
        id, zone_id, accuracy_percentage, physical_count, system_count,
        discrepancy_count, metric_type, metric_period
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const id = generateId()
    stmt.run(
      id, metric.zone_id || null, metric.accuracy_percentage,
      metric.physical_count, metric.system_count, metric.discrepancy_count,
      metric.metric_type, metric.metric_period
    )
    return id
  } catch (error) {
    console.error('Error creating accuracy metric:', error)
    return null
  }
}

/**
 * Get all voice commands
 */
export function getAllVoiceCommands(): any[] {
  if (!db) return []
  try {
    const stmt = db.prepare('SELECT * FROM voice_commands WHERE is_active = 1 ORDER BY command_phrase')
    return stmt.all()
  } catch (error) {
    console.error('Error getting voice commands:', error)
    return []
  }
}