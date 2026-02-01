-- Migration: Add core identification fields to product_instances table (Phase 1A)
-- Date: 2025-07-09
-- Description: Add core identification fields for enhanced serial number tracking
--              Phase 1A: model, serial_number_custom, part_number, counter

-- Add core identification fields to product_instances table
ALTER TABLE product_instances ADD COLUMN model TEXT;
ALTER TABLE product_instances ADD COLUMN serial_number_custom TEXT;
ALTER TABLE product_instances ADD COLUMN part_number TEXT;
ALTER TABLE product_instances ADD COLUMN counter INTEGER;

-- Create indexes for the new fields for better performance
CREATE INDEX IF NOT EXISTS idx_product_instances_model ON product_instances(model);
CREATE INDEX IF NOT EXISTS idx_product_instances_serial_number_custom ON product_instances(serial_number_custom);
CREATE INDEX IF NOT EXISTS idx_product_instances_part_number ON product_instances(part_number);
CREATE INDEX IF NOT EXISTS idx_product_instances_counter ON product_instances(counter);

-- Create unique constraint on serial_number_custom + product_id to prevent duplicate custom serials
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_instances_unique_custom_serial_product 
ON product_instances(product_id, serial_number_custom) 
WHERE serial_number_custom IS NOT NULL;

-- Create unique constraint on part_number + serial_number_custom for traceability
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_instances_unique_part_serial 
ON product_instances(part_number, serial_number_custom) 
WHERE part_number IS NOT NULL AND serial_number_custom IS NOT NULL;

-- Update the schema comments to document the new fields
-- Phase 1A Core Identification Fields:
-- - model (TEXT) - Product model identifier
-- - serial_number_custom (TEXT) - User-defined serial number format (e.g., "RTPCR P4V3C202103LAB00001xxx")
-- - part_number (TEXT) - Part number (P/N) for the product
-- - counter (INTEGER) - Sequential counter for instances

-- Note: The existing serial_number field is preserved for backward compatibility
-- The new serial_number_custom field allows for user-defined serial formats