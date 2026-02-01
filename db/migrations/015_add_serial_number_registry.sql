-- Migration: Add serial number registry for Excel-based serial number management
-- Date: 2025-07-09
-- Description: Create registry table for existing serial numbers and manual generation system

-- Create serial number registry table
CREATE TABLE IF NOT EXISTS serial_number_registry (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    
    -- Serial number identification
    serial_number TEXT NOT NULL UNIQUE,
    counter INTEGER NOT NULL, -- The numeric counter (1, 2, 3, etc.)
    
    -- Serial number components (from Excel structure)
    model TEXT,
    kind TEXT,
    use_case TEXT,
    version TEXT,
    production_year INTEGER,
    num_wells INTEGER,
    application TEXT,
    machine_name TEXT,
    note TEXT,
    input_specs TEXT,
    color_code TEXT,
    color TEXT,
    self_test_by TEXT,
    calibrated_by TEXT,
    used_by TEXT,
    calibration_date TEXT,
    recalibration_date TEXT,
    
    -- Status and lifecycle
    status TEXT DEFAULT 'active', -- active, deprecated, reassigned
    assigned_to_machine_id TEXT, -- Reference to physical machine
    assigned_to_production_run_id TEXT, -- Link to production run
    assigned_to_product_instance_id TEXT, -- Link to product instance
    
    -- Deprecation and reassignment tracking
    deprecated_at TEXT,
    deprecated_by TEXT,
    deprecated_reason TEXT,
    reassigned_at TEXT,
    reassigned_by TEXT,
    reassigned_to_counter INTEGER, -- New counter number if reassigned
    
    -- Import metadata
    imported_from_excel INTEGER DEFAULT 0, -- 1 if imported from Excel
    excel_row_number INTEGER, -- Original Excel row for reference
    
    -- Audit fields
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    created_by TEXT DEFAULT 'system',
    updated_by TEXT DEFAULT 'system',
    
    -- Foreign key constraints
    FOREIGN KEY (assigned_to_production_run_id) REFERENCES production_runs(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to_product_instance_id) REFERENCES product_instances(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_serial_registry_serial_number ON serial_number_registry(serial_number);
CREATE INDEX IF NOT EXISTS idx_serial_registry_counter ON serial_number_registry(counter);
CREATE INDEX IF NOT EXISTS idx_serial_registry_status ON serial_number_registry(status);
CREATE INDEX IF NOT EXISTS idx_serial_registry_model ON serial_number_registry(model);
CREATE INDEX IF NOT EXISTS idx_serial_registry_production_run ON serial_number_registry(assigned_to_production_run_id);
CREATE INDEX IF NOT EXISTS idx_serial_registry_product_instance ON serial_number_registry(assigned_to_product_instance_id);
CREATE INDEX IF NOT EXISTS idx_serial_registry_imported ON serial_number_registry(imported_from_excel);

-- Create unique constraint on counter for active serial numbers
CREATE UNIQUE INDEX IF NOT EXISTS idx_serial_registry_unique_counter 
ON serial_number_registry(counter) 
WHERE status = 'active';

-- Create trigger to update timestamp
CREATE TRIGGER IF NOT EXISTS update_serial_registry_timestamp 
AFTER UPDATE ON serial_number_registry
BEGIN
    UPDATE serial_number_registry SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Create view for active serial numbers
CREATE VIEW IF NOT EXISTS v_active_serial_numbers AS
SELECT 
    id,
    serial_number,
    counter,
    model,
    kind,
    use_case,
    version,
    production_year,
    num_wells,
    application,
    machine_name,
    status,
    assigned_to_production_run_id,
    assigned_to_product_instance_id,
    created_at,
    updated_at
FROM serial_number_registry 
WHERE status = 'active'
ORDER BY counter ASC;

-- Create view for next available counter
CREATE VIEW IF NOT EXISTS v_next_available_counter AS
SELECT 
    COALESCE(MAX(counter), 0) + 1 as next_counter,
    COUNT(*) as total_active_numbers,
    MAX(counter) as highest_counter
FROM serial_number_registry 
WHERE status = 'active';

-- Create function to get next available counter
-- Note: This is a view since SQLite doesn't have stored procedures
CREATE VIEW IF NOT EXISTS v_available_counter_ranges AS
WITH RECURSIVE counter_gaps AS (
    SELECT 1 as counter
    UNION ALL
    SELECT counter + 1 
    FROM counter_gaps 
    WHERE counter < (SELECT MAX(counter) FROM serial_number_registry WHERE status = 'active')
)
SELECT 
    cg.counter as available_counter
FROM counter_gaps cg
LEFT JOIN serial_number_registry snr ON cg.counter = snr.counter AND snr.status = 'active'
WHERE snr.counter IS NULL
ORDER BY cg.counter;

-- Schema documentation
-- This table serves as:
-- 1. Registry of all serial numbers (existing from Excel + newly generated)
-- 2. Status tracking (active, deprecated, reassigned)
-- 3. Link between serial numbers and production system
-- 4. Audit trail for all changes
-- 5. Support for manual generation with parameter control