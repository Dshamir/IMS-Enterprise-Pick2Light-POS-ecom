-- Migration: Add products_created column to production_runs table
-- Date: 2025-07-09
-- Description: Add products_created column to track whether product instances have been created for a completed production run

-- Add products_created column to production_runs table
ALTER TABLE production_runs ADD COLUMN products_created INTEGER DEFAULT 0;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_production_runs_products_created ON production_runs(products_created);

-- Update the table schema comment
-- The complete production_runs table now has:
-- - id (TEXT PRIMARY KEY)
-- - bom_id (TEXT NOT NULL)
-- - planned_quantity (INTEGER NOT NULL DEFAULT 1)
-- - actual_quantity (INTEGER DEFAULT 0)
-- - start_date (TEXT)
-- - end_date (TEXT)
-- - status (TEXT DEFAULT 'planned')
-- - notes (TEXT)
-- - inventory_deducted (INTEGER DEFAULT 0) -- 0 = not deducted, 1 = deducted
-- - products_created (INTEGER DEFAULT 0) -- NEW: 0 = not created, 1 = created
-- - created_at (TEXT DEFAULT datetime('now'))
-- - updated_at (TEXT DEFAULT datetime('now'))