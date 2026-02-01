-- AI Command Center Migration
-- Creates tables for dynamic configuration, warehouse zones, automation rules, and metrics

-- Global Command Center Configuration
CREATE TABLE IF NOT EXISTS command_center_config (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  value_type TEXT NOT NULL CHECK (value_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  category TEXT NOT NULL, -- 'general', 'warehouse', 'automation', 'voice', 'performance'
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Warehouse Zone Definitions
CREATE TABLE IF NOT EXISTS warehouse_zones (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  zone_name TEXT UNIQUE NOT NULL,
  zone_type TEXT NOT NULL CHECK (zone_type IN ('receiving', 'storage', 'picking', 'packing', 'shipping', 'quality', 'returns')),
  aisles INTEGER DEFAULT 1,
  shelves_per_aisle INTEGER DEFAULT 1,
  bins_per_shelf INTEGER DEFAULT 1,
  position_x REAL DEFAULT 0, -- 3D position
  position_y REAL DEFAULT 0,
  position_z REAL DEFAULT 0,
  dimensions_width REAL DEFAULT 10,
  dimensions_height REAL DEFAULT 10,
  dimensions_depth REAL DEFAULT 10,
  color_code TEXT DEFAULT '#3B82F6', -- Display color
  wled_device_id TEXT, -- Optional LED device mapping
  rfid_scanner_type TEXT CHECK (rfid_scanner_type IN ('fixed', 'mobile', 'gate', 'none')),
  rfid_scanner_range REAL DEFAULT 5.0,
  is_active INTEGER DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (wled_device_id) REFERENCES wled_devices(id) ON DELETE SET NULL
);

-- Automation Rules for Autopilot
CREATE TABLE IF NOT EXISTS automation_rules (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  rule_name TEXT UNIQUE NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('low_stock', 'accuracy_drop', 'zone_congestion', 'schedule', 'manual')),
  trigger_condition TEXT NOT NULL, -- JSON: { "field": "stock_quantity", "operator": "<=", "value": 10 }
  action_type TEXT NOT NULL CHECK (action_type IN ('reorder', 'rebalance', 'alert', 'audit', 'relocate', 'custom')),
  action_params TEXT, -- JSON: action-specific parameters
  requires_approval INTEGER DEFAULT 1, -- 0 = auto-execute, 1 = requires human approval
  approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected', NULL)),
  approved_by TEXT,
  approved_at TEXT,
  priority INTEGER DEFAULT 5, -- 1 (highest) to 10 (lowest)
  is_active INTEGER DEFAULT 1,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Automation Execution Log
CREATE TABLE IF NOT EXISTS automation_executions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  rule_id TEXT NOT NULL,
  execution_status TEXT NOT NULL CHECK (execution_status IN ('running', 'completed', 'failed', 'cancelled')),
  trigger_data TEXT, -- JSON: what triggered the rule
  action_taken TEXT, -- JSON: what action was performed
  result_data TEXT, -- JSON: results or error details
  duration_ms INTEGER,
  executed_by TEXT, -- 'autopilot' or user ID
  executed_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (rule_id) REFERENCES automation_rules(id) ON DELETE CASCADE
);

-- Warehouse Accuracy Metrics (Historical)
CREATE TABLE IF NOT EXISTS accuracy_metrics (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  zone_id TEXT,
  accuracy_percentage REAL NOT NULL,
  physical_count INTEGER NOT NULL,
  system_count INTEGER NOT NULL,
  discrepancy_count INTEGER NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('zone', 'global', 'category')),
  metric_period TEXT NOT NULL CHECK (metric_period IN ('realtime', 'hourly', 'daily', 'weekly')),
  calculated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (zone_id) REFERENCES warehouse_zones(id) ON DELETE CASCADE
);

