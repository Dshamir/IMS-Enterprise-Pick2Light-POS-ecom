-- Add missing fields to production_lines table for UI compatibility
-- This migration adds the fields that the UI components expect

-- Add hourly_rate field for cost calculation
ALTER TABLE production_lines ADD COLUMN hourly_rate REAL DEFAULT 0;

-- Add shift_hours field for daily cost calculation
ALTER TABLE production_lines ADD COLUMN shift_hours INTEGER DEFAULT 8;

-- Add department field for organization
ALTER TABLE production_lines ADD COLUMN department TEXT;

-- Update the table schema to match UI expectations
-- The complete production_lines table now has:
-- - id (TEXT PRIMARY KEY)
-- - name (TEXT NOT NULL)
-- - description (TEXT)
-- - schedule_type (TEXT DEFAULT 'continuous')
-- - capacity (INTEGER DEFAULT 1)
-- - status (TEXT DEFAULT 'active')
-- - location (TEXT)
-- - notes (TEXT)
-- - hourly_rate (REAL DEFAULT 0)
-- - shift_hours (INTEGER DEFAULT 8)
-- - department (TEXT)
-- - created_at (TEXT DEFAULT datetime('now'))
-- - updated_at (TEXT DEFAULT datetime('now'))