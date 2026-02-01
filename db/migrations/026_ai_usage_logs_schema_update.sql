-- Migration 026: AI Usage Logs Schema Update
-- Updates ai_usage_logs table to support comprehensive telemetry tracking
-- Preserves all 94 existing historical records from September 2025
-- Date: October 15, 2025

-- ============================================================================
-- PHASE 1: Add Missing Columns (Non-Destructive)
-- ============================================================================

-- Add model_used column (tracks which AI model was used)
ALTER TABLE ai_usage_logs ADD COLUMN model_used TEXT DEFAULT NULL;

-- Add token breakdown columns
ALTER TABLE ai_usage_logs ADD COLUMN prompt_tokens INTEGER DEFAULT 0;
ALTER TABLE ai_usage_logs ADD COLUMN completion_tokens INTEGER DEFAULT 0;
ALTER TABLE ai_usage_logs ADD COLUMN total_tokens INTEGER DEFAULT 0;

-- Add cost tracking column (new name)
ALTER TABLE ai_usage_logs ADD COLUMN estimated_cost REAL DEFAULT 0;

-- Add operation type tracking
ALTER TABLE ai_usage_logs ADD COLUMN operation_type TEXT DEFAULT 'chat';

-- Add user message preview for debugging
ALTER TABLE ai_usage_logs ADD COLUMN user_message_preview TEXT DEFAULT NULL;

-- Add success/failure tracking
ALTER TABLE ai_usage_logs ADD COLUMN success INTEGER DEFAULT 1;

-- Add error type tracking
ALTER TABLE ai_usage_logs ADD COLUMN error_type TEXT DEFAULT NULL;

-- ============================================================================
-- PHASE 2: Migrate Data from Old Columns to New Columns
-- ============================================================================

-- Migrate tokens_used → total_tokens (preserve historical token counts)
UPDATE ai_usage_logs
SET total_tokens = COALESCE(tokens_used, 0)
WHERE total_tokens = 0 OR total_tokens IS NULL;

-- Migrate cost_estimate → estimated_cost (preserve historical cost estimates)
UPDATE ai_usage_logs
SET estimated_cost = COALESCE(cost_estimate, 0)
WHERE estimated_cost = 0 OR estimated_cost IS NULL;

-- Set operation_type to 'chat' for all historical records (reasonable default)
UPDATE ai_usage_logs
SET operation_type = 'chat'
WHERE operation_type IS NULL;

-- Set success = 1 for all historical records (assume successful if logged)
UPDATE ai_usage_logs
SET success = 1
WHERE success IS NULL;

-- ============================================================================
-- PHASE 3: Create Performance Indexes
-- ============================================================================

-- Index on model_used for model breakdown queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_model ON ai_usage_logs(model_used);

-- Index on operation_type for operation breakdown queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_operation ON ai_usage_logs(operation_type);

-- Index on success for error rate queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_success ON ai_usage_logs(success);

-- Composite index for date range queries with provider filtering
CREATE INDEX IF NOT EXISTS idx_ai_usage_provider_date ON ai_usage_logs(provider_id, created_at);

-- Composite index for date range queries with agent filtering
CREATE INDEX IF NOT EXISTS idx_ai_usage_agent_date ON ai_usage_logs(agent_id, created_at);

-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================

-- Verify all columns exist
-- PRAGMA table_info(ai_usage_logs);

-- Verify data migration succeeded
-- SELECT
--   COUNT(*) as total_records,
--   SUM(CASE WHEN total_tokens > 0 THEN 1 ELSE 0 END) as records_with_tokens,
--   SUM(CASE WHEN estimated_cost > 0 THEN 1 ELSE 0 END) as records_with_cost,
--   MIN(created_at) as oldest_record,
--   MAX(created_at) as newest_record
-- FROM ai_usage_logs;

-- ============================================================================
-- NOTES
-- ============================================================================
-- - Old columns (tokens_used, cost_estimate) are kept for backwards compatibility
-- - They can be dropped in a future migration after verification
-- - All 94 historical records are preserved
-- - New indexes optimize analytics queries
-- ============================================================================
