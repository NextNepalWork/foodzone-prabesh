-- Inventory Management Schema for Food Zone

-- 1. Ingredients Table (raw materials)
CREATE TABLE IF NOT EXISTS ingredients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL UNIQUE,
  category VARCHAR(100), -- 'vegetables', 'meat', 'dairy', 'spices', 'packaging', etc.
  current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  minimum_stock DECIMAL(10,2) NOT NULL DEFAULT 10,
  reorder_point DECIMAL(10,2) DEFAULT 20,
  unit VARCHAR(50) DEFAULT 'kg', -- 'kg', 'liters', 'pieces', 'grams', etc.
  cost_per_unit DECIMAL(10,2) DEFAULT 0.00,
  supplier_name VARCHAR(200),
  supplier_contact VARCHAR(100),
  last_restocked_at TIMESTAMP,
  expiry_date DATE,
  storage_location VARCHAR(100),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Recipe Ingredients (what goes into each menu item)
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id SERIAL PRIMARY KEY,
  menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
  ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity_required DECIMAL(10,2) NOT NULL, -- amount needed per serving
  unit VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(menu_item_id, ingredient_id)
);

-- 3. Inventory Items Table (finished products - optional for items not made from recipes)
CREATE TABLE IF NOT EXISTS inventory_items (
  id SERIAL PRIMARY KEY,
  menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
  current_stock INTEGER NOT NULL DEFAULT 0,
  minimum_stock INTEGER NOT NULL DEFAULT 10,
  maximum_stock INTEGER NOT NULL DEFAULT 100,
  unit VARCHAR(50) DEFAULT 'pieces',
  cost_per_unit DECIMAL(10,2) DEFAULT 0.00,
  reorder_point INTEGER DEFAULT 20,
  last_restocked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(menu_item_id)
);

-- 2. Inventory Transactions Table (logs all stock movements)
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id SERIAL PRIMARY KEY,
  transaction_type VARCHAR(50) NOT NULL, -- 'ingredient_restock', 'ingredient_usage', 'product_restock', 'sale', 'adjustment', 'waste', 'expired'
  reference_type VARCHAR(50), -- 'order', 'manual', 'system', 'recipe'
  reference_id INTEGER, -- order_id if related to an order
  
  -- For ingredient transactions
  ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE SET NULL,
  ingredient_quantity_change DECIMAL(10,2),
  ingredient_quantity_before DECIMAL(10,2),
  ingredient_quantity_after DECIMAL(10,2),
  
  -- For finished product transactions
  inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE SET NULL,
  menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE SET NULL,
  product_quantity_change INTEGER,
  product_quantity_before INTEGER,
  product_quantity_after INTEGER,
  
  cost_impact DECIMAL(10,2) DEFAULT 0.00,
  notes TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Low Stock Alerts Table
