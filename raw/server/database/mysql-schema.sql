-- Food Zone Restaurant Database Schema for MySQL
-- Create tables for the restaurant ordering system

-- Menu Items Table
CREATE TABLE IF NOT EXISTS menu_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100),
    image_url VARCHAR(500),
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    table_id VARCHAR(50) NOT NULL,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_address TEXT,
    customer_latitude DECIMAL(10, 8),
    customer_longitude DECIMAL(11, 8),
    order_type ENUM('table', 'delivery') DEFAULT 'table',
    items JSON NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    delivery_fee DECIMAL(10, 2) DEFAULT 0,
    status ENUM('pending', 'preparing', 'ready', 'delivered', 'cancelled') DEFAULT 'pending',
    special_instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table Sessions Table (for managing table occupancy)
CREATE TABLE IF NOT EXISTS table_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    table_id VARCHAR(50) NOT NULL UNIQUE,
    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin Settings Table
CREATE TABLE IF NOT EXISTS admin_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default menu items
INSERT IGNORE INTO menu_items (name, description, price, category, image_url) VALUES
('Chicken Momo', 'Steamed chicken dumplings served with spicy sauce', 180.00, 'Appetizers', '/images/menu-common.jpg'),
('Buff Momo', 'Traditional buffalo meat dumplings', 200.00, 'Appetizers', '/images/menu-common.jpg'),
('Veg Momo', 'Mixed vegetable dumplings', 150.00, 'Appetizers', '/images/menu-common.jpg'),
('Chicken Chowmein', 'Stir-fried noodles with chicken and vegetables', 220.00, 'Main Course', '/images/menu-common.jpg'),
('Buff Chowmein', 'Spicy buffalo meat noodles', 240.00, 'Main Course', '/images/menu-common.jpg'),
('Veg Chowmein', 'Vegetable stir-fried noodles', 180.00, 'Main Course', '/images/menu-common.jpg'),
('Chicken Thali', 'Complete meal with chicken curry, rice, dal, and vegetables', 350.00, 'Thali Sets', '/images/menu-common.jpg'),
('Mutton Thali', 'Traditional mutton curry set with rice and sides', 450.00, 'Thali Sets', '/images/menu-common.jpg'),
('Dal Bhat Tarkari', 'Traditional Nepali meal with lentils, rice, and curry', 280.00, 'Thali Sets', '/images/menu-common.jpg'),
('Chicken Burger', 'Grilled chicken burger with fries', 280.00, 'Fast Food', '/images/menu-common.jpg'),
('Cheese Burger', 'Beef burger with cheese and vegetables', 320.00, 'Fast Food', '/images/menu-common.jpg'),
('French Fries', 'Crispy golden potato fries', 120.00, 'Sides', '/images/menu-common.jpg'),
('Coca Cola', 'Chilled soft drink', 80.00, 'Beverages', '/images/menu-common.jpg'),
('Fresh Lime Soda', 'Refreshing lime drink', 100.00, 'Beverages', '/images/menu-common.jpg'),
('Lassi', 'Traditional yogurt drink', 120.00, 'Beverages', '/images/menu-common.jpg');

-- Insert default admin settings
INSERT IGNORE INTO admin_settings (setting_key, setting_value) VALUES
('restaurant_name', 'Food Zone Duwakot'),
('restaurant_phone', '9851234567'),
('restaurant_address', 'KMC Chowk, Duwakot, Bhaktapur'),
('delivery_radius', '5.0'),
('min_delivery_amount', '200'),
('base_delivery_fee', '50');
