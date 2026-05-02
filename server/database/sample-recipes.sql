-- Sample recipes for popular menu items
-- This connects menu items to ingredients so stock deduction works automatically

-- First, let's add some sample recipes for common items
-- Note: These are example recipes - adjust quantities based on your actual recipes

-- Chicken Burger (assuming menu item id 29 from the hardcoded menu)
INSERT INTO recipe_ingredients (menu_item_id, ingredient_id, quantity_required, unit, notes)
SELECT 29, i.id, 
  CASE 
    WHEN i.name = 'Chicken breast' THEN 0.15
    WHEN i.name = 'All-purpose flour' THEN 0.05
    WHEN i.name = 'Sunflower oil' THEN 0.02
    WHEN i.name = 'Salt' THEN 0.005
    WHEN i.name = 'Black pepper' THEN 0.002
  END as quantity,
  i.unit,
  CASE 
    WHEN i.name = 'Chicken breast' THEN 'Grilled chicken patty'
    WHEN i.name = 'All-purpose flour' THEN 'For bun and coating'
    WHEN i.name = 'Sunflower oil' THEN 'For cooking'
    WHEN i.name = 'Salt' THEN 'Seasoning'
    WHEN i.name = 'Black pepper' THEN 'Seasoning'
  END as notes
FROM ingredients i
WHERE i.name IN ('Chicken breast', 'All-purpose flour', 'Sunflower oil', 'Salt', 'Black pepper')
ON CONFLICT (menu_item_id, ingredient_id) DO NOTHING;

-- Veg Burger (assuming menu item id 28)
INSERT INTO recipe_ingredients (menu_item_id, ingredient_id, quantity_required, unit, notes)
SELECT 28, i.id,
  CASE 
    WHEN i.name = 'All-purpose flour' THEN 0.08
    WHEN i.name = 'Yellow onion' THEN 0.05
    WHEN i.name = 'Tomato' THEN 0.03
    WHEN i.name = 'Sunflower oil' THEN 0.02
    WHEN i.name = 'Salt' THEN 0.005
  END as quantity,
  i.unit,
  CASE 
    WHEN i.name = 'All-purpose flour' THEN 'For patty and bun'
    WHEN i.name = 'Yellow onion' THEN 'Sliced for topping'
    WHEN i.name = 'Tomato' THEN 'Sliced for topping'
    WHEN i.name = 'Sunflower oil' THEN 'For cooking'
    WHEN i.name = 'Salt' THEN 'Seasoning'
  END as notes
FROM ingredients i
WHERE i.name IN ('All-purpose flour', 'Yellow onion', 'Tomato', 'Sunflower oil', 'Salt')
ON CONFLICT (menu_item_id, ingredient_id) DO NOTHING;

-- Chicken MoMo Steam (assuming menu item id 46)
INSERT INTO recipe_ingredients (menu_item_id, ingredient_id, quantity_required, unit, notes)
SELECT 46, i.id,
  CASE 
    WHEN i.name = 'Chicken breast' THEN 0.12
    WHEN i.name = 'All-purpose flour' THEN 0.06
    WHEN i.name = 'Yellow onion' THEN 0.03
    WHEN i.name = 'Garlic' THEN 0.01
    WHEN i.name = 'Ginger' THEN 0.01
    WHEN i.name = 'Green chili' THEN 0.005
    WHEN i.name = 'Salt' THEN 0.005
    WHEN i.name = 'Sunflower oil' THEN 0.01
  END as quantity,
  i.unit,
  CASE 
    WHEN i.name = 'Chicken breast' THEN 'Minced for filling'
    WHEN i.name = 'All-purpose flour' THEN 'For wrapper dough'
    WHEN i.name = 'Yellow onion' THEN 'Minced for filling'
    WHEN i.name = 'Garlic' THEN 'Minced for filling'
    WHEN i.name = 'Ginger' THEN 'Minced for filling'
    WHEN i.name = 'Green chili' THEN 'Minced for filling'
    WHEN i.name = 'Salt' THEN 'Seasoning'
    WHEN i.name = 'Sunflower oil' THEN 'For dough'
  END as notes
FROM ingredients i
WHERE i.name IN ('Chicken breast', 'All-purpose flour', 'Yellow onion', 'Garlic', 'Ginger', 'Green chili', 'Salt', 'Sunflower oil')
ON CONFLICT (menu_item_id, ingredient_id) DO NOTHING;

-- Veg MoMo Steam (assuming menu item id 34)
INSERT INTO recipe_ingredients (menu_item_id, ingredient_id, quantity_required, unit, notes)
SELECT 34, i.id,
  CASE 
    WHEN i.name = 'All-purpose flour' THEN 0.06
    WHEN i.name = 'Yellow onion' THEN 0.04
    WHEN i.name = 'Tomato' THEN 0.02
    WHEN i.name = 'Garlic' THEN 0.01
    WHEN i.name = 'Ginger' THEN 0.01
    WHEN i.name = 'Green chili' THEN 0.005
    WHEN i.name = 'Salt' THEN 0.005
    WHEN i.name = 'Sunflower oil' THEN 0.01
    WHEN i.name = 'Cumin powder' THEN 0.002
  END as quantity,
  i.unit,
  CASE 
    WHEN i.name = 'All-purpose flour' THEN 'For wrapper dough'
    WHEN i.name = 'Yellow onion' THEN 'Minced for filling'
    WHEN i.name = 'Tomato' THEN 'Diced for filling'
    WHEN i.name = 'Garlic' THEN 'Minced for filling'
    WHEN i.name = 'Ginger' THEN 'Minced for filling'
    WHEN i.name = 'Green chili' THEN 'Minced for filling'
    WHEN i.name = 'Salt' THEN 'Seasoning'
    WHEN i.name = 'Sunflower oil' THEN 'For dough and filling'
    WHEN i.name = 'Cumin powder' THEN 'Spice for filling'
  END as notes
