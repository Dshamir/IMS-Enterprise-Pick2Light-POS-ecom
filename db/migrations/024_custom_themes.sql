-- Custom Themes System Migration
-- Enables users to create, edit, and manage custom color themes
-- Stores theme configurations as JSON for flexibility

CREATE TABLE IF NOT EXISTS custom_themes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  theme_name TEXT NOT NULL UNIQUE,
  theme_slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,

  -- Variant support flags
  supports_light_variant INTEGER NOT NULL DEFAULT 1,
  supports_dark_variant INTEGER NOT NULL DEFAULT 1,

  -- Theme type and status
  is_system_theme INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  theme_source TEXT NOT NULL DEFAULT 'created', -- 'system', 'created', 'imported'

  -- Color configurations stored as JSON
  -- Structure: {background: "0 0% 100%", foreground: "0 0% 3.9%", ...}
  -- Note: light_colors required but can be same as dark_colors for dark-only themes
  light_colors TEXT NOT NULL,
  dark_colors TEXT,

  -- Optional custom CSS classes for advanced styling
  custom_css TEXT,

  -- Metadata
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_custom_themes_slug ON custom_themes(theme_slug);
CREATE INDEX IF NOT EXISTS idx_custom_themes_active ON custom_themes(is_active);
CREATE INDEX IF NOT EXISTS idx_custom_themes_system ON custom_themes(is_system_theme);

-- Seed with current 4 system themes as read-only reference
INSERT INTO custom_themes (id, theme_name, theme_slug, display_name, description, supports_light_variant, supports_dark_variant, is_system_theme, is_active, theme_source, light_colors, dark_colors) VALUES

-- Standard Theme
('theme-standard', 'Standard', 'standard', 'Standard Theme', 'Clean black and white design with system preference support', 1, 1, 1, 1, 'system',
'{"background":"0 0% 100%","foreground":"0 0% 3.9%","card":"0 0% 100%","card_foreground":"0 0% 3.9%","popover":"0 0% 100%","popover_foreground":"0 0% 3.9%","primary":"0 0% 9%","primary_foreground":"0 0% 98%","secondary":"0 0% 96.1%","secondary_foreground":"0 0% 9%","muted":"0 0% 96.1%","muted_foreground":"0 0% 45.1%","accent":"0 0% 96.1%","accent_foreground":"0 0% 9%","destructive":"0 84.2% 60.2%","destructive_foreground":"0 0% 98%","border":"0 0% 89.8%","input":"0 0% 89.8%","ring":"0 0% 3.9%","radius":"0.5rem","sidebar_background":"0 0% 98%","sidebar_foreground":"240 5.3% 26.1%","sidebar_primary":"240 5.9% 10%","sidebar_primary_foreground":"0 0% 98%","sidebar_accent":"240 4.8% 95.9%","sidebar_accent_foreground":"240 5.9% 10%","sidebar_border":"220 13% 91%","sidebar_ring":"217.2 91.2% 59.8%"}',
'{"background":"0 0% 3.9%","foreground":"0 0% 98%","card":"0 0% 3.9%","card_foreground":"0 0% 98%","popover":"0 0% 3.9%","popover_foreground":"0 0% 98%","primary":"0 0% 98%","primary_foreground":"0 0% 9%","secondary":"0 0% 14.9%","secondary_foreground":"0 0% 98%","muted":"0 0% 14.9%","muted_foreground":"0 0% 63.9%","accent":"0 0% 14.9%","accent_foreground":"0 0% 98%","destructive":"0 62.8% 30.6%","destructive_foreground":"0 0% 98%","border":"0 0% 14.9%","input":"0 0% 14.9%","ring":"0 0% 83.1%","radius":"0.5rem","sidebar_background":"240 5.9% 10%","sidebar_foreground":"240 4.8% 95.9%","sidebar_primary":"224.3 76.3% 48%","sidebar_primary_foreground":"0 0% 100%","sidebar_accent":"240 3.7% 15.9%","sidebar_accent_foreground":"240 4.8% 95.9%","sidebar_border":"240 3.7% 15.9%","sidebar_ring":"217.2 91.2% 59.8%"}'
),

