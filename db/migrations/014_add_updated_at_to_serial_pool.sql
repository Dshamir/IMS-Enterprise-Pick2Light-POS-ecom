-- Migration: Add updated_at column to serial_number_pool table
-- Date: 2025-07-09
-- Description: Add missing updated_at column to track when serial numbers were last modified

-- SQLite doesn't support dynamic defaults in ALTER TABLE, so we add without default first
ALTER TABLE serial_number_pool 
ADD COLUMN updated_at TEXT;

-- Update existing records to have an updated_at timestamp
UPDATE serial_number_pool 
SET updated_at = COALESCE(allocated_at, datetime('now'))
WHERE updated_at IS NULL;