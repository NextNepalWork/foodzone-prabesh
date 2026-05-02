-- Food Zone Database Schema
-- PostgreSQL with PostGIS for geospatial features

-- Enable PostGIS extension for location features
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Customers table
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100),
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Customer addresses table
CREATE TABLE customer_addresses (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    label VARCHAR(50) DEFAULT 'Home', -- 'Home', 'Work', 'Other'
    address TEXT NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    landmark VARCHAR(200),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add geospatial index for fast location queries
CREATE INDEX idx_addresses_location ON customer_addresses 
USING GIST (ST_MakePoint(longitude, latitude));

-- 2.5. Table Sessions table (for dine-in table management)
CREATE TABLE table_sessions (
    id SERIAL PRIMARY KEY,
    table_id INTEGER NOT NULL CHECK (table_id >= 1 AND table_id <= 25),
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_end TIMESTAMP,
    status VARCHAR(20) DEFAULT 'occupied' CHECK (status IN ('occupied', 'ordering', 'dining', 'payment_pending', 'completed', 'cleared')),
    total_amount DECIMAL(10,2) DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast table lookups
CREATE INDEX idx_table_sessions_table_id ON table_sessions(table_id);
CREATE INDEX idx_table_sessions_status ON table_sessions(status);

-- 2.6. Table Payments table
CREATE TABLE table_payments (
    id SERIAL PRIMARY KEY,
    table_session_id INTEGER REFERENCES table_sessions(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- 'mobile', 'card', 'cash', 'digital_wallet'
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    transaction_id VARCHAR(100),
    gateway_response TEXT, -- Store payment gateway response
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for payment tracking
CREATE INDEX idx_table_payments_session ON table_payments(table_session_id);
CREATE INDEX idx_table_payments_status ON table_payments(payment_status);

-- 3. Orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(20) UNIQUE NOT NULL, -- 'FZ-2024-001'
    order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('dine-in', 'delivery')),
    
    -- Customer info
    customer_id INTEGER REFERENCES customers(id),
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    
    -- Location info (for delivery orders)
    delivery_address TEXT,
    delivery_latitude DECIMAL(10,8),
    delivery_longitude DECIMAL(11,8),
    delivery_landmark VARCHAR(200),
    delivery_distance DECIMAL(5,2), -- km from restaurant
    delivery_fee DECIMAL(8,2) DEFAULT 0,
    
    -- Table info (for dine-in orders)
    table_id INTEGER,
    table_session_id INTEGER REFERENCES table_sessions(id),
    
    -- Order financial details
    subtotal DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    
    -- Order status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'digital', 'card')),
    
    -- Special instructions
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- 4. Order items table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INTEGER NOT NULL,
    menu_item_name VARCHAR(200) NOT NULL,
    menu_item_category VARCHAR(100),
    price DECIMAL(8,2) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    subtotal DECIMAL(8,2) NOT NULL,
    special_instructions TEXT
);

-- 5. Delivery zones table
CREATE TABLE delivery_zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    delivery_fee DECIMAL(8,2) NOT NULL,
    estimated_time INTEGER NOT NULL, -- minutes
    max_distance DECIMAL(5,2) NOT NULL, -- km from restaurant
    min_order_amount DECIMAL(8,2) DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Restaurant settings table
CREATE TABLE restaurant_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default restaurant settings
INSERT INTO restaurant_settings (setting_key, setting_value, description) VALUES
('table_count', '25', 'Total number of tables in restaurant'),
('restaurant_name', 'Food Zone Duwakot', 'Restaurant name'),
('restaurant_phone', '9851234567', 'Primary contact number'),
('restaurant_address', 'KMC Chowk, Duwakot, Bhaktapur', 'Restaurant address'),
('restaurant_latitude', '27.6710', 'Restaurant latitude coordinate'),
('restaurant_longitude', '85.4298', 'Restaurant longitude coordinate'),
('delivery_radius', '5.0', 'Maximum delivery radius in km'),
('min_delivery_amount', '200', 'Minimum order amount for delivery'),
('delivery_fee_base', '50', 'Base delivery fee');

-- Insert default delivery zones
INSERT INTO delivery_zones (name, description, delivery_fee, estimated_time, max_distance, min_order_amount) VALUES
('Duwakot Central', 'Central Duwakot area including KMC Hospital vicinity', 30, 15, 1.0, 150),
('Duwakot Extended', 'Extended Duwakot area and nearby localities', 50, 25, 3.0, 200),
('Bhaktapur City', 'Bhaktapur city center and surrounding areas', 80, 35, 5.0, 300);

-- Create indexes for better performance
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX idx_orders_table_id ON orders(table_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_customers_phone ON customers(phone);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurant_settings_updated_at BEFORE UPDATE ON restaurant_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for common queries
CREATE VIEW order_summary AS
SELECT 
    o.id,
    o.order_number,
    o.order_type,
    o.customer_name,
    o.customer_phone,
    o.table_id,
    o.delivery_address,
    o.total,
    o.status,
    o.payment_status,
    o.created_at,
    COUNT(oi.id) as item_count,
    STRING_AGG(oi.menu_item_name || ' x' || oi.quantity, ', ') as items_summary
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.order_number, o.order_type, o.customer_name, o.customer_phone, 
         o.table_id, o.delivery_address, o.total, o.status, o.payment_status, o.created_at
ORDER BY o.created_at DESC;

-- Create view for customer statistics
CREATE VIEW customer_stats AS
SELECT 
    c.id,
    c.name,
    c.phone,
    c.total_orders,
    c.total_spent,
    c.created_at as first_order_date,
    MAX(o.created_at) as last_order_date,
    COUNT(DISTINCT o.id) as actual_order_count,
    AVG(o.total) as average_order_value
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, c.name, c.phone, c.total_orders, c.total_spent, c.created_at;
