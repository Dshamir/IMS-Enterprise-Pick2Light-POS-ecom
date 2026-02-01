-- ============================================================================
-- AI FEATURES DATABASE SCHEMA - NON-DESTRUCTIVE ADDITIONS ONLY
-- ============================================================================
-- This file contains ONLY NEW tables for AI functionality
-- CRITICAL: Does NOT modify any existing tables or schemas
-- Safe to run multiple times - uses IF NOT EXISTS for all operations
-- ============================================================================

-- AI Provider Configurations
CREATE TABLE IF NOT EXISTS ai_providers (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name VARCHAR(50) NOT NULL, -- 'openai', 'anthropic', 'gemini', 'custom'
    display_name VARCHAR(100) NOT NULL,
    api_key_encrypted TEXT, -- Encrypted storage
    api_endpoint VARCHAR(255),
    default_model VARCHAR(100),
    default_temperature REAL DEFAULT 0.7,
    default_max_tokens INTEGER DEFAULT 1000,
    is_active INTEGER DEFAULT 1, -- SQLite uses INTEGER for boolean
    settings TEXT, -- JSON string for provider-specific settings
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- AI Agents Configuration
CREATE TABLE IF NOT EXISTS ai_agents (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name VARCHAR(100) NOT NULL,
    role VARCHAR(100),
    description TEXT,
    type VARCHAR(20) DEFAULT 'individual', -- 'individual', 'orchestrator', 'worker'
    orchestrator_id TEXT REFERENCES ai_agents(id),
    provider_id TEXT REFERENCES ai_providers(id),
    model VARCHAR(100),
    temperature REAL,
    max_tokens INTEGER,
    system_prompt TEXT,
    capabilities TEXT, -- JSON string
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (provider_id) REFERENCES ai_providers(id) ON DELETE SET NULL,
    FOREIGN KEY (orchestrator_id) REFERENCES ai_agents(id) ON DELETE SET NULL
);

-- AI Conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT DEFAULT 'default_user', -- Will integrate with user system later
    session_id VARCHAR(100),
    messages TEXT, -- JSON string for message array
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- AI Tasks Queue
CREATE TABLE IF NOT EXISTS ai_tasks (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    agent_id TEXT REFERENCES ai_agents(id),
    task_type VARCHAR(50),
    input_data TEXT, -- JSON string
    output_data TEXT, -- JSON string
    status VARCHAR(20) DEFAULT 'pending', -- pending, running, completed, failed
    priority INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    FOREIGN KEY (agent_id) REFERENCES ai_agents(id) ON DELETE SET NULL
);

-- Enhanced AI Usage Tracking
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    provider_id TEXT REFERENCES ai_providers(id),
    agent_id TEXT REFERENCES ai_agents(id),
    model_used TEXT,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    estimated_cost REAL DEFAULT 0,
    request_duration INTEGER DEFAULT 0, -- milliseconds
    operation_type TEXT DEFAULT 'chat', -- chat, vision, function_call, etc.
    user_message_preview TEXT, -- First 100 chars of user message
    success BOOLEAN DEFAULT 1,
    error_type TEXT, -- quota_exceeded, invalid_api_key, etc.
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (provider_id) REFERENCES ai_providers(id) ON DELETE SET NULL,
    FOREIGN KEY (agent_id) REFERENCES ai_agents(id) ON DELETE SET NULL
);

-- Daily Usage Summary Table
CREATE TABLE IF NOT EXISTS daily_usage_summaries (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    date TEXT NOT NULL, -- YYYY-MM-DD format
    provider_id TEXT REFERENCES ai_providers(id),
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    estimated_total_cost REAL DEFAULT 0,
    most_used_model TEXT,
    most_active_agent TEXT,
    error_breakdown TEXT, -- JSON string of error types and counts
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(date, provider_id),
    FOREIGN KEY (provider_id) REFERENCES ai_providers(id) ON DELETE SET NULL
);

-- OpenAI Quota Alerts Table
CREATE TABLE IF NOT EXISTS quota_alerts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    provider_id TEXT REFERENCES ai_providers(id),
    alert_type TEXT NOT NULL, -- quota_warning, quota_critical, quota_exceeded
    threshold_percentage REAL, -- 80, 90, 100
    current_usage_usd REAL,
    remaining_credits REAL,
    hard_limit_usd REAL,
    is_resolved BOOLEAN DEFAULT 0,
    alert_message TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT,
    FOREIGN KEY (provider_id) REFERENCES ai_providers(id) ON DELETE SET NULL
);

