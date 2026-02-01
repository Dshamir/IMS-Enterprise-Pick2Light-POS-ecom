-- Migration: Add missing placeholder pattern fields to serial number templates
-- Date: 2025-07-10
-- Description: Add num_wells_pattern, kind_pattern, color_code_pattern fields to support all placeholders

-- Add new columns for missing placeholder patterns
ALTER TABLE serial_number_templates ADD COLUMN num_wells_pattern TEXT DEFAULT 'PIV';
ALTER TABLE serial_number_templates ADD COLUMN kind_pattern TEXT DEFAULT 'RTPCR';
ALTER TABLE serial_number_templates ADD COLUMN color_code_pattern TEXT DEFAULT 'W';

-- Update existing templates with sensible defaults
UPDATE serial_number_templates SET 
    num_wells_pattern = 'PIV',
    kind_pattern = 'RTPCR', 
    color_code_pattern = 'W'
WHERE num_wells_pattern IS NULL OR kind_pattern IS NULL OR color_code_pattern IS NULL;

-- Create indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_serial_templates_num_wells ON serial_number_templates(num_wells_pattern);
CREATE INDEX IF NOT EXISTS idx_serial_templates_kind ON serial_number_templates(kind_pattern);
CREATE INDEX IF NOT EXISTS idx_serial_templates_color_code ON serial_number_templates(color_code_pattern);

-- Update the active templates view to include new fields
DROP VIEW IF EXISTS v_active_serial_templates;
CREATE VIEW v_active_serial_templates AS
SELECT 
    id,
    name,
    description,
    format_template,
    model_pattern,
    version_pattern,
    num_wells_pattern,
    kind_pattern,
    color_code_pattern,
    product_type,
    facility_code,
    counter_start,
    is_default,
    created_at
FROM serial_number_templates 
WHERE is_active = 1
ORDER BY is_default DESC, name ASC;

-- Schema documentation update
-- Added support for complete RTPCR format placeholders:
-- - {NUM_WELLS}: Number of wells identifier (e.g., PIV, 25, XXL)
-- - {KIND}: Device kind/type (e.g., RTPCR, KIMERA, LAB)  
-- - {COLOR_CODE}: Color code identifier (e.g., W, R, B, GREEN)
-- This enables full user control over template placeholders