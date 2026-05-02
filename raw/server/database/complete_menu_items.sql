-- Complete Food Zone Menu Items
-- This script adds all menu items from the comprehensive menu

-- Clear existing menu items (optional - remove if you want to keep existing items)
-- DELETE FROM menu_items;

-- Insert all menu items
INSERT INTO menu_items (name, description, price, category, is_available, preparation_time, is_vegetarian, is_spicy) VALUES

-- 🍔 Combo Meals
('Veg Combo', 'Veg Burger, Tofu Stick, Cheese Fries, Cheese Corndog, Free Coke/Bubble Tea', 599.00, 'Combo Meals', true, 20, true, false),
('Non-Veg Combo', 'Chicken Burger, Chicken Sausage, Cheese Fries, Corndog, Free Coke/Bubble Tea', 599.00, 'Combo Meals', true, 25, false, false),

-- 🥘 Nanglo Khaja Set
('Nanglo Khaja Set Non-Veg', 'Chicken Biryani, Chicken Momo, Chicken Sausage, Veg Chowmein, Mustang Aalu, Wai Wai Sadeko, Hot Wings, Drumstick, Chicken Burger, Chicken Pizza (250ml Coke Free)', 1999.00, 'Nanglo Khaja Set', true, 35, false, false),
('Nanglo Khaja Set Veg', 'Veg Biryani, Veg Momo, Tofu Stick, Mustang Aalu, Veg Burger, Cheese Pizza, Paneer Pakoda, Wai Wai Sadeko, Potato Cheese Ball (250ml Coke Free)', 1499.00, 'Nanglo Khaja Set', true, 30, true, false),

-- 🍱 Khaja & Khana Sets
('Veg Khaja Set', 'Traditional veg khaja set', 250.00, 'Khaja & Khana Sets', true, 15, true, false),
('Non-Veg Khaja Set (Chicken)', 'Traditional non-veg khaja set with chicken', 300.00, 'Khaja & Khana Sets', true, 20, false, false),
('Non-Veg Khaja Set (Buff)', 'Traditional non-veg khaja set with buff', 300.00, 'Khaja & Khana Sets', true, 20, false, false),
('Veg Khana Set', 'Traditional veg khana set', 250.00, 'Khaja & Khana Sets', true, 15, true, false),
('Non-Veg Khana Set (Chicken)', 'Traditional non-veg khana set with chicken', 300.00, 'Khaja & Khana Sets', true, 20, false, false),
('Non-Veg Khana Set (Buff)', 'Traditional non-veg khana set with buff', 300.00, 'Khaja & Khana Sets', true, 20, false, false),
('Food Zone Special Set', 'Special combination set', 400.00, 'Khaja & Khana Sets', true, 25, false, false),

-- 🍳 Breakfast Menu
('Bread Omelette', 'Fresh bread with omelette', 150.00, 'Breakfast', true, 10, false, false),
('Bread Jam', 'Bread with jam', 100.00, 'Breakfast', true, 5, true, false),
('French Toast', 'Classic french toast', 150.00, 'Breakfast', true, 10, true, false),
('Butter Toast', 'Toast with butter', 100.00, 'Breakfast', true, 5, true, false),
('Honey Butter Toast', 'Toast with honey and butter', 150.00, 'Breakfast', true, 8, true, false),
('Cheese Toast', 'Toast with cheese', 150.00, 'Breakfast', true, 8, true, false),
('Cheese Tomato Toast', 'Toast with cheese and tomato', 180.00, 'Breakfast', true, 10, true, false),
('Aalu Paratha', 'Potato paratha with dahi and mix pickle', 140.00, 'Breakfast', true, 15, true, false),
('Pancake', 'Fluffy pancakes', 150.00, 'Breakfast', true, 12, true, false),
('Bread Roll', 'Crispy bread roll', 150.00, 'Breakfast', true, 10, true, false),
('Regular Breakfast', 'Veg/Chicken Sandwich, Masala Tea, Omelette', 250.00, 'Breakfast', true, 15, false, false),
('Food Zone Special Breakfast', 'Cheese Tomato Toast, Omelette, Salad, Milk Masala Tea, Hash Brown Potatoes', 350.00, 'Breakfast', true, 20, false, false),

