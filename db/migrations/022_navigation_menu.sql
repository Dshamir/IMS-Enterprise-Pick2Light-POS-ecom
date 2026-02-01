-- Navigation Menu System Migration
-- Enables dynamic drag-and-drop navigation management without code changes
-- Supports hierarchical groups, badges, visibility toggles, and custom ordering

-- Create navigation items table
CREATE TABLE IF NOT EXISTS navigation_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  href TEXT,
  icon_name TEXT NOT NULL,
  parent_id TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible INTEGER NOT NULL DEFAULT 1,
  is_group INTEGER NOT NULL DEFAULT 0,
  badge_key TEXT,
  highlight INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES navigation_items(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_navigation_parent ON navigation_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_navigation_order ON navigation_items(display_order);
CREATE INDEX IF NOT EXISTS idx_navigation_visible ON navigation_items(is_visible);

-- Seed default navigation structure from current hardcoded routes
-- Top-level items (no parent_id)
INSERT INTO navigation_items (id, name, href, icon_name, display_order, is_visible, is_group, highlight, badge_key) VALUES
  ('nav-home', 'Home', '/', 'Home', 0, 1, 0, 0, NULL),
  ('nav-ai-command', 'AI Command Center', '/command-center', 'Zap', 1, 1, 0, 1, NULL),
  ('nav-dashboard', 'Dashboard', '/dashboard', 'LayoutDashboard', 2, 1, 0, 0, NULL),
  ('nav-products', 'Products', '/products', 'Package', 3, 1, 0, 0, NULL),
  ('nav-image-catalog', 'AI Image Cataloging', '/image-cataloging', 'Image', 4, 1, 0, 0, NULL),
  ('nav-scan', 'Scan Barcode', '/scan', 'Barcode', 5, 1, 0, 1, NULL),
  ('nav-pick2light', 'Pick2Light Search', '/pick2light', 'Search', 6, 1, 0, 0, NULL),
  ('nav-orders', 'Orders', '/orders', 'ShoppingCart', 7, 1, 0, 0, NULL),
  ('nav-manufacturing', 'Manufacturing', '/manufacturing', 'Factory', 8, 1, 0, 0, NULL),
  ('nav-serial', 'Serial Numbers', '/serial-numbers', 'Hash', 9, 1, 0, 0, NULL),
  ('nav-customers', 'Customers', '/customers', 'Users', 10, 1, 0, 0, NULL),
  ('nav-reports', 'Reports', '/reports', 'BarChart3', 11, 1, 0, 0, NULL),
  ('nav-alerts', 'Inventory Alerts', '/inventory/alerts', 'AlertTriangle', 12, 1, 0, 0, 'lowStockCount'),
  ('nav-ai-assistant', 'AI Assistant', '/ai-assistant', 'Bot', 13, 1, 1, 0, NULL),
  ('nav-docs', 'Documentation', '/docs', 'BookOpen', 14, 1, 0, 0, NULL),
  ('nav-settings', 'Settings', '/settings', 'Settings', 15, 1, 1, 0, NULL);

-- AI Assistant sub-items (parent_id = 'nav-ai-assistant')
INSERT INTO navigation_items (id, name, href, icon_name, parent_id, display_order, is_visible, is_group) VALUES
  ('nav-ai-custom', 'Custom AI Agents', '/ai-assistant/custom-agents', 'Wrench', 'nav-ai-assistant', 0, 1, 0),
  ('nav-ai-settings', 'AI Settings', '/ai-assistant/settings', 'Settings', 'nav-ai-assistant', 1, 1, 0);

-- Settings sub-items (parent_id = 'nav-settings')
INSERT INTO navigation_items (id, name, href, icon_name, parent_id, display_order, is_visible, is_group) VALUES
  ('nav-network', 'Network Settings', '/settings/network', 'Network', 'nav-settings', 0, 1, 0);
