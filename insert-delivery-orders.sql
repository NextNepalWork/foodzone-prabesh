-- Insert delivery orders directly into the database
-- These orders will appear in the Delivery Orders section

INSERT INTO orders (
    order_number, customer_name, phone, address, items, 
    total, order_type, status, payment_status, created_at
) VALUES 
(
    'DEL' || EXTRACT(EPOCH FROM NOW())::bigint || '001',
    'John Smith',
    '9841234567',
    'Thamel, Kathmandu',
    '[{"name":"Chicken Momo","price":250,"quantity":2},{"name":"Fried Rice","price":180,"quantity":1}]',
    680,
    'delivery',
    'pending',
    'pending',
    NOW()
),
(
    'DEL' || EXTRACT(EPOCH FROM NOW())::bigint || '002',
    'Sarah Johnson',
    '9851234568',
    'Baneshwor, Kathmandu',
    '[{"name":"Dal Bhat","price":120,"quantity":1},{"name":"Chicken Curry","price":200,"quantity":1},{"name":"Lassi","price":80,"quantity":2}]',
    480,
    'delivery',
    'pending',
    'pending',
    NOW()
),
(
    'DEL' || EXTRACT(EPOCH FROM NOW())::bigint || '003',
    'Mike Wilson',
    '9861234569',
    'Lalitpur, Patan',
    '[{"name":"Pizza Margherita","price":450,"quantity":1},{"name":"Coke","price":50,"quantity":2}]',
    550,
    'delivery',
    'pending',
    'pending',
    NOW()
),
(
    'DEL' || EXTRACT(EPOCH FROM NOW())::bigint || '004',
    'Emma Davis',
    '9871234570',
    'Bhaktapur Durbar Square',
    '[{"name":"Buff Sekuwa","price":320,"quantity":1},{"name":"Chatamari","price":150,"quantity":2},{"name":"Local Beer","price":200,"quantity":1}]',
    820,
    'delivery',
    'pending',
    'pending',
    NOW()
),
(
    'DEL' || EXTRACT(EPOCH FROM NOW())::bigint || '005',
    'David Brown',
    '9881234571',
    'Kirtipur, Kathmandu',
    '[{"name":"Thukpa","price":180,"quantity":1},{"name":"Chowmein","price":160,"quantity":1},{"name":"Tea","price":30,"quantity":2}]',
    400,
    'delivery',
    'pending',
    'pending',
    NOW()
);
