-- Staff Management Database Schema
-- Create staff table for dynamic staff management

CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL CHECK (role IN ('Manager', 'Chef', 'Waiter', 'Cashier', 'Kitchen Helper')),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'admin'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staff_username ON staff(username);
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(is_active);

-- Insert default staff members
INSERT INTO staff (username, password_hash, full_name, role, email, phone) VALUES
('manager', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsKwHBfHy', 'Restaurant Manager', 'Manager', 'manager@foodzone.com', '+977-9800000001'),
('chef', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsKwHBfHy', 'Head Chef', 'Chef', 'chef@foodzone.com', '+977-9800000002'),
('waiter', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsKwHBfHy', 'Senior Waiter', 'Waiter', 'waiter@foodzone.com', '+977-9800000003'),
('cashier', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsKwHBfHy', 'Head Cashier', 'Cashier', 'cashier@foodzone.com', '+977-9800000004')
ON CONFLICT (username) DO NOTHING;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
