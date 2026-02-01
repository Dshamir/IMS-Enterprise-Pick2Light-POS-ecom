-- Migration: Enhance BOM tables for multi-level support
-- Date: 2025-01-09
-- Description: Add support for hierarchical BOMs and component substitutions

-- Add fields to support multi-level BOMs
ALTER TABLE bom_components ADD COLUMN is_assembly INTEGER DEFAULT 0;
ALTER TABLE bom_components ADD COLUMN sequence_number INTEGER DEFAULT 0;
ALTER TABLE bom_components ADD COLUMN is_optional INTEGER DEFAULT 0;
ALTER TABLE bom_components ADD COLUMN reference_designator TEXT;

-- Create BOM substitutions table for alternative components
CREATE TABLE IF NOT EXISTS bom_substitutions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  bom_component_id TEXT NOT NULL,
  substitute_product_id TEXT NOT NULL,
  priority INTEGER DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (bom_component_id) REFERENCES bom_components(id) ON DELETE CASCADE,
  FOREIGN KEY (substitute_product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Create BOM versions table for change management
CREATE TABLE IF NOT EXISTS bom_versions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  assembly_id TEXT NOT NULL,
  version_number TEXT NOT NULL,
  description TEXT,
  is_current INTEGER DEFAULT 0,
  effective_date TEXT DEFAULT (datetime('now')),
  created_by TEXT DEFAULT 'system',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (assembly_id) REFERENCES bom_assemblies(id) ON DELETE CASCADE
);

-- Create BOM cost rollups table for cached calculations
CREATE TABLE IF NOT EXISTS bom_cost_rollups (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  assembly_id TEXT NOT NULL,
  version_id TEXT,
  material_cost REAL DEFAULT 0,
  labor_cost REAL DEFAULT 0,
  overhead_cost REAL DEFAULT 0,
  total_cost REAL DEFAULT 0,
  last_calculated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (assembly_id) REFERENCES bom_assemblies(id) ON DELETE CASCADE,
  FOREIGN KEY (version_id) REFERENCES bom_versions(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bom_components_sequence ON bom_components(sequence_number);
CREATE INDEX IF NOT EXISTS idx_bom_components_is_assembly ON bom_components(is_assembly);
CREATE INDEX IF NOT EXISTS idx_bom_substitutions_component_id ON bom_substitutions(bom_component_id);
CREATE INDEX IF NOT EXISTS idx_bom_substitutions_substitute_id ON bom_substitutions(substitute_product_id);
CREATE INDEX IF NOT EXISTS idx_bom_versions_assembly_id ON bom_versions(assembly_id);
CREATE INDEX IF NOT EXISTS idx_bom_versions_current ON bom_versions(is_current);
CREATE INDEX IF NOT EXISTS idx_bom_cost_rollups_assembly_id ON bom_cost_rollups(assembly_id);