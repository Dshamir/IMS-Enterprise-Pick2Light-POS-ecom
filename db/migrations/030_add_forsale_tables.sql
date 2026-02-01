-- =============================================
-- FOR SALE MODULE - SQLite Schema
-- Migration: 018_add_forsale_tables.sql
-- Date: December 31, 2025
-- =============================================

-- For Sale Categories (New / Pre-Owned)
CREATE TABLE IF NOT EXISTS forsale_categories (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- For Sale Subcategories
CREATE TABLE IF NOT EXISTS forsale_subcategories (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  parent_category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (parent_category_id) REFERENCES forsale_categories(id) ON DELETE CASCADE,
  UNIQUE(parent_category_id, slug)
);

-- Product For Sale Extension (links to products table)
CREATE TABLE IF NOT EXISTS product_for_sale (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  product_id TEXT UNIQUE NOT NULL,
  enabled INTEGER DEFAULT 0,
  sale_category_id TEXT,
  sub_category_id TEXT,
  condition TEXT CHECK(condition IN ('like_new', 'good', 'fair', 'for_parts')),
  marketplace_title TEXT,
  marketplace_description TEXT,
  suggested_price REAL,
  final_price REAL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'optimized', 'exported')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (sale_category_id) REFERENCES forsale_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (sub_category_id) REFERENCES forsale_subcategories(id) ON DELETE SET NULL
);

-- Extracted Specifications per Product
CREATE TABLE IF NOT EXISTS forsale_specifications (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  product_for_sale_id TEXT NOT NULL,
  spec_key TEXT NOT NULL,
  spec_value TEXT NOT NULL,
  confidence REAL DEFAULT 1.0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (product_for_sale_id) REFERENCES product_for_sale(id) ON DELETE CASCADE
);

-- Price Recommendation History
CREATE TABLE IF NOT EXISTS forsale_price_history (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  product_for_sale_id TEXT NOT NULL,
  price REAL NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (product_for_sale_id) REFERENCES product_for_sale(id) ON DELETE CASCADE
);

-- Market Data per Product per Platform
CREATE TABLE IF NOT EXISTS forsale_market_data (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  product_for_sale_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK(platform IN ('ebay', 'facebook', 'craigslist')),
  average_price REAL,
  min_price REAL,
  max_price REAL,
  listing_count INTEGER DEFAULT 0,
  last_scraped TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (product_for_sale_id) REFERENCES product_for_sale(id) ON DELETE CASCADE,
  UNIQUE(product_for_sale_id, platform)
);

-- Export History Tracking
CREATE TABLE IF NOT EXISTS forsale_export_history (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  product_for_sale_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  format TEXT NOT NULL,
  file_path TEXT,
  exported_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (product_for_sale_id) REFERENCES product_for_sale(id) ON DELETE CASCADE
);

-- Market Price Cache (for search queries - SerpAPI results)
CREATE TABLE IF NOT EXISTS market_price_cache (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  search_query TEXT NOT NULL,
  platform TEXT NOT NULL CHECK(platform IN ('ebay', 'facebook', 'craigslist')),
  average_price REAL,
  median_price REAL,
  min_price REAL,
  max_price REAL,
  listing_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

-- Individual Cached Market Listings
CREATE TABLE IF NOT EXISTS market_listings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  cache_id TEXT NOT NULL,
  title TEXT NOT NULL,
  price REAL NOT NULL,
  condition TEXT,
  url TEXT,
  image_url TEXT,
  listed_date TEXT,
  FOREIGN KEY (cache_id) REFERENCES market_price_cache(id) ON DELETE CASCADE
);

-- SQLite Cached Templates (fallback when ChromaDB unavailable)
CREATE TABLE IF NOT EXISTS forsale_cached_templates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  template_type TEXT NOT NULL CHECK(template_type IN ('title', 'description', 'spec')),
  category TEXT,
  platform TEXT,
  template_text TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_forsale_subcategories_parent ON forsale_subcategories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_product_for_sale_enabled ON product_for_sale(enabled);
CREATE INDEX IF NOT EXISTS idx_product_for_sale_category ON product_for_sale(sale_category_id);
CREATE INDEX IF NOT EXISTS idx_product_for_sale_subcategory ON product_for_sale(sub_category_id);
CREATE INDEX IF NOT EXISTS idx_product_for_sale_status ON product_for_sale(status);
CREATE INDEX IF NOT EXISTS idx_product_for_sale_product ON product_for_sale(product_id);
CREATE INDEX IF NOT EXISTS idx_forsale_specs_product ON forsale_specifications(product_for_sale_id);
CREATE INDEX IF NOT EXISTS idx_market_cache_query ON market_price_cache(search_query);
CREATE INDEX IF NOT EXISTS idx_market_cache_platform ON market_price_cache(platform);
CREATE INDEX IF NOT EXISTS idx_market_cache_expires ON market_price_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_forsale_templates_type ON forsale_cached_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_forsale_templates_category ON forsale_cached_templates(category);
