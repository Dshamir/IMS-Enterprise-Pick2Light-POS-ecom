-- Migration: Add Orders Management System
-- Description: Creates tables for managing customer orders and their fulfillment through manufacturing

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    order_date TEXT DEFAULT (datetime('now')),
    due_date TEXT,
    status TEXT DEFAULT 'pending', -- pending, in_progress, manufacturing, completed, cancelled
    priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
    total_value REAL DEFAULT 0,
    notes TEXT,
    requires_manufacturing INTEGER DEFAULT 0, -- Boolean: 1 if any items need manufacturing
    manufacturing_status TEXT DEFAULT 'not_required', -- not_required, bom_needed, bom_created, in_production, completed
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    product_id TEXT,
    product_name TEXT NOT NULL,
    product_description TEXT,
    quantity INTEGER NOT NULL,
    unit_price REAL DEFAULT 0,
    total_price REAL DEFAULT 0,
    requires_manufacturing INTEGER DEFAULT 0, -- Boolean: 1 if this item needs to be manufactured
    bom_id TEXT, -- Link to manufacturing BOM if applicable
    production_run_id TEXT, -- Link to production run if applicable
    fulfillment_status TEXT DEFAULT 'pending', -- pending, in_stock, manufacturing, ready, shipped
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    FOREIGN KEY (bom_id) REFERENCES manufacturing_boms(id) ON DELETE SET NULL,
    FOREIGN KEY (production_run_id) REFERENCES production_runs(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_due_date ON orders(due_date);
CREATE INDEX IF NOT EXISTS idx_orders_manufacturing_status ON orders(manufacturing_status);
CREATE INDEX IF NOT EXISTS idx_orders_requires_manufacturing ON orders(requires_manufacturing);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_bom_id ON order_items(bom_id);
CREATE INDEX IF NOT EXISTS idx_order_items_production_run_id ON order_items(production_run_id);
CREATE INDEX IF NOT EXISTS idx_order_items_fulfillment_status ON order_items(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_order_items_requires_manufacturing ON order_items(requires_manufacturing);

-- Add triggers to update timestamps
CREATE TRIGGER IF NOT EXISTS update_orders_timestamp 
AFTER UPDATE ON orders
BEGIN
    UPDATE orders SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_order_items_timestamp 
AFTER UPDATE ON order_items
BEGIN
    UPDATE order_items SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Add trigger to update order total and manufacturing status
CREATE TRIGGER IF NOT EXISTS update_order_totals
AFTER INSERT ON order_items
BEGIN
    UPDATE orders SET 
        total_value = (
            SELECT COALESCE(SUM(total_price), 0) 
            FROM order_items 
            WHERE order_id = NEW.order_id
        ),
        requires_manufacturing = (
            SELECT CASE 
                WHEN COUNT(*) > 0 THEN 1 
                ELSE 0 
            END
            FROM order_items 
            WHERE order_id = NEW.order_id 
            AND requires_manufacturing = 1
        ),
        manufacturing_status = (
            SELECT CASE 
                WHEN COUNT(*) = 0 THEN 'not_required'
                WHEN COUNT(CASE WHEN bom_id IS NOT NULL THEN 1 END) = 0 THEN 'bom_needed'
                WHEN COUNT(CASE WHEN production_run_id IS NOT NULL THEN 1 END) = 0 THEN 'bom_created'
                ELSE 'in_production'
            END
            FROM order_items 
            WHERE order_id = NEW.order_id 
            AND requires_manufacturing = 1
        )
    WHERE id = NEW.order_id;
END;

CREATE TRIGGER IF NOT EXISTS update_order_totals_on_update
AFTER UPDATE ON order_items
BEGIN
    UPDATE orders SET 
        total_value = (
            SELECT COALESCE(SUM(total_price), 0) 
            FROM order_items 
            WHERE order_id = NEW.order_id
        ),
        requires_manufacturing = (
            SELECT CASE 
                WHEN COUNT(*) > 0 THEN 1 
                ELSE 0 
            END
            FROM order_items 
            WHERE order_id = NEW.order_id 
            AND requires_manufacturing = 1
        ),
        manufacturing_status = (
            SELECT CASE 
                WHEN COUNT(*) = 0 THEN 'not_required'
                WHEN COUNT(CASE WHEN bom_id IS NOT NULL THEN 1 END) = 0 THEN 'bom_needed'
                WHEN COUNT(CASE WHEN production_run_id IS NOT NULL THEN 1 END) = 0 THEN 'bom_created'
                ELSE 'in_production'
            END
            FROM order_items 
            WHERE order_id = NEW.order_id 
            AND requires_manufacturing = 1
        )
    WHERE id = NEW.order_id;
END;

-- Create order_bom_links table to track which BOMs fulfill which orders
CREATE TABLE IF NOT EXISTS order_bom_links (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    order_item_id TEXT,
    bom_id TEXT NOT NULL,
    quantity_needed INTEGER NOT NULL,
    quantity_completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
    FOREIGN KEY (bom_id) REFERENCES manufacturing_boms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_bom_links_order_id ON order_bom_links(order_id);
CREATE INDEX IF NOT EXISTS idx_order_bom_links_bom_id ON order_bom_links(bom_id);

-- Insert sample data for testing
INSERT OR IGNORE INTO orders (id, order_number, customer_name, customer_email, status, priority, due_date, notes) VALUES
('order-001', 'ORD-2025-001', 'Acme Corporation', 'orders@acme.com', 'pending', 'high', '2025-07-20', 'Rush order for quarterly review'),
('order-002', 'ORD-2025-002', 'TechStart Inc', 'procurement@techstart.com', 'pending', 'normal', '2025-07-25', 'Standard delivery schedule');

-- Sample order items (some requiring manufacturing)
INSERT OR IGNORE INTO order_items (id, order_id, product_name, product_description, quantity, unit_price, total_price, requires_manufacturing, notes) VALUES
('item-001', 'order-001', 'Kimera P-IV PCR System', 'Complete PCR analysis system', 2, 15000.00, 30000.00, 1, 'Custom configuration required'),
('item-002', 'order-001', 'Standard Test Kit', 'Ready-to-ship test kit', 10, 150.00, 1500.00, 0, 'In stock item'),
('item-003', 'order-002', 'Kimera P-IV PCR System', 'Complete PCR analysis system', 1, 15000.00, 15000.00, 1, 'Standard configuration'),
('item-004', 'order-002', 'Calibration Kit', 'System calibration tools', 1, 500.00, 500.00, 0, 'Ships with main unit');