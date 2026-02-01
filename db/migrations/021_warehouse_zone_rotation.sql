-- Warehouse Zone Rotation Support Migration
-- Adds rotation field to warehouse_zones table for interactive 3D canvas manipulation

-- Add rotation_degrees column to warehouse_zones
-- Values represent rotation in degrees (0-360) for zone orientation
ALTER TABLE warehouse_zones ADD COLUMN rotation_degrees REAL DEFAULT 0;

-- Update existing zones to have 0 rotation
UPDATE warehouse_zones SET rotation_degrees = 0 WHERE rotation_degrees IS NULL;

-- Create index for rotation queries (optional, for future filtering)
CREATE INDEX IF NOT EXISTS idx_warehouse_zones_rotation ON warehouse_zones(rotation_degrees);
