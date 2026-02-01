-- Migration: Add custom agent fields
-- Date: 2025-06-22

-- Add new columns to ai_agents table if they don't exist
ALTER TABLE ai_agents ADD COLUMN type VARCHAR(20) DEFAULT 'individual';
ALTER TABLE ai_agents ADD COLUMN orchestrator_id TEXT REFERENCES ai_agents(id);

-- Create index for orchestrator relationships
CREATE INDEX IF NOT EXISTS idx_ai_agents_orchestrator ON ai_agents(orchestrator_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_type ON ai_agents(type);

-- Update existing agents to have proper type
UPDATE ai_agents SET type = 'individual' WHERE type IS NULL;