-- Migration: Add product_instances table and manufacturing fields to products table
-- Date: 2025-07-09
-- Description: Add product_instances table for tracking individual manufactured product instances
--              and add manufacturing-related fields to products table

-- First, add manufacturing fields to products table
ALTER TABLE products ADD COLUMN is_manufactured INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN bom_id TEXT REFERENCES manufacturing_boms(id);
ALTER TABLE products ADD COLUMN default_production_run_id TEXT REFERENCES production_runs(id);

-- Create product_instances table for tracking individual manufactured product instances
CREATE TABLE IF NOT EXISTS product_instances (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  product_id TEXT NOT NULL,
  production_run_id TEXT NOT NULL,
  serial_number TEXT,
  batch_number TEXT,
  instance_status TEXT DEFAULT 'produced', -- produced, in_qa, released, shipped, returned, defective
  manufacture_date TEXT,
  qa_date TEXT,
  release_date TEXT,
  shipped_date TEXT,
  tracking_number TEXT,
  customer_id TEXT,
  quality_notes TEXT,
  defect_reason TEXT,
  repair_notes TEXT,
  location TEXT,
  warranty_start_date TEXT,
  warranty_end_date TEXT,
  maintenance_schedule TEXT,
  last_maintenance_date TEXT,
  next_maintenance_date TEXT,
  metadata TEXT, -- JSON string for additional custom metadata
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (production_run_id) REFERENCES production_runs(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_is_manufactured ON products(is_manufactured);
CREATE INDEX IF NOT EXISTS idx_products_bom_id ON products(bom_id);
CREATE INDEX IF NOT EXISTS idx_products_default_production_run_id ON products(default_production_run_id);

CREATE INDEX IF NOT EXISTS idx_product_instances_product_id ON product_instances(product_id);
CREATE INDEX IF NOT EXISTS idx_product_instances_production_run_id ON product_instances(production_run_id);
CREATE INDEX IF NOT EXISTS idx_product_instances_serial_number ON product_instances(serial_number);
CREATE INDEX IF NOT EXISTS idx_product_instances_batch_number ON product_instances(batch_number);
CREATE INDEX IF NOT EXISTS idx_product_instances_status ON product_instances(instance_status);
CREATE INDEX IF NOT EXISTS idx_product_instances_manufacture_date ON product_instances(manufacture_date);
CREATE INDEX IF NOT EXISTS idx_product_instances_tracking_number ON product_instances(tracking_number);
CREATE INDEX IF NOT EXISTS idx_product_instances_customer_id ON product_instances(customer_id);
CREATE INDEX IF NOT EXISTS idx_product_instances_location ON product_instances(location);

-- Create a unique constraint on serial_number + product_id to prevent duplicate serials for the same product
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_instances_unique_serial_product 
ON product_instances(product_id, serial_number) 
WHERE serial_number IS NOT NULL;

-- Create a unique constraint on batch_number + product_id to help with batch tracking
CREATE INDEX IF NOT EXISTS idx_product_instances_batch_product ON product_instances(product_id, batch_number);

-- Update the products table schema comment
-- The complete products table now has additional manufacturing fields:
-- - is_manufactured (INTEGER DEFAULT 0) -- 0 = not manufactured, 1 = manufactured
-- - bom_id (TEXT REFERENCES manufacturing_boms(id)) -- Default BOM for this product
-- - default_production_run_id (TEXT REFERENCES production_runs(id)) -- Default production run template

-- The product_instances table tracks individual manufactured items with:
-- - Basic identification: product_id, production_run_id, serial_number, batch_number
-- - Status tracking: instance_status (produced, in_qa, released, shipped, returned, defective)
-- - Lifecycle dates: manufacture_date, qa_date, release_date, shipped_date
-- - Shipping: tracking_number, customer_id
-- - Quality: quality_notes, defect_reason, repair_notes
-- - Location: location (current physical location)
-- - Warranty: warranty_start_date, warranty_end_date
-- - Maintenance: maintenance_schedule, last_maintenance_date, next_maintenance_date
-- - Extensibility: metadata (JSON string for custom fields)