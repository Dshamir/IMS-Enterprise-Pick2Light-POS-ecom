-- Migration: Add new fields to products table
-- Date: 2025-01-26
-- Description: Expand products table with manufacturer info, location, distributor, and product URLs

-- Add new columns to products table
ALTER TABLE products ADD COLUMN mfgname TEXT DEFAULT NULL;
ALTER TABLE products ADD COLUMN mfgnum TEXT DEFAULT NULL;
ALTER TABLE products ADD COLUMN Location TEXT DEFAULT NULL;
ALTER TABLE products ADD COLUMN loc_tag TEXT DEFAULT NULL;
ALTER TABLE products ADD COLUMN distributor TEXT DEFAULT NULL;
ALTER TABLE products ADD COLUMN Product_url_1 TEXT DEFAULT NULL;
ALTER TABLE products ADD COLUMN Product_url_2 TEXT DEFAULT NULL;
ALTER TABLE products ADD COLUMN Product_url_3 TEXT DEFAULT NULL;

-- Create indexes for searchable fields
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_mfgnum ON products(mfgnum);
CREATE INDEX IF NOT EXISTS idx_products_location ON products(Location);
CREATE INDEX IF NOT EXISTS idx_products_mfgname ON products(mfgname);
CREATE INDEX IF NOT EXISTS idx_products_distributor ON products(distributor);

-- Create composite index for location-based searches
CREATE INDEX IF NOT EXISTS idx_products_location_category ON products(Location, category);

-- Optional: Add constraints if needed
-- ALTER TABLE products ADD CONSTRAINT chk_valid_urls CHECK (
--   (Product_url_1 IS NULL OR Product_url_1 LIKE 'http%') AND
--   (Product_url_2 IS NULL OR Product_url_2 LIKE 'http%') AND
--   (Product_url_3 IS NULL OR Product_url_3 LIKE 'http%')
-- );