-- Usage Analytics Cache Table
CREATE TABLE IF NOT EXISTS usage_analytics_cache (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    cache_key TEXT UNIQUE NOT NULL,
    provider_id TEXT REFERENCES ai_providers(id),
    data_type TEXT NOT NULL, -- quota, usage, costs, analytics
    cache_data TEXT NOT NULL, -- JSON data
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (provider_id) REFERENCES ai_providers(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_providers_active ON ai_providers(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_agents_provider ON ai_agents(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_active ON ai_agents(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_session ON ai_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_agent ON ai_tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_status ON ai_tasks(status);
CREATE INDEX IF NOT EXISTS idx_ai_usage_provider ON ai_usage_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_model ON ai_usage_logs(model_used);
CREATE INDEX IF NOT EXISTS idx_ai_usage_success ON ai_usage_logs(success);
CREATE INDEX IF NOT EXISTS idx_daily_usage_date ON daily_usage_summaries(date);
CREATE INDEX IF NOT EXISTS idx_daily_usage_provider ON daily_usage_summaries(provider_id);
CREATE INDEX IF NOT EXISTS idx_quota_alerts_provider ON quota_alerts(provider_id);
CREATE INDEX IF NOT EXISTS idx_quota_alerts_type ON quota_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_quota_alerts_resolved ON quota_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_usage_cache_key ON usage_analytics_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_usage_cache_expires ON usage_analytics_cache(expires_at);

-- Insert default AI providers (if they don't exist)
INSERT OR IGNORE INTO ai_providers (name, display_name, default_model, default_temperature, default_max_tokens, is_active)
VALUES 
    ('openai', 'OpenAI GPT', 'gpt-3.5-turbo', 0.7, 1000, 0),
    ('anthropic', 'Anthropic Claude', 'claude-3-haiku-20240307', 0.7, 1000, 0),
    ('gemini', 'Google Gemini', 'gemini-pro', 0.7, 1000, 0);

-- Insert default AI agents (if they don't exist)
INSERT OR IGNORE INTO ai_agents (name, role, description, system_prompt, capabilities, is_active)
VALUES 
    (
        'Stock Monitor', 
        'Inventory Monitoring', 
        'Real-time inventory monitoring and low stock alerts',
        'You are a Stock Monitor AI assistant for the Nexless Inventory Management System. Your role is to monitor inventory levels, identify low stock situations, and provide intelligent alerts. You have access to real-time inventory data and can analyze stock velocity, predict shortages, and suggest optimal reorder timing. Always provide clear, actionable insights about inventory status.',
        '["stock_monitoring", "low_stock_alerts", "inventory_analysis", "reorder_suggestions"]',
        1
    ),
    (
        'Reorder Assistant', 
        'Purchase Planning', 
        'Intelligent reorder quantity and timing suggestions',
        'You are a Reorder Assistant AI for the Nexless Inventory Management System. Your expertise is in analyzing inventory patterns, consumption rates, and market trends to suggest optimal reorder quantities and timing. You help minimize carrying costs while preventing stockouts. Provide data-driven recommendations with clear reasoning.',
        '["reorder_analysis", "quantity_optimization", "timing_analysis", "cost_optimization"]',
        1
    ),
    (
        'Search Assistant', 
        'Natural Language Search', 
        'Natural language inventory search and product discovery',
        'You are a Search Assistant AI for the Nexless Inventory Management System. You help users find products, parts, and equipment using natural language queries. You can search by name, description, location, barcode, manufacturer, or any other product attribute. Provide relevant results with explanations for why items match the search criteria.',
        '["natural_language_search", "product_discovery", "barcode_lookup", "location_search"]',
        1
    ),
    (
        'Image Processing Specialist', 
        'Image Analysis & OCR', 
        'Advanced image analysis and text extraction for inventory cataloging',
        'You are an Image Processing Specialist AI for the Nexless Inventory Management System. Your expertise is in analyzing product images, extracting text from labels, identifying barcodes, and cataloging inventory items from visual data. You have advanced computer vision capabilities and can read text from product labels, packaging, and equipment nameplates. Always provide detailed, accurate descriptions that help with inventory management and product identification.',
        '["image_analysis", "text_extraction", "barcode_reading", "product_identification", "visual_cataloging"]',
        1
    );

-- ============================================================================
-- VERIFICATION QUERIES - Safe to run for testing
-- ============================================================================
-- SELECT 'AI Providers created:' as info, COUNT(*) as count FROM ai_providers;
-- SELECT 'AI Agents created:' as info, COUNT(*) as count FROM ai_agents;
-- SELECT 'AI schema installation completed successfully' as status;