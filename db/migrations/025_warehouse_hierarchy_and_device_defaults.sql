-- ============================================
-- Migration 025: Warehouse Hierarchy & Device Defaults
-- Purpose: Enterprise-grade WLED management with warehouse/zone organization,
--          device-level defaults, auto-sync, and CSV bulk import support
-- Created: 2025-10-14
-- ============================================

-- ============================================
-- PART A: Create Warehouses Table
-- ============================================
CREATE TABLE IF NOT EXISTS warehouses (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    warehouse_name TEXT UNIQUE NOT NULL,
    warehouse_code TEXT UNIQUE NOT NULL,  -- e.g., "LA-01", "NY-02", "WH-A"
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'USA',
    postal_code TEXT,
    phone TEXT,
    is_active INTEGER DEFAULT 1,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for fast warehouse lookups
CREATE INDEX IF NOT EXISTS idx_warehouses_active ON warehouses(is_active);
CREATE INDEX IF NOT EXISTS idx_warehouses_code ON warehouses(warehouse_code);
CREATE INDEX IF NOT EXISTS idx_warehouses_name ON warehouses(warehouse_name);

-- ============================================
-- PART B: Link Warehouse Zones to Warehouses
-- ============================================
ALTER TABLE warehouse_zones ADD COLUMN warehouse_id TEXT;

-- Create index for warehouse-zone relationship
CREATE INDEX IF NOT EXISTS idx_warehouse_zones_warehouse ON warehouse_zones(warehouse_id);

-- ============================================
-- PART C: Add Device-Level Defaults to WLED Devices
-- ============================================

-- Location/Organization columns
ALTER TABLE wled_devices ADD COLUMN warehouse_id TEXT;
ALTER TABLE wled_devices ADD COLUMN zone_id TEXT;

-- Device-level default behavior settings (inherited by segments)
ALTER TABLE wled_devices ADD COLUMN default_animation_speed INTEGER DEFAULT 128;
ALTER TABLE wled_devices ADD COLUMN default_animation_intensity INTEGER DEFAULT 128;
ALTER TABLE wled_devices ADD COLUMN default_location_behavior TEXT DEFAULT 'solid';
ALTER TABLE wled_devices ADD COLUMN default_stock_behavior TEXT DEFAULT 'solid';
ALTER TABLE wled_devices ADD COLUMN default_alert_behavior TEXT DEFAULT 'solid';

-- Auto-sync configuration
ALTER TABLE wled_devices ADD COLUMN auto_sync_enabled INTEGER DEFAULT 1;
ALTER TABLE wled_devices ADD COLUMN last_sync_at TEXT;

-- Cached segment count for performance (updated via trigger)
ALTER TABLE wled_devices ADD COLUMN segment_count INTEGER DEFAULT 0;

-- Indexes for device queries
CREATE INDEX IF NOT EXISTS idx_wled_devices_warehouse ON wled_devices(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wled_devices_zone ON wled_devices(zone_id);
CREATE INDEX IF NOT EXISTS idx_wled_devices_auto_sync ON wled_devices(auto_sync_enabled);
CREATE INDEX IF NOT EXISTS idx_wled_devices_status_sync ON wled_devices(status, auto_sync_enabled); -- Composite for auto-sync queries

-- ============================================
-- PART D: Add Sync Tracking to LED Segments
-- ============================================

-- Location tagging
ALTER TABLE led_segments ADD COLUMN warehouse_id TEXT;
ALTER TABLE led_segments ADD COLUMN zone_id TEXT;

-- Sync tracking
ALTER TABLE led_segments ADD COLUMN last_synced_at TEXT;
ALTER TABLE led_segments ADD COLUMN sync_status TEXT DEFAULT 'pending';  -- 'synced', 'pending', 'failed'
ALTER TABLE led_segments ADD COLUMN sync_attempts INTEGER DEFAULT 0;

-- Configuration inheritance
ALTER TABLE led_segments ADD COLUMN use_device_defaults INTEGER DEFAULT 1;  -- 1 = inherit device defaults, 0 = use custom

-- Indexes for sync operations
CREATE INDEX IF NOT EXISTS idx_led_segments_warehouse ON led_segments(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_led_segments_zone ON led_segments(zone_id);
CREATE INDEX IF NOT EXISTS idx_led_segments_sync_status ON led_segments(sync_status);
CREATE INDEX IF NOT EXISTS idx_led_segments_device_status ON led_segments(wled_device_id, sync_status); -- Composite for bulk sync
CREATE INDEX IF NOT EXISTS idx_led_segments_product_device ON led_segments(product_id, wled_device_id); -- Composite for fast lookups

-- ============================================
-- PART E: Add Location Tracking to Products
-- ============================================
ALTER TABLE products ADD COLUMN warehouse_id TEXT;
ALTER TABLE products ADD COLUMN zone_id TEXT;
ALTER TABLE products ADD COLUMN primary_wled_device_id TEXT;  -- For fast filtering by device

-- Indexes for product location queries
CREATE INDEX IF NOT EXISTS idx_products_warehouse ON products(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_products_zone ON products(zone_id);
CREATE INDEX IF NOT EXISTS idx_products_primary_device ON products(primary_wled_device_id);
CREATE INDEX IF NOT EXISTS idx_products_warehouse_zone ON products(warehouse_id, zone_id); -- Composite for filtered views

-- ============================================
-- PART F: CSV Import Staging Table
-- ============================================
CREATE TABLE IF NOT EXISTS led_import_staging (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    import_batch_id TEXT NOT NULL,              -- Group imports together
    row_number INTEGER NOT NULL,                -- Original CSV row number

    -- Input data from CSV
    product_sku TEXT,
    product_name TEXT,
    warehouse_code TEXT,
    zone_name TEXT,
    device_name TEXT,
    device_ip TEXT,
    start_led INTEGER,
    led_count INTEGER DEFAULT 12,
    location_color TEXT DEFAULT '#FF5733',
    location_behavior TEXT DEFAULT 'solid',
    use_device_defaults INTEGER DEFAULT 1,

    -- Resolved IDs (filled during validation)
    resolved_product_id TEXT,
    resolved_warehouse_id TEXT,
    resolved_zone_id TEXT,
    resolved_device_id TEXT,

    -- Validation status
    validation_status TEXT DEFAULT 'pending',   -- 'valid', 'invalid', 'duplicate', 'warning'
    validation_errors TEXT,                     -- JSON array of error messages
    validation_warnings TEXT,                   -- JSON array of warning messages

    -- Processing status
    processed INTEGER DEFAULT 0,
    processed_at TEXT,
    created_segment_id TEXT,                    -- ID of created segment after processing

    created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for import operations
CREATE INDEX IF NOT EXISTS idx_led_import_batch ON led_import_staging(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_led_import_status ON led_import_staging(validation_status, processed);
CREATE INDEX IF NOT EXISTS idx_led_import_batch_status ON led_import_staging(import_batch_id, validation_status);

-- ============================================
-- PART G: Triggers for Automated Maintenance
-- ============================================

-- Trigger: Update segment_count when segments are added
CREATE TRIGGER IF NOT EXISTS trg_led_segments_insert_count
AFTER INSERT ON led_segments
BEGIN
    UPDATE wled_devices
    SET segment_count = (
        SELECT COUNT(*) FROM led_segments WHERE wled_device_id = NEW.wled_device_id
    )
    WHERE id = NEW.wled_device_id;
END;

-- Trigger: Update segment_count when segments are deleted
CREATE TRIGGER IF NOT EXISTS trg_led_segments_delete_count
AFTER DELETE ON led_segments
BEGIN
    UPDATE wled_devices
    SET segment_count = (
        SELECT COUNT(*) FROM led_segments WHERE wled_device_id = OLD.wled_device_id
    )
    WHERE id = OLD.wled_device_id;
END;

-- Trigger: Update segment_count when device changes
CREATE TRIGGER IF NOT EXISTS trg_led_segments_update_count
AFTER UPDATE OF wled_device_id ON led_segments
BEGIN
    -- Update old device count
    UPDATE wled_devices
    SET segment_count = (
        SELECT COUNT(*) FROM led_segments WHERE wled_device_id = OLD.wled_device_id
    )
    WHERE id = OLD.wled_device_id;

    -- Update new device count
    UPDATE wled_devices
    SET segment_count = (
        SELECT COUNT(*) FROM led_segments WHERE wled_device_id = NEW.wled_device_id
    )
    WHERE id = NEW.wled_device_id;
END;

-- Trigger: Auto-set warehouse/zone on segment from device
CREATE TRIGGER IF NOT EXISTS trg_led_segments_inherit_location
AFTER INSERT ON led_segments
WHEN NEW.warehouse_id IS NULL OR NEW.zone_id IS NULL
BEGIN
    UPDATE led_segments
    SET
        warehouse_id = COALESCE(NEW.warehouse_id, (SELECT warehouse_id FROM wled_devices WHERE id = NEW.wled_device_id)),
        zone_id = COALESCE(NEW.zone_id, (SELECT zone_id FROM wled_devices WHERE id = NEW.wled_device_id))
    WHERE id = NEW.id;
END;

-- Trigger: Update product location when primary device changes
CREATE TRIGGER IF NOT EXISTS trg_products_update_location
AFTER UPDATE OF primary_wled_device_id ON products
WHEN NEW.primary_wled_device_id IS NOT NULL
BEGIN
    UPDATE products
    SET
        warehouse_id = (SELECT warehouse_id FROM wled_devices WHERE id = NEW.primary_wled_device_id),
        zone_id = (SELECT zone_id FROM wled_devices WHERE id = NEW.primary_wled_device_id)
    WHERE id = NEW.id;
END;

-- ============================================
-- PART H: Initialize Segment Counts for Existing Devices
-- ============================================
UPDATE wled_devices
SET segment_count = (
    SELECT COUNT(*)
    FROM led_segments
    WHERE led_segments.wled_device_id = wled_devices.id
);

-- ============================================
-- PART I: Create Default Warehouse (Optional - if no warehouses exist)
-- ============================================
INSERT OR IGNORE INTO warehouses (warehouse_code, warehouse_name, is_active)
VALUES ('DEFAULT', 'Default Warehouse', 1);

-- ============================================
-- Migration Complete
-- ============================================
-- Summary of changes:
-- - Created warehouses table with 13 columns
-- - Added 2 columns to warehouse_zones (warehouse_id linkage)
-- - Added 10 columns to wled_devices (location, defaults, sync)
-- - Added 7 columns to led_segments (location, sync tracking)
-- - Added 3 columns to products (location tracking)
-- - Created led_import_staging table with 21 columns
-- - Added 15 performance indexes
-- - Created 5 triggers for automated maintenance
-- - Initialized segment counts for existing devices
--
-- Total database enhancements: 33 new columns, 1 new table, 15 indexes, 5 triggers
-- ============================================
