-- Migration: Add image support to manufacturing entities
-- Date: 2025-07-10
-- Description: Add image_url fields to projects, production_lines, manufacturing_boms, and production_runs tables

-- Add image_url field to projects table
ALTER TABLE projects ADD COLUMN image_url TEXT;

-- Add image_url field to production_lines table
ALTER TABLE production_lines ADD COLUMN image_url TEXT;

-- Add image_url field to manufacturing_boms table
ALTER TABLE manufacturing_boms ADD COLUMN image_url TEXT;

-- Add image_url field to production_runs table
ALTER TABLE production_runs ADD COLUMN image_url TEXT;

-- Create indexes for performance (optional, for image-based queries)
CREATE INDEX IF NOT EXISTS idx_projects_image ON projects(image_url) WHERE image_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_production_lines_image ON production_lines(image_url) WHERE image_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_manufacturing_boms_image ON manufacturing_boms(image_url) WHERE image_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_production_runs_image ON production_runs(image_url) WHERE image_url IS NOT NULL;

-- Update any existing records to ensure compatibility (optional - adds default NULL values which SQLite handles automatically)
-- No need for explicit UPDATE statements as new columns are automatically NULL

-- Schema documentation update
-- Added image_url support to manufacturing entities:
-- - projects.image_url: Optional project image/logo
-- - production_lines.image_url: Optional production line diagram/photo
-- - manufacturing_boms.image_url: Optional BOM schematic/diagram  
-- - production_runs.image_url: Optional production run photo/documentation
-- Images stored in /public/uploads/[entity-type]/ directories