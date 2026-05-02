-- Insert test orders for today's date to test Reception page
-- These orders will appear in the Reception dashboard

INSERT INTO orders (
    order_number, order_type, customer_name, customer_phone, 
    table_id, subtotal, total, status, payment_status, created_at
) VALUES 
-- Active orders
('FZ-' || TO_CHAR(NOW(), 'YYYY-MM-DD') || '-001', 'dine-in', 'John Doe', '9841234567', 5, 450.00, 450.00, 'pending', 'pending', NOW()),
('FZ-' || TO_CHAR(NOW(), 'YYYY-MM-DD') || '-002', 'dine-in', 'Jane Smith', '9851234568', 3, 320.00, 320.00, 'preparing', 'pending', NOW()),
('FZ-' || TO_CHAR(NOW(), 'YYYY-MM-DD') || '-003', 'delivery', 'Ram Sharma', '9861234569', NULL, 280.00, 330.00, 'ready', 'paid', NOW()),
('FZ-' || TO_CHAR(NOW(), 'YYYY-MM-DD') || '-004', 'dine-in', 'Sita Patel', '9871234570', 7, 180.00, 180.00, 'preparing', 'pending', NOW()),

-- Completed orders
('FZ-' || TO_CHAR(NOW(), 'YYYY-MM-DD') || '-005', 'dine-in', 'Mike Wilson', '9881234571', 2, 250.00, 250.00, 'completed', 'paid', NOW() - INTERVAL '2 hours'),
('FZ-' || TO_CHAR(NOW(), 'YYYY-MM-DD') || '-006', 'delivery', 'Lisa Johnson', '9891234572', NULL, 380.00, 430.00, 'completed', 'paid', NOW() - INTERVAL '1 hour'),
('FZ-' || TO_CHAR(NOW(), 'YYYY-MM-DD') || '-007', 'dine-in', 'David Brown', '9801234573', 4, 150.00, 150.00, 'completed', 'paid', NOW() - INTERVAL '30 minutes');

-- Insert corresponding order items
INSERT INTO order_items (order_id, menu_item_id, quantity, price, subtotal) 
SELECT 
    o.id,
    1, -- Assuming menu item ID 1 exists
    2,
    225.00,
    450.00
FROM orders o 
WHERE o.order_number LIKE 'FZ-' || TO_CHAR(NOW(), 'YYYY-MM-DD') || '%'
AND o.customer_name = 'John Doe';

INSERT INTO order_items (order_id, menu_item_id, quantity, price, subtotal) 
SELECT 
    o.id,
    2, -- Assuming menu item ID 2 exists
    1,
    320.00,
    320.00
FROM orders o 
WHERE o.order_number LIKE 'FZ-' || TO_CHAR(NOW(), 'YYYY-MM-DD') || '%'
AND o.customer_name = 'Jane Smith';
