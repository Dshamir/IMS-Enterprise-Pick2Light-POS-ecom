-- ============================================
-- Migration 026: Locate Override Color
-- Purpose: Add locate override color feature to LED segments for high-visibility
--          product location in warehouse operations
-- Created: 2025-10-17
-- ============================================

-- Add locate override color (NULL = disabled, uses normal location_color)
ALTER TABLE led_segments ADD COLUMN locate_override_color TEXT DEFAULT NULL;

-- Add locate override behavior (animation when override is active)
ALTER TABLE led_segments ADD COLUMN locate_override_behavior TEXT DEFAULT 'flash'
  CHECK (locate_override_behavior IN ('solid', 'flash', 'flash-solid', 'chaser-loop', 'chaser-twice'));

-- Add locate override enabled flag (1 = enabled, 0 = disabled)
ALTER TABLE led_segments ADD COLUMN locate_override_enabled INTEGER DEFAULT 0;

-- ============================================
-- Migration Complete
-- ============================================
-- Summary of changes:
-- - Added locate_override_color TEXT (NULL = feature disabled)
-- - Added locate_override_behavior TEXT (animation pattern for override)
-- - Added locate_override_enabled INTEGER (toggle flag)
--
-- Feature behavior:
-- - When locate_override_enabled = 1 AND locate_override_color IS NOT NULL:
--   → Locate button lights up ALL LEDs (0-11) with override color
-- - When locate_override_enabled = 0 OR locate_override_color IS NULL:
--   → Locate button uses normal location_color for LEDs 0-3 only
-- - Stop button always restores Stock/Alert sections to dynamic state
-- ============================================