-- 🥪 Sandwiches & Burgers
('Veg Sandwich', 'Fresh vegetable sandwich', 180.00, 'Sandwiches & Burgers', true, 10, true, false),
('Egg Sandwich', 'Sandwich with egg', 180.00, 'Sandwiches & Burgers', true, 10, false, false),
('Chicken Sandwich', 'Chicken sandwich', 180.00, 'Sandwiches & Burgers', true, 12, false, false),
('Veg Cheese Sandwich', 'Vegetable sandwich with cheese', 250.00, 'Sandwiches & Burgers', true, 12, true, false),
('Chicken Cheese Sandwich', 'Chicken sandwich with cheese', 250.00, 'Sandwiches & Burgers', true, 15, false, false),
('Club Sandwich', 'Multi-layered club sandwich', 300.00, 'Sandwiches & Burgers', true, 15, false, false),
('Veg Burger', 'Vegetable burger', 180.00, 'Sandwiches & Burgers', true, 12, true, false),
('Chicken Burger', 'Chicken burger', 180.00, 'Sandwiches & Burgers', true, 15, false, false),
('Veg Cheese Burger', 'Vegetable burger with cheese', 250.00, 'Sandwiches & Burgers', true, 15, true, false),
('Chicken Cheese Burger', 'Chicken burger with cheese', 250.00, 'Sandwiches & Burgers', true, 18, false, false),

-- 🍟 Fries
('French Fries', 'Crispy french fries', 160.00, 'Fries', true, 8, true, false),
('Fries Chilly', 'Spicy chilly fries', 220.00, 'Fries', true, 10, true, true),

-- 🥢 MoMo
('Veg Momo Steam', 'Steamed vegetable momo', 120.00, 'MoMo', true, 15, true, false),
('Veg Momo Fried', 'Fried vegetable momo', 170.00, 'MoMo', true, 18, true, false),
('Veg Momo Jhol', 'Vegetable momo in soup', 170.00, 'MoMo', true, 20, true, false),
('Veg Momo Chilly', 'Spicy chilly vegetable momo', 200.00, 'MoMo', true, 20, true, true),
('Veg Momo Sadeko', 'Spiced vegetable momo', 200.00, 'MoMo', true, 18, true, true),
('Veg Momo Kothey', 'Pan-fried vegetable momo', 200.00, 'MoMo', true, 20, true, false),
('Buff Momo Steam', 'Steamed buff momo', 120.00, 'MoMo', true, 15, false, false),
('Buff Momo Fried', 'Fried buff momo', 170.00, 'MoMo', true, 18, false, false),
('Buff Momo Jhol', 'Buff momo in soup', 170.00, 'MoMo', true, 20, false, false),
('Buff Momo Chilly', 'Spicy chilly buff momo', 200.00, 'MoMo', true, 20, false, true),
('Buff Momo Sadeko', 'Spiced buff momo', 200.00, 'MoMo', true, 18, false, true),
('Buff Momo Kothey', 'Pan-fried buff momo', 200.00, 'MoMo', true, 20, false, false),
('Chicken Momo Steam', 'Steamed chicken momo', 140.00, 'MoMo', true, 15, false, false),
('Chicken Momo Fried', 'Fried chicken momo', 190.00, 'MoMo', true, 18, false, false),
('Chicken Momo Jhol', 'Chicken momo in soup', 190.00, 'MoMo', true, 20, false, false),
('Chicken Momo Chilly', 'Spicy chilly chicken momo', 220.00, 'MoMo', true, 20, false, true),
('Chicken Momo Sadeko', 'Spiced chicken momo', 220.00, 'MoMo', true, 18, false, true),
('Chicken Momo Kothey', 'Pan-fried chicken momo', 220.00, 'MoMo', true, 20, false, false),

-- 🥡 Chowmein
('Veg Chowmein Half', 'Half plate vegetable chowmein', 70.00, 'Chowmein', true, 12, true, false),
('Veg Chowmein Full', 'Full plate vegetable chowmein', 110.00, 'Chowmein', true, 15, true, false),
('Buff Chowmein Half', 'Half plate buff chowmein', 90.00, 'Chowmein', true, 15, false, false),
('Buff Chowmein Full', 'Full plate buff chowmein', 150.00, 'Chowmein', true, 18, false, false),
('Chicken Chowmein Half', 'Half plate chicken chowmein', 90.00, 'Chowmein', true, 15, false, false),
('Chicken Chowmein Full', 'Full plate chicken chowmein', 150.00, 'Chowmein', true, 18, false, false),
('Egg Chowmein Half', 'Half plate egg chowmein', 90.00, 'Chowmein', true, 12, false, false),
('Egg Chowmein Full', 'Full plate egg chowmein', 150.00, 'Chowmein', true, 15, false, false),
('Mix Chowmein', 'Mixed chowmein with multiple ingredients', 200.00, 'Chowmein', true, 20, false, false),

