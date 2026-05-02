-- Railway Database Migration Script
-- This script ensures all required tables and columns exist with proper constraints

-- 1. Create menu_items table if not exists
CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    price DECIMAL(8,2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    preparation_time INTEGER DEFAULT 15,
    is_vegetarian BOOLEAN DEFAULT false,
    is_spicy BOOLEAN DEFAULT false,
    allergens TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create customers table if not exists
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100),
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create orders table if not exists
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(20) UNIQUE,
    order_type VARCHAR(20) NOT NULL DEFAULT 'dine-in',
    customer_id INTEGER REFERENCES customers(id),
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    phone VARCHAR(20), -- Alternative phone field
    delivery_address TEXT,
    table_id INTEGER,
    subtotal DECIMAL(10,2),
    total DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2), -- Alternative total field
    status VARCHAR(20) DEFAULT 'pending',
    payment_status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- 4. Create order_items table if not exists
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INTEGER,
    menu_item_name VARCHAR(200) NOT NULL,
    item_name VARCHAR(200), -- Alternative name field
    name VARCHAR(200), -- Another alternative name field
    price DECIMAL(8,2) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    subtotal DECIMAL(8,2) NOT NULL,
    special_instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create payments table with all payment methods
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    invoice_number VARCHAR(100),
    amount_received DECIMAL(10,2),
    change_given DECIMAL(10,2),
    payment_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create daybook_transactions table
CREATE TABLE IF NOT EXISTS daybook_transactions (
    id SERIAL PRIMARY KEY,
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    order_id INTEGER REFERENCES orders(id),
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Create staff table for authentication
CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL DEFAULT 'Waiter',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7.5. Create table_sessions table for dine-in management
CREATE TABLE IF NOT EXISTS table_sessions (
    id SERIAL PRIMARY KEY,
    table_id VARCHAR(10) NOT NULL,
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active',
    total_amount DECIMAL(10,2) DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'unpaid',
    notes TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for table_sessions
CREATE INDEX IF NOT EXISTS idx_table_sessions_table_id ON table_sessions(table_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_status ON table_sessions(status);

-- 8. Update payment method constraints to include all methods
-- Drop existing constraint if it exists
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;

-- Add new constraint with all payment methods
ALTER TABLE payments ADD CONSTRAINT payments_payment_method_check 
CHECK (payment_method IN ('cash', 'card', 'phonepe', 'esewa', 'khalti', 'digital'));

-- 9. Add missing columns to orders table if they don't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_latitude DECIMAL(10,8);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_longitude DECIMAL(11,8);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_landmark TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_distance DECIMAL(6,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_session_id INTEGER;

-- Make customer fields nullable for dine-in orders
ALTER TABLE orders ALTER COLUMN customer_phone DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN customer_name DROP NOT NULL;

-- 10. Add missing columns to order_items table if they don't exist
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS item_name VARCHAR(200);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS name VARCHAR(200);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS menu_item_category VARCHAR(100);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_vegetarian BOOLEAN DEFAULT false;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_spicy BOOLEAN DEFAULT false;

-- 11. Update order status constraints
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled'));

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check 
CHECK (payment_status IN ('pending', 'paid'));

-- 12. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- 13. Insert default staff users if not exists
-- Admin password: FoodZone2024!
INSERT INTO staff (username, password_hash, full_name, role, is_active) 
VALUES ('admin', '$2b$10$kBdrwDTQptt1D2jdHs/aWu/OSaXBIM47dj3.6CuTxRPEyqLci3r2.', 'Administrator', 'Manager', true)
ON CONFLICT (username) DO UPDATE SET 
    password_hash = EXCLUDED.password_hash,
    role = 'Manager',
    is_active = EXCLUDED.is_active;

-- Manager password: Manager2024!
INSERT INTO staff (username, password_hash, full_name, role, is_active)
VALUES ('manager', '$2b$10$feZXqZeabG/lHhTQPBSm.utZRaDP8KhYDR268y95kKjMuzU/BvtCi', 'Manager', 'Manager', true)
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Chef password: Chef2024!
INSERT INTO staff (username, password_hash, full_name, role, is_active)
VALUES ('chef', '$2b$10$CmEBVSfGYPz0SQY3QykmhegmeRMbNlfzp.kNUnCICU2VhLB.cwq4G', 'Chef', 'Chef', true)
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Waiter password: Waiter2024!
INSERT INTO staff (username, password_hash, full_name, role, is_active)
VALUES ('waiter', '$2b$10$Bj/0J4aPxOGt/YVPMTNCtesaTPR3h00IoyuO5qyS06ohPszCM.dnG', 'Waiter', 'Waiter', true)
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Cashier password: Cashier2024!
INSERT INTO staff (username, password_hash, full_name, role, is_active)
VALUES ('cashier', '$2b$10$AgyiUYewemKhD2OXNK0CueYPlPeCJG.Qgo/8Qx4oXFUr7nAiM6H6y', 'Cashier', 'Cashier', true)
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- 14. Ensure order_type consistency
UPDATE orders SET order_type = 'dine-in' WHERE order_type = 'dine_in';

-- 15. Create restaurant_settings table if not exists
CREATE TABLE IF NOT EXISTS restaurant_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migration completed successfully
SELECT 'Railway database migration completed successfully!' as status;
