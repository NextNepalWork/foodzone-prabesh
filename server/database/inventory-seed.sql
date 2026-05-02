-- Sample seed data for inventory management
-- Idempotent: uses ON CONFLICT to avoid duplicates on re-run.

INSERT INTO ingredients (name, category, current_stock, minimum_stock, reorder_point, unit, cost_per_unit, supplier_name, supplier_contact, storage_location, notes)
VALUES
  ('Chicken breast',    'meat',        15.0,  5.0,  10.0, 'kg',     450.00, 'Kathmandu Meats',     '9841000001', 'Walk-in cooler · shelf A', 'Boneless, skinless'),
  ('Basmati rice',      'grains',      45.0, 10.0,  20.0, 'kg',     180.00, 'Himalayan Grains',    '9841000002', 'Dry storage · shelf B1',   'Long grain'),
  ('Yellow onion',      'vegetables',   8.0,  3.0,   6.0, 'kg',      55.00, 'Kalimati Bazaar',     '9841000003', 'Dry storage · crate 2',    NULL),
  ('Tomato',            'vegetables',   4.5,  4.0,   8.0, 'kg',      75.00, 'Kalimati Bazaar',     '9841000003', 'Walk-in cooler',           'Rotate daily'),
  ('Garlic',            'vegetables',   2.0,  1.0,   2.5, 'kg',     180.00, 'Kalimati Bazaar',     '9841000003', 'Dry storage · crate 3',    NULL),
  ('Ginger',            'vegetables',   1.5,  1.0,   2.0, 'kg',     160.00, 'Kalimati Bazaar',     '9841000003', 'Dry storage · crate 3',    NULL),
  ('Green chili',       'vegetables',   0.8,  0.5,   1.0, 'kg',     120.00, 'Kalimati Bazaar',     '9841000003', 'Walk-in cooler',           NULL),
  ('Mozzarella cheese','dairy',         3.2,  2.0,   4.0, 'kg',     820.00, 'Dairy Co-op',         '9841000004', 'Walk-in cooler · shelf C', 'Low-moisture block'),
  ('Butter',            'dairy',        5.0,  2.0,   4.0, 'kg',     780.00, 'Dairy Co-op',         '9841000004', 'Walk-in cooler',           NULL),
  ('All-purpose flour', 'grains',      22.0,  5.0,  10.0, 'kg',      95.00, 'Himalayan Grains',    '9841000002', 'Dry storage · bin 1',      NULL),
  ('Sugar',             'grains',      12.0,  3.0,   6.0, 'kg',     110.00, 'Himalayan Grains',    '9841000002', 'Dry storage · bin 2',      NULL),
  ('Salt',              'spices',       6.5,  1.0,   2.0, 'kg',      40.00, 'Local market',         NULL,         'Dry storage · shelf D',    NULL),
  ('Black pepper',      'spices',       0.6,  0.3,   0.6, 'kg',    1400.00, 'Spice Traders',       '9841000005', 'Dry storage · shelf D',    'Whole peppercorns'),
  ('Cumin powder',      'spices',       0.9,  0.3,   0.6, 'kg',     680.00, 'Spice Traders',       '9841000005', 'Dry storage · shelf D',    NULL),
  ('Garam masala',      'spices',       0.4,  0.3,   0.6, 'kg',     920.00, 'Spice Traders',       '9841000005', 'Dry storage · shelf D',    NULL),
  ('Turmeric powder',   'spices',       0.8,  0.3,   0.6, 'kg',     420.00, 'Spice Traders',       '9841000005', 'Dry storage · shelf D',    NULL),
  ('Sunflower oil',     'oils',        18.0,  5.0,  10.0, 'liters',  210.00,'Refined Oils Ltd',    '9841000006', 'Dry storage · rack 1',     NULL),
  ('Soy sauce',         'oils',         4.5,  1.0,   2.0, 'liters',  360.00,'Asian Sauces Co',     '9841000007', 'Dry storage · shelf E',    NULL),
  ('Coca-Cola 250ml',   'beverages',   48.0, 12.0,  24.0, 'pieces',   65.00,'Bottlers Nepal',      '9841000008', 'Beverage cooler',          NULL),
  ('Fanta 250ml',       'beverages',   36.0, 12.0,  24.0, 'pieces',   65.00,'Bottlers Nepal',      '9841000008', 'Beverage cooler',          NULL),
  ('Takeaway box L',    'packaging',   60.0, 20.0,  40.0, 'pieces',   12.00,'Pack-Right',          '9841000009', 'Dry storage · shelf F',    '1000ml kraft')
ON CONFLICT (name) DO NOTHING;
