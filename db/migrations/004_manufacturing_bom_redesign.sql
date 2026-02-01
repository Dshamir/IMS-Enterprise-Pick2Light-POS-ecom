-- Migration: Manufacturing-Focused BOM System Redesign
-- Date: 2025-01-09
-- Description: Redesign BOM system for manufacturing with projects and production lines

-- Projects table - for one-off manufacturing projects
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  description TEXT,
  client TEXT,
  start_date TEXT,
  end_date TEXT,
  status TEXT DEFAULT 'active', -- active, completed, cancelled, on_hold
  budget REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Production Lines table - for recurring manufacturing
CREATE TABLE IF NOT EXISTS production_lines (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  description TEXT,
  schedule_type TEXT DEFAULT 'continuous', -- continuous, batch, scheduled
  capacity INTEGER DEFAULT 1, -- units per day/batch
  status TEXT DEFAULT 'active', -- active, inactive, maintenance
  location TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Manufacturing BOMs table - redesigned for manufacturing context
CREATE TABLE IF NOT EXISTS manufacturing_boms (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'project' or 'production_line'
  project_id TEXT,
  production_line_id TEXT,
  status TEXT DEFAULT 'active', -- active, inactive, draft
  quantity INTEGER DEFAULT 1, -- how many units this BOM produces
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (production_line_id) REFERENCES production_lines(id) ON DELETE CASCADE,
  CHECK (
    (type = 'project' AND project_id IS NOT NULL AND production_line_id IS NULL) OR
    (type = 'production_line' AND production_line_id IS NOT NULL AND project_id IS NULL)
  )
);

-- BOM Items table - simplified for manufacturing
CREATE TABLE IF NOT EXISTS manufacturing_bom_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  bom_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (bom_id) REFERENCES manufacturing_boms(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Production Runs table - track actual manufacturing runs
CREATE TABLE IF NOT EXISTS production_runs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  bom_id TEXT NOT NULL,
  planned_quantity INTEGER NOT NULL DEFAULT 1,
  actual_quantity INTEGER DEFAULT 0,
  start_date TEXT,
  end_date TEXT,
  status TEXT DEFAULT 'planned', -- planned, in_progress, completed, cancelled
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (bom_id) REFERENCES manufacturing_boms(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_dates ON projects(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_production_lines_status ON production_lines(status);
CREATE INDEX IF NOT EXISTS idx_manufacturing_boms_type ON manufacturing_boms(type);
CREATE INDEX IF NOT EXISTS idx_manufacturing_boms_project_id ON manufacturing_boms(project_id);
CREATE INDEX IF NOT EXISTS idx_manufacturing_boms_production_line_id ON manufacturing_boms(production_line_id);
CREATE INDEX IF NOT EXISTS idx_manufacturing_bom_items_bom_id ON manufacturing_bom_items(bom_id);
CREATE INDEX IF NOT EXISTS idx_manufacturing_bom_items_product_id ON manufacturing_bom_items(product_id);
CREATE INDEX IF NOT EXISTS idx_production_runs_bom_id ON production_runs(bom_id);
CREATE INDEX IF NOT EXISTS idx_production_runs_status ON production_runs(status);