-- 🌭 Corn Dog & Hot Dog
('Sausage Corn Dog', 'Corn dog with sausage', 130.00, 'Corn Dog & Hot Dog', true, 10, false, false),
('Cheese Corn Dog', 'Corn dog with cheese', 180.00, 'Corn Dog & Hot Dog', true, 12, true, false),
('Hot Dog (Chicken)', 'Chicken hot dog', 190.00, 'Corn Dog & Hot Dog', true, 12, false, false),

-- 🥘 Thukpa
('Veg Thukpa Half', 'Half bowl vegetable thukpa', 100.00, 'Thukpa', true, 15, true, false),
('Veg Thukpa Full', 'Full bowl vegetable thukpa', 150.00, 'Thukpa', true, 18, true, false),
('Egg Thukpa Half', 'Half bowl egg thukpa', 140.00, 'Thukpa', true, 15, false, false),
('Egg Thukpa Full', 'Full bowl egg thukpa', 180.00, 'Thukpa', true, 18, false, false),
('Chicken Thukpa Half', 'Half bowl chicken thukpa', 140.00, 'Thukpa', true, 18, false, false),
('Chicken Thukpa Full', 'Full bowl chicken thukpa', 180.00, 'Thukpa', true, 20, false, false),
('Mixed Thukpa', 'Mixed thukpa with multiple ingredients', 200.00, 'Thukpa', true, 22, false, false),

-- 🍕 Pizza
('9 Inch Cheese Pizza', '9 inch cheese pizza', 400.00, 'Pizza', true, 20, true, false),
('12 Inch Cheese Pizza', '12 inch cheese pizza', 400.00, 'Pizza', true, 25, true, false),
('9 Inch Veg Pizza', '9 inch vegetable pizza', 450.00, 'Pizza', true, 22, true, false),
('12 Inch Veg Pizza', '12 inch vegetable pizza', 450.00, 'Pizza', true, 28, true, false),
('9 Inch Chicken Pizza', '9 inch chicken pizza', 450.00, 'Pizza', true, 25, false, false),
('12 Inch Chicken Pizza', '12 inch chicken pizza', 450.00, 'Pizza', true, 30, false, false),
('9 Inch Mixed Pizza', '9 inch mixed pizza', 500.00, 'Pizza', true, 28, false, false),
('12 Inch Mixed Pizza', '12 inch mixed pizza', 500.00, 'Pizza', true, 32, false, false),
('Extra Cheese', 'Additional cheese topping', 100.00, 'Pizza', true, 2, true, false),

-- 🍚 Rice & Biryani
('Veg Fry Rice Half', 'Half plate vegetable fried rice', 100.00, 'Rice & Biryani', true, 12, true, false),
('Veg Fry Rice Full', 'Full plate vegetable fried rice', 150.00, 'Rice & Biryani', true, 15, true, false),
('Egg Fry Rice Half', 'Half plate egg fried rice', 120.00, 'Rice & Biryani', true, 12, false, false),
('Egg Fry Rice Full', 'Full plate egg fried rice', 160.00, 'Rice & Biryani', true, 15, false, false),
('Buff Fry Rice Half', 'Half plate buff fried rice', 120.00, 'Rice & Biryani', true, 15, false, false),
('Buff Fry Rice Full', 'Full plate buff fried rice', 180.00, 'Rice & Biryani', true, 18, false, false),
('Chicken Fry Rice Half', 'Half plate chicken fried rice', 120.00, 'Rice & Biryani', true, 15, false, false),
('Chicken Fry Rice Full', 'Full plate chicken fried rice', 180.00, 'Rice & Biryani', true, 18, false, false),
('Mixed Fry Rice', 'Mixed fried rice with multiple ingredients', 200.00, 'Rice & Biryani', true, 20, false, false),
('Veg Biryani', 'Aromatic vegetable biryani', 280.00, 'Rice & Biryani', true, 25, true, false),
('Chicken Biryani', 'Aromatic chicken biryani', 320.00, 'Rice & Biryani', true, 30, false, false),
('Egg Biryani', 'Aromatic egg biryani', 300.00, 'Rice & Biryani', true, 25, false, false),