FROM ingredients i
WHERE i.name IN ('All-purpose flour', 'Yellow onion', 'Tomato', 'Garlic', 'Ginger', 'Green chili', 'Salt', 'Sunflower oil', 'Cumin powder')
ON CONFLICT (menu_item_id, ingredient_id) DO NOTHING;

-- Chicken Chowmein Full (assuming menu item id 57)
INSERT INTO recipe_ingredients (menu_item_id, ingredient_id, quantity_required, unit, notes)
SELECT 57, i.id,
  CASE 
    WHEN i.name = 'Chicken breast' THEN 0.10
    WHEN i.name = 'All-purpose flour' THEN 0.08
    WHEN i.name = 'Yellow onion' THEN 0.03
    WHEN i.name = 'Tomato' THEN 0.02
    WHEN i.name = 'Garlic' THEN 0.01
    WHEN i.name = 'Ginger' THEN 0.005
    WHEN i.name = 'Green chili' THEN 0.003
    WHEN i.name = 'Soy sauce' THEN 0.02
    WHEN i.name = 'Sunflower oil' THEN 0.03
    WHEN i.name = 'Salt' THEN 0.005
  END as quantity,
  i.unit,
  CASE 
    WHEN i.name = 'Chicken breast' THEN 'Sliced for stir-fry'
    WHEN i.name = 'All-purpose flour' THEN 'For noodles'
    WHEN i.name = 'Yellow onion' THEN 'Sliced for stir-fry'
    WHEN i.name = 'Tomato' THEN 'Sliced for stir-fry'
    WHEN i.name = 'Garlic' THEN 'Minced for flavor'
    WHEN i.name = 'Ginger' THEN 'Minced for flavor'
    WHEN i.name = 'Green chili' THEN 'Sliced for heat'
    WHEN i.name = 'Soy sauce' THEN 'For flavor and color'
    WHEN i.name = 'Sunflower oil' THEN 'For stir-frying'
    WHEN i.name = 'Salt' THEN 'Seasoning'
  END as notes
FROM ingredients i
WHERE i.name IN ('Chicken breast', 'All-purpose flour', 'Yellow onion', 'Tomato', 'Garlic', 'Ginger', 'Green chili', 'Soy sauce', 'Sunflower oil', 'Salt')
ON CONFLICT (menu_item_id, ingredient_id) DO NOTHING;

-- 9 Inch Cheese Pizza (assuming menu item id 71)
INSERT INTO recipe_ingredients (menu_item_id, ingredient_id, quantity_required, unit, notes)
SELECT 71, i.id,
  CASE 
    WHEN i.name = 'All-purpose flour' THEN 0.15
    WHEN i.name = 'Mozzarella cheese' THEN 0.08
    WHEN i.name = 'Tomato' THEN 0.05
    WHEN i.name = 'Sunflower oil' THEN 0.02
    WHEN i.name = 'Salt' THEN 0.005
    WHEN i.name = 'Sugar' THEN 0.01
    WHEN i.name = 'Garlic' THEN 0.005
  END as quantity,
  i.unit,
  CASE 
    WHEN i.name = 'All-purpose flour' THEN 'For pizza dough'
    WHEN i.name = 'Mozzarella cheese' THEN 'Shredded topping'
    WHEN i.name = 'Tomato' THEN 'For sauce base'
    WHEN i.name = 'Sunflower oil' THEN 'For dough'
    WHEN i.name = 'Salt' THEN 'For dough and sauce'
    WHEN i.name = 'Sugar' THEN 'For sauce balance'
    WHEN i.name = 'Garlic' THEN 'For sauce flavor'
  END as notes
FROM ingredients i
WHERE i.name IN ('All-purpose flour', 'Mozzarella cheese', 'Tomato', 'Sunflower oil', 'Salt', 'Sugar', 'Garlic')
ON CONFLICT (menu_item_id, ingredient_id) DO NOTHING;

-- French Fries (assuming menu item id 32)
INSERT INTO recipe_ingredients (menu_item_id, ingredient_id, quantity_required, unit, notes)
SELECT 32, i.id,
  CASE 
    WHEN i.name = 'Sunflower oil' THEN 0.05
    WHEN i.name = 'Salt' THEN 0.005
  END as quantity,
  i.unit,
  CASE 
    WHEN i.name = 'Sunflower oil' THEN 'For deep frying'
    WHEN i.name = 'Salt' THEN 'Seasoning'
  END as notes
FROM ingredients i
WHERE i.name IN ('Sunflower oil', 'Salt')
ON CONFLICT (menu_item_id, ingredient_id) DO NOTHING;

-- Add beverages (they don't need recipes, just direct inventory tracking)
-- Coca-Cola 250ml (assuming menu item needs to be created or mapped)
-- Note: For beverages, we might want to track them as finished products instead of recipes