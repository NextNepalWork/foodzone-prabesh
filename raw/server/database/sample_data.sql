-- Sample data for Food Zone Restaurant
-- This will populate the database with test orders and customers for demo purposes

-- Insert sample customers
INSERT INTO customers (name, phone, email, total_orders, total_spent) VALUES
('John Doe', '9841234567', 'john@example.com', 3, 850.00),
('Jane Smith', '9847654321', 'jane@example.com', 2, 560.00),
('Ram Sharma', '9851111111', 'ram@example.com', 1, 320.00),
('Sita Patel', '9862222222', 'sita@example.com', 4, 1200.00),
('Mike Johnson', '9873333333', 'mike@example.com', 1, 180.00);

-- Insert sample customer addresses
INSERT INTO customer_addresses (customer_id, label, address, latitude, longitude, landmark, is_default) VALUES
(2, 'Home', 'Duwakot, Bhaktapur', 27.6710, 85.4298, 'Near KMC Hospital', true),
(4, 'Home', 'Madhyapur Thimi', 27.6789, 85.4456, 'Near Bus Stop', true),
(5, 'Office', 'Bhaktapur Durbar Square', 27.6722, 85.4276, 'Heritage Site', false);

-- Insert sample table sessions
INSERT INTO table_sessions (table_id, customer_name, customer_phone, status, total_amount, payment_status, notes) VALUES
(5, 'John Doe', '9841234567', 'completed', 360.00, 'paid', 'Regular customer'),
(12, 'Ram Sharma', '9851111111', 'dining', 320.00, 'unpaid', 'Birthday celebration');

-- Insert sample orders
INSERT INTO orders (order_number, order_type, customer_id, customer_name, customer_phone, delivery_address, table_id, table_session_id, subtotal, total, status, payment_status, payment_method, notes) VALUES
('FZ-2024-001', 'delivery', 2, 'Jane Smith', '9847654321', 'Duwakot, Bhaktapur', NULL, NULL, 280.00, 330.00, 'completed', 'paid', 'digital', 'Extra spicy'),
('FZ-2024-002', 'dine-in', 1, 'John Doe', '9841234567', NULL, 5, 1, 360.00, 360.00, 'completed', 'paid', 'cash', NULL),
('FZ-2024-003', 'delivery', 4, 'Sita Patel', '9862222222', 'Madhyapur Thimi', NULL, NULL, 450.00, 500.00, 'preparing', 'paid', 'digital', 'Call before delivery'),
('FZ-2024-004', 'dine-in', 3, 'Ram Sharma', '9851111111', NULL, 12, 2, 320.00, 320.00, 'ready', 'pending', NULL, 'Birthday special'),
('FZ-2024-005', 'delivery', 5, 'Mike Johnson', '9873333333', 'Bhaktapur Durbar Square', NULL, NULL, 180.00, 230.00, 'pending', 'paid', 'card', 'Office delivery');

-- Insert sample menu items
INSERT INTO menu_items (name, description, price, category, available, image_url) VALUES
-- MoMo
('Chicken MoMo (Steam)', 'Traditional steamed chicken dumplings served with spicy tomato chutney', 140.00, 'MoMo', true, NULL),
('Veg MoMo (Steam)', 'Fresh vegetable dumplings steamed to perfection', 120.00, 'MoMo', true, NULL),
('Chicken MoMo (Fried)', 'Crispy fried chicken momos with special sauce', 160.00, 'MoMo', true, NULL),
('Buff MoMo (Steam)', 'Traditional buffalo meat dumplings', 150.00, 'MoMo', true, NULL),

-- Pizza
('9 Inch Chicken Pizza', 'Delicious chicken pizza with fresh toppings', 450.00, 'Pizza', true, NULL),
('9 Inch Veg Pizza', 'Fresh vegetable pizza with cheese', 380.00, 'Pizza', true, NULL),
('Margherita Pizza', 'Classic pizza with tomato sauce and mozzarella', 350.00, 'Pizza', true, NULL),

-- Sandwiches & Burgers
('Chicken Burger', 'Juicy chicken patty with fresh vegetables', 220.00, 'Sandwiches & Burgers', true, NULL),
('Veg Burger', 'Healthy vegetable patty burger', 180.00, 'Sandwiches & Burgers', true, NULL),
('Chicken Sandwich', 'Grilled chicken sandwich with mayo', 180.00, 'Sandwiches & Burgers', true, NULL),

