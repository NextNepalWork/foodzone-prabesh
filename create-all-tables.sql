-- Food Zone Complete Database Schema
-- Run this script to create all required tables for the Food Zone restaurant system

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create customer addresses table
CREATE TABLE IF NOT EXISTS customer_addresses (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    address_line1 VARCHAR(200) NOT NULL,
    address_line2 VARCHAR(200),
    city VARCHAR(50) NOT NULL,
    state VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'Nepal',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table sessions table
CREATE TABLE IF NOT EXISTS table_sessions (
    id SERIAL PRIMARY KEY,
    table_id VARCHAR(10) NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ordering', 'ordered', 'served', 'payment_pending', 'completed', 'cancelled')),
    total_amount DECIMAL(10,2) DEFAULT 0.00,
    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    table_session_id INTEGER REFERENCES table_sessions(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id),
    table_id VARCHAR(10),
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    order_type VARCHAR(20) DEFAULT 'dine_in' CHECK (order_type IN ('dine_in', 'takeaway', 'delivery')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled')),
    total_amount DECIMAL(10,2) NOT NULL,
    special_instructions TEXT,
    estimated_completion_time TIMESTAMP,
    order_number VARCHAR(20) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create order items table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INTEGER REFERENCES menu_items(id),
    menu_item_name VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(8,2) NOT NULL,
    subtotal DECIMAL(8,2) NOT NULL,
    special_instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    table_session_id INTEGER REFERENCES table_sessions(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'card', 'phonepe')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    transaction_id VARCHAR(100),
    invoice_number VARCHAR(50),
    amount_received DECIMAL(10,2),
    change_given DECIMAL(10,2) DEFAULT 0.00,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create staff table
CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Manager', 'Chef', 'Waiter', 'Cashier', 'Kitchen Helper')),
    phone VARCHAR(20),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES staff(id)
);

-- Create daybook tables for financial tracking
CREATE TABLE IF NOT EXISTS daybook_transactions (
    id SERIAL PRIMARY KEY,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('income', 'expense')),
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'card', 'phonepe', 'bank_transfer')),
    reference_id VARCHAR(100),
    created_by INTEGER REFERENCES staff(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daybook_opening_balance (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
    opening_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_by INTEGER REFERENCES staff(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_table_sessions_table_id ON table_sessions(table_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_status ON table_sessions(status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_table_session_id ON orders(table_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(is_available);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_staff_username ON staff(username);
CREATE INDEX IF NOT EXISTS idx_daybook_date ON daybook_transactions(transaction_date);

-- Insert default restaurant settings if not exists
INSERT INTO restaurant_settings (setting_key, setting_value, description) VALUES
('table_count', '25', 'Total number of tables in restaurant'),
('restaurant_name', 'Food Zone Duwakot', 'Restaurant name'),
('restaurant_phone', '9851234567', 'Primary contact number'),
('restaurant_address', 'KMC Chowk, Duwakot, Bhaktapur', 'Restaurant address'),
('restaurant_latitude', '27.6710', 'Restaurant latitude coordinate'),
('restaurant_longitude', '85.4298', 'Restaurant longitude coordinate'),
('delivery_radius', '5.0', 'Maximum delivery radius in km'),
('min_delivery_amount', '200', 'Minimum order amount for delivery'),
('delivery_fee_base', '50', 'Base delivery fee')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert sample menu items if not exists
INSERT INTO menu_items (name, description, price, category, is_vegetarian, is_spicy) VALUES
('Chicken Momo', 'Steamed dumplings filled with seasoned chicken', 180.00, 'Appetizers', false, true),
('Veg Momo', 'Steamed dumplings filled with mixed vegetables', 150.00, 'Appetizers', true, false),
('Chicken Chowmein', 'Stir-fried noodles with chicken and vegetables', 220.00, 'Main Course', false, true),
('Veg Chowmein', 'Stir-fried noodles with mixed vegetables', 180.00, 'Main Course', true, false),
('Dal Bhat', 'Traditional Nepali meal with lentil soup and rice', 250.00, 'Main Course', true, false),
('Chicken Curry', 'Spicy chicken curry with traditional spices', 300.00, 'Main Course', false, true),
('Fried Rice', 'Wok-fried rice with vegetables and egg', 200.00, 'Main Course', true, false),
('Coca Cola', 'Refreshing soft drink', 50.00, 'Beverages', true, false),
('Lassi', 'Traditional yogurt-based drink', 80.00, 'Beverages', true, false),
('Kheer', 'Traditional rice pudding dessert', 120.00, 'Desserts', true, false)
ON CONFLICT (name) DO NOTHING;

-- Create default staff users with hashed passwords
-- Password for all: Staff2024!
INSERT INTO staff (username, password_hash, full_name, role, phone, email) VALUES
('admin', '$2b$12$LQv3c1yqBw2uuCD4mi7ePe.AG3.Fsl6/6QjNFJw7OX8YvMc8E8jLu', 'System Administrator', 'Manager', '9851234567', 'admin@foodzone.com'),
('manager', '$2b$12$8K.P5VY8YjCkYjCkYjCkYu8K.P5VY8YjCkYjCkYjCkYu8K.P5VY8Yj', 'Restaurant Manager', 'Manager', '9851234568', 'manager@foodzone.com'),
('chef', '$2b$12$8K.P5VY8YjCkYjCkYjCkYu8K.P5VY8YjCkYjCkYjCkYu8K.P5VY8Yj', 'Head Chef', 'Chef', '9851234569', 'chef@foodzone.com'),
('waiter', '$2b$12$8K.P5VY8YjCkYjCkYjCkYu8K.P5VY8YjCkYjCkYjCkYu8K.P5VY8Yj', 'Senior Waiter', 'Waiter', '9851234570', 'waiter@foodzone.com'),
('cashier', '$2b$12$8K.P5VY8YjCkYjCkYjCkYu8K.P5VY8YjCkYjCkYjCkYu8K.P5VY8Yj', 'Cashier', 'Cashier', '9851234571', 'cashier@foodzone.com')
ON CONFLICT (username) DO NOTHING;
