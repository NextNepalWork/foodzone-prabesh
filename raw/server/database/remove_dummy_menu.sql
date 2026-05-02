-- Remove all dummy/old menu items and keep only the comprehensive menu
-- This will clean up the database to have only the real Food Zone menu

-- Delete all old dummy menu items from these categories
DELETE FROM menu_items WHERE category IN (
    'Appetizers', 'Beverages', 'Desserts', 'Fast Food', 'Main Course', 'Snacks', 'Specials'
);

-- Show remaining categories after cleanup
SELECT DISTINCT category, COUNT(*) as item_count 
FROM menu_items 
GROUP BY category 
ORDER BY category;

-- Show total count
SELECT COUNT(*) as total_menu_items FROM menu_items;
