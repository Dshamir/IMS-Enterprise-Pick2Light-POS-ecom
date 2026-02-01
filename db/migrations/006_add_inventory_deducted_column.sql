-- Migration: Add inventory_deducted column to production_runs table
-- Date: 2025-07-09
-- Description: Add inventory_deducted column to track whether inventory has been deducted for a production run

-- Add inventory_deducted column to production_runs table
ALTER TABLE production_runs ADD COLUMN inventory_deducted INTEGER DEFAULT 0;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_production_runs_inventory_deducted ON production_runs(inventory_deducted);

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
-- - inventory_deducted (INTEGER DEFAULT 0) -- NEW: 0 = not deducted, 1 = deducted
-- - created_at (TEXT DEFAULT datetime('now'))
-- - updated_at (TEXT DEFAULT datetime('now'))