-- Rice & Biryani
('Chicken Biryani', 'Aromatic basmati rice with tender chicken', 320.00, 'Rice & Biryani', true, NULL),
('Veg Biryani', 'Flavorful vegetable biryani with spices', 280.00, 'Rice & Biryani', true, NULL),
('Mutton Biryani', 'Rich mutton biryani with traditional spices', 380.00, 'Rice & Biryani', true, NULL),

-- Beverages
('Coke', 'Chilled Coca-Cola', 70.00, 'Cold Beverages', true, NULL),
('Pepsi', 'Refreshing Pepsi cola', 70.00, 'Cold Beverages', true, NULL),
('Fresh Lime Soda', 'Refreshing lime soda with mint', 90.00, 'Cold Beverages', true, NULL),
('Masala Tea', 'Traditional Nepali spiced tea', 40.00, 'Hot Beverages', true, NULL),
('Black Coffee', 'Strong black coffee', 60.00, 'Hot Beverages', true, NULL),

-- Appetizers
('Chicken Wings', 'Spicy buffalo chicken wings', 280.00, 'Appetizers', true, NULL),
('Veg Spring Rolls', 'Crispy vegetable spring rolls', 180.00, 'Appetizers', true, NULL),
('Chicken Sekuwa', 'Grilled chicken with Nepali spices', 320.00, 'Appetizers', true, NULL),

-- Desserts
('Chocolate Cake', 'Rich chocolate cake slice', 150.00, 'Desserts', true, NULL),
('Ice Cream Sundae', 'Vanilla ice cream with chocolate sauce', 120.00, 'Desserts', true, NULL),
('Gulab Jamun', 'Traditional sweet dumplings in syrup', 100.00, 'Desserts', true, NULL);

-- Insert sample order items
INSERT INTO order_items (order_id, menu_item_id, menu_item_name, menu_item_category, price, quantity, subtotal, special_instructions) VALUES
-- Order 1 (Jane Smith - Delivery)
(1, 46, 'Chicken MoMo (Steam)', 'MoMo', 140.00, 2, 280.00, 'Extra jhol'),

-- Order 2 (John Doe - Dine-in)
(2, 34, 'Veg MoMo (Steam)', 'MoMo', 120.00, 1, 120.00, NULL),
(2, 75, '9 Inch Chicken Pizza', 'Pizza', 450.00, 1, 450.00, 'Extra cheese'),
(2, 155, 'Coke', 'Cold Beverages', 70.00, 2, 140.00, NULL),

-- Order 3 (Sita Patel - Delivery)
(3, 89, 'Veg Biryani', 'Rice & Biryani', 280.00, 1, 280.00, NULL),
(3, 28, 'Veg Burger', 'Sandwiches & Burgers', 180.00, 1, 180.00, 'No onions'),

-- Order 4 (Ram Sharma - Dine-in)
(4, 90, 'Chicken Biryani', 'Rice & Biryani', 320.00, 1, 320.00, 'Birthday special presentation'),

-- Order 5 (Mike Johnson - Delivery)
(5, 24, 'Chicken Sandwich', 'Sandwiches & Burgers', 180.00, 1, 180.00, NULL);

-- Update order timestamps to show recent activity
UPDATE orders SET 
  created_at = CURRENT_TIMESTAMP - INTERVAL '2 hours',
  updated_at = CURRENT_TIMESTAMP - INTERVAL '2 hours'
WHERE id = 1;

UPDATE orders SET 
  created_at = CURRENT_TIMESTAMP - INTERVAL '1 hour',
  updated_at = CURRENT_TIMESTAMP - INTERVAL '30 minutes',
  completed_at = CURRENT_TIMESTAMP - INTERVAL '30 minutes'
WHERE id = 2;

UPDATE orders SET 
  created_at = CURRENT_TIMESTAMP - INTERVAL '30 minutes',
  updated_at = CURRENT_TIMESTAMP - INTERVAL '10 minutes'
WHERE id = 3;

UPDATE orders SET 
  created_at = CURRENT_TIMESTAMP - INTERVAL '20 minutes',
  updated_at = CURRENT_TIMESTAMP - INTERVAL '5 minutes'
WHERE id = 4;

UPDATE orders SET 
  created_at = CURRENT_TIMESTAMP - INTERVAL '10 minutes',
  updated_at = CURRENT_TIMESTAMP - INTERVAL '10 minutes'
WHERE id = 5;
