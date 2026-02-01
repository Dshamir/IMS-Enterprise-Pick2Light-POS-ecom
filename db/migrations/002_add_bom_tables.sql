-- Migration: Add Bill of Materials (BOM) tables
-- Date: 2025-01-09
-- Description: Add basic BOM support for product assemblies - Phase 1 implementation

-- BOM Assemblies - defines the top-level assembly
CREATE TABLE IF NOT EXISTS bom_assemblies (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active', -- active, inactive, draft
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- BOM Components - individual components in the assembly
CREATE TABLE IF NOT EXISTS bom_components (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  assembly_id TEXT NOT NULL,
  component_product_id TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (assembly_id) REFERENCES bom_assemblies(id) ON DELETE CASCADE,
  FOREIGN KEY (component_product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bom_assemblies_product_id ON bom_assemblies(product_id);
CREATE INDEX IF NOT EXISTS idx_bom_assemblies_status ON bom_assemblies(status);
CREATE INDEX IF NOT EXISTS idx_bom_components_assembly_id ON bom_components(assembly_id);
CREATE INDEX IF NOT EXISTS idx_bom_components_component_id ON bom_components(component_product_id);