-- Bumblebee Theme (Dark only - light_colors = dark_colors since no light variant)
('theme-bumblebee', 'Bumblebee', 'bumblebee', 'Bumblebee Theme', 'Black background with yellow accents - optimized for warehouse environments', 0, 1, 1, 1, 'system',
'{"background":"0 0% 5.88%","foreground":"0 0% 100%","card":"0 0% 10.2%","card_foreground":"0 0% 100%","popover":"0 0% 10.2%","popover_foreground":"0 0% 100%","primary":"48 100% 52%","primary_foreground":"0 0% 0%","secondary":"210 6% 12%","secondary_foreground":"0 0% 100%","muted":"210 6% 12%","muted_foreground":"0 0% 63%","accent":"48 100% 52%","accent_foreground":"0 0% 0%","destructive":"0 84% 60%","destructive_foreground":"0 0% 100%","border":"210 6% 12%","input":"210 6% 12%","ring":"48 100% 52%","radius":"0.5rem","sidebar_background":"0 0% 5.88%","sidebar_foreground":"0 0% 100%","sidebar_primary":"48 100% 52%","sidebar_primary_foreground":"0 0% 0%","sidebar_accent":"0 0% 10.2%","sidebar_accent_foreground":"0 0% 100%","sidebar_border":"210 6% 12%","sidebar_ring":"48 100% 52%"}',
'{"background":"0 0% 5.88%","foreground":"0 0% 100%","card":"0 0% 10.2%","card_foreground":"0 0% 100%","popover":"0 0% 10.2%","popover_foreground":"0 0% 100%","primary":"48 100% 52%","primary_foreground":"0 0% 0%","secondary":"210 6% 12%","secondary_foreground":"0 0% 100%","muted":"210 6% 12%","muted_foreground":"0 0% 63%","accent":"48 100% 52%","accent_foreground":"0 0% 0%","destructive":"0 84% 60%","destructive_foreground":"0 0% 100%","border":"210 6% 12%","input":"210 6% 12%","ring":"48 100% 52%","radius":"0.5rem","sidebar_background":"0 0% 5.88%","sidebar_foreground":"0 0% 100%","sidebar_primary":"48 100% 52%","sidebar_primary_foreground":"0 0% 0%","sidebar_accent":"0 0% 10.2%","sidebar_accent_foreground":"0 0% 100%","sidebar_border":"210 6% 12%","sidebar_ring":"48 100% 52%"}'
),

-- Modern Punch Theme
('theme-modern-punch', 'Modern Punch', 'modern-punch', 'Modern Punch Theme', 'Bold purple and pink gradients for modern interfaces', 1, 1, 1, 1, 'system',
'{"background":"255 255 255","foreground":"107 33 168","card":"255 255 255","card_foreground":"107 33 168","popover":"255 255 255","popover_foreground":"107 33 168","primary":"147 51 234","primary_foreground":"255 255 255","secondary":"250 232 255","secondary_foreground":"107 33 168","muted":"243 232 255","muted_foreground":"107 33 168","accent":"192 132 252","accent_foreground":"107 33 168","destructive":"239 68 68","destructive_foreground":"255 255 255","border":"233 213 255","input":"233 213 255","ring":"147 51 234","radius":"0.5rem","sidebar_background":"250 245 255","sidebar_foreground":"107 33 168","sidebar_primary":"147 51 234","sidebar_primary_foreground":"255 255 255","sidebar_accent":"243 232 255","sidebar_accent_foreground":"107 33 168","sidebar_border":"233 213 255","sidebar_ring":"147 51 234"}',
'{"background":"30 27 75","foreground":"233 213 255","card":"45 42 95","card_foreground":"233 213 255","popover":"45 42 95","popover_foreground":"233 213 255","primary":"192 132 252","primary_foreground":"30 27 75","secondary":"67 56 202","secondary_foreground":"233 213 255","muted":"67 56 202","muted_foreground":"196 181 253","accent":"167 139 250","accent_foreground":"233 213 255","destructive":"220 38 38","destructive_foreground":"255 255 255","border":"67 56 202","input":"67 56 202","ring":"192 132 252","radius":"0.5rem","sidebar_background":"30 27 75","sidebar_foreground":"233 213 255","sidebar_primary":"192 132 252","sidebar_primary_foreground":"30 27 75","sidebar_accent":"45 42 95","sidebar_accent_foreground":"233 213 255","sidebar_border":"67 56 202","sidebar_ring":"192 132 252"}'
),

-- Marvel Theme
('theme-marvel', 'Marvel', 'marvel', 'Marvel Theme', 'Premium lavender theme with vibrant colorful gradient accents', 1, 1, 1, 1, 'system',
'{"background":"240 235 255","foreground":"107 33 168","card":"255 255 255","card_foreground":"107 33 168","popover":"255 255 255","popover_foreground":"107 33 168","primary":"167 139 250","primary_foreground":"255 255 255","secondary":"232 224 255","secondary_foreground":"107 33 168","muted":"232 224 255","muted_foreground":"107 114 142","accent":"139 92 246","accent_foreground":"255 255 255","destructive":"239 68 68","destructive_foreground":"255 255 255","border":"216 180 254","input":"216 180 254","ring":"167 139 250","radius":"0.75rem","sidebar_background":"250 245 255","sidebar_foreground":"107 33 168","sidebar_primary":"167 139 250","sidebar_primary_foreground":"255 255 255","sidebar_accent":"243 232 255","sidebar_accent_foreground":"107 33 168","sidebar_border":"233 213 255","sidebar_ring":"167 139 250"}',
'{"background":"30 27 75","foreground":"240 235 255","card":"45 42 95","card_foreground":"240 235 255","popover":"45 42 95","popover_foreground":"240 235 255","primary":"192 132 252","primary_foreground":"30 27 75","secondary":"49 46 129","secondary_foreground":"240 235 255","muted":"49 46 129","muted_foreground":"196 181 253","accent":"167 139 250","accent_foreground":"240 235 255","destructive":"220 38 38","destructive_foreground":"255 255 255","border":"88 80 236","input":"88 80 236","ring":"192 132 252","radius":"0.75rem","sidebar_background":"30 27 75","sidebar_foreground":"240 235 255","sidebar_primary":"192 132 252","sidebar_primary_foreground":"30 27 75","sidebar_accent":"45 42 95","sidebar_accent_foreground":"240 235 255","sidebar_border":"67 56 202","sidebar_ring":"192 132 252"}'
);