CREATE TABLE IF NOT EXISTS inventory_alerts (
  id SERIAL PRIMARY KEY,
  alert_type VARCHAR(50) NOT NULL, -- 'low_stock', 'out_of_stock', 'overstocked', 'expiring_soon', 'expired'
  item_type VARCHAR(50) NOT NULL, -- 'ingredient' or 'product'
  
  -- For ingredients
  ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
  
  -- For finished products
  inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
  menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
  
  current_stock DECIMAL(10,2) NOT NULL,
  threshold_value DECIMAL(10,2) NOT NULL,
  expiry_date DATE,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'acknowledged', 'resolved'
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  acknowledged_by VARCHAR(100),
  acknowledged_at TIMESTAMP,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Inventory Suppliers Table (optional for future use)
CREATE TABLE IF NOT EXISTS inventory_suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  contact_person VARCHAR(200),
  phone VARCHAR(20),
  email VARCHAR(200),
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Purchase Orders Table (optional for future use)
CREATE TABLE IF NOT EXISTS purchase_orders (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER REFERENCES inventory_suppliers(id),
  order_number VARCHAR(100) UNIQUE,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'received', 'cancelled'
  total_amount DECIMAL(10,2) DEFAULT 0.00,
  expected_delivery_date DATE,
  received_date DATE,
  notes TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Purchase Order Items Table
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id SERIAL PRIMARY KEY,
  purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
  inventory_item_id INTEGER REFERENCES inventory_items(id),
  menu_item_id INTEGER REFERENCES menu_items(id),
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  received_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ingredients_category ON ingredients(category);
CREATE INDEX IF NOT EXISTS idx_ingredients_active ON ingredients(is_active);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_menu_item ON recipe_ingredients(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_menu_item ON inventory_items(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_ingredient ON inventory_transactions(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item ON inventory_transactions(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON inventory_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_status ON inventory_alerts(status);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_ingredient ON inventory_alerts(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_item ON inventory_alerts(inventory_item_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_inventory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ingredients_timestamp ON ingredients;
CREATE TRIGGER update_ingredients_timestamp
  BEFORE UPDATE ON ingredients
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_timestamp();

DROP TRIGGER IF EXISTS update_recipe_ingredients_timestamp ON recipe_ingredients;
CREATE TRIGGER update_recipe_ingredients_timestamp
  BEFORE UPDATE ON recipe_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_timestamp();

DROP TRIGGER IF EXISTS update_inventory_items_timestamp ON inventory_items;
CREATE TRIGGER update_inventory_items_timestamp
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_timestamp();

-- Create trigger to automatically create alerts for low stock ingredients
CREATE OR REPLACE FUNCTION check_ingredient_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if stock is below reorder point
  IF NEW.current_stock <= NEW.reorder_point THEN
    -- Check if there's already an active alert
    IF NOT EXISTS (
      SELECT 1 FROM inventory_alerts 
      WHERE ingredient_id = NEW.id 
      AND status = 'active'
      AND alert_type IN ('low_stock', 'out_of_stock')
    ) THEN
      -- Create new alert
      INSERT INTO inventory_alerts (
        ingredient_id,
        item_type,
        alert_type,
        current_stock,
        threshold_value,
        status,
        priority
      ) VALUES (
        NEW.id,
        'ingredient',
        CASE WHEN NEW.current_stock = 0 THEN 'out_of_stock' ELSE 'low_stock' END,
        NEW.current_stock,
        NEW.reorder_point,
        'active',
        CASE 
          WHEN NEW.current_stock = 0 THEN 'critical'
          WHEN NEW.current_stock <= NEW.minimum_stock THEN 'high'
          ELSE 'medium'
        END
      );
    END IF;
  ELSE
    -- Resolve any active low stock alerts if stock is now above reorder point
    UPDATE inventory_alerts
    SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP
    WHERE ingredient_id = NEW.id
    AND status = 'active'
    AND alert_type IN ('low_stock', 'out_of_stock');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_ingredient_stock ON ingredients;
CREATE TRIGGER trigger_check_ingredient_stock
  AFTER INSERT OR UPDATE OF current_stock ON ingredients
  FOR EACH ROW
  EXECUTE FUNCTION check_ingredient_stock();

-- Create trigger for finished product low stock alerts
CREATE OR REPLACE FUNCTION check_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_stock <= NEW.reorder_point THEN
    IF NOT EXISTS (
      SELECT 1 FROM inventory_alerts 
      WHERE inventory_item_id = NEW.id 
      AND status = 'active'
      AND alert_type IN ('low_stock', 'out_of_stock')
    ) THEN
      INSERT INTO inventory_alerts (
        inventory_item_id,
        menu_item_id,
        item_type,
        alert_type,
        current_stock,
        threshold_value,
        status,
        priority
      ) VALUES (
        NEW.id,
        NEW.menu_item_id,
        'product',
        CASE WHEN NEW.current_stock = 0 THEN 'out_of_stock' ELSE 'low_stock' END,
        NEW.current_stock,
        NEW.reorder_point,
        'active',
        CASE 
          WHEN NEW.current_stock = 0 THEN 'critical'
          WHEN NEW.current_stock <= NEW.minimum_stock THEN 'high'
          ELSE 'medium'
        END
      );
    END IF;
  ELSE
    UPDATE inventory_alerts
    SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP
    WHERE inventory_item_id = NEW.id
    AND status = 'active'
    AND alert_type IN ('low_stock', 'out_of_stock');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_product_stock ON inventory_items;
CREATE TRIGGER trigger_check_product_stock
  AFTER INSERT OR UPDATE OF current_stock ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION check_product_stock();

-- Function to deduct ingredients when an order is placed
CREATE OR REPLACE FUNCTION deduct_ingredients_for_order()
RETURNS TRIGGER AS $$
DECLARE
  recipe_record RECORD;
  ingredient_record RECORD;
BEGIN
  -- Only process when order status changes to 'preparing' or 'completed'
  IF NEW.status IN ('preparing', 'completed') AND (OLD.status IS NULL OR OLD.status NOT IN ('preparing', 'completed')) THEN
    -- Loop through all items in the order
    FOR recipe_record IN 
      SELECT oi.menu_item_id, oi.quantity
      FROM order_items oi
      WHERE oi.order_id = NEW.id
    LOOP
      -- For each menu item, deduct its ingredients
      FOR ingredient_record IN
        SELECT ri.ingredient_id, ri.quantity_required, i.current_stock, i.unit
        FROM recipe_ingredients ri
        JOIN ingredients i ON i.id = ri.ingredient_id
        WHERE ri.menu_item_id = recipe_record.menu_item_id
      LOOP
        -- Calculate total quantity to deduct
        DECLARE
          total_deduction DECIMAL(10,2);
          new_stock DECIMAL(10,2);
        BEGIN
          total_deduction := ingredient_record.quantity_required * recipe_record.quantity;
          new_stock := ingredient_record.current_stock - total_deduction;
          
          -- Update ingredient stock
          UPDATE ingredients
          SET current_stock = new_stock,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ingredient_record.ingredient_id;
          
          -- Log the transaction
          INSERT INTO inventory_transactions (
            transaction_type,
            reference_type,
            reference_id,
            ingredient_id,
            ingredient_quantity_change,
            ingredient_quantity_before,
            ingredient_quantity_after,
            notes,
            created_by
          ) VALUES (
            'ingredient_usage',
            'order',
            NEW.id,
            ingredient_record.ingredient_id,
            -total_deduction,
            ingredient_record.current_stock,
            new_stock,
            'Auto-deducted for order #' || NEW.order_number,
            'system'
          );
        END;
      END LOOP;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_deduct_ingredients ON orders;
CREATE TRIGGER trigger_deduct_ingredients
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION deduct_ingredients_for_order();
