-- Migration: Add serial number templates and allocation system
-- Date: 2025-07-09
-- Description: Add comprehensive serial number template management and pre-allocation system

-- Create serial number templates table
CREATE TABLE IF NOT EXISTS serial_number_templates (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    description TEXT,
    
    -- Template configuration
    format_template TEXT NOT NULL, -- Template string with placeholders like "{MODEL} P4V3C{YEAR}{MONTH}{PREFIX}{COUNTER}xxx"
    model_pattern TEXT, -- Default model pattern
    version_pattern TEXT, -- Version pattern (e.g., "P4V3C")
    year_format TEXT DEFAULT 'YY', -- YY or YYYY
    month_format TEXT DEFAULT 'MM', -- MM or M
    prefix_default TEXT DEFAULT 'LAB', -- Default prefix
    counter_padding INTEGER DEFAULT 5, -- Number of digits for counter
    suffix_pattern TEXT DEFAULT 'xxx', -- Suffix pattern
    
    -- Advanced configuration
    counter_start INTEGER DEFAULT 1, -- Starting counter value
    counter_increment INTEGER DEFAULT 1, -- Increment value
    validation_regex TEXT, -- Regex for validation
    
    -- Template metadata
    product_type TEXT, -- Product type this template applies to
    facility_code TEXT, -- Facility or location code
    is_active INTEGER DEFAULT 1,
    is_default INTEGER DEFAULT 0,
    
    -- Audit fields
    created_by TEXT DEFAULT 'system',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Create serial number allocation pool table
CREATE TABLE IF NOT EXISTS serial_number_pool (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    
    -- Template and production run association
    template_id TEXT NOT NULL REFERENCES serial_number_templates(id),
    production_run_id TEXT NOT NULL REFERENCES production_runs(id),
    
    -- Serial number details
    serial_number TEXT NOT NULL, -- Full generated serial number
    model TEXT,
    part_number TEXT,
    counter INTEGER,
    
    -- Extended serial components (from Excel format)
    version TEXT,
    year TEXT,
    month TEXT,
    prefix TEXT,
    suffix TEXT,
    facility_code TEXT,
    
    -- Allocation status
    status TEXT DEFAULT 'allocated', -- allocated, assigned, consumed, cancelled
    assigned_to_instance_id TEXT, -- Reference to product_instances.id when assigned
    
    -- Sequence and ordering
    sequence_number INTEGER, -- Order in the production run (1, 2, 3, etc.)
    
    -- Audit fields
    allocated_at TEXT DEFAULT (datetime('now')),
    assigned_at TEXT,
    consumed_at TEXT,
    
    -- Constraints
    FOREIGN KEY (template_id) REFERENCES serial_number_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (production_run_id) REFERENCES production_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to_instance_id) REFERENCES product_instances(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_serial_templates_name ON serial_number_templates(name);
CREATE INDEX IF NOT EXISTS idx_serial_templates_product_type ON serial_number_templates(product_type);
CREATE INDEX IF NOT EXISTS idx_serial_templates_active ON serial_number_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_serial_templates_default ON serial_number_templates(is_default);

CREATE INDEX IF NOT EXISTS idx_serial_pool_template ON serial_number_pool(template_id);
CREATE INDEX IF NOT EXISTS idx_serial_pool_production_run ON serial_number_pool(production_run_id);
CREATE INDEX IF NOT EXISTS idx_serial_pool_serial_number ON serial_number_pool(serial_number);
CREATE INDEX IF NOT EXISTS idx_serial_pool_status ON serial_number_pool(status);
CREATE INDEX IF NOT EXISTS idx_serial_pool_sequence ON serial_number_pool(sequence_number);
CREATE INDEX IF NOT EXISTS idx_serial_pool_assigned_instance ON serial_number_pool(assigned_to_instance_id);

-- Create unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_serial_pool_unique_serial 
ON serial_number_pool(serial_number) 
WHERE status != 'cancelled';

CREATE UNIQUE INDEX IF NOT EXISTS idx_serial_pool_unique_sequence 
ON serial_number_pool(production_run_id, sequence_number);

-- Create view for easy template selection
CREATE VIEW IF NOT EXISTS v_active_serial_templates AS
SELECT 
    id,
    name,
    description,
    format_template,
    model_pattern,
    product_type,
    facility_code,
    counter_start,
    is_default,
    created_at
FROM serial_number_templates 
WHERE is_active = 1
ORDER BY is_default DESC, name ASC;

-- Create view for production run serial allocation summary
CREATE VIEW IF NOT EXISTS v_production_run_serial_summary AS
SELECT 
    pr.id as production_run_id,
    pr.planned_quantity,
    pr.actual_quantity,
    st.name as template_name,
    st.format_template,
    COUNT(sp.id) as allocated_serials,
    COUNT(CASE WHEN sp.status = 'assigned' THEN 1 END) as assigned_serials,
    COUNT(CASE WHEN sp.status = 'consumed' THEN 1 END) as consumed_serials,
    MIN(sp.serial_number) as first_serial,
    MAX(sp.serial_number) as last_serial
FROM production_runs pr
LEFT JOIN serial_number_pool sp ON pr.id = sp.production_run_id
LEFT JOIN serial_number_templates st ON sp.template_id = st.id
GROUP BY pr.id, st.id;

-- Insert default templates for common formats
INSERT OR IGNORE INTO serial_number_templates (
    name, 
    description, 
    format_template, 
    model_pattern, 
    product_type, 
    is_default,
    created_by
) VALUES 
(
    'RTPCR Standard Format',
    'Standard RTPCR format: MODEL P4V3CYYMMPREFIX00000xxx',
    '{MODEL} P4V3C{YEAR}{MONTH}{PREFIX}{COUNTER}xxx',
    'RTPCR',
    'PCR Device',
    1,
    'system'
),
(
    'Generic Lab Equipment',
    'Generic format for lab equipment: MODEL-YYYY-MM-00000',
    '{MODEL}-{YEAR}-{MONTH}-{COUNTER}',
    'LAB',
    'Laboratory Equipment',
    0,
    'system'
),
(
    'Kimera P-IV Format',
    'Kimera P-IV specific format',
    'KIMERA-P4V3C{YEAR}{MONTH}{PREFIX}{COUNTER}xxx',
    'KIMERA',
    'Kimera P-IV',
    0,
    'system'
);

-- Update schema comments
-- Serial Number Templates System:
-- - serial_number_templates: Define reusable templates for different product types
-- - serial_number_pool: Pre-allocate serial numbers for production runs
-- - Templates support Excel-based formats with placeholders
-- - Pre-allocation ensures no conflicts and efficient batch processing
-- - Sequence tracking enables proper ordering and assignment
-- - Status tracking provides full lifecycle management