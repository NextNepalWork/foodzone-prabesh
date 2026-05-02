-- Import menu from CSV file
-- First, clear existing menu items
DELETE FROM menu_items;

-- Create temporary table for CSV import
CREATE TEMP TABLE temp_menu (
    name VARCHAR(200),
    category VARCHAR(100),
    price DECIMAL(8,2),
    description TEXT,
    is_vegetarian BOOLEAN,
    is_spicy BOOLEAN,
    preparation_time INTEGER
);

-- Copy data from CSV (this will be run with psql \copy command)
-- \copy temp_menu FROM 'server/scripts/foodzone-menu.csv' WITH (FORMAT csv, HEADER true);

-- Insert into menu_items from temp table
INSERT INTO menu_items (name, category, price, description, is_vegetarian, is_spicy, preparation_time, is_available)
SELECT 
    name,
    category,
    price,
    description,
    is_vegetarian,
    is_spicy,
    preparation_time,
    true as is_available
FROM temp_menu;

-- Show results
SELECT 'Menu items imported successfully!' as message;
SELECT COUNT(*) as total_items FROM menu_items;
SELECT category, COUNT(*) as items FROM menu_items GROUP BY category ORDER BY category;
