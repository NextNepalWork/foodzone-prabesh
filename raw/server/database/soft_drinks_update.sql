-- Create separate Soft Drinks category and update existing items
-- This script will create a dedicated Soft Drinks category

-- First, let's check what soft drink items currently exist
SELECT name, category FROM menu_items WHERE name ILIKE '%coke%' OR name ILIKE '%pepsi%' OR name ILIKE '%sprite%' OR name ILIKE '%fanta%';

-- Update existing soft drink items to new category
UPDATE menu_items SET category = 'Soft Drinks' WHERE name IN ('Coke', 'Fanta', 'Sprite');

-- Add individual soft drink items if they don't exist
INSERT INTO menu_items (name, description, price, category, available, preparation_time, is_vegetarian, is_spicy) VALUES
('Coca Cola', 'Classic Coca Cola', 70.00, 'Soft Drinks', true, 2, true, false),
('Pepsi', 'Pepsi Cola', 70.00, 'Soft Drinks', true, 2, true, false)
ON CONFLICT (name) DO NOTHING;

-- Update existing items to use proper names
UPDATE menu_items SET name = 'Coca Cola' WHERE name = 'Coke';
UPDATE menu_items SET name = 'Orange Fanta' WHERE name = 'Fanta';
UPDATE menu_items SET name = 'Lemon Sprite' WHERE name = 'Sprite';

-- Verify the changes
SELECT name, price, category FROM menu_items WHERE category = 'Soft Drinks' ORDER BY name;

-- Show category counts
SELECT category, COUNT(*) as item_count FROM menu_items WHERE category IN ('Soft Drinks', 'Cold Beverages') GROUP BY category;
