-- Migration: Add serial_config column to production_runs table
-- Date: 2025-07-09
-- Description: Add serial number configuration storage for production runs

-- Add serial_config column to store JSON configuration for serial number generation
ALTER TABLE production_runs ADD COLUMN serial_config TEXT;

-- Create index for performance (optional, but useful for queries)
CREATE INDEX IF NOT EXISTS idx_production_runs_serial_config ON production_runs(serial_config);

-- Update the schema comments to document the new field
-- The serial_config column stores JSON configuration for serial number generation:
-- {
--   "model": "RTPCR",
--   "partNumberPrefix": "P/N",
--   "useCustomFormat": true,
--   "counterStart": 1
-- }