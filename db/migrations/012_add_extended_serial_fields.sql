-- Migration: Add Phase 1B extended serial number fields to product_instances table
-- Date: 2025-07-09
-- Description: Add remaining 17 fields for comprehensive serial number tracking
--              Phase 1B: Extended fields for complete product lifecycle management

-- Add extended identification and specification fields
ALTER TABLE product_instances ADD COLUMN kind TEXT;
ALTER TABLE product_instances ADD COLUMN use_case TEXT;
ALTER TABLE product_instances ADD COLUMN version TEXT;
ALTER TABLE product_instances ADD COLUMN production_year INTEGER;
ALTER TABLE product_instances ADD COLUMN num_wells INTEGER;
ALTER TABLE product_instances ADD COLUMN application TEXT;
ALTER TABLE product_instances ADD COLUMN machine_name TEXT;
ALTER TABLE product_instances ADD COLUMN note TEXT;
ALTER TABLE product_instances ADD COLUMN input_specs TEXT;

-- Add color and appearance fields
ALTER TABLE product_instances ADD COLUMN color_code TEXT;
ALTER TABLE product_instances ADD COLUMN color TEXT;

-- Add personnel and responsibility fields
ALTER TABLE product_instances ADD COLUMN self_test_by TEXT;
ALTER TABLE product_instances ADD COLUMN calibrated_by TEXT;
ALTER TABLE product_instances ADD COLUMN used_by TEXT;

-- Add calibration and maintenance date fields
ALTER TABLE product_instances ADD COLUMN calibration_date TEXT;
ALTER TABLE product_instances ADD COLUMN recalibration_date TEXT;

-- Create indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_product_instances_kind ON product_instances(kind);
CREATE INDEX IF NOT EXISTS idx_product_instances_use_case ON product_instances(use_case);
CREATE INDEX IF NOT EXISTS idx_product_instances_version ON product_instances(version);
CREATE INDEX IF NOT EXISTS idx_product_instances_production_year ON product_instances(production_year);
CREATE INDEX IF NOT EXISTS idx_product_instances_application ON product_instances(application);
CREATE INDEX IF NOT EXISTS idx_product_instances_machine_name ON product_instances(machine_name);
CREATE INDEX IF NOT EXISTS idx_product_instances_color_code ON product_instances(color_code);
CREATE INDEX IF NOT EXISTS idx_product_instances_self_test_by ON product_instances(self_test_by);
CREATE INDEX IF NOT EXISTS idx_product_instances_calibrated_by ON product_instances(calibrated_by);
CREATE INDEX IF NOT EXISTS idx_product_instances_used_by ON product_instances(used_by);
CREATE INDEX IF NOT EXISTS idx_product_instances_calibration_date ON product_instances(calibration_date);
CREATE INDEX IF NOT EXISTS idx_product_instances_recalibration_date ON product_instances(recalibration_date);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_product_instances_kind_version ON product_instances(kind, version);
CREATE INDEX IF NOT EXISTS idx_product_instances_production_year_version ON product_instances(production_year, version);
CREATE INDEX IF NOT EXISTS idx_product_instances_calibrated_by_date ON product_instances(calibrated_by, calibration_date);

-- Update the schema comments to document the new fields
-- Phase 1B Extended Serial Number Fields:
-- 
-- Identification & Specification:
-- - kind (TEXT) - Product kind/type identifier
-- - use_case (TEXT) - Intended use case or purpose (renamed from 'use' to avoid SQL keyword)
-- - version (TEXT) - Product version identifier  
-- - production_year (INTEGER) - Year of production
-- - num_wells (INTEGER) - Number of wells (for applicable products)
-- - application (TEXT) - Specific application or context
-- - machine_name (TEXT) - Associated machine or equipment name
-- - note (TEXT) - General notes and observations
-- - input_specs (TEXT) - Input specifications and requirements
--
-- Appearance & Color:
-- - color_code (TEXT) - Color code identifier
-- - color (TEXT) - Color description
--
-- Personnel & Responsibility:
-- - self_test_by (TEXT) - Person who performed self-test
-- - calibrated_by (TEXT) - Person who performed calibration
-- - used_by (TEXT) - Person or department using the product
--
-- Calibration & Maintenance:
-- - calibration_date (TEXT) - Date of calibration
-- - recalibration_date (TEXT) - Date for next recalibration
--
-- Note: 'use' field renamed to 'use_case' to avoid SQL reserved keyword conflicts