-- Voice Command Definitions
CREATE TABLE IF NOT EXISTS voice_commands (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  command_phrase TEXT UNIQUE NOT NULL,
  command_type TEXT NOT NULL CHECK (command_type IN ('navigation', 'search', 'action', 'query', 'control')),
  action_handler TEXT NOT NULL, -- Function name or API endpoint
  parameters TEXT, -- JSON: default parameters
  confidence_threshold REAL DEFAULT 0.7,
  is_active INTEGER DEFAULT 1,
  usage_count INTEGER DEFAULT 0,
  last_used_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Feature Flags (Dynamic Feature Registry)
CREATE TABLE IF NOT EXISTS command_center_features (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  feature_key TEXT UNIQUE NOT NULL,
  feature_name TEXT NOT NULL,
  feature_description TEXT,
  is_enabled INTEGER DEFAULT 1,
  icon_name TEXT,
  component_path TEXT,
  required_services TEXT, -- JSON: array of service names
  required_permissions TEXT, -- JSON: array of permission keys
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_command_center_config_key ON command_center_config(key);
CREATE INDEX IF NOT EXISTS idx_command_center_config_category ON command_center_config(category);
CREATE INDEX IF NOT EXISTS idx_warehouse_zones_active ON warehouse_zones(is_active);
CREATE INDEX IF NOT EXISTS idx_warehouse_zones_type ON warehouse_zones(zone_type);
CREATE INDEX IF NOT EXISTS idx_automation_rules_active ON automation_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON automation_rules(trigger_type);
CREATE INDEX IF NOT EXISTS idx_automation_executions_rule ON automation_executions(rule_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_status ON automation_executions(execution_status);
CREATE INDEX IF NOT EXISTS idx_accuracy_metrics_zone ON accuracy_metrics(zone_id);
CREATE INDEX IF NOT EXISTS idx_accuracy_metrics_calculated ON accuracy_metrics(calculated_at);
CREATE INDEX IF NOT EXISTS idx_voice_commands_active ON voice_commands(is_active);
CREATE INDEX IF NOT EXISTS idx_command_center_features_enabled ON command_center_features(is_enabled);

-- Insert Default Configuration
INSERT OR IGNORE INTO command_center_config (key, value, value_type, description, category) VALUES
  ('enabled', 'true', 'boolean', 'Enable AI Command Center module', 'general'),
  ('refresh_interval_ms', '1000', 'number', 'Real-time data refresh interval in milliseconds', 'performance'),
  ('accuracy_threshold', '95', 'number', 'Minimum acceptable accuracy percentage', 'performance'),
  ('autopilot_enabled', 'false', 'boolean', 'Enable autopilot automated actions', 'automation'),
  ('voice_commands_enabled', 'true', 'boolean', 'Enable voice command interface', 'voice'),
  ('3d_view_enabled', 'true', 'boolean', 'Enable 3D warehouse visualization', 'warehouse'),
  ('max_concurrent_automations', '5', 'number', 'Maximum simultaneous automation executions', 'automation'),
  ('alert_email', '', 'string', 'Email address for critical alerts', 'general'),
  ('ai_agent_id', '', 'string', 'ID of assigned AI agent for analysis', 'general');

-- Insert Sample Warehouse Zones
INSERT OR IGNORE INTO warehouse_zones (zone_name, zone_type, aisles, shelves_per_aisle, bins_per_shelf, position_x, position_y, position_z, dimensions_width, dimensions_height, dimensions_depth, color_code, rfid_scanner_type, rfid_scanner_range) VALUES
  ('Zone A - Receiving', 'receiving', 2, 5, 10, 0, 0, 0, 15, 12, 8, '#10B981', 'gate', 10.0),
  ('Zone B - Main Storage', 'storage', 8, 8, 12, 20, 0, 0, 40, 15, 20, '#3B82F6', 'fixed', 5.0),
  ('Zone C - Pick Area', 'picking', 4, 6, 8, 65, 0, 0, 20, 12, 15, '#F59E0B', 'mobile', 8.0),
  ('Zone D - Packing', 'packing', 2, 4, 6, 90, 0, 0, 15, 10, 10, '#EC4899', 'none', 0),
  ('Zone E - Shipping', 'shipping', 2, 3, 5, 110, 0, 0, 15, 10, 8, '#8B5CF6', 'gate', 10.0);

-- Insert Sample Automation Rules
INSERT OR IGNORE INTO automation_rules (rule_name, description, trigger_type, trigger_condition, action_type, action_params, requires_approval, priority) VALUES
  ('Auto-Reorder Low Stock', 'Automatically create reorder suggestions when stock falls below minimum', 'low_stock', '{"field":"stock_quantity","operator":"<=","threshold":"min_stock_level"}', 'reorder', '{"quantity_multiplier":1.5,"notify":true}', 1, 2),
  ('Accuracy Alert', 'Alert when zone accuracy drops below threshold', 'accuracy_drop', '{"threshold":90,"zone":"all"}', 'alert', '{"recipients":["admin"],"severity":"high"}', 0, 1),
  ('Daily Audit Schedule', 'Schedule daily inventory audit at 2 AM', 'schedule', '{"cron":"0 2 * * *"}', 'audit', '{"zones":["all"],"type":"full"}', 1, 5);

-- Insert Sample Voice Commands
INSERT OR IGNORE INTO voice_commands (command_phrase, command_type, action_handler, parameters, confidence_threshold) VALUES
  ('show zone *', 'navigation', 'navigateToZone', '{"zone":"$1"}', 0.7),
  ('locate product *', 'search', 'locateProduct', '{"product":"$1"}', 0.8),
  ('run accuracy audit', 'action', 'runAudit', '{"type":"accuracy"}', 0.9),
  ('what is the accuracy', 'query', 'getAccuracy', '{"period":"current"}', 0.8),
  ('enable autopilot', 'control', 'toggleAutopilot', '{"enabled":true}', 0.9),
  ('disable autopilot', 'control', 'toggleAutopilot', '{"enabled":false}', 0.9);

-- Insert Default Features
INSERT OR IGNORE INTO command_center_features (feature_key, feature_name, feature_description, is_enabled, icon_name, component_path, sort_order) VALUES
  ('dashboard', 'Command Dashboard', 'Main overview dashboard with real-time metrics', 1, 'LayoutDashboard', '/command-center', 1),
  ('warehouse_3d', '3D Warehouse View', 'Interactive 3D visualization of warehouse zones', 1, 'Box', '/command-center/warehouse', 2),
  ('accuracy_tracker', 'Accuracy Tracking', 'Real-time inventory accuracy monitoring', 1, 'Target', '/command-center/accuracy', 3),
  ('autopilot', 'Autopilot Automation', 'Automated inventory management actions', 0, 'Zap', '/command-center/autopilot', 4),
  ('voice_commands', 'Voice Control', 'Voice-activated command interface', 1, 'Mic', '/command-center/voice', 5),
  ('ai_analysis', 'AI Analysis', 'Intelligent insights and recommendations', 1, 'Brain', '/command-center/ai-analysis', 6);