-- 🥘 Curries
('Aalu Matar', 'Potato and peas curry', 130.00, 'Curries', true, 15, true, false),
('Mix Veg', 'Mixed vegetable curry', 130.00, 'Curries', true, 15, true, false),
('Mushroom Curry', 'Mushroom curry', 180.00, 'Curries', true, 18, true, false),
('Matar Paneer', 'Peas and cottage cheese curry', 250.00, 'Curries', true, 20, true, false),
('Paneer Butter Masala', 'Cottage cheese in butter masala', 300.00, 'Curries', true, 22, true, false),
('Chicken Curry', 'Traditional chicken curry', 180.00, 'Curries', true, 25, false, false),
('Chicken Butter Masala', 'Chicken in butter masala', 250.00, 'Curries', true, 28, false, false),
('Chicken Curry Rice', 'Chicken curry with rice', 250.00, 'Curries', true, 25, false, false),
('Paneer Curry Rice', 'Paneer curry with rice', 300.00, 'Curries', true, 22, true, false),
('Veg Curry Rice', 'Vegetable curry with rice', 200.00, 'Curries', true, 20, true, false),

-- 🔥 Peri Peri & Chicken Specials
('Peri Peri Chicken', 'Spicy peri peri chicken', 350.00, 'Chicken Specials', true, 25, false, true),
('Chicken 65', 'South Indian style chicken 65', 300.00, 'Chicken Specials', true, 20, false, true),
('Chicken Popcorn', 'Bite-sized chicken popcorn', 250.00, 'Chicken Specials', true, 15, false, false),
('Food Zone Special Dragon Chicken', 'Special dragon style chicken', 300.00, 'Chicken Specials', true, 22, false, true),

-- 🐟 Fish Specials
('Fish Finger (8 pcs)', '8 pieces of fish fingers', 250.00, 'Fish Specials', true, 15, false, false),
('Fish & Chips', 'Fish with chips', 350.00, 'Fish Specials', true, 20, false, false),

-- 🧀 Paneer & Veg Snacks
('Paneer Pakoda', 'Fried cottage cheese fritters', 300.00, 'Paneer & Veg Snacks', true, 15, true, false),
('Paneer Chilly', 'Spicy paneer chilly', 300.00, 'Paneer & Veg Snacks', true, 18, true, true),
('Grill Potatoes', 'Grilled potatoes', 150.00, 'Paneer & Veg Snacks', true, 12, true, false),

-- 🥢 Chopsuey
('Veg Chopsuey', 'Vegetable chopsuey', 300.00, 'Chopsuey', true, 18, true, false),
('Non-Veg Chopsuey', 'Non-vegetarian chopsuey', 320.00, 'Chopsuey', true, 20, false, false),

-- 🍝 Pasta & Extra Choice Items
('Spaghetti Carbonara', 'Creamy carbonara pasta', 350.00, 'Pasta', true, 20, false, false),
('Spaghetti Bolognese', 'Meat sauce pasta', 300.00, 'Pasta', true, 22, false, false),
('Pesto Penne', 'Penne with pesto sauce', 300.00, 'Pasta', true, 18, true, false),
('Pasta', 'Basic pasta', 150.00, 'Pasta', true, 15, true, false),

-- 🍗 Food Zone Specials
('Chicken Kathi Roll', 'Chicken wrapped in paratha', 180.00, 'Food Zone Specials', true, 15, false, false),
('Paneer Kathi Roll', 'Paneer wrapped in paratha', 200.00, 'Food Zone Specials', true, 15, true, false),
('Food Zone Special Chicken Burger [KFC]', 'KFC style chicken burger', 250.00, 'Food Zone Specials', true, 18, false, false),
('Food Zone Special Chicken [KFC] (4 pcs)', 'KFC style chicken 4 pieces', 300.00, 'Food Zone Specials', true, 20, false, false),
('Veg Manchurian with Rice', 'Vegetable manchurian with rice', 250.00, 'Food Zone Specials', true, 20, true, false),
('Chicken Manchurian with Rice', 'Chicken manchurian with rice', 300.00, 'Food Zone Specials', true, 22, false, false),
('Veg MoMo Platter', 'Assorted vegetable momo platter', 250.00, 'Food Zone Specials', true, 25, true, false),
('Buff MoMo Platter', 'Assorted buff momo platter', 300.00, 'Food Zone Specials', true, 25, false, false),
('Chicken MoMo Platter', 'Assorted chicken momo platter', 300.00, 'Food Zone Specials', true, 25, false, false),
('Food Zone Special Noodles', 'Special house noodles', 250.00, 'Food Zone Specials', true, 18, false, false),
('Meat Ball', 'Meat balls', 200.00, 'Food Zone Specials', true, 15, false, false),

