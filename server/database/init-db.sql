-- Food Zone Database Initialization Script
-- This script will be automatically executed when the PostgreSQL container starts

-- Create database if it doesn't exist (handled by docker-compose environment variables)

-- Connect to the foodzone_db database
\c foodzone_db;

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

-- Create menu items table
CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(8,2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    image_url VARCHAR(500),
    is_available BOOLEAN DEFAULT true,
    preparation_time INTEGER DEFAULT 15, -- in minutes
    is_vegetarian BOOLEAN DEFAULT false,
    is_spicy BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table sessions table
CREATE TABLE IF NOT EXISTS table_sessions (
    id SERIAL PRIMARY KEY,
    table_id INTEGER NOT NULL CHECK (table_id BETWEEN 1 AND 25),
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
    order_type VARCHAR(20) DEFAULT 'dine_in' CHECK (order_type IN ('dine_in', 'takeaway', 'delivery')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled')),
    total_amount DECIMAL(10,2) NOT NULL,
    special_instructions TEXT,
    estimated_completion_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create order items table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INTEGER REFERENCES menu_items(id),
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
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'card', 'digital_wallet', 'bank_transfer')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    transaction_id VARCHAR(100),
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create restaurant settings table
CREATE TABLE IF NOT EXISTS restaurant_settings (
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
('delivery_fee_base', '50', 'Base delivery fee')
ON CONFLICT (setting_key) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_table_sessions_table_id ON table_sessions(table_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_status ON table_sessions(status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_table_session_id ON orders(table_session_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(is_available);

-- Insert sample menu items
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
ON CONFLICT DO NOTHING;

-- Create a default admin user (password should be changed in production)
-- Password: FoodZone2024! (hashed with bcrypt)
INSERT INTO staff (username, password_hash, full_name, role, phone, email) VALUES
('admin', '$2b$12$LQv3c1yqBw2uuCD4mi7ePe.AG3.Fsl6/6QjNFJw7OX8YvMc8E8jLu', 'System Administrator', 'Manager', '9851234567', 'admin@foodzone.com')
ON CONFLICT (username) DO NOTHING;

COMMIT;
