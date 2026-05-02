-- Remove all cigarette category items from the database
-- This will fix the duplicate cigarette categories showing in the menu filter

-- First, check what will be deleted
SELECT id, name, category, price 
FROM menu_items 
WHERE LOWER(category) = 'cigarette';

-- Delete all cigarette items (both lowercase and capitalized)
DELETE FROM menu_items 
WHERE LOWER(category) = 'cigarette';

-- Verify deletion
SELECT 'Cigarette items removed successfully' as message;
SELECT COUNT(*) as total_remaining_items FROM menu_items;

-- Show all unique categories after cleanup
SELECT DISTINCT category 
FROM menu_items 
ORDER BY category;