-- 💨 Hukka
('Hukka', 'Traditional hookah', 400.00, 'Hukka', true, 5, true, false),

-- 🥣 Soups
('Mushroom Soup', 'Creamy mushroom soup', 150.00, 'Soups', true, 12, true, false),
('Hot & Sour Soup', 'Spicy and sour soup', 150.00, 'Soups', true, 12, true, true),
('Clear Soup', 'Light clear soup', 100.00, 'Soups', true, 10, true, false),
('Chicken Soup', 'Chicken soup', 150.00, 'Soups', true, 15, false, false),

-- ☕ Hot Beverages
('Black Tea', 'Plain black tea', 20.00, 'Hot Beverages', true, 5, true, false),
('Ginger Tea', 'Ginger flavored tea', 25.00, 'Hot Beverages', true, 5, true, false),
('Black Masala', 'Spiced black tea', 30.00, 'Hot Beverages', true, 5, true, false),
('Marich Tea', 'Black pepper tea', 30.00, 'Hot Beverages', true, 5, true, false),
('Lemon Tea', 'Lemon flavored tea', 30.00, 'Hot Beverages', true, 5, true, false),
('Mint Tea', 'Mint flavored tea', 30.00, 'Hot Beverages', true, 5, true, false),
('Milk Tea', 'Tea with milk', 30.00, 'Hot Beverages', true, 5, true, false),
('Milk Masala Tea', 'Spiced milk tea', 40.00, 'Hot Beverages', true, 8, true, false),
('Hot Lemon', 'Hot lemon drink', 50.00, 'Hot Beverages', true, 5, true, false),
('Ginger Lemon Honey', 'Ginger lemon honey tea', 130.00, 'Hot Beverages', true, 8, true, false),
('Hot Chocolate', 'Rich hot chocolate', 190.00, 'Hot Beverages', true, 10, true, false),

-- 🥤 Cold Beverages
('Ju Ju Dhau', 'Traditional yogurt', 70.00, 'Cold Beverages', true, 2, true, false),
('Lassi Plain', 'Plain yogurt drink', 100.00, 'Cold Beverages', true, 5, true, false),
('Lassi Sweet', 'Sweet yogurt drink', 120.00, 'Cold Beverages', true, 5, true, false),
('Lassi Banana', 'Banana flavored lassi', 130.00, 'Cold Beverages', true, 8, true, false),
('Lemonade', 'Fresh lemonade', 100.00, 'Cold Beverages', true, 5, true, false),
('Cold Coffee', 'Iced coffee', 190.00, 'Cold Beverages', true, 8, true, false),
('Oreo Milkshake', 'Oreo cookie milkshake', 190.00, 'Cold Beverages', true, 10, true, false),
('Chocolate Milkshake', 'Chocolate milkshake', 190.00, 'Cold Beverages', true, 10, true, false),
('Virgin Mojito', 'Non-alcoholic mojito', 90.00, 'Cold Beverages', true, 8, true, false),
('Black Coffee', 'Black coffee', 80.00, 'Cold Beverages', true, 5, true, false),
('Milk Coffee', 'Coffee with milk', 120.00, 'Cold Beverages', true, 5, true, false),
('Coke', 'Coca Cola', 70.00, 'Cold Beverages', true, 2, true, false),
('Fanta', 'Orange Fanta', 70.00, 'Cold Beverages', true, 2, true, false),
('Sprite', 'Lemon Sprite', 70.00, 'Cold Beverages', true, 2, true, false);

-- Success message
SELECT 'All menu items inserted successfully!' as message;
SELECT COUNT(*) as total_items FROM menu_items;
