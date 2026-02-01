-- Navigation Theme System Migration
-- Adds per-page theming capabilities to navigation menu items
-- Supports 4 themes: standard, bumblebee, modern-punch, marvel
-- Supports theme variants: light, dark, auto (where applicable)

-- Add theme column
ALTER TABLE navigation_items ADD COLUMN theme TEXT DEFAULT 'standard';

-- Add theme_variant column
ALTER TABLE navigation_items ADD COLUMN theme_variant TEXT DEFAULT 'light';

-- Update existing navigation items with appropriate themes based on current page designs

-- Standard theme (light): Home, Dashboard, Products, Orders, etc.
UPDATE navigation_items SET theme = 'standard', theme_variant = 'light'
WHERE id IN ('nav-home', 'nav-dashboard', 'nav-products', 'nav-orders', 'nav-customers', 'nav-reports', 'nav-docs', 'nav-settings');

-- Bumblebee theme (always dark): Pick2Light Search
UPDATE navigation_items SET theme = 'bumblebee', theme_variant = 'dark'
WHERE id = 'nav-pick2light';

-- Modern Punch theme (dark): AI Command Center
UPDATE navigation_items SET theme = 'modern-punch', theme_variant = 'dark'
WHERE id = 'nav-ai-command';

-- Standard theme for other pages (can be customized by user later)
UPDATE navigation_items SET theme = 'standard', theme_variant = 'light'
WHERE theme IS NULL;

-- Create index for faster theme queries
CREATE INDEX IF NOT EXISTS idx_navigation_theme ON navigation_items(theme);
