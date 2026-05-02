-- Insert test orders for staff dashboard testing
-- This will help verify the staff dashboard displays orders correctly

-- Insert test customers first
INSERT INTO customers (name, phone, total_orders, total_spent) VALUES
('John Doe', '9841234567', 1, 450.00),
('Jane Smith', '9851234568', 1, 320.00)
ON CONFLICT (phone) DO NOTHING;

-- Insert test orders for today
INSERT INTO orders (
    order_number, order_type, customer_name, customer_phone, 
    table_id, subtotal, total, status, created_at
) VALUES
('FZ-TEST-001', 'dine-in', 'John Doe', '9841234567', '5', 400.00, 450.00, 'pending', NOW()),
('FZ-TEST-002', 'dine-in', 'Jane Smith', '9851234568', '12', 280.00, 320.00, 'preparing', NOW() - INTERVAL '15 minutes'),
('FZ-TEST-003', 'delivery', 'Mike Johnson', '9861234569', NULL, 350.00, 400.00, 'ready', NOW() - INTERVAL '30 minutes');

-- Get the order IDs for inserting order items
DO $$
DECLARE
    order1_id INTEGER;
    order2_id INTEGER;
    order3_id INTEGER;
BEGIN
    -- Get order IDs
    SELECT id INTO order1_id FROM orders WHERE order_number = 'FZ-TEST-001';
    SELECT id INTO order2_id FROM orders WHERE order_number = 'FZ-TEST-002';
    SELECT id INTO order3_id FROM orders WHERE order_number = 'FZ-TEST-003';
    
    -- Insert order items for order 1
    INSERT INTO order_items (order_id, menu_item_id, menu_item_name, menu_item_category, price, quantity, subtotal) VALUES
    (order1_id, 1, 'Chicken Momo Steam', 'MoMo', 140.00, 2, 280.00),
    (order1_id, 2, 'Veg Chowmein Full', 'Chowmein', 110.00, 1, 110.00);
    
    -- Insert order items for order 2
    INSERT INTO order_items (order_id, menu_item_id, menu_item_name, menu_item_category, price, quantity, subtotal) VALUES
    (order2_id, 3, 'Chicken Burger', 'Sandwiches & Burgers', 180.00, 1, 180.00),
    (order2_id, 4, 'French Fries', 'Fries', 160.00, 1, 160.00);
    
    -- Insert order items for order 3
    INSERT INTO order_items (order_id, menu_item_id, menu_item_name, menu_item_category, price, quantity, subtotal) VALUES
    (order3_id, 5, 'Chicken Biryani', 'Rice & Biryani', 320.00, 1, 320.00),
    (order3_id, 6, 'Coca Cola', 'Soft Drinks', 70.00, 1, 70.00);
END $$;

-- Update delivery order with address
UPDATE orders SET 
    delivery_address = '123 Test Street, Kathmandu',
    delivery_latitude = 27.7172,
    delivery_longitude = 85.3240,
    delivery_landmark = 'Near Test Mall'
WHERE order_number = 'FZ-TEST-003';

-- Show inserted orders
SELECT 
    order_number, 
    order_type, 
    customer_name, 
    table_id, 
    total, 
    status, 
    created_at 
FROM orders 
WHERE order_number LIKE 'FZ-TEST-%' 
ORDER BY created_at DESC;
