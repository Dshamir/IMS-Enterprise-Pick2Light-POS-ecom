const Database = require('better-sqlite3');
const path = require('path');

console.log('Creating database...');

const dbPath = path.join(__dirname, 'data', 'inventory.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create basic tables
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS units (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL UNIQUE,
    symbol TEXT,
    type TEXT DEFAULT 'quantity',
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
    feature_vector TEXT,
    barcode TEXT
  );

  CREATE TABLE IF NOT EXISTS wled_devices (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    ip_address TEXT NOT NULL UNIQUE,
    total_leds INTEGER NOT NULL DEFAULT 60,
    is_online BOOLEAN DEFAULT false,
    last_seen TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS led_segments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    wled_device_id TEXT NOT NULL REFERENCES wled_devices(id) ON DELETE CASCADE,
    start_led INTEGER NOT NULL,
    led_count INTEGER NOT NULL DEFAULT 12,
    location_color TEXT DEFAULT '#FF5733',
    location_behavior TEXT DEFAULT 'solid',
    stock_mode TEXT DEFAULT 'auto',
    stock_color_1 TEXT DEFAULT '#4CAF50',
    stock_color_2 TEXT DEFAULT '#4CAF50',
    stock_color_3 TEXT DEFAULT '#4CAF50',
    stock_color_4 TEXT DEFAULT '#4CAF50',
    stock_behavior TEXT DEFAULT 'solid',
    alert_mode TEXT DEFAULT 'auto',
    alert_color_1 TEXT DEFAULT '#333333',
    alert_color_2 TEXT DEFAULT '#333333',
    alert_color_3 TEXT DEFAULT '#333333',
    alert_color_4 TEXT DEFAULT '#333333',
    alert_behavior TEXT DEFAULT 'solid',
    segment_behavior TEXT DEFAULT 'none',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

// Insert some default data
db.exec(`
  INSERT OR IGNORE INTO categories (name, description) VALUES
  ('parts', 'Mechanical, electrical, and structural parts'),
  ('consumables', 'Supplies that need regular replenishment'),
  ('equipment', 'Tools, machines, and other durable items'),
  ('tools', 'Hand tools, power tools, and maintenance equipment'),
  ('safety', 'Safety equipment and protective gear'),
  ('electrical', 'Electrical components and supplies'),
  ('automotive', 'Vehicle parts and automotive supplies'),
  ('other', 'Miscellaneous items and general inventory');

  INSERT OR IGNORE INTO units (name, symbol, type) VALUES
  ('pieces', 'pcs', 'quantity'),
  ('kilograms', 'kg', 'weight'),
  ('grams', 'g', 'weight'),
  ('liters', 'L', 'volume'),
  ('milliliters', 'mL', 'volume'),
  ('meters', 'm', 'length'),
  ('centimeters', 'cm', 'length'),
  ('millimeters', 'mm', 'length'),
  ('hours', 'hr', 'time'),
  ('minutes', 'min', 'time'),
  ('seconds', 's', 'time'),
  ('amperes', 'A', 'current'),
  ('volts', 'V', 'voltage'),
  ('watts', 'W', 'power'),
  ('ohms', 'Ω', 'resistance'),
  ('fahrenheit', '°F', 'temperature');

  INSERT OR IGNORE INTO wled_devices (name, ip_address, total_leds) VALUES
  ('Main Storage Rack', '192.168.1.100', 300),
  ('Parts Bin Array', '192.168.1.101', 240),
  ('Tool Cabinet', '192.168.1.102', 180);
`);

db.close();

console.log('Database created successfully!');
console.log('Location:', dbPath);