-- Menu Items Table and Data for Food Zone Restaurant

-- Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    price DECIMAL(8,2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    is_available BOOLEAN DEFAULT true,
    preparation_time INTEGER DEFAULT 15, -- minutes
    is_vegetarian BOOLEAN DEFAULT false,
    is_spicy BOOLEAN DEFAULT false,
    allergens TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clear existing menu items (except Happy Hour items)
DELETE FROM menu_items WHERE category != 'Happy Hour';

-- Insert Food Zone menu items
INSERT INTO menu_items (name, price, category, description, image_url, is_vegetarian, is_spicy, preparation_time) VALUES

-- Combo Meals
('Veg Combo', 599, 'Combo Meals', 'Veg Burger, Tofu Stick, Cheese Fries, Cheese Corndog, Free Coke/Bubble Tea', '/images/combo-meals.jpg', true, false, 25),
('Non-Veg Combo', 599, 'Combo Meals', 'Chicken Burger, Chicken Sausage, Cheese Fries, Corndog, Free Coke/Bubble Tea', '/images/combo-meals.jpg', false, false, 25),

-- Nanglo Khaja Set
('Non-Veg Nanglo Khaja Set', 1999, 'Nanglo Khaja Set', 'Chicken Biryani, Chicken Momo, Chicken Sausage, Veg Chowmein, Mustang Aalu, Wai Wai Sadeko, Hot Wings, Drumstick, Chicken Burger, Chicken Pizza (250ml Coke Free)', '/images/nanglo-nonveg.jpg', false, false, 45),
('Veg Nanglo Khaja Set', 1499, 'Nanglo Khaja Set', 'Veg Biryani, Veg Momo, Tofu Stick, Mustang Aalu, Veg Burger, Cheese Pizza, Paneer Pakoda, Wai Wai Sadeko, Potato Cheese Ball (250ml Coke Free)', '/images/nanglo-veg.jpg', true, false, 45),

-- Khaja & Khana Sets
('Veg Khaja Set', 250, 'Khaja & Khana Sets', 'Traditional vegetarian khaja set', '/images/khaja-veg.jpg', true, false, 20),
('Non-Veg Khaja Set', 300, 'Khaja & Khana Sets', 'Traditional non-vegetarian khaja set with chicken/buff', '/images/khaja-nonveg.jpg', false, false, 20),
('Veg Khana Set', 250, 'Khaja & Khana Sets', 'Complete vegetarian meal set', '/images/khana-veg.jpg', true, false, 25),
('Non-Veg Khana Set', 300, 'Khaja & Khana Sets', 'Complete non-vegetarian meal set with chicken/buff', '/images/khana-nonveg.jpg', false, false, 25),
('Food Zone Special', 400, 'Khaja & Khana Sets', 'House special combination meal', '/images/food-zone-special.jpg', false, false, 30);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(is_available);

-- Update trigger for menu_items
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
