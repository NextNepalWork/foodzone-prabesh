const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult, param } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

// Load environment variables first
require('dotenv').config();
const { 
  authenticateToken, 
  requireAdmin, 
  requireStaffRole, 
  requireManager,
  requireChef,
  requireWaiter,
  requireCashier,
  requireKitchenStaff,
  requireFrontStaff,
  authenticateAdmin, 
  authenticateStaff,
  generateToken,
  STAFF_ROLES 
} = require('./middleware/auth');
const { validationRules, sanitizeInput } = require('./middleware/validation');
const { securityHeaders, rateLimits, checkAdminIP, requestSizeLimit, enhancedCorsOptions } = require('./middleware/security');
const { globalErrorHandler, catchAsync, notFoundHandler, AppError, ValidationError, AuthenticationError, NotFoundError } = require('./middleware/errorHandler');
const { Customer, Order, TableSession, TablePayment } = require('./database/models');
const CacheManager = require('./utils/cacheManager');
const { pool, query } = require('./database/config');

// Import routes
const inventoryRoutes = require('./routes/inventory');
const settingsRoutes = require('./routes/settings');
const tableSessionRoutes = require('./routes/tableSession');
const paymentQRRoutes = require('./routes/paymentQR');
const reportsRoutes = require('./routes/reports');
const uploadRoutes = require('./routes/upload');
const settingsLoader = require('./utils/settingsLoader');
const orderingHoursValidator = require('./utils/orderingHoursValidator');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? ["https://foodzone.com.np", "https://www.foodzone.com.np", "https://foodzoneduwakot.netlify.app", "https://astounding-malabi-c1d59c.netlify.app", "https://food-zone-restaurant.windsurf.build", "https://foodzone-updated.windsurf.build", "https://main--astounding-malabi-c1d59c.netlify.app"]
      : (process.env.CORS_ORIGIN || "http://localhost:3000").split(',').map(url => url.trim()),
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});
// Expose io to routes via app locals
app.set('io', io);

// Apply security middleware first
app.use(securityHeaders);
app.use(requestSizeLimit);
app.use(sanitizeInput);
app.use(cors(enhancedCorsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint (before rate limiting)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Restaurant Backend',
    version: '1.0.0',
    port: process.env.PORT || 3000
  });
});

// Debug endpoint to check daybook table structure
app.get('/debug/daybook-columns', async (req, res) => {
  try {
    const result = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'daybook_transactions'
      ORDER BY ordinal_position
    `);
    res.json({ columns: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to check order history date range
app.get('/debug/order-date-range', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        MIN(created_at) as earliest_order,
        MAX(created_at) as latest_order,
        COUNT(*) as total_orders,
        COUNT(DISTINCT DATE(created_at)) as days_with_orders
      FROM orders
    `);
    
    const byMonth = await query(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as order_count
      FROM orders
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month DESC
    `);
    
    const byDay = await query(`
      SELECT 
        DATE(created_at) as order_date,
        COUNT(*) as order_count
      FROM orders
      GROUP BY DATE(created_at)
      ORDER BY order_date DESC
      LIMIT 20
    `);
    
    res.json({ 
      dateRange: result.rows[0],
      ordersByMonth: byMonth.rows,
      recentDays: byDay.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to check operations metrics
app.get('/debug/operations-metrics', async (req, res) => {
  try {
    // First check what columns exist in orders table
    const columns = await query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'orders'
      ORDER BY ordinal_position
    `);
    
    // Check customer data in orders
    const customerData = await query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(customer_id) as orders_with_customer_id,
        COUNT(customer_name) as orders_with_customer_name,
        COUNT(customer_phone) as orders_with_customer_phone
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);
    
    // Sample customer data
    const sampleCustomers = await query(`
      SELECT 
        customer_id,
        customer_name,
        customer_phone,
        COUNT(*) as order_count,
        SUM(total) as total_spend
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '30 days'
        AND (customer_id IS NOT NULL OR customer_name IS NOT NULL OR customer_phone IS NOT NULL)
      GROUP BY customer_id, customer_name, customer_phone
      ORDER BY total_spend DESC
      LIMIT 5
    `);
    
    // Check table performance
    const tablePerf = await query(`
      SELECT 
        table_id,
        COUNT(*) as order_count,
        SUM(total) as revenue,
        AVG(total) as avg_order_value
      FROM orders
      WHERE table_id IS NOT NULL
        AND order_type = 'dine-in'
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY table_id
      ORDER BY revenue DESC
      LIMIT 10
    `);
    
    // Check discounts
    const discounts = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE COALESCE(discount, 0) > 0) as discounted_orders,
        COALESCE(SUM(discount), 0) as total_discount
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);
    
    // Check delivery orders
    const delivery = await query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN order_type = 'delivery' THEN 1 END) as delivery_count,
        COALESCE(SUM(CASE WHEN order_type = 'delivery' THEN delivery_fee ELSE 0 END), 0) as total_delivery_fees
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);
    
    // Check heatmap data
    const heatmap = await query(`
      SELECT 
        EXTRACT(DOW FROM created_at) as day_of_week,
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as order_count
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY day_of_week, hour
      ORDER BY order_count DESC
      LIMIT 10
    `);
    
    // Check staff activity (daybook transactions)
    const staffActivity = await query(`
      SELECT 
        created_by,
        COUNT(*) as transaction_count
      FROM daybook_transactions
      WHERE created_at >= NOW() - INTERVAL '30 days'
        AND created_by IS NOT NULL
      GROUP BY created_by
      ORDER BY transaction_count DESC
    `);
    
    res.json({ 
      orderColumns: columns.rows,
      customerData: customerData.rows[0],
      sampleCustomers: sampleCustomers.rows,
      tablePerformance: tablePerf.rows,
      discounts: discounts.rows[0],
      delivery: delivery.rows[0],
      heatmapSample: heatmap.rows,
      staffActivity: staffActivity.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Apply general rate limiting
app.use('/api/', rateLimits.general);

// Register routes
app.use('/api/inventory', inventoryRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/table-session', tableSessionRoutes);
app.use('/api/payment-qr', paymentQRRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/upload', uploadRoutes);

// Serve static files including images
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// In-memory storage for table sessions (temporary data)
const tableSessions = new Map(); // tableId -> { timestamp, cartItems }

// Initialize Active Cache Manager
let cacheManager;

// Initialize restaurant settings from database
let restaurantSettings = {
  tableCount: 25 // Default, will be loaded from database
};

// Initialize menu_items table
async function initializeMenuTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        price DECIMAL(8,2) NOT NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT,
        image_url VARCHAR(500),
        is_available BOOLEAN DEFAULT true,
        preparation_time INTEGER DEFAULT 15,
        is_vegetarian BOOLEAN DEFAULT false,
        is_spicy BOOLEAN DEFAULT false,
        allergens TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Menu items table initialized');
    
    // Initialize inventory tables
    await initializeInventoryTables();
  } catch (error) {
    console.error('❌ Error initializing menu table:', error);
  }
}

// Initialize inventory management tables
async function initializeInventoryTables() {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Read and execute inventory schema
    const schemaPath = path.join(__dirname, 'database', 'inventory-schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await query(schema);
      console.log('✅ Inventory management tables initialized');
    }

    // Seed sample ingredients if table is empty
    const seedPath = path.join(__dirname, 'database', 'inventory-seed.sql');
    if (fs.existsSync(seedPath)) {
      const { rows } = await query('SELECT COUNT(*)::int AS n FROM ingredients');
      if (rows[0].n === 0) {
        const seed = fs.readFileSync(seedPath, 'utf8');
        await query(seed);
        console.log('✅ Inventory seed data loaded');
      }
    }
    
    // Daybook harmonization (idempotent migration)
    const daybookPath = path.join(__dirname, 'database', 'daybook-schema.sql');
    if (fs.existsSync(daybookPath)) {
      // First, clean up any duplicate opening/closing balance entries
      try {
        await query(`
          DELETE FROM daybook_transactions
          WHERE id IN (
            SELECT id FROM (
              SELECT id, 
                     ROW_NUMBER() OVER (PARTITION BY transaction_date, transaction_type 
                                       ORDER BY created_at DESC) as rn
              FROM daybook_transactions
              WHERE transaction_type IN ('opening_balance', 'closing_balance')
            ) t
            WHERE rn > 1
          )
        `);
        console.log('✅ Cleaned up duplicate daybook entries');
      } catch (cleanupErr) {
        console.warn('⚠️ Daybook cleanup skipped:', cleanupErr.message);
      }
      
      // Now apply the schema
      const daybookSchema = fs.readFileSync(daybookPath, 'utf8');
      try {
        await query(daybookSchema);
        console.log('✅ Daybook schema harmonized');
      } catch (e) {
        console.warn('⚠️ Daybook migration skipped:', e.message);
      }
    }

    // Expenses tracking for P&L
    const expensesPath = path.join(__dirname, 'database', 'expenses-schema.sql');
    if (fs.existsSync(expensesPath)) {
      const expensesSchema = fs.readFileSync(expensesPath, 'utf8');
      await query(expensesSchema);
      console.log('✅ Expenses tables initialized');
    }

    // Add sample recipes if none exist
    const recipePath = path.join(__dirname, 'database', 'sample-recipes.sql');
    if (fs.existsSync(recipePath)) {
      const { rows } = await query('SELECT COUNT(*)::int AS n FROM recipe_ingredients');
      if (rows[0].n === 0) {
        const recipes = fs.readFileSync(recipePath, 'utf8');
        await query(recipes);
        console.log('✅ Sample recipes loaded - ingredients will now deduct automatically');
      }
    }
  } catch (error) {
    console.error('❌ Error initializing inventory tables:', error);
  }
}

// Load settings from database on startup
async function loadSettings() {
  try {
    await initializeMenuTable();
    
    // Create restaurant_settings table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS restaurant_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(255) UNIQUE NOT NULL,
        setting_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Run extended settings schema (metadata columns, hours, zones, payment methods, tenant)
    try {
      const fs = require('fs');
      const path = require('path');
      const settingsPath = path.join(__dirname, 'database', 'settings-schema.sql');
      if (fs.existsSync(settingsPath)) {
        const sql = fs.readFileSync(settingsPath, 'utf8');
        await query(sql);
        console.log('✅ Settings schema applied');
      }
    } catch (e) {
      console.warn('⚠️ Settings schema init skipped:', e.message);
    }

    // Create table_calls table for service requests
    await query(`
      CREATE TABLE IF NOT EXISTS table_calls (
        id SERIAL PRIMARY KEY,
        table_id INTEGER NOT NULL,
        reason VARCHAR(100) DEFAULT 'Service',
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        responded_at TIMESTAMP,
        resolved_at TIMESTAMP,
        notes TEXT
      )
    `);
    
    const result = await query('SELECT setting_key, setting_value FROM restaurant_settings');
    result.rows.forEach(row => {
      if (row.setting_key === 'table_count' || row.setting_key === 'tables.table_count') {
        restaurantSettings.tableCount = parseInt(row.setting_value);
      }
    });
    console.log('✅ Restaurant settings loaded:', restaurantSettings);
  } catch (error) {
    console.error('❌ Error loading settings:', error);
  }
}

// Initialize database with sample data on startup
async function initializeDatabaseWithSampleData() {
  try {
    // Check if database has any orders
    const orderCount = await query('SELECT COUNT(*) as count FROM orders');
    if (parseInt(orderCount.rows[0].count) === 0) {
      console.log('🔄 Database is empty, populating with sample data...');
      
      // Insert sample data directly
      const sampleQueries = [
        // Insert customers
        `INSERT INTO customers (name, phone, email) VALUES
         ('John Doe', '9841234567', 'john@example.com'),
         ('Jane Smith', '9847654321', 'jane@example.com'),
         ('Ram Sharma', '9851111111', 'ram@example.com'),
         ('Sita Poudel', '9856666666', 'sita@example.com'),
         ('Krishna Thapa', '9844444444', 'krishna@example.com')`,
        
        // Insert orders
        `INSERT INTO orders (customer_id, order_type, status, total_amount, special_instructions) VALUES
         (2, 'delivery', 'completed', 330.00, 'Extra spicy'),
         (1, 'dine_in', 'completed', 360.00, NULL),
         (4, 'delivery', 'preparing', 500.00, 'Call before delivery'),
         (3, 'dine_in', 'ready', 320.00, 'Birthday special'),
         (5, 'delivery', 'pending', 230.00, 'Office delivery')`,
        
        // Insert order items
        `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal) VALUES
         (1, 1, 2, 140.00, 280.00),
         (2, 2, 1, 120.00, 120.00),
         (2, 3, 1, 240.00, 240.00),
         (3, 4, 1, 280.00, 280.00),
         (4, 5, 1, 320.00, 320.00),
         (5, 6, 1, 180.00, 180.00)`
      ];
      
      for (const sampleQuery of sampleQueries) {
        await query(sampleQuery);
      }
      console.log('🚀 Restaurant Server started successfully! (Schema updated)');
    }
  } catch (error) {
    console.error('❌ Error initializing sample data:', error);
  }
}

// Initialize settings and sample data on startup
loadSettings();
// setTimeout(() => {
//   initializeDatabaseWithSampleData();
// }, 3000); // Wait 3 seconds for database connection to stabilize - Temporarily disabled

// Geo Tage Food Zone Menu Items
const menuItems = [
  // Combo Meals
  { id: 1, name: "Veg Combo", price: 599, category: "Combo Meals", description: "Veg Burger, Tofu Stick, Cheese Fries, Cheese Corndog + Free Coke/Bubble Tea" },
  { id: 2, name: "Non-Veg Combo", price: 599, category: "Combo Meals", description: "Chicken Burger, Chicken Sausage, Cheese Fries, Corndog + Free Coke/Bubble Tea" },
  
  // Nanglo Khaja Set
  { id: 3, name: "Non-Veg Nanglo Khaja Set", price: 1999, category: "Nanglo Khaja Set", description: "Chicken Biryani, Chicken Momo, Chicken Sausage, Veg Chowmein, Mustang Aalu, Wai Wai Sadeko, Hot Wings, Drumstick, Chicken Burger, Chicken Pizza + 250ml Coke Free" },
  { id: 4, name: "Veg Nanglo Khaja Set", price: 1499, category: "Nanglo Khaja Set", description: "Veg Biryani, Veg Momo, Tofu Stick, Mustang Aalu, Veg Burger, Cheese Pizza, Paneer Pakoda, Wai Wai Sadeko, Potato Cheese Ball + 250ml Coke Free" },
  
  // Khaja & Khana Sets
  { id: 5, name: "Veg Khaja Set", price: 250, category: "Khaja & Khana Sets" },
  { id: 6, name: "Non-Veg Khaja Set", price: 300, category: "Khaja & Khana Sets" },
  { id: 7, name: "Veg Khana Set", price: 250, category: "Khaja & Khana Sets" },
  { id: 8, name: "Non-Veg Khana Set", price: 300, category: "Khaja & Khana Sets" },
  { id: 9, name: "Food Zone Special", price: 400, category: "Khaja & Khana Sets" },
  
  // Breakfast Menu
  { id: 10, name: "Bread Omelette", price: 150, category: "Breakfast" },
  { id: 11, name: "Bread Jam", price: 100, category: "Breakfast" },
  { id: 12, name: "French Toast", price: 150, category: "Breakfast" },
  { id: 13, name: "Butter Toast", price: 100, category: "Breakfast" },
  { id: 14, name: "Honey Butter Toast", price: 150, category: "Breakfast" },
  { id: 15, name: "Cheese Toast", price: 150, category: "Breakfast" },
  { id: 16, name: "Cheese Tomato Toast", price: 180, category: "Breakfast" },
  { id: 17, name: "Aalu Paratha", price: 140, category: "Breakfast", description: "With Dahi & Mix Pickle" },
  { id: 18, name: "Pancake", price: 150, category: "Breakfast" },
  { id: 19, name: "Bread Roll", price: 150, category: "Breakfast" },
  { id: 20, name: "Regular Breakfast", price: 250, category: "Breakfast", description: "Veg/Chicken Sandwich, Masala Tea, Omelette" },
  { id: 21, name: "Food Zone Special Breakfast", price: 350, category: "Breakfast", description: "Cheese Tomato Toast, Omelette, Salad, Milk Masala Tea, Hash Brown Potatoes" },
  
  // Sandwiches & Burgers
  { id: 22, name: "Veg Sandwich", price: 180, category: "Sandwiches & Burgers" },
  { id: 23, name: "Egg Sandwich", price: 180, category: "Sandwiches & Burgers" },
  { id: 24, name: "Chicken Sandwich", price: 180, category: "Sandwiches & Burgers" },
  { id: 25, name: "Veg Cheese Sandwich", price: 250, category: "Sandwiches & Burgers" },
  { id: 26, name: "Chicken Cheese Sandwich", price: 250, category: "Sandwiches & Burgers" },
  { id: 27, name: "Club Sandwich", price: 300, category: "Sandwiches & Burgers" },
  { id: 28, name: "Veg Burger", price: 180, category: "Sandwiches & Burgers" },
  { id: 29, name: "Chicken Burger", price: 180, category: "Sandwiches & Burgers" },
  { id: 30, name: "Veg Cheese Burger", price: 250, category: "Sandwiches & Burgers" },
  { id: 31, name: "Chicken Cheese Burger", price: 250, category: "Sandwiches & Burgers" },
  
  // Fries
  { id: 32, name: "French Fries", price: 160, category: "Fries" },
  { id: 33, name: "Fries Chilly", price: 220, category: "Fries" },
  
  // MoMo
  { id: 34, name: "Veg MoMo (Steam)", price: 120, category: "MoMo" },
  { id: 35, name: "Veg MoMo (Fried)", price: 170, category: "MoMo" },
  { id: 36, name: "Veg MoMo (Jhol)", price: 170, category: "MoMo" },
  { id: 37, name: "Veg MoMo (Chilly)", price: 200, category: "MoMo" },
  { id: 38, name: "Veg MoMo (Sadeko)", price: 200, category: "MoMo" },
  { id: 39, name: "Veg MoMo (Kothey)", price: 200, category: "MoMo" },
  { id: 40, name: "Buff MoMo (Steam)", price: 120, category: "MoMo" },
  { id: 41, name: "Buff MoMo (Fried)", price: 170, category: "MoMo" },
  { id: 42, name: "Buff MoMo (Jhol)", price: 170, category: "MoMo" },
  { id: 43, name: "Buff MoMo (Chilly)", price: 200, category: "MoMo" },
  { id: 44, name: "Buff MoMo (Sadeko)", price: 200, category: "MoMo" },
  { id: 45, name: "Buff MoMo (Kothey)", price: 200, category: "MoMo" },
  { id: 46, name: "Chicken MoMo (Steam)", price: 140, category: "MoMo" },
  { id: 47, name: "Chicken MoMo (Fried)", price: 190, category: "MoMo" },
  { id: 48, name: "Chicken MoMo (Jhol)", price: 190, category: "MoMo" },
  { id: 49, name: "Chicken MoMo (Chilly)", price: 220, category: "MoMo" },
  { id: 50, name: "Chicken MoMo (Sadeko)", price: 220, category: "MoMo" },
  { id: 51, name: "Chicken MoMo (Kothey)", price: 220, category: "MoMo" },
  
  // Chowmein
  { id: 52, name: "Veg Chowmein (Half)", price: 70, category: "Chowmein" },
  { id: 53, name: "Veg Chowmein (Full)", price: 110, category: "Chowmein" },
  { id: 54, name: "Buff Chowmein (Half)", price: 90, category: "Chowmein" },
  { id: 55, name: "Buff Chowmein (Full)", price: 150, category: "Chowmein" },
  { id: 56, name: "Chicken Chowmein (Half)", price: 90, category: "Chowmein" },
  { id: 57, name: "Chicken Chowmein (Full)", price: 150, category: "Chowmein" },
  { id: 58, name: "Egg Chowmein (Half)", price: 90, category: "Chowmein" },
  { id: 59, name: "Egg Chowmein (Full)", price: 150, category: "Chowmein" },
  { id: 60, name: "Mix Chowmein", price: 200, category: "Chowmein" },
  
  // Corn Dog & Hot Dog
  { id: 61, name: "Sausage Corn Dog", price: 130, category: "Corn Dog & Hot Dog" },
  { id: 62, name: "Cheese Corn Dog", price: 180, category: "Corn Dog & Hot Dog" },
  { id: 63, name: "Hot Dog (Chicken)", price: 190, category: "Corn Dog & Hot Dog" },
  
  // Thukpa
  { id: 64, name: "Veg Thukpa (Half)", price: 100, category: "Thukpa" },
  { id: 65, name: "Veg Thukpa (Full)", price: 150, category: "Thukpa" },
  { id: 66, name: "Egg Thukpa (Half)", price: 140, category: "Thukpa" },
  { id: 67, name: "Egg Thukpa (Full)", price: 180, category: "Thukpa" },
  { id: 68, name: "Chicken Thukpa (Half)", price: 140, category: "Thukpa" },
  { id: 69, name: "Chicken Thukpa (Full)", price: 180, category: "Thukpa" },
  { id: 70, name: "Mixed Thukpa", price: 200, category: "Thukpa" },
  
  // Pizza
  { id: 71, name: "9 Inch Cheese Pizza", price: 400, category: "Pizza" },
  { id: 72, name: "12 Inch Cheese Pizza", price: 400, category: "Pizza" },
  { id: 73, name: "9 Inch Veg Pizza", price: 450, category: "Pizza" },
  { id: 74, name: "12 Inch Veg Pizza", price: 450, category: "Pizza" },
  { id: 75, name: "9 Inch Chicken Pizza", price: 450, category: "Pizza" },
  { id: 76, name: "12 Inch Chicken Pizza", price: 450, category: "Pizza" },
  { id: 77, name: "9 Inch Mixed Pizza", price: 500, category: "Pizza" },
  { id: 78, name: "12 Inch Mixed Pizza", price: 500, category: "Pizza" },
  { id: 79, name: "Extra Cheese", price: 100, category: "Pizza" },
  
  // Rice & Biryani
  { id: 80, name: "Veg Fry Rice (Half)", price: 100, category: "Rice & Biryani" },
  { id: 81, name: "Veg Fry Rice (Full)", price: 150, category: "Rice & Biryani" },
  { id: 82, name: "Egg Fry Rice (Half)", price: 120, category: "Rice & Biryani" },
  { id: 83, name: "Egg Fry Rice (Full)", price: 160, category: "Rice & Biryani" },
  { id: 84, name: "Buff Fry Rice (Half)", price: 120, category: "Rice & Biryani" },
  { id: 85, name: "Buff Fry Rice (Full)", price: 180, category: "Rice & Biryani" },
  { id: 86, name: "Chicken Fry Rice (Half)", price: 120, category: "Rice & Biryani" },
  { id: 87, name: "Chicken Fry Rice (Full)", price: 180, category: "Rice & Biryani" },
  { id: 88, name: "Mixed Fry Rice", price: 200, category: "Rice & Biryani" },
  { id: 89, name: "Veg Biryani", price: 280, category: "Rice & Biryani" },
  { id: 90, name: "Chicken Biryani", price: 320, category: "Rice & Biryani" },
  { id: 91, name: "Egg Biryani", price: 300, category: "Rice & Biryani" },
  
  // Curries
  { id: 92, name: "Aalu Matar", price: 130, category: "Curries" },
  { id: 93, name: "Mix Veg", price: 130, category: "Curries" },
  { id: 94, name: "Mushroom Curry", price: 180, category: "Curries" },
  { id: 95, name: "Matar Paneer", price: 250, category: "Curries" },
  { id: 96, name: "Paneer Butter Masala", price: 300, category: "Curries" },
  { id: 97, name: "Chicken Curry", price: 180, category: "Curries" },
  { id: 98, name: "Chicken Butter Masala", price: 250, category: "Curries" },
  { id: 99, name: "Chicken Curry Rice", price: 250, category: "Curries" },
  { id: 100, name: "Paneer Curry Rice", price: 300, category: "Curries" },
  { id: 101, name: "Veg Curry Rice", price: 200, category: "Curries" },
  
  // Peri Peri & Chicken Specials
  { id: 102, name: "Peri Peri Chicken", price: 350, category: "Peri Peri & Chicken Specials" },
  { id: 103, name: "Chicken '65'", price: 300, category: "Peri Peri & Chicken Specials" },
  { id: 104, name: "Chicken Popcorn", price: 250, category: "Peri Peri & Chicken Specials" },
  { id: 105, name: "Food Zone Special Dragon Chicken", price: 300, category: "Peri Peri & Chicken Specials" },
  
  // Fish Specials
  { id: 106, name: "Fish Finger (8 pcs)", price: 250, category: "Fish Specials" },
  { id: 107, name: "Fish & Chips", price: 350, category: "Fish Specials" },
  
  // Paneer & Veg Snacks
  { id: 108, name: "Paneer Pakoda", price: 300, category: "Paneer & Veg Snacks" },
  { id: 109, name: "Paneer Chilly", price: 300, category: "Paneer & Veg Snacks" },
  { id: 110, name: "Grill Potatoes", price: 150, category: "Paneer & Veg Snacks" },
  
  // Chopsuey
  { id: 111, name: "Veg Chopsuey", price: 300, category: "Chopsuey" },
  { id: 112, name: "Non-Veg Chopsuey", price: 320, category: "Chopsuey" },
  
  // Pasta & Extra Choice Items
  { id: 113, name: "Spaghetti Carbonara", price: 350, category: "Pasta" },
  { id: 114, name: "Spaghetti Bolognese", price: 300, category: "Pasta" },
  { id: 115, name: "Pesto Penne", price: 300, category: "Pasta" },
  { id: 116, name: "Pasta", price: 150, category: "Pasta" },
  
  // Food Zone Specials
  { id: 117, name: "Chicken Kathi Roll", price: 180, category: "Food Zone Specials" },
  { id: 118, name: "Paneer Kathi Roll", price: 200, category: "Food Zone Specials" },
  { id: 119, name: "Food Zone Special Chicken Burger [KFC]", price: 250, category: "Food Zone Specials" },
  { id: 120, name: "Food Zone Special Chicken [KFC] (4 pcs)", price: 300, category: "Food Zone Specials" },
  { id: 121, name: "Veg Manchurian with Rice", price: 250, category: "Food Zone Specials" },
  { id: 122, name: "Chicken Manchurian with Rice", price: 300, category: "Food Zone Specials" },
  { id: 123, name: "Veg MoMo Platter", price: 250, category: "Food Zone Specials" },
  { id: 124, name: "Buff MoMo Platter", price: 300, category: "Food Zone Specials" },
  { id: 125, name: "Chicken MoMo Platter", price: 300, category: "Food Zone Specials" },
  { id: 126, name: "Food Zone Special Noodles", price: 250, category: "Food Zone Specials" },
  { id: 127, name: "Meat Ball", price: 200, category: "Food Zone Specials" },
  
  // Hukka
  { id: 128, name: "Hukka", price: 400, category: "Hukka" },
  
  // Soups
  { id: 129, name: "Mushroom Soup", price: 150, category: "Soups" },
  { id: 130, name: "Hot & Sour Soup", price: 150, category: "Soups" },
  { id: 131, name: "Clear Soup", price: 100, category: "Soups" },
  { id: 132, name: "Chicken Soup", price: 150, category: "Soups" },
  
  // Hot Beverages
  { id: 133, name: "Black Tea", price: 20, category: "Hot Beverages" },
  { id: 134, name: "Ginger Tea", price: 25, category: "Hot Beverages" },
  { id: 135, name: "Black Masala", price: 30, category: "Hot Beverages" },
  { id: 136, name: "Marich Tea", price: 30, category: "Hot Beverages" },
  { id: 137, name: "Lemon Tea", price: 30, category: "Hot Beverages" },
  { id: 138, name: "Mint Tea", price: 30, category: "Hot Beverages" },
  { id: 139, name: "Milk Tea", price: 30, category: "Hot Beverages" },
  { id: 140, name: "Milk Masala Tea", price: 40, category: "Hot Beverages" },
  { id: 141, name: "Hot Lemon", price: 50, category: "Hot Beverages" },
  { id: 142, name: "Ginger Lemon Honey", price: 130, category: "Hot Beverages" },
  { id: 143, name: "Hot Chocolate", price: 190, category: "Hot Beverages" },
  
  // Cold Beverages
  { id: 144, name: "Ju Ju Dhau", price: 70, category: "Cold Beverages" },
  { id: 145, name: "Lassi Plain", price: 100, category: "Cold Beverages" },
  { id: 146, name: "Lassi Sweet", price: 120, category: "Cold Beverages" },
  { id: 147, name: "Lassi Banana", price: 130, category: "Cold Beverages" },
  { id: 148, name: "Lemonade", price: 100, category: "Cold Beverages" },
  { id: 149, name: "Cold Coffee", price: 190, category: "Cold Beverages" },
  { id: 150, name: "Oreo Milkshake", price: 190, category: "Cold Beverages" },
  { id: 151, name: "Chocolate Milkshake", price: 190, category: "Cold Beverages" },
  { id: 152, name: "Virgin Mojito", price: 90, category: "Cold Beverages" },
  { id: 153, name: "Black Coffee", price: 80, category: "Cold Beverages" },
  { id: 154, name: "Milk Coffee", price: 120, category: "Cold Beverages" },
  { id: 155, name: "Coke", price: 70, category: "Cold Beverages" },
  { id: 156, name: "Fanta", price: 70, category: "Cold Beverages" },
  { id: 157, name: "Sprite", price: 70, category: "Cold Beverages" }
];

// Clean expired table sessions (older than 5 minutes for active clearing)
const cleanExpiredSessions = () => {
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  let clearedCount = 0;
  
  for (const [tableId, session] of tableSessions.entries()) {
    if (session.timestamp < fiveMinutesAgo) {
      tableSessions.delete(tableId);
      clearedCount++;
      console.log(`🧹 Auto-cleared expired table cache: Table ${tableId}`);
      
      // Emit cache cleared event to all connected clients
      io.emit('tableCacheCleared', { tableId });
    }
  }
  
  if (clearedCount > 0) {
    console.log(`🕒 ACTIVE CACHE CLEAR: Cleaned ${clearedCount} expired table sessions (older than 5 minutes)`);
  }
};

// Run cleanup every 1 minute for active cache clearing
setInterval(cleanExpiredSessions, 1 * 60 * 1000);

// Force cache clear on server startup
console.log('🚀 Starting active table cache clearing system...');
cleanExpiredSessions();

// Initialize Active Cache Manager after Socket.IO is ready
setTimeout(() => {
  cacheManager = new CacheManager(io);
  console.log('✅ ACTIVE CACHE MANAGER INITIALIZED');
}, 1000);

// Initialize database settings on startup
loadSettings();

// API Routes

// Clear table sessions endpoint for cache cleanup
app.post('/api/clear-table-sessions', (req, res) => {
  try {
    const clearedSessions = tableSessions.size;
    tableSessions.clear();
    
    // Also clear active cache manager if available
    let cacheCleared = 0;
    if (cacheManager) {
      cacheCleared = cacheManager.clearAll();
    }
    
    console.log(`🧹 ACTIVE CLEAR: ${clearedSessions} table sessions + ${cacheCleared} cache entries at ${new Date().toLocaleString()}`);
    
    res.json({
      success: true,
      message: `ACTIVE CLEAR: Cleared ${clearedSessions} table sessions + ${cacheCleared} cache entries`,
      clearedCount: clearedSessions,
      cacheCleared,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error clearing table sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear table sessions',
      error: error.message
    });
  }
});

// Get cache statistics endpoint
app.get('/api/cache/stats', (req, res) => {
  try {
    const stats = {
      tableSessions: tableSessions.size,
      cacheManager: cacheManager ? cacheManager.getStats() : null,
      timestamp: new Date().toISOString()
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Force cache cleanup endpoint
app.post('/api/cache/force-cleanup', (req, res) => {
  try {
    let cleaned = 0;
    if (cacheManager) {
      cleaned = cacheManager.forceCleanup();
    }
    
    console.log(`⚡ FORCE CLEANUP: ${cleaned} cache entries removed`);
    res.json({
      success: true,
      message: `Force cleanup completed: ${cleaned} entries removed`,
      cleaned
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get menu items from database
app.get('/api/menu', async (req, res) => {
  try {
    const result = await query(`
      SELECT id, name, price, category, description, image_url, is_available, 
             preparation_time, is_vegetarian, is_spicy
      FROM menu_items 
      ORDER BY category, name
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching menu:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch menu items' 
    });
  }
});

// Get single menu item
app.get('/api/menu/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT id, name, price, category, description, image_url, is_available, 
             preparation_time, is_vegetarian, is_spicy
      FROM menu_items 
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error fetching menu item:', error);
    res.status(500).json({ error: 'Failed to fetch menu item' });
  }
});

// Create new menu item
app.post('/api/menu', authenticateToken, requireManager, validationRules.createMenuItem, async (req, res) => {
  try {
    const { name, price, category, description, image_url, is_available = true, preparation_time, is_vegetarian = false, is_spicy = false, allergens } = req.body;
    
    if (!name || !price || !category) {
      return res.status(400).json({ error: 'Name, price, and category are required' });
    }
    
    const result = await query(`
      INSERT INTO menu_items (name, price, category, description, image_url, is_available, preparation_time, is_vegetarian, is_spicy, allergens)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [name, price, category, description, image_url, is_available, preparation_time, is_vegetarian, is_spicy, allergens]);
    
    res.status(201).json({ success: true, item: result.rows[0] });
  } catch (error) {
    console.error('❌ Error creating menu item:', error);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// Update menu item
app.put('/api/menu/:id', authenticateToken, requireManager, validationRules.createMenuItem, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, category, description, image_url, is_available, preparation_time, is_vegetarian, is_spicy, allergens } = req.body;
    
    const result = await query(`
      UPDATE menu_items 
      SET name = $1, price = $2, category = $3, description = $4, image_url = $5, 
          is_available = $6, preparation_time = $7, is_vegetarian = $8, is_spicy = $9,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `, [name, price, category, description, image_url, is_available, preparation_time, is_vegetarian, is_spicy, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    res.json({ success: true, item: result.rows[0] });
  } catch (error) {
    console.error('❌ Error updating menu item:', error);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// Delete menu item
app.delete('/api/menu/:id', authenticateToken, requireManager, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if menu item exists in any orders
    const orderCheck = await query(`
      SELECT COUNT(*) as count 
      FROM order_items 
      WHERE menu_item_id = $1
    `, [id]);
    
    const orderCount = parseInt(orderCheck.rows[0].count);
    
    if (orderCount > 0) {
      // Don't delete, just mark as unavailable instead
      const result = await query(`
        UPDATE menu_items 
        SET is_available = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Menu item not found' });
      }
      
      return res.json({ 
        success: true, 
        message: `Menu item is used in ${orderCount} orders. Marked as unavailable instead of deleting.`,
        markedUnavailable: true,
        item: result.rows[0]
      });
    }
    
    // Safe to delete if not in any orders
    const result = await query(`
      DELETE FROM menu_items 
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    res.json({ success: true, message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting menu item:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ 
      error: 'Failed to delete menu item',
      details: error.message 
    });
  }
});

// Toggle menu item availability
app.patch('/api/menu/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      UPDATE menu_items 
      SET is_available = NOT is_available, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    res.json({ success: true, item: result.rows[0] });
  } catch (error) {
    console.error('❌ Error toggling menu item availability:', error);
    res.status(500).json({ error: 'Failed to toggle menu item availability' });
  }
});

app.post('/api/order', rateLimits.orders, validationRules.createOrder, async (req, res) => {
  try {
    const { tableId, customerName, phone, address, deliveryNotes, coordinates, items, orderType, totalAmount, deliveryFee = 0 } = req.body;
    
    const isDelivery = tableId === 'Delivery' || orderType === 'delivery';
    const finalTableId = !isDelivery && tableId ? tableId : null;
    
    // Use NULL for optional fields if not provided
    const finalCustomerName = customerName && customerName.trim() ? customerName.trim() : null;
    const finalPhone = phone && phone.trim() ? phone.trim() : null;
    
    console.log('🔍 Order submission debug:', { 
      tableId, 
      tableIdType: typeof tableId,
      orderType, 
      isDelivery,
      finalTableId,
      finalTableIdType: typeof finalTableId,
      customerName: finalCustomerName,
      phone: finalPhone
    });
    
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    // Check if restaurant is open for orders
    const hoursCheck = await orderingHoursValidator.isOpenForOrders();
    if (!hoursCheck.open) {
      const allowPreOrders = await orderingHoursValidator.allowPreOrders();
      if (!allowPreOrders) {
        return res.status(400).json({ error: hoursCheck.reason });
      }
      console.log('⏰ Pre-order accepted (restaurant closed):', hoursCheck.reason);
    }

    // Calculate order details
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal + deliveryFee;

    // Validate minimum order amount from settings
    const minOrderKey = isDelivery ? 'ordering.min_order_delivery' : 'ordering.min_order_dinein';
    const minOrder = await settingsLoader.get(minOrderKey, isDelivery ? 200 : 0);
    
    if (subtotal < minOrder) {
      return res.status(400).json({ 
        error: `Minimum order amount is Rs. ${minOrder}. Your order is Rs. ${subtotal}` 
      });
    }

    // Find or create customer (only if phone is provided)
    let customer = null;
    if (finalPhone) {
      customer = await Customer.findOrCreate({
        name: finalCustomerName,
        phone: finalPhone
      });
    }

    // Calculate delivery distance if coordinates provided
    let deliveryDistance = 0;
    if (isDelivery && coordinates) {
      const restaurantLat = parseFloat(restaurantSettings.restaurant_latitude || 27.6710);
      const restaurantLng = parseFloat(restaurantSettings.restaurant_longitude || 85.4298);
      deliveryDistance = calculateDistance(restaurantLat, restaurantLng, coordinates.latitude, coordinates.longitude);
    }

    // Create order data
    const orderData = {
      orderType: isDelivery ? 'delivery' : 'dine-in',
      customerId: customer ? customer.id : null,
      customerName: finalCustomerName,
      customerPhone: finalPhone || null,
      deliveryAddress: isDelivery ? address : null,
      deliveryLatitude: isDelivery && coordinates ? coordinates.latitude : null,
      deliveryLongitude: isDelivery && coordinates ? coordinates.longitude : null,
      deliveryLandmark: isDelivery ? coordinates?.landmark : null,
      deliveryDistance: isDelivery ? deliveryDistance : null,
      deliveryFee: isDelivery ? deliveryFee : 0,
      tableId: finalTableId,
      subtotal,
      discount: 0,
      total,
      paymentMethod: 'cash',
      notes: deliveryNotes,
      items
    };

    // Create order in database
    const order = await Order.create(orderData);
    
    // Clear table session after order (but not for delivery orders)
    if (!isDelivery) {
      tableSessions.delete(tableId);
    }

    // Emit new order to all connected clients
    io.emit('newOrder', order);
    
    console.log('✅ New order created:', order.order_number);
    res.json({ success: true, order });
    
  } catch (error) {
    console.error('❌ Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order', details: error.message });
  }
});

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

// Get detailed order by ID (must come before general /api/orders route)
app.get('/api/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    console.log(`📋 Fetching order details for ID: ${orderId}`);
    
    // Get order details with items
    const orderResult = await query(`
      SELECT 
        o.*,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', oi.id,
              'name', oi.menu_item_name,
              'quantity', oi.quantity,
              'price', oi.price,
              'special_instructions', oi.special_instructions,
              'category', oi.menu_item_category,
              'description', mi.description
            ) ORDER BY oi.id
          ) FILTER (WHERE oi.id IS NOT NULL), 
          '[]'::json
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_name = mi.name
      WHERE o.id = $1
      GROUP BY o.id
    `, [orderId]);

    if (orderResult.rows.length === 0) {
      console.log(`❌ Order not found: ID ${orderId}`);
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        error: 'ORDER_NOT_FOUND'
      });
    }

    const order = orderResult.rows[0];
    console.log(`✅ Order found: ${order.order_number}`);
    
    // Get payment history if exists
    let paymentHistory = { rows: [] };
    try {
      paymentHistory = await query(`
        SELECT 
          transaction_type,
          amount,
          description,
          created_at
        FROM daybook_transactions 
        WHERE order_id = $1 
        ORDER BY created_at DESC
      `, [orderId]);
    } catch (paymentError) {
      console.warn(`⚠️ Could not fetch payment history for order ${orderId}:`, paymentError.message);
      // Continue without payment history
    }

    // Get table information if it's a dine-in order
    let tableInfo = null;
    if (order.table_id) {
      try {
        const tableResult = await query(`
          SELECT 
            table_number,
            capacity,
            status
          FROM tables 
          WHERE id = $1
        `, [order.table_id]);
        
        if (tableResult.rows.length > 0) {
          tableInfo = tableResult.rows[0];
        }
      } catch (tableError) {
        console.warn(`⚠️ Could not fetch table info for order ${orderId}:`, tableError.message);
        // Continue without table info
      }
    }

    // Totals: trust the stored `total` written at order creation as the
    // source of truth (subtotal + deliveryFee). Only recompute if `total`
    // is missing (defensive fallback for legacy rows).
    const computedSubtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxAmount = Number(order.tax_amount || 0);
    const discountAmount = Number(order.discount_amount || 0);
    const deliveryFee = Number(order.delivery_fee || 0);
    const storedTotal = order.total != null ? Number(order.total) : null;
    const fallbackTotal = computedSubtotal + deliveryFee + taxAmount - discountAmount;
    const totalAmount = storedTotal != null ? storedTotal : fallbackTotal;

    res.json({
      success: true,
      order: {
        ...order,
        subtotal: computedSubtotal,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        delivery_fee: deliveryFee,
        total_amount: totalAmount,
        payment_history: paymentHistory.rows,
        table_info: tableInfo
      }
    });

  } catch (error) {
    console.error(`❌ Error fetching order details for ID ${req.params.orderId}:`, error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order details',
      error: error.message
    });
  }
});

// Get orders for a specific table (for customer view)
app.get('/api/orders/table/:tableId', async (req, res) => {
  try {
    const { tableId } = req.params;
    
    // Validate table ID
    if (!tableId || isNaN(tableId)) {
      return res.status(400).json({ error: 'Invalid table ID' });
    }

    // Get only ACTIVE orders for this table (exclude completed and cancelled)
    const result = await query(`
      SELECT 
        o.id,
        o.order_number,
        o.table_id,
        o.customer_name,
        o.customer_phone,
        o.order_type,
        o.status,
        o.payment_status,
        o.payment_method,
        o.subtotal,
        o.discount,
        o.total,
        o.created_at,
        o.completed_at,
        json_agg(
          json_build_object(
            'id', oi.menu_item_id,
            'name', oi.menu_item_name,
            'price', oi.price,
            'quantity', oi.quantity
          ) ORDER BY oi.id
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.table_id = $1
        AND o.status NOT IN ('completed', 'cancelled')
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [tableId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching table orders:', error);
    res.status(500).json({ error: 'Failed to fetch table orders' });
  }
});


app.get('/api/orders', authenticateToken, requireStaffRole([STAFF_ROLES.MANAGER, STAFF_ROLES.CHEF, STAFF_ROLES.WAITER, STAFF_ROLES.CASHIER]), async (req, res) => {
  try {
    const { 
      status, 
      orderType, 
      tableId, 
      paymentStatus,
      customerName,
      customerPhone,
      orderNumber,
      search,
      startDate,
      endDate,
      from,
      to,
      range,
      page = 1,
      limit = 500,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;
    
    const filters = {};
    
    if (status) filters.status = status;
    if (orderType) filters.orderType = orderType;
    if (tableId) filters.tableId = tableId;
    if (paymentStatus) filters.paymentStatus = paymentStatus;
    if (customerName) filters.customerName = customerName;
    if (customerPhone) filters.customerPhone = customerPhone;
    if (orderNumber) filters.orderNumber = orderNumber;
    if (search) filters.search = search; // General search across all fields
    
    // Handle date range - support multiple formats
    if (from && to) {
      filters.startDate = from;
      filters.endDate = to;
    } else if (startDate && endDate) {
      filters.startDate = startDate;
      filters.endDate = endDate;
    } else if (range) {
      // Parse range preset (7d, 30d, 90d)
      const today = new Date();
      let start;
      switch(range) {
        case '7d':
          start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          start = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'today':
          start = today;
          break;
        default:
          start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      filters.startDate = start.toISOString().split('T')[0];
      filters.endDate = today.toISOString().split('T')[0];
    }
    
    // Pagination
    filters.page = parseInt(page);
    filters.limit = parseInt(limit);
    filters.sortBy = sortBy;
    filters.sortOrder = sortOrder;
    
    console.log('📊 Fetching orders with filters:', filters);
    const result = await Order.findAllWithPagination(filters);
    console.log(`📋 Found ${result.orders.length} orders (${result.total} total)`);
    
    res.json({
      orders: result.orders,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev
      }
    });
  } catch (error) {
    console.error('❌ Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders', details: error.message });
  }
});

app.get('/api/settings', async (req, res) => {
  try {
    // Get all settings from database
    const result = await query('SELECT setting_key, setting_value FROM restaurant_settings');
    
    // Convert to key-value object
    const settings = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });
    
    // Add current restaurant settings for backward compatibility
    settings['tables.table_count'] = restaurantSettings.tableCount;
    settings['table_count'] = restaurantSettings.tableCount; // Legacy key
    
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings', details: error.message });
  }
});

// Update settings endpoint
app.put('/api/settings', async (req, res) => {
  try {
    const updates = req.body;
    
    // Update each setting in the database
    for (const [key, value] of Object.entries(updates)) {
      await query(`
        INSERT INTO restaurant_settings (setting_key, setting_value, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (setting_key)
        DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP
      `, [key, String(value)]);
      
      // Update in-memory settings for specific keys
      if (key === 'tables.table_count' || key === 'table_count') {
        restaurantSettings.tableCount = parseInt(value);
      }
    }
    
    console.log('✅ Settings updated:', updates);
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings', details: error.message });
  }
});

// Get payment QR codes
app.get('/api/payment-qr-codes', async (req, res) => {
  try {
    const qrCodes = [];
    
    // Get QR codes from settings
    const methods = ['esewa', 'khalti', 'fonepay'];
    for (const method of methods) {
      const imageKey = `payment.qr.${method}.image`;
      const nameKey = `payment.qr.${method}.name`;
      const numberKey = `payment.qr.${method}.number`;
      
      const imageResult = await query('SELECT setting_value FROM restaurant_settings WHERE setting_key = $1', [imageKey]);
      const nameResult = await query('SELECT setting_value FROM restaurant_settings WHERE setting_key = $1', [nameKey]);
      const numberResult = await query('SELECT setting_value FROM restaurant_settings WHERE setting_key = $1', [numberKey]);
      
      if (imageResult.rows.length > 0 && imageResult.rows[0].setting_value) {
        qrCodes.push({
          payment_method: method,
          qr_image_url: imageResult.rows[0].setting_value,
          account_name: nameResult.rows[0]?.setting_value || '',
          account_number: numberResult.rows[0]?.setting_value || '',
          is_active: true
        });
      }
    }
    
    res.json(qrCodes);
  } catch (error) {
    console.error('Error fetching QR codes:', error);
    res.status(500).json({ error: 'Failed to fetch QR codes' });
  }
});

app.get('/api/database/summary', async (req, res) => {
  try {
    // Simple summary for in-memory system
    const summary = {
      customers: 0, // In-memory system doesn't persist customers
      totalOrders: 0, // Will be counted from current orders
      orderItems: 0,
      addresses: 0,
      completedOrders: 0,
      activeOrders: tableSessions.size
    };
    
    console.log('📊 Database summary:', summary);
    res.json(summary);
  } catch (error) {
    console.error('Error getting database summary:', error);
    res.status(500).json({ error: 'Failed to get database summary', details: error.message });
  }
});

app.post('/api/database/clear-all', async (req, res) => {
  try {
    console.log('🧹 Database cleanup requested via API');
    
    // Clear database tables
    await query('DELETE FROM order_items');
    const ordersResult = await query('DELETE FROM orders RETURNING id');
    const customersResult = await query('DELETE FROM customers RETURNING id');
    await query('DELETE FROM customer_addresses');
    
    // Clear in-memory table sessions
    const sessionCount = tableSessions.size;
    tableSessions.clear();
    
    const ordersCleared = ordersResult.rowCount || 0;
    const customersCleared = customersResult.rowCount || 0;
    
    console.log(`🗑️ Cleared ${ordersCleared} orders, ${customersCleared} customers, ${sessionCount} table sessions`);
    
    // Emit cleanup event to all connected clients
    io.emit('databaseCleared', {
      customers: customersCleared,
      orders: ordersCleared,
      orderItems: ordersCleared, // Assume same count
      addresses: 0,
      tableSessions: sessionCount,
      message: 'All data cleared successfully'
    });
    
    const result = {
      success: true,
      customers: customersCleared,
      orders: ordersCleared,
      orderItems: ordersCleared,
      addresses: 0,
      tableSessions: sessionCount,
      message: 'All data cleared successfully'
    };
    
    console.log('✅ Simple cleanup completed:', result);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Data cleanup failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to clear data', 
      details: error.message 
    });
  }
});

// Get order history
app.get('/api/order-history', async (req, res) => {
  try {
    // First get all orders
    const result = await query(`
      SELECT * FROM orders 
      WHERE status = 'completed'
      ORDER BY created_at DESC
      LIMIT 100
    `);
    
    console.log(`📊 Found ${result.rows.length} completed orders`);
    
    // Get items for each order
    const ordersWithItems = [];
    for (const order of result.rows) {
      try {
        const itemsResult = await query(
          'SELECT item_name as name, quantity, price, is_custom as "isCustom" FROM order_items WHERE order_id = $1',
          [order.id]
        );
        
        ordersWithItems.push({
          ...order,
          items: itemsResult.rows || []
        });
      } catch (itemError) {
        console.error(`Error fetching items for order ${order.id}:`, itemError);
        ordersWithItems.push({
          ...order,
          items: []
        });
      }
    }
    
    res.json(ordersWithItems);
  } catch (error) {
    console.error('Error fetching order history:', error);
    res.status(500).json({ error: 'Failed to fetch order history', details: error.message });
  }
});

// Delete order with proper authentication
app.delete('/api/order/:orderId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Admin authentication already verified by middleware
    
    // First, check if order exists and get order details
    const orderCheck = await query(
      'SELECT * FROM orders WHERE id = $1',
      [orderId]
    );
    
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found' 
      });
    }
    
    const orderToDelete = orderCheck.rows[0];
    
    // Delete related records in correct order to avoid foreign key constraint violations
    // 1. Delete payments associated with this order
    await query('DELETE FROM payments WHERE order_id = $1', [orderId]);
    
    // 2. Delete daybook transactions associated with this order
    await query('DELETE FROM daybook_transactions WHERE order_id = $1', [orderId]);
    
    // 3. Delete order items
    await query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
    
    // 4. Finally, delete the order itself
    const result = await query(
      'DELETE FROM orders WHERE id = $1 RETURNING *',
      [orderId]
    );
    
    const deletedOrder = result.rows[0];
    console.log(`🗑️ Order ${deletedOrder.order_number} deleted by admin (including related payments and transactions)`);
    
    // Emit order deletion to all connected clients
    io.emit('orderDeleted', { orderId: parseInt(orderId) });
    
    res.json({ 
      success: true, 
      message: 'Order deleted successfully',
      deletedOrder: deletedOrder.order_number
    });
    
  } catch (error) {
    console.error('❌ Error deleting order:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete order', 
      details: error.message 
    });
  }
});

// Customers endpoint
app.get('/api/customers', async (req, res) => {
  try {
    const result = await query(`
      SELECT c.*, 
             COUNT(o.id) as actual_order_count,
             MAX(o.created_at) as last_order_date,
             COALESCE(AVG(o.total), 0) as average_order_value
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      GROUP BY c.id, c.name, c.phone, c.total_orders, c.total_spent, c.created_at
      ORDER BY c.total_spent DESC, c.created_at DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers', details: error.message });
  }
});

// Analytics endpoint with detailed daily breakdown
app.get('/api/analytics', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get basic stats - include all orders with total > 0 for revenue
    const totalOrdersResult = await query('SELECT COUNT(*) as count FROM orders');
    const totalRevenueResult = await query('SELECT SUM(total) as revenue FROM orders WHERE total > 0');
    const totalCustomersResult = await query('SELECT COUNT(*) as count FROM customers');
    const avgOrderValueResult = await query('SELECT AVG(total) as avg FROM orders WHERE total > 0');
    
    // Get today's stats
    const todayOrdersResult = await query('SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = $1', [today]);
    const todayRevenueResult = await query('SELECT SUM(total) as revenue FROM orders WHERE DATE(created_at) = $1 AND total > 0', [today]);
    
    // Get order types
    const dineInOrdersResult = await query('SELECT COUNT(*) as count FROM orders WHERE order_type = $1', ['dine-in']);
    const deliveryOrdersResult = await query('SELECT COUNT(*) as count FROM orders WHERE order_type = $1', ['delivery']);
    
    // Get last 7 days breakdown - include all orders with revenue
    const last7DaysResult = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as order_count,
        SUM(total) as revenue
      FROM orders 
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND total > 0
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    
    // Get top items - from all orders
    const topItemsResult = await query(`
      SELECT 
        oi.item_name as name,
        SUM(oi.quantity) as count
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.total > 0
      GROUP BY oi.item_name
      ORDER BY count DESC
      LIMIT 5
    `);
    
    // Get completion rate
    const completedOrdersResult = await query('SELECT COUNT(*) as count FROM orders WHERE status = $1', ['completed']);
    const completionRate = totalOrdersResult.rows[0].count > 0 ? 
      (completedOrdersResult.rows[0].count / totalOrdersResult.rows[0].count) * 100 : 0;
    
    const analytics = {
      totalOrders: parseInt(totalOrdersResult.rows[0].count),
      totalRevenue: parseFloat(totalRevenueResult.rows[0].revenue || 0),
      totalCustomers: parseInt(totalCustomersResult.rows[0].count),
      avgOrderValue: parseFloat(avgOrderValueResult.rows[0].avg || 0),
      todayOrders: parseInt(todayOrdersResult.rows[0].count),
      todayRevenue: parseFloat(todayRevenueResult.rows[0].revenue || 0),
      dineInOrders: parseInt(dineInOrdersResult.rows[0].count),
      deliveryOrders: parseInt(deliveryOrdersResult.rows[0].count),
      completionRate: Math.round(completionRate),
      completedOrders: parseInt(completedOrdersResult.rows[0].count),
      last7Days: last7DaysResult.rows,
      topItems: topItemsResult.rows
    };
    
    res.json(analytics);
  } catch (error) {
    console.error('❌ Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics', details: error.message });
  }
});

// Email analytics report endpoint
app.post('/api/analytics/email-report', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { email, timeRange, metrics, revenueData, topItems } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }
    
    // For now, just log the request (email functionality would require email service setup)
    console.log(`📧 Analytics report requested for: ${email}`);
    console.log(`Time Range: ${timeRange}`);
    console.log(`Metrics:`, metrics);
    
    // In a production environment, you would integrate with an email service like:
    // - SendGrid
    // - AWS SES
    // - Nodemailer with SMTP
    
    // For now, return success (you can implement actual email sending later)
    res.json({
      success: true,
      message: `Report would be sent to ${email}`,
      note: 'Email service integration pending. Report data logged to console.'
    });
    
  } catch (error) {
    console.error('❌ Error sending email report:', error);
    res.status(500).json({ success: false, message: 'Failed to send email report' });
  }
});

// Update order status endpoint
app.put('/api/orders/:orderId/status', authenticateToken, requireStaffRole([STAFF_ROLES.MANAGER, STAFF_ROLES.CHEF, STAFF_ROLES.WAITER, STAFF_ROLES.CASHIER]), validationRules.updateOrderStatus, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, payment_status, payment_method } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    const completedAt = (status === 'completed' || status === 'cancelled') ? new Date().toISOString() : null;
    
    // Build update query dynamically based on provided fields
    let updateFields = ['status = $2', 'updated_at = NOW()'];
    let queryParams = [orderId, status];
    let paramIndex = 3;
    
    if (completedAt) {
      updateFields.push(`completed_at = $${paramIndex}`);
      queryParams.push(completedAt);
      paramIndex++;
    }
    
    if (payment_status) {
      updateFields.push(`payment_status = $${paramIndex}`);
      queryParams.push(payment_status);
      paramIndex++;
    }
    
    if (payment_method) {
      updateFields.push(`payment_method = $${paramIndex}`);
      queryParams.push(payment_method);
      paramIndex++;
    }
    
    const updateQuery = `
      UPDATE orders 
      SET ${updateFields.join(', ')}
      WHERE id = $1 
      RETURNING *
    `;
    
    const result = await query(updateQuery, queryParams);
    const updatedOrder = result.rows[0];
    
    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // If payment is completed, create daybook transaction (idempotent — uniq index on order_id).
    if (payment_status === 'paid' && payment_method) {
      try {
        const transactionType =
          payment_method === 'cash'    ? 'cash_payment'   :
          payment_method === 'card'    ? 'card_payment'   :
          payment_method === 'esewa'   ? 'esewa_payment'  :
          payment_method === 'khalti'  ? 'khalti_payment' :
          payment_method === 'fonepay' ? 'fonepay_payment':
                                         'online_payment';

        const daybookResult = await query(`
          INSERT INTO daybook_transactions (transaction_date, transaction_type, category, amount, description, order_id, payment_method, created_at)
          VALUES (CURRENT_DATE, $1, 'sales', $2, $3, $4, $5, NOW())
          ON CONFLICT DO NOTHING
          RETURNING id
        `, [
          transactionType,
          updatedOrder.total,
          `${payment_method.charAt(0).toUpperCase() + payment_method.slice(1)} payment - Order #${orderId}`,
          orderId,
          payment_method
        ]);

        if (daybookResult.rowCount > 0) {
          console.log(`💰 Daybook transaction created: ${transactionType} NPR ${updatedOrder.total} for Order #${orderId}`);
        } else {
          console.log(`ℹ️  Daybook already has entry for Order #${orderId}, skipping duplicate`);
        }
      } catch (daybookError) {
        console.error('❌ Error creating daybook transaction:', daybookError);
      }
    }

    // Emit order status update
    io.emit('orderStatusUpdated', { orderId, status, payment_status, payment_method, completedAt });
    
    console.log(`✅ Order ${orderId} status updated to: ${status}${payment_method ? ` (Payment: ${payment_method})` : ''}`);
    res.json({ 
      success: true, 
      message: `Order status updated to ${status}`,
      order: updatedOrder 
    });
  } catch (error) {
    console.error('❌ Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status', details: error.message });
  }
});

// Update order payment status endpoint
app.put('/api/orders/:orderId/payment-status', authenticateToken, requireFrontStaff, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { payment_status } = req.body;
    
    if (!payment_status) {
      return res.status(400).json({ error: 'Payment status is required' });
    }
    
    // Update payment status in database
    const result = await query(
      'UPDATE orders SET payment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [payment_status, orderId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const updatedOrder = result.rows[0];
    
    // If payment is completed, create daybook transaction (idempotent — uniq index on order_id).
    if (payment_status === 'paid' && updatedOrder.payment_method) {
      try {
        const pm = updatedOrder.payment_method;
        const transactionType =
          pm === 'cash'    ? 'cash_payment'   :
          pm === 'card'    ? 'card_payment'   :
          pm === 'esewa'   ? 'esewa_payment'  :
          pm === 'khalti'  ? 'khalti_payment' :
          pm === 'fonepay' ? 'fonepay_payment':
                             'online_payment';

        const daybookResult = await query(`
          INSERT INTO daybook_transactions (transaction_date, transaction_type, category, amount, description, order_id, payment_method, created_at)
          VALUES (CURRENT_DATE, $1, 'sales', $2, $3, $4, $5, NOW())
          ON CONFLICT DO NOTHING
          RETURNING id
        `, [
          transactionType,
          updatedOrder.total,
          `${pm.charAt(0).toUpperCase() + pm.slice(1)} payment - Order #${orderId}`,
          orderId,
          pm
        ]);

        if (daybookResult.rowCount > 0) {
          console.log(`💰 Daybook transaction created: ${transactionType} NPR ${updatedOrder.total} for Order #${orderId}`);
        } else {
          console.log(`ℹ️  Daybook already has entry for Order #${orderId}, skipping duplicate`);
        }
      } catch (daybookError) {
        console.error('❌ Error creating daybook transaction:', daybookError);
      }
    }
    
    // Emit payment status update
    io.emit('orderPaymentStatusUpdated', { orderId, payment_status });
    
    console.log(`✅ Order ${orderId} payment status updated to: ${payment_status}`);
    res.json({ 
      success: true, 
      message: `Payment status updated to ${payment_status}`,
      order: updatedOrder 
    });
  } catch (error) {
    console.error('❌ Error updating payment status:', error);
    res.status(500).json({ error: 'Failed to update payment status', details: error.message });
  }
});

// Settings endpoints
app.get('/api/settings/tables', (req, res) => {
  res.json(restaurantSettings);
});

app.post('/api/settings/tables', (req, res) => {
  const { tableCount } = req.body;
  
  if (!tableCount || tableCount < 1 || tableCount > 100) {
    return res.status(400).json({ error: 'Table count must be between 1 and 100' });
  }
  
  restaurantSettings.tableCount = tableCount;
  
  // Emit settings update to all connected clients
  io.emit('settingsUpdated', { tableCount });
  
  console.log(`Table count updated to ${tableCount}`);
  res.json({ success: true, tableCount });
});

// Happy Hour settings endpoints
app.get('/api/settings/happy-hour', async (req, res) => {
  try {
    const result = await query(
      'SELECT setting_value FROM restaurant_settings WHERE setting_key = $1',
      ['happy_hour_enabled']
    );
    
    const enabled = result.rows.length > 0 ? result.rows[0].setting_value === 'true' : true;
    res.json({ enabled });
  } catch (error) {
    console.error('Error fetching happy hour settings:', error);
    res.json({ enabled: true }); // Default to enabled
  }
});

app.post('/api/settings/happy-hour', async (req, res) => {
  try {
    const { enabled } = req.body;
    
    await query(`
      INSERT INTO restaurant_settings (setting_key, setting_value, description)
      VALUES ($1, $2, $3)
      ON CONFLICT (setting_key) 
      DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP
    `, ['happy_hour_enabled', enabled.toString(), 'Enable or disable happy hour feature']);
    
    // Emit settings update to all connected clients
    io.emit('happyHourSettingsUpdated', { enabled });
    
    console.log(`✅ Happy Hour ${enabled ? 'enabled' : 'disabled'}`);
    res.json({ success: true, enabled });
  } catch (error) {
    console.error('❌ Error updating happy hour settings:', error);
    res.status(500).json({ error: 'Failed to update happy hour settings' });
  }
});

app.post('/api/clear-table/:tableId', async (req, res) => {
  console.log('🔧 Clear table API called for tableId:', req.params.tableId);
  try {
    const { tableId } = req.params;
    const tableIdInt = parseInt(tableId);
    console.log('🔧 Parsed tableId as integer:', tableIdInt);
    
    // Clear table using database - mark orders as completed
    console.log('🔧 Calling Order.clearTable...');
    const clearedOrdersCount = await Order.clearTable(tableIdInt);
    console.log('🔧 Orders cleared from database:', clearedOrdersCount);
    
    // Clear table session from database
    try {
      await TableSession.clearSession(tableIdInt);
      console.log('🔧 Table session cleared from database');
    } catch (sessionError) {
      console.warn('⚠️ Failed to clear table session from database:', sessionError.message);
    }
    
    // Clear table session - try both string and integer keys to ensure complete cleanup
    tableSessions.delete(tableId);        // Delete string key
    tableSessions.delete(tableIdInt);     // Delete integer key
    tableSessions.delete(String(tableIdInt)); // Delete string version of integer
    
    // Clear table sessions from the new session system (in-memory)
    try {
      const clearResponse = await fetch(`http://localhost:${process.env.PORT || 3000}/api/table-session/clear`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: tableIdInt })
      });
      console.log('🔧 Table session cleared from memory:', clearResponse.ok);
    } catch (sessionError) {
      console.warn('⚠️ Failed to clear table session from memory:', sessionError.message);
    }
    
    // Also clear any cart items or session data for this table
    // Check if there are any other session keys that might contain this table ID
    for (const [sessionKey, sessionData] of tableSessions.entries()) {
      if (sessionKey.toString().includes(tableId) || sessionKey.toString().includes(tableIdInt.toString())) {
        tableSessions.delete(sessionKey);
        console.log(`🧹 Cleared additional session key: ${sessionKey}`);
      }
    }
    
    // Emit table cleared event to all connected clients
    io.emit('tableCleared', { tableId: tableIdInt });
    
    // Also emit table status update to refresh the table display
    io.emit('tableStatusUpdated', { 
      tableId: tableIdInt, 
      status: 'empty',
      customer_name: null,
      customer_phone: null,
      total_amount: 0,
      order_count: 0
    });
    
    console.log(`✅ Table ${tableId} cleared completely. ${clearedOrdersCount} orders moved to history. All sessions cleared.`);
    res.json({ 
      success: true, 
      message: `Table ${tableId} cleared successfully`, 
      movedToHistory: clearedOrdersCount,
      tableCacheCleared: true,
      sessionCleared: true
    });
  } catch (error) {
    console.error('❌ Error clearing table:', error);
    res.status(500).json({ error: 'Failed to clear table', details: error.message });
  }
});

// Migrate table - move all orders from one table to another
app.post('/api/migrate-table', async (req, res) => {
  console.log('🔄 Migrate table API called:', req.body);
  try {
    const { fromTableId, toTableId } = req.body;
    
    if (!fromTableId || !toTableId) {
      return res.status(400).json({ success: false, message: 'Both fromTableId and toTableId are required' });
    }
    
    const fromTableInt = parseInt(fromTableId);
    const toTableInt = parseInt(toTableId);
    
    if (fromTableInt === toTableInt) {
      return res.status(400).json({ success: false, message: 'Cannot migrate to the same table' });
    }
    
    if (fromTableInt < 1 || fromTableInt > restaurantSettings.tableCount || toTableInt < 1 || toTableInt > restaurantSettings.tableCount) {
      return res.status(400).json({ success: false, message: `Table numbers must be between 1 and ${restaurantSettings.tableCount}` });
    }
    
    console.log(`🔄 Migrating orders from Table ${fromTableInt} to Table ${toTableInt}`);
    
    // Update all active orders from the source table to the target table
    const result = await query(`
      UPDATE orders 
      SET table_id = $1
      WHERE table_id = $2 
      AND order_type IN ('dine-in', 'dine_in')
      AND status IN ('pending', 'preparing', 'ready')
      RETURNING id, order_number
    `, [toTableInt, fromTableInt]);
    
    const ordersUpdated = result.rowCount;
    console.log(`✅ Migrated ${ordersUpdated} orders from Table ${fromTableInt} to Table ${toTableInt}`);
    
    // Clear source table session
    tableSessions.delete(String(fromTableInt));
    tableSessions.delete(fromTableInt);
    
    // Emit table migration event
    io.emit('tableMigrated', { fromTableId: fromTableInt, toTableId: toTableInt, ordersUpdated });
    
    res.json({ 
      success: true, 
      message: `Successfully migrated ${ordersUpdated} orders from Table ${fromTableInt} to Table ${toTableInt}`,
      ordersUpdated,
      fromTableId: fromTableInt,
      toTableId: toTableInt
    });
  } catch (error) {
    console.error('❌ Error migrating table:', error);
    res.status(500).json({ success: false, error: 'Failed to migrate table', details: error.message });
  }
});

app.get('/api/table-session/:tableId', (req, res) => {
  const { tableId } = req.params;
  const session = tableSessions.get(tableId);
  
  if (!session) {
    return res.json({ exists: false });
  }
  
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  if (session.timestamp < fiveMinutesAgo) {
    tableSessions.delete(tableId);
    console.log(`🧹 Expired table session cleared on access: ${tableId}`);
    io.emit('tableCacheCleared', { tableId });
    return res.json({ exists: false });
  }
  
  res.json({ exists: true, cartItems: session.cartItems });
});

app.post('/api/table-session/:tableId', (req, res) => {
  const { tableId } = req.params;
  const { cartItems } = req.body;
  
  tableSessions.set(tableId, {
    timestamp: Date.now(),
    cartItems: cartItems || []
  });
  
  res.json({ success: true });
});

// Admin authentication endpoint
// Secure admin authentication with JWT
app.post('/api/admin/auth', rateLimits.auth, validationRules.adminAuth, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const authResult = await authenticateAdmin(username, password);
    
    if (authResult.success) {
      res.json({
        success: true,
        message: 'Authentication successful',
        token: authResult.token,
        user: authResult.user
      });
    } else {
      res.status(401).json({
        success: false,
        message: authResult.message
      });
    }
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ success: false, message: 'Authentication error' });
  }
});

// Staff authentication endpoint
app.post('/api/staff/auth', rateLimits.auth, validationRules.staffAuth, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const authResult = await authenticateStaff(username, password);
    
    if (authResult.success) {
      res.json({
        success: true,
        message: 'Authentication successful',
        token: authResult.token,
        user: authResult.user
      });
    } else {
      res.status(401).json({
        success: false,
        message: authResult.message
      });
    }
  } catch (error) {
    console.error('Staff auth error:', error);
    res.status(500).json({ success: false, message: 'Authentication error' });
  }
});

// Token verification endpoint
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user,
    message: 'Token is valid'
  });
});

// Token refresh: reissue a fresh token for any still-valid (non-expired) token.
// This lets a logged-in client extend a session without re-entering credentials,
// without introducing a separate refresh-token store.
app.post('/api/auth/refresh', authenticateToken, (req, res) => {
  try {
    // req.user is the decoded payload; strip JWT-reserved claims before re-signing.
    const { iat, exp, nbf, aud, iss, sub, jti, ...payload } = req.user || {};
    const token = generateToken(payload);
    res.json({ success: true, token, user: payload });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ success: false, message: 'Failed to refresh token' });
  }
});

// Staff Management API Endpoints (Admin only)

// Get all staff members
app.get('/api/admin/staff', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, username, full_name, email, phone, role, is_active, created_at, updated_at FROM staff ORDER BY created_at DESC'
    );
    
    res.json({
      success: true,
      staff: result.rows
    });
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch staff' });
  }
});

// Add new staff member
app.post('/api/admin/staff', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, password, fullName, email, phone, role } = req.body;
    
    // Validate required fields
    if (!username || !password || !fullName || !role) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, full name, and role are required'
      });
    }
    
    // Check if username already exists
    const existingStaff = await query('SELECT id FROM staff WHERE username = $1', [username]);
    if (existingStaff.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Insert new staff member
    const result = await query(
      'INSERT INTO staff (username, password_hash, full_name, email, phone, role, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, username, full_name, email, phone, role, is_active, created_at',
      [username, passwordHash, fullName, email, phone, role, req.user.username]
    );
    
    res.json({
      success: true,
      message: 'Staff member added successfully',
      staff: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding staff:', error);
    res.status(500).json({ success: false, message: 'Failed to add staff member' });
  }
});

// Update staff member
app.put('/api/admin/staff/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const staffId = parseInt(id);
    const { username, fullName, email, phone, role, isActive, password } = req.body;
    
    // Check if staff member exists
    const existingStaff = await query('SELECT id FROM staff WHERE id = $1', [staffId]);
    if (existingStaff.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }
    
    // Check if username is taken by another staff member
    if (username) {
      const usernameCheck = await query('SELECT id FROM staff WHERE username = $1 AND id != $2', [username, staffId]);
      if (usernameCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists'
        });
      }
    }
    
    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }
    
    // Update staff member
    const result = await query(
      'UPDATE staff SET username = COALESCE($1, username), full_name = COALESCE($2, full_name), email = COALESCE($3, email), phone = COALESCE($4, phone), role = COALESCE($5, role), is_active = COALESCE($6, is_active), password_hash = COALESCE($7, password_hash), updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING id, username, full_name, email, phone, role, is_active, updated_at',
      [username, fullName, email, phone, role, isActive, hashedPassword, staffId]
    );
    
    res.json({
      success: true,
      message: 'Staff member updated successfully',
      staff: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(500).json({ success: false, message: 'Failed to update staff member' });
  }
});

// Delete staff member (soft delete)
app.delete('/api/admin/staff/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if staff member exists
    const existingStaff = await query('SELECT id, username FROM staff WHERE id = $1', [id]);
    if (existingStaff.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }
    
    // Soft delete (set is_active to false)
    await query('UPDATE staff SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    
    res.json({
      success: true,
      message: 'Staff member deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting staff:', error);
    res.status(500).json({ success: false, message: 'Failed to delete staff member' });
  }
});

// Reset staff password
app.post('/api/admin/staff/:id/reset-password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    console.log(`🔄 Reset password request for staff ID: ${id}`);
    
    if (!newPassword) {
      console.log('❌ No password provided');
      return res.status(400).json({
        success: false,
        message: 'New password is required'
      });
    }
    
    // Check if staff member exists
    const existingStaff = await query('SELECT id, username FROM staff WHERE id = $1', [id]);
    if (existingStaff.rows.length === 0) {
      console.log(`❌ Staff member ${id} not found`);
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }
    
    console.log(`✅ Found staff member: ${existingStaff.rows[0].username}`);
    
    // Hash new password
    console.log('🔐 Hashing password...');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    console.log('✅ Password hashed successfully');
    
    // Update password
    await query('UPDATE staff SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [passwordHash, id]);
    console.log(`✅ Password updated for staff ID: ${id}`);
    
    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reset password',
      error: error.message 
    });
  }
});

// Database connection test endpoint
app.get('/api/test/db', async (req, res) => {
  try {
    const result = await query('SELECT NOW() as current_time, version() as db_version');
    res.json({ 
      success: true, 
      connected: true,
      timestamp: result.rows[0].current_time,
      version: result.rows[0].db_version
    });
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    res.status(500).json({ 
      success: false, 
      connected: false,
      error: error.message 
    });
  }
});

// Check database tables endpoint
app.get('/api/test/tables', async (req, res) => {
  try {
    const tables = await query(`
      SELECT table_name, table_schema 
      FROM information_schema.tables 
      WHERE table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name
    `);
    
    const publicTables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    
    res.json({
      success: true,
      allTables: tables.rows,
      publicTables: publicTables.rows.map(r => r.table_name),
      count: publicTables.rows.length
    });
  } catch (error) {
    console.error('❌ Table check failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Clear and repopulate menu data endpoint (no auth required for development)
app.post('/api/menu/reset', async (req, res) => {
  try {
    console.log('🔄 Clearing existing menu data and repopulating...');
    
    // Clear existing menu data only
    await query('DELETE FROM menu_items');
    
    // New menu data based on provided list
    const menuItems = [
      // Combo Meals
      {name: 'Veg Combo', price: 599, category: 'Combo Meals', description: 'Veg Burger, Tofu Stick, Cheese Fries, Cheese Corndog + Free Coke/Bubble Tea'},
      {name: 'Non-Veg Combo', price: 599, category: 'Combo Meals', description: 'Chicken Burger, Chicken Sausage, Cheese Fries, Corndog + Free Coke/Bubble Tea'},
      
      // Nanglo Khaja Set
      {name: 'Non-Veg Nanglo Khaja Set', price: 1999, category: 'Nanglo Khaja Set', description: 'Chicken Biryani, Chicken Momo, Chicken Sausage, Veg Chowmein, Mustang Aalu, Wai Wai Sadeko, Hot Wings, Drumstick, Chicken Burger, Chicken Pizza + 250ml Coke Free'},
      {name: 'Veg Nanglo Khaja Set', price: 1499, category: 'Nanglo Khaja Set', description: 'Veg Biryani, Veg Momo, Tofu Stick, Mustang Aalu, Veg Burger, Cheese Pizza, Paneer Pakoda, Wai Wai Sadeko, Potato Cheese Ball + 250ml Coke Free'},
      
      // Khaja & Khana Sets
      {name: 'Veg Khaja Set', price: 250, category: 'Khaja & Khana Sets'},
      {name: 'Non-Veg Khaja Set', price: 300, category: 'Khaja & Khana Sets'},
      {name: 'Veg Khana Set', price: 250, category: 'Khaja & Khana Sets'},
      {name: 'Non-Veg Khana Set', price: 300, category: 'Khaja & Khana Sets'},
      {name: 'Food Zone Special', price: 400, category: 'Khaja & Khana Sets'},
      
      // Breakfast
      {name: 'Bread Omelette', price: 150, category: 'Breakfast'},
      {name: 'Bread Jam', price: 100, category: 'Breakfast'},
      {name: 'French Toast', price: 150, category: 'Breakfast'},
      {name: 'Butter Toast', price: 100, category: 'Breakfast'},
      {name: 'Honey Butter Toast', price: 150, category: 'Breakfast'},
      {name: 'Cheese Toast', price: 150, category: 'Breakfast'},
      {name: 'Cheese Tomato Toast', price: 180, category: 'Breakfast'},
      {name: 'Aalu Paratha', price: 140, category: 'Breakfast', description: 'With Dahi & Mix Pickle'},
      {name: 'Pancake', price: 150, category: 'Breakfast'},
      {name: 'Bread Roll', price: 150, category: 'Breakfast'},
      {name: 'Regular Breakfast', price: 250, category: 'Breakfast', description: 'Veg/Chicken Sandwich, Masala Tea, Omelette'},
      {name: 'Food Zone Special Breakfast', price: 350, category: 'Breakfast', description: 'Cheese Tomato Toast, Omelette, Salad, Milk Masala Tea, Hash Brown Potatoes'},
      
      // Sandwiches & Burgers
      {name: 'Veg Sandwich', price: 180, category: 'Sandwiches & Burgers'},
      {name: 'Egg Sandwich', price: 180, category: 'Sandwiches & Burgers'},
      {name: 'Chicken Sandwich', price: 180, category: 'Sandwiches & Burgers'},
      {name: 'Veg Cheese Sandwich', price: 250, category: 'Sandwiches & Burgers'},
      {name: 'Chicken Cheese Sandwich', price: 250, category: 'Sandwiches & Burgers'},
      {name: 'Club Sandwich', price: 300, category: 'Sandwiches & Burgers'},
      {name: 'Veg Burger', price: 180, category: 'Sandwiches & Burgers'},
      {name: 'Chicken Burger', price: 180, category: 'Sandwiches & Burgers'},
      {name: 'Veg Cheese Burger', price: 250, category: 'Sandwiches & Burgers'},
      {name: 'Chicken Cheese Burger', price: 250, category: 'Sandwiches & Burgers'},
      
      // Fries
      {name: 'French Fries', price: 160, category: 'Fries'},
      {name: 'Fries Chilly', price: 220, category: 'Fries'},
      
      // MoMo
      {name: 'Veg MoMo (Steam)', price: 120, category: 'MoMo'},
      {name: 'Veg MoMo (Fried)', price: 170, category: 'MoMo'},
      {name: 'Veg MoMo (Jhol)', price: 170, category: 'MoMo'},
      {name: 'Veg MoMo (Chilly)', price: 200, category: 'MoMo'},
      {name: 'Veg MoMo (Sadeko)', price: 200, category: 'MoMo'},
      {name: 'Veg MoMo (Kothey)', price: 200, category: 'MoMo'},
      {name: 'Buff MoMo (Steam)', price: 120, category: 'MoMo'},
      {name: 'Buff MoMo (Fried)', price: 170, category: 'MoMo'},
      {name: 'Buff MoMo (Jhol)', price: 170, category: 'MoMo'},
      {name: 'Buff MoMo (Chilly)', price: 200, category: 'MoMo'},
      {name: 'Buff MoMo (Sadeko)', price: 200, category: 'MoMo'},
      {name: 'Buff MoMo (Kothey)', price: 200, category: 'MoMo'},
      {name: 'Chicken MoMo (Steam)', price: 140, category: 'MoMo'},
      {name: 'Chicken MoMo (Fried)', price: 190, category: 'MoMo'},
      {name: 'Chicken MoMo (Jhol)', price: 190, category: 'MoMo'},
      {name: 'Chicken MoMo (Chilly)', price: 220, category: 'MoMo'},
      {name: 'Chicken MoMo (Sadeko)', price: 220, category: 'MoMo'},
      {name: 'Chicken MoMo (Kothey)', price: 220, category: 'MoMo'},
      
      // Chowmein
      {name: 'Veg Chowmein (Half)', price: 70, category: 'Chowmein'},
      {name: 'Veg Chowmein (Full)', price: 110, category: 'Chowmein'},
      {name: 'Buff Chowmein (Half)', price: 90, category: 'Chowmein'},
      {name: 'Buff Chowmein (Full)', price: 150, category: 'Chowmein'},
      {name: 'Chicken Chowmein (Half)', price: 90, category: 'Chowmein'},
      {name: 'Chicken Chowmein (Full)', price: 150, category: 'Chowmein'},
      {name: 'Egg Chowmein (Half)', price: 90, category: 'Chowmein'},
      {name: 'Egg Chowmein (Full)', price: 150, category: 'Chowmein'},
      {name: 'Mix Chowmein', price: 200, category: 'Chowmein'},
      
      // Corn Dog & Hot Dog
      {name: 'Sausage Corn Dog', price: 130, category: 'Corn Dog & Hot Dog'},
      {name: 'Cheese Corn Dog', price: 180, category: 'Corn Dog & Hot Dog'},
      {name: 'Hot Dog (Chicken)', price: 190, category: 'Corn Dog & Hot Dog'},
      
      // Thukpa
      {name: 'Veg Thukpa (Half)', price: 100, category: 'Thukpa'},
      {name: 'Veg Thukpa (Full)', price: 150, category: 'Thukpa'},
      {name: 'Egg Thukpa (Half)', price: 140, category: 'Thukpa'},
      {name: 'Egg Thukpa (Full)', price: 180, category: 'Thukpa'},
      {name: 'Chicken Thukpa (Half)', price: 140, category: 'Thukpa'},
      {name: 'Chicken Thukpa (Full)', price: 180, category: 'Thukpa'},
      {name: 'Mixed Thukpa', price: 200, category: 'Thukpa'},
      
      // Pizza
      {name: '9 Inch Cheese Pizza', price: 400, category: 'Pizza'},
      {name: '12 Inch Cheese Pizza', price: 400, category: 'Pizza'},
      {name: '9 Inch Veg Pizza', price: 450, category: 'Pizza'},
      {name: '12 Inch Veg Pizza', price: 450, category: 'Pizza'},
      {name: '9 Inch Chicken Pizza', price: 450, category: 'Pizza'},
      {name: '12 Inch Chicken Pizza', price: 450, category: 'Pizza'},
      {name: '9 Inch Mixed Pizza', price: 500, category: 'Pizza'},
      {name: '12 Inch Mixed Pizza', price: 500, category: 'Pizza'},
      {name: 'Extra Cheese', price: 100, category: 'Pizza'},
      
      // Rice & Biryani
      {name: 'Veg Fry Rice (Half)', price: 100, category: 'Rice & Biryani'},
      {name: 'Veg Fry Rice (Full)', price: 150, category: 'Rice & Biryani'},
      {name: 'Egg Fry Rice (Half)', price: 120, category: 'Rice & Biryani'},
      {name: 'Egg Fry Rice (Full)', price: 160, category: 'Rice & Biryani'},
      {name: 'Buff Fry Rice (Half)', price: 120, category: 'Rice & Biryani'},
      {name: 'Buff Fry Rice (Full)', price: 180, category: 'Rice & Biryani'},
      {name: 'Chicken Fry Rice (Half)', price: 120, category: 'Rice & Biryani'},
      {name: 'Chicken Fry Rice (Full)', price: 180, category: 'Rice & Biryani'},
      {name: 'Mixed Fry Rice', price: 200, category: 'Rice & Biryani'},
      {name: 'Veg Biryani', price: 280, category: 'Rice & Biryani'},
      {name: 'Chicken Biryani', price: 320, category: 'Rice & Biryani'},
      {name: 'Egg Biryani', price: 300, category: 'Rice & Biryani'},
      
      // Curries
      {name: 'Aalu Matar', price: 130, category: 'Curries'},
      {name: 'Mix Veg', price: 130, category: 'Curries'},
      {name: 'Mushroom Curry', price: 180, category: 'Curries'},
      {name: 'Matar Paneer', price: 250, category: 'Curries'},
      {name: 'Paneer Butter Masala', price: 300, category: 'Curries'},
      {name: 'Chicken Curry', price: 180, category: 'Curries'},
      {name: 'Chicken Butter Masala', price: 250, category: 'Curries'},
      {name: 'Chicken Curry Rice', price: 250, category: 'Curries'},
      {name: 'Paneer Curry Rice', price: 300, category: 'Curries'},
      {name: 'Veg Curry Rice', price: 200, category: 'Curries'},
      
      // Peri Peri & Chicken Specials
      {name: 'Peri Peri Chicken', price: 350, category: 'Peri Peri & Chicken Specials'},
      {name: 'Chicken 65', price: 300, category: 'Peri Peri & Chicken Specials'},
      {name: 'Chicken Popcorn', price: 250, category: 'Peri Peri & Chicken Specials'},
      {name: 'Food Zone Special Dragon Chicken', price: 300, category: 'Peri Peri & Chicken Specials'},
      
      // Fish Specials
      {name: 'Fish Finger (8 pcs)', price: 250, category: 'Fish Specials'},
      {name: 'Fish & Chips', price: 350, category: 'Fish Specials'},
      
      // Paneer & Veg Snacks
      {name: 'Paneer Pakoda', price: 300, category: 'Paneer & Veg Snacks'},
      {name: 'Paneer Chilly', price: 300, category: 'Paneer & Veg Snacks'},
      {name: 'Grill Potatoes', price: 150, category: 'Paneer & Veg Snacks'},
      
      // Chopsuey
      {name: 'Veg Chopsuey', price: 300, category: 'Chopsuey'},
      {name: 'Non-Veg Chopsuey', price: 320, category: 'Chopsuey'},
      
      // Pasta
      {name: 'Spaghetti Carbonara', price: 350, category: 'Pasta'},
      {name: 'Spaghetti Bolognese', price: 300, category: 'Pasta'},
      {name: 'Pesto Penne', price: 300, category: 'Pasta'},
      {name: 'Pasta', price: 150, category: 'Pasta'},
      
      // Food Zone Specials
      {name: 'Chicken Kathi Roll', price: 180, category: 'Food Zone Specials'},
      {name: 'Paneer Kathi Roll', price: 200, category: 'Food Zone Specials'},
      {name: 'Food Zone Special Chicken Burger [KFC]', price: 250, category: 'Food Zone Specials'},
      {name: 'Food Zone Special Chicken [KFC] (4 pcs)', price: 300, category: 'Food Zone Specials'},
      {name: 'Veg Manchurian with Rice', price: 250, category: 'Food Zone Specials'},
      {name: 'Chicken Manchurian with Rice', price: 300, category: 'Food Zone Specials'},
      {name: 'Veg MoMo Platter', price: 250, category: 'Food Zone Specials'},
      {name: 'Buff MoMo Platter', price: 300, category: 'Food Zone Specials'},
      {name: 'Chicken MoMo Platter', price: 300, category: 'Food Zone Specials'},
      {name: 'Food Zone Special Noodles', price: 250, category: 'Food Zone Specials'},
      {name: 'Meat Ball', price: 200, category: 'Food Zone Specials'},
      
      // Hukka
      {name: 'Hukka', price: 400, category: 'Hukka'},
      
      // Soups
      {name: 'Mushroom Soup', price: 150, category: 'Soups'},
      {name: 'Hot & Sour Soup', price: 150, category: 'Soups'},
      {name: 'Clear Soup', price: 100, category: 'Soups'},
      {name: 'Chicken Soup', price: 150, category: 'Soups'},
      
      // Hot Beverages
      {name: 'Black Tea', price: 20, category: 'Hot Beverages'},
      {name: 'Ginger Tea', price: 25, category: 'Hot Beverages'},
      {name: 'Black Masala', price: 30, category: 'Hot Beverages'},
      {name: 'Marich Tea', price: 30, category: 'Hot Beverages'},
      {name: 'Lemon Tea', price: 30, category: 'Hot Beverages'},
      {name: 'Mint Tea', price: 30, category: 'Hot Beverages'},
      {name: 'Milk Tea', price: 30, category: 'Hot Beverages'},
      {name: 'Milk Masala Tea', price: 40, category: 'Hot Beverages'},
      {name: 'Hot Lemon', price: 50, category: 'Hot Beverages'},
      {name: 'Ginger Lemon Honey', price: 130, category: 'Hot Beverages'},
      {name: 'Hot Chocolate', price: 190, category: 'Hot Beverages'},
      
      // Cold Beverages
      {name: 'Ju Ju Dhau', price: 70, category: 'Cold Beverages'},
      {name: 'Lassi Plain', price: 100, category: 'Cold Beverages'},
      {name: 'Lassi Sweet', price: 120, category: 'Cold Beverages'},
      {name: 'Lassi Banana', price: 130, category: 'Cold Beverages'},
      {name: 'Lemonade', price: 100, category: 'Cold Beverages'},
      {name: 'Cold Coffee', price: 190, category: 'Cold Beverages'},
      {name: 'Oreo Milkshake', price: 190, category: 'Cold Beverages'},
      {name: 'Chocolate Milkshake', price: 190, category: 'Cold Beverages'},
      {name: 'Virgin Mojito', price: 90, category: 'Cold Beverages'},
      {name: 'Black Coffee', price: 80, category: 'Cold Beverages'},
      {name: 'Milk Coffee', price: 120, category: 'Cold Beverages'},
      {name: 'Coke', price: 70, category: 'Cold Beverages'},
      {name: 'Fanta', price: 70, category: 'Cold Beverages'},
      {name: 'Sprite', price: 70, category: 'Cold Beverages'}
    ];
    
    // Insert new menu items
    for (const item of menuItems) {
      await query(
        'INSERT INTO menu_items (name, price, category, description, is_available, preparation_time, is_vegetarian, is_spicy) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [item.name, item.price, item.category, item.description || null, true, 15, false, false]
      );
    }
    
    console.log(`✅ Menu reset complete! Added ${menuItems.length} items`);
    res.json({ 
      success: true, 
      message: `Menu reset successfully with ${menuItems.length} items`,
      itemCount: menuItems.length
    });
    
  } catch (error) {
    console.error('❌ Menu reset failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reset menu',
      error: error.message
    });
  }
});

// Initialize database tables endpoint
app.post('/api/init-database', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Check existing tables
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('📋 Existing tables:', tableCheck.rows.map(r => r.table_name));
    
    // Create tables in correct order (respecting foreign key dependencies)
    res.json({
      success: true,
      message: 'Database initialization completed',
      tables: ['customers', 'customer_addresses', 'menu_items', 'table_sessions', 'orders', 'order_items', 'payments', 'staff', 'settings']
    });
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    res.status(500).json({
      success: false,
      message: 'Database initialization failed',
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Socket.IO connection handling

// Socket.IO connection handling
// Track active calls: callId -> { callerSocketId, adminSocketId, tableId, reason, timeoutId, initiatedAt, acceptedAt, status }
const activeCalls = new Map();
// Ring buffer of recent completed calls (most recent first), max 50
const callHistory = [];
const CALL_TIMEOUT_MS = 60 * 1000;
const MAX_HISTORY = 50;

function pushHistory(entry) {
  callHistory.unshift(entry);
  if (callHistory.length > MAX_HISTORY) callHistory.length = MAX_HISTORY;
  io.emit('callHistoryUpdate', callHistory);
}

function clearCallTimeout(callId) {
  const rec = activeCalls.get(callId);
  if (rec && rec.timeoutId) {
    clearTimeout(rec.timeoutId);
    rec.timeoutId = null;
  }
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // On connect, sync current pending calls + history to this client
  const pending = [];
  for (const [callId, rec] of activeCalls.entries()) {
    if (!rec.adminSocketId) {
      pending.push({
        callId,
        tableId: rec.tableId,
        reason: rec.reason,
        initiatedAt: rec.initiatedAt
      });
    }
  }
  if (pending.length > 0) socket.emit('pendingCallsSync', pending);
  if (callHistory.length > 0) socket.emit('callHistoryUpdate', callHistory);

  // Voice call handlers
  socket.on('initiateVoiceCall', (data) => {
    console.log(`📞 SERVER: Voice call initiated from Table ${data.tableId}, callerSocket=${socket.id}`);

    const callId = socket.id;

    // If this socket already has an active call, drop the old one
    if (activeCalls.has(callId)) {
      console.warn(`⚠️ SERVER: Caller ${callId} already has an active call, replacing`);
      clearCallTimeout(callId);
      activeCalls.delete(callId);
    }

    const record = {
      callerSocketId: socket.id,
      tableId: data.tableId,
      reason: data.reason || 'Service',
      initiatedAt: Date.now(),
      acceptedAt: null,
      status: 'ringing',
      timeoutId: null
    };

    // 60-second timeout: if not accepted, cancel the call
    record.timeoutId = setTimeout(() => {
      const rec = activeCalls.get(callId);
      if (!rec || rec.adminSocketId) return; // already accepted or gone
      console.log(`⏰ SERVER: Call ${callId} timed out after 60s (Table ${rec.tableId})`);

      // Notify caller: busy / try again
      io.to(rec.callerSocketId).emit('callTimedOut', {
        callId,
        tableId: rec.tableId,
        message: 'Reception is busy. Please try again in a moment.'
      });

      // Tell all admins to remove this pending notification
      io.emit('incomingVoiceCallCancelled', { callId, reason: 'timeout' });

      pushHistory({
        callId,
        tableId: rec.tableId,
        reason: rec.reason,
        status: 'missed',
        initiatedAt: rec.initiatedAt,
        endedAt: Date.now(),
        duration: 0
      });

      activeCalls.delete(callId);
    }, CALL_TIMEOUT_MS);

    activeCalls.set(callId, record);

    io.emit('incomingVoiceCall', {
      callId,
      tableId: data.tableId,
      reason: record.reason,
      initiatedAt: record.initiatedAt,
      timestamp: new Date()
    });
    console.log(`✅ SERVER: incomingVoiceCall broadcast (callId=${callId})`);
  });

  socket.on('acceptVoiceCall', (data) => {
    console.log(`✅ SERVER: acceptVoiceCall for Table ${data.tableId}, callId=${data.callId}, adminSocket=${socket.id}`);

    const callRecord = activeCalls.get(data.callId);
    if (!callRecord) {
      console.error(`❌ SERVER: acceptVoiceCall for unknown callId=${data.callId}. Possibly already timed out.`);
      socket.emit('callUnavailable', { callId: data.callId, reason: 'expired' });
      return;
    }
    if (callRecord.adminSocketId && callRecord.adminSocketId !== socket.id) {
      console.warn(`⚠️ SERVER: Call ${data.callId} already accepted by another admin ${callRecord.adminSocketId}`);
      socket.emit('callUnavailable', { callId: data.callId, reason: 'already_accepted' });
      return;
    }

    clearCallTimeout(data.callId);
    callRecord.adminSocketId = socket.id;
    callRecord.acceptedAt = Date.now();
    callRecord.status = 'active';
    console.log(`✅ SERVER: Call linked. Caller=${callRecord.callerSocketId} Admin=${socket.id}`);

    // Notify all OTHER admins to remove this pending notification
    socket.broadcast.emit('incomingVoiceCallCancelled', { callId: data.callId, reason: 'accepted' });

    // Send callAccepted ONLY to the caller (callerSocketId === callId)
    io.to(callRecord.callerSocketId).emit('callAccepted', {
      callId: data.callId,
      tableId: data.tableId
    });
    console.log(`✅ SERVER: callAccepted sent to caller ${callRecord.callerSocketId}`);
  });

  socket.on('offer', (data) => {
    console.log(`📤 SERVER: Received offer from ${socket.id} for callId=${data.callId}, tableId=${data.tableId}`);
    const callRecord = activeCalls.get(data.callId);
    if (!callRecord) {
      console.error(`❌ SERVER: No activeCall record for callId=${data.callId}. Active:`, Array.from(activeCalls.keys()));
      return;
    }
    if (!callRecord.adminSocketId) {
      console.error(`❌ SERVER: No adminSocketId registered for callId=${data.callId}. Call was not accepted yet.`);
      return;
    }
    console.log(`📤 SERVER: Routing offer to admin ${callRecord.adminSocketId}`);
    io.to(callRecord.adminSocketId).emit('offer', {
      offer: data.offer,
      callId: data.callId,
      tableId: data.tableId
    });
    console.log(`✅ SERVER: Offer forwarded to admin`);
  });

  socket.on('answer', (data) => {
    console.log(`📥 SERVER: Received answer from ${socket.id} for callId=${data.callId}`);
    const callRecord = activeCalls.get(data.callId);
    if (!callRecord) {
      console.error(`❌ SERVER: No activeCall record for answer callId=${data.callId}`);
      return;
    }
    if (!callRecord.callerSocketId) {
      console.error(`❌ SERVER: No callerSocketId for callId=${data.callId}`);
      return;
    }
    console.log(`📥 SERVER: Routing answer to caller ${callRecord.callerSocketId}`);
    io.to(callRecord.callerSocketId).emit('answer', {
      answer: data.answer,
      callId: data.callId
    });
    console.log(`✅ SERVER: Answer forwarded to caller`);
  });

  socket.on('iceCandidate', (data) => {
    const callRecord = activeCalls.get(data.callId);
    if (!callRecord) {
      console.warn(`⚠️ SERVER: ICE candidate for unknown callId=${data.callId}`);
      return;
    }
    if (socket.id === callRecord.callerSocketId && callRecord.adminSocketId) {
      console.log(`🧊 SERVER: Routing ICE caller→admin ${callRecord.adminSocketId}`);
      io.to(callRecord.adminSocketId).emit('iceCandidate', {
        candidate: data.candidate,
        callId: data.callId
      });
    } else if (socket.id === callRecord.adminSocketId && callRecord.callerSocketId) {
      console.log(`🧊 SERVER: Routing ICE admin→caller ${callRecord.callerSocketId}`);
      io.to(callRecord.callerSocketId).emit('iceCandidate', {
        candidate: data.candidate,
        callId: data.callId
      });
    } else {
      console.warn(`⚠️ SERVER: ICE from unknown socket ${socket.id} for callId=${data.callId}`);
    }
  });

  socket.on('rejectVoiceCall', (data) => {
    console.log(`❌ SERVER: rejectVoiceCall for Table ${data.tableId}, callId=${data.callId}`);
    const callRecord = activeCalls.get(data.callId);
    if (!callRecord) return;

    clearCallTimeout(data.callId);
    if (callRecord.callerSocketId) {
      io.to(callRecord.callerSocketId).emit('callRejected', {
        callId: data.callId,
        tableId: data.tableId
      });
    }
    // Remove notification from all other admins
    socket.broadcast.emit('incomingVoiceCallCancelled', { callId: data.callId, reason: 'rejected' });

    pushHistory({
      callId: data.callId,
      tableId: callRecord.tableId,
      reason: callRecord.reason,
      status: 'rejected',
      initiatedAt: callRecord.initiatedAt,
      endedAt: Date.now(),
      duration: 0
    });

    activeCalls.delete(data.callId);
  });

  socket.on('endVoiceCall', (data) => {
    const callId = (data && data.callId) || socket.id;
    console.log(`📞 SERVER: endVoiceCall callId=${callId} from ${socket.id}`);
    const callRecord = activeCalls.get(callId);
    if (!callRecord) {
      // Broadcast anyway in case the client is cleaning up stale state
      io.emit('callEnded', { callId });
      return;
    }

    clearCallTimeout(callId);

    if (callRecord.callerSocketId) {
      io.to(callRecord.callerSocketId).emit('callEnded', { callId });
    }
    if (callRecord.adminSocketId) {
      io.to(callRecord.adminSocketId).emit('callEnded', { callId });
    }

    const duration = callRecord.acceptedAt ? Math.round((Date.now() - callRecord.acceptedAt) / 1000) : 0;
    pushHistory({
      callId,
      tableId: callRecord.tableId,
      reason: callRecord.reason,
      status: callRecord.acceptedAt ? 'ended' : 'missed',
      initiatedAt: callRecord.initiatedAt,
      endedAt: Date.now(),
      duration
    });

    activeCalls.delete(callId);
  });

  // Caller cancels before admin picks up
  socket.on('cancelVoiceCall', (data) => {
    const callId = (data && data.callId) || socket.id;
    console.log(`🚫 SERVER: cancelVoiceCall callId=${callId}`);
    const callRecord = activeCalls.get(callId);
    if (!callRecord) return;

    clearCallTimeout(callId);
    // Tell admins to remove the pending notification
    io.emit('incomingVoiceCallCancelled', { callId, reason: 'cancelled' });

    pushHistory({
      callId,
      tableId: callRecord.tableId,
      reason: callRecord.reason,
      status: 'cancelled',
      initiatedAt: callRecord.initiatedAt,
      endedAt: Date.now(),
      duration: 0
    });

    activeCalls.delete(callId);
  });

  socket.on('requestCallHistory', () => {
    socket.emit('callHistoryUpdate', callHistory);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Clean up any calls associated with this socket
    for (const [callId, record] of Array.from(activeCalls.entries())) {
      if (record.callerSocketId === socket.id) {
        clearCallTimeout(callId);
        if (record.adminSocketId) {
          io.to(record.adminSocketId).emit('callEnded', { callId, reason: 'caller_disconnected' });
        }
        io.emit('incomingVoiceCallCancelled', { callId, reason: 'caller_disconnected' });
        const duration = record.acceptedAt ? Math.round((Date.now() - record.acceptedAt) / 1000) : 0;
        pushHistory({
          callId,
          tableId: record.tableId,
          reason: record.reason,
          status: record.acceptedAt ? 'ended' : 'cancelled',
          initiatedAt: record.initiatedAt,
          endedAt: Date.now(),
          duration
        });
        activeCalls.delete(callId);
      } else if (record.adminSocketId === socket.id) {
        clearCallTimeout(callId);
        if (record.callerSocketId) {
          io.to(record.callerSocketId).emit('callEnded', { callId, reason: 'admin_disconnected' });
        }
        const duration = record.acceptedAt ? Math.round((Date.now() - record.acceptedAt) / 1000) : 0;
        pushHistory({
          callId,
          tableId: record.tableId,
          reason: record.reason,
          status: 'ended',
          initiatedAt: record.initiatedAt,
          endedAt: Date.now(),
          duration
        });
        activeCalls.delete(callId);
      }
    }
  });
});

// ============================================
// TABLE MANAGEMENT API ENDPOINTS
// ============================================

// Get all table statuses for admin dashboard
app.get('/api/tables/status', async (req, res) => {
  try {
    console.log('📊 Getting all table statuses...');
    
    // Get all active orders (not completed or cancelled) with better error handling
    let ordersResult;
    try {
      ordersResult = await query(`
        SELECT o.id, o.order_number, o.table_id, o.customer_name, o.customer_phone, o.phone, 
               o.status, o.total, o.total_amount, o.created_at,
               oi.item_name, oi.menu_item_name, oi.quantity, oi.price, oi.subtotal
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.order_type IN ('dine-in', 'dine_in')
        AND o.status IN ('pending', 'preparing', 'ready')
        AND o.table_id IS NOT NULL
        ORDER BY o.table_id, o.created_at
      `);
    } catch (dbError) {
      console.error('❌ Database query failed:', dbError);
      // Return empty table statuses if database fails
      const emptyTableStatuses = [];
      for (let i = 1; i <= 25; i++) {
        emptyTableStatuses.push({
          table_id: i,
          status: 'available',
          customer_name: null,
          customer_phone: null,
          display_name: null,
          total_amount: 0,
          order_count: 0,
          hours_occupied: 0,
          orders: [],
          session_start: null
        });
      }
      console.log('📊 Returning fallback empty table statuses due to DB error');
      return res.json(emptyTableStatuses);
    }
    
    console.log('📊 Found orders for table status:', ordersResult.rows.length);
    
    // Log first few rows for debugging
    if (ordersResult.rows.length > 0) {
      console.log('📊 Sample order row:', ordersResult.rows[0]);
    }
    
    // Group orders by table
    const ordersByTable = {};
    ordersResult.rows.forEach(row => {
      const tableId = row.table_id;
      if (!tableId) return; // Skip rows without table_id
      
      if (!ordersByTable[tableId]) {
        ordersByTable[tableId] = {
          orders: [],
          customer_name: row.customer_name || null,
          customer_phone: row.phone || row.customer_phone || null,
          table_id: tableId,
          created_at: row.created_at
        };
      }
      
      // Find existing order or create new one
      let existingOrder = ordersByTable[tableId].orders.find(o => o.id === row.id);
      if (!existingOrder) {
        existingOrder = {
          id: row.id,
          order_number: row.order_number,
          status: row.status,
          total: parseFloat(row.total_amount || row.total || 0),
          items: []
        };
        ordersByTable[tableId].orders.push(existingOrder);
      }
      
      // Add item if it exists (use menu_item_name or item_name)
      const itemName = row.menu_item_name || row.item_name;
      if (itemName) {
        existingOrder.items.push({
          name: itemName,
          quantity: row.quantity,
          price: row.price,
          subtotal: row.subtotal
        });
      }
    });
    
    // Generate table statuses for all tables
    const tableStatuses = [];
    for (let i = 1; i <= restaurantSettings.tableCount; i++) {
      const tableData = ordersByTable[i];
      
      if (tableData && tableData.orders.length > 0) {
        // Calculate total amount from all orders for this table
        const totalAmount = tableData.orders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
        const orderCount = tableData.orders.length;
        const hoursOccupied = tableData.created_at ? 
          (Date.now() - new Date(tableData.created_at)) / (1000 * 60 * 60) : 0;
        
        tableStatuses.push({
          table_id: i,
          status: 'occupied',
          customer_name: tableData.customer_name,
          customer_phone: tableData.customer_phone,
          display_name: tableData.customer_name || tableData.customer_phone || `Table ${i}`,
          total_amount: totalAmount,
          order_count: orderCount,
          hours_occupied: Math.round(hoursOccupied * 10) / 10, // Round to 1 decimal
          orders: tableData.orders,
          session_start: tableData.created_at
        });
      } else {
        // Table is available
        tableStatuses.push({
          table_id: i,
          status: 'available',
          customer_name: null,
          customer_phone: null,
          display_name: null,
          total_amount: 0,
          order_count: 0,
          hours_occupied: 0,
          orders: [],
          session_start: null
        });
      }
    }
    
    console.log(`📊 Returning ${tableStatuses.length} table statuses (${tableStatuses.filter(t => t.status === 'occupied').length} occupied)`);
    res.json(tableStatuses);
  } catch (error) {
    console.error('❌ Error getting table statuses:', error);
    
    // Return fallback empty table statuses instead of 500 error
    const fallbackTableStatuses = [];
    for (let i = 1; i <= 25; i++) {
      fallbackTableStatuses.push({
        table_id: i,
        status: 'available',
        customer_name: null,
        customer_phone: null,
        display_name: null,
        total_amount: 0,
        order_count: 0,
        hours_occupied: 0,
        orders: [],
        session_start: null
      });
    }
    
    console.log('📊 Returning fallback table statuses due to general error');
    res.json(fallbackTableStatuses);
  }
});

// Create new table session (when customer scans QR)
app.post('/api/tables/:tableId/session', async (req, res) => {
  try {
    const { tableId } = req.params;
    const { customerName, customerPhone } = req.body;
    
    console.log(`🔄 Creating session for table ${tableId}, customer: ${customerName}`);
    
    if (!customerName || !customerPhone) {
      return res.status(400).json({ error: 'Customer name and phone are required' });
    }
    
    const tableIdInt = parseInt(tableId);
    if (isNaN(tableIdInt) || tableIdInt < 1 || tableIdInt > 25) {
      return res.status(400).json({ error: 'Invalid table ID. Must be between 1 and 25' });
    }
    
    const session = await TableSession.createSession(tableIdInt, customerName, customerPhone);
    
    // Emit table occupied event
    io.emit('tableOccupied', { 
      tableId: tableIdInt, 
      customerName, 
      customerPhone,
      sessionId: session.id 
    });
    
    res.json({ success: true, session });
  } catch (error) {
    console.error('❌ Error creating table session:', error);
    if (error.message.includes('already occupied')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create table session', details: error.message });
    }
  }
});

// Get active session for a specific table
app.get('/api/tables/:tableId/session', async (req, res) => {
  try {
    const { tableId } = req.params;
    const tableIdInt = parseInt(tableId);
    
    const session = await TableSession.getActiveSession(tableIdInt);
    
    if (!session) {
      return res.status(404).json({ error: 'No active session found for this table' });
    }
    
    res.json(session);
  } catch (error) {
    console.error('❌ Error getting table session:', error);
    res.status(500).json({ error: 'Failed to get table session', details: error.message });
  }
});

// Update table session status
app.put('/api/tables/:tableId/session/status', async (req, res) => {
  try {
    const { tableId } = req.params;
    const { status, totalAmount } = req.body;
    
    console.log(`🔄 Updating table ${tableId} status to: ${status}`);
    
    const tableIdInt = parseInt(tableId);
    const updatedSession = await TableSession.updateSessionStatus(tableIdInt, status, totalAmount);
    
    if (!updatedSession) {
      return res.status(404).json({ error: 'No active session found for this table' });
    }
    
    // Emit status update event
    io.emit('tableStatusUpdate', { 
      tableId: tableIdInt, 
      status, 
      totalAmount,
      sessionId: updatedSession.id 
    });
    
    res.json({ success: true, session: updatedSession });
  } catch (error) {
    console.error('❌ Error updating table session status:', error);
    res.status(500).json({ error: 'Failed to update table session status', details: error.message });
  }
});

// Clear table session (admin action)
app.post('/api/tables/:tableId/clear', async (req, res) => {
  try {
    const { tableId } = req.params;
    const tableIdInt = parseInt(tableId);
    
    console.log(`🧹 Admin clearing table ${tableId}...`);
    
    // Clear table session in database
    const clearedSession = await TableSession.clearSession(tableIdInt);
    
    if (!clearedSession) {
      return res.status(404).json({ error: 'No active session found for this table' });
    }
    
    // Clear any existing orders for this table (move to history)
    const clearedOrdersCount = await Order.clearTable(tableIdInt);
    
    // Clear table session from memory
    tableSessions.delete(tableId);
    tableSessions.delete(tableIdInt);
    tableSessions.delete(String(tableIdInt));
    
    // Emit table cleared event
    io.emit('tableCleared', { tableId: tableIdInt, sessionId: clearedSession.id });
    
    console.log(`✅ Table ${tableId} cleared completely. Session ended, ${clearedOrdersCount} orders moved to history.`);
    
    res.json({ 
      success: true, 
      message: `Table ${tableId} cleared successfully`,
      clearedSession,
      movedToHistory: clearedOrdersCount
    });
  } catch (error) {
    console.error('❌ Error clearing table:', error);
    res.status(500).json({ error: 'Failed to clear table', details: error.message });
  }
});

// Get table session history
app.get('/api/tables/:tableId/history', async (req, res) => {
  try {
    const { tableId } = req.params;
    const { limit = 10 } = req.query;
    
    const tableIdInt = parseInt(tableId);
    const history = await TableSession.getSessionHistory(tableIdInt, parseInt(limit));
    
    res.json(history);
  } catch (error) {
    console.error('❌ Error getting table history:', error);
    res.status(500).json({ error: 'Failed to get table history', details: error.message });
  }
});

// ============================================
// API ENDPOINTS
// ============================================

// Create payment for table session
app.post('/api/tables/:tableId/payments', async (req, res) => {
  try {
    const { tableId } = req.params;
    const { amount, paymentMethod, transactionId } = req.body;
    
    console.log(`💳 Processing payment for table ${tableId}, amount: $${amount}`);
    
    const tableIdInt = parseInt(tableId);
    const activeSession = await TableSession.getActiveSession(tableIdInt);
    
    if (!activeSession) {
      return res.status(404).json({ error: 'No active session found for this table' });
    }
    
    const payment = await TablePayment.createPayment(
  activeSession.id, 
  amount, 
  paymentMethod, 
  transactionId
);
    
// Update session status to payment_pending
await TableSession.updateSessionStatus(tableIdInt, 'payment_pending', amount);
    
// Emit payment initiated event
io.emit('paymentInitiated', { 
  tableId: tableIdInt, 
  sessionId: activeSession.id,
  paymentId: payment.id,
  amount 
});
    
    res.json({ success: true, payment });
  } catch (error) {
    console.error('❌ Error creating payment:', error);
    res.status(500).json({ error: 'Failed to create payment', details: error.message });
  }
});

// Update payment status
app.put('/api/payments/:paymentId/status', async (req, res) => {
try {
const { paymentId } = req.params;
const { status, gatewayResponse } = req.body;
    
console.log(` Updating payment ${paymentId} status to: ${status}`);
    
const updatedPayment = await TablePayment.updatePaymentStatus(
  parseInt(paymentId), 
  status, 
  gatewayResponse
);
    
if (!updatedPayment) {
  return res.status(404).json({ error: 'Payment not found' });
}
    
// If payment completed, update session payment status
if (status === 'completed') {
  // Get the table session and update payment status
  const sessionQuery = await pool.query(
    'SELECT table_id FROM table_sessions WHERE id = $1',
    [updatedPayment.table_session_id]
  );
      
  if (sessionQuery.rows[0]) {
    const tableId = sessionQuery.rows[0].table_id;
    await TableSession.updateSessionStatus(tableId, 'completed');
        
    // Emit payment completed event
    io.emit('paymentCompleted', { 
      tableId, 
      sessionId: updatedPayment.table_session_id,
      paymentId: updatedPayment.id 
    });
  }
}
    
res.json({ success: true, payment: updatedPayment });
} catch (error) {
console.error(' Error updating payment status:', error);
res.status(500).json({ error: 'Failed to update payment status', details: error.message });
}
});

// Get payments for a table session
app.get('/api/tables/:tableId/payments', async (req, res) => {
try {
const { tableId } = req.params;
const tableIdInt = parseInt(tableId);
    
const activeSession = await TableSession.getActiveSession(tableIdInt);
    
if (!activeSession) {
  return res.status(404).json({ error: 'No active session found for this table' });
}
    
const payments = await TablePayment.getSessionPayments(activeSession.id);
res.json(payments);
} catch (error) {
console.error(' Error getting table payments:', error);
res.status(500).json({ error: 'Failed to get table payments', details: error.message });
}
});

// Direct endpoint to populate menu data (for production deployment)
app.post('/api/populate-menu', async (req, res) => {
  try {
    console.log('🔄 Populating menu data...');
    
    // First ensure table exists
    await initializeMenuTable();
    
    // Clear existing data
    await query('DELETE FROM menu_items');
    
    // Insert all menu items
    for (const item of menuItems) {
      await query(`
        INSERT INTO menu_items (name, price, category, description, image_url, is_available, preparation_time, is_vegetarian, is_spicy) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        item.name,
        item.price,
        item.category,
        item.description || '',
        item.image_url || '/images/default-food.jpg',
        item.is_available !== false,
        item.preparation_time || 15,
        item.is_vegetarian || false,
        item.is_spicy || false
      ]);
    }
    
    const count = await query('SELECT COUNT(*) as count FROM menu_items');
    console.log(`✅ Menu populated with ${count.rows[0].count} items`);
    
    res.json({ 
      success: true, 
      message: `Menu populated with ${count.rows[0].count} items`,
      count: parseInt(count.rows[0].count)
    });
  } catch (error) {
    console.error('❌ Error populating menu:', error);
    res.status(500).json({ error: 'Failed to populate menu', details: error.message });
  }
});

// Clear all test data endpoint (orders, customers, sessions)
app.post('/api/clear-all-data', async (req, res) => {
  try {
    console.log('🧹 Clearing all test data from database...');
    
    const clearedTables = [];
    
    // Clear orders and related data
    try {
      await query('DELETE FROM order_items');
      clearedTables.push('order_items');
      console.log('✅ Cleared order_items');
    } catch (e) {
      console.log('⚠️ order_items table not found, skipping');
    }
    
    try {
      await query('DELETE FROM orders');
      clearedTables.push('orders');
      console.log('✅ Cleared orders');
    } catch (e) {
      console.log('⚠️ orders table not found, skipping');
    }
    
    // Clear customers
    try {
      await query('DELETE FROM customers');
      clearedTables.push('customers');
      console.log('✅ Cleared customers');
    } catch (e) {
      console.log('⚠️ customers table not found, skipping');
    }
    
    // Clear table sessions and payments (if they exist)
    try {
      await query('DELETE FROM table_payments');
      clearedTables.push('table_payments');
      console.log('✅ Cleared table_payments');
    } catch (e) {
      console.log('⚠️ table_payments table not found, skipping');
    }
    
    try {
      await query('DELETE FROM table_sessions');
      clearedTables.push('table_sessions');
      console.log('✅ Cleared table_sessions');
    } catch (e) {
      console.log('⚠️ table_sessions table not found, skipping');
    }
    
    // Clear any cached sessions in memory
    tableSessions.clear();
    clearedTables.push('memory_cache');
    
    console.log('✅ All available test data cleared successfully');
    
    res.json({ 
      success: true, 
      message: 'All available test data cleared successfully',
      cleared: clearedTables
    });
  } catch (error) {
    console.error('❌ Error clearing test data:', error);
    res.status(500).json({ error: 'Failed to clear test data', details: error.message });
  }
});

// Payment API endpoints
app.post('/api/payments', rateLimits.payments, validationRules.createPayment, async (req, res) => {
  try {
    const { order_id, payment_method, amount, invoice_number, amount_received, change_given, notes, transaction_id, skip_daybook } = req.body;
    
    console.log('📱 Payment request received:', { order_id, payment_method, amount, invoice_number, skip_daybook });
    
    // First verify the order exists
    const orderCheck = await query('SELECT id, order_number, total FROM orders WHERE id = $1', [order_id]);
    if (orderCheck.rows.length === 0) {
      console.error(`Payment failed: Order ${order_id} not found`);
      return res.status(404).json({ error: `Order ${order_id} not found` });
    }
    
    const order = orderCheck.rows[0];
    
    // Ensure payments table has all payment methods
    try {
      // Drop old constraint if exists
      await query(`
        DO $$
        DECLARE
            con_name TEXT;
        BEGIN
            FOR con_name IN
                SELECT conname FROM pg_constraint
                WHERE conrelid = 'payments'::regclass
                  AND contype = 'c'
                  AND pg_get_constraintdef(oid) ILIKE '%payment_method%'
            LOOP
                EXECUTE format('ALTER TABLE payments DROP CONSTRAINT %I', con_name);
            END LOOP;
        END $$;
      `);
      
      // Add new constraint with all payment methods
      await query(`
        ALTER TABLE payments
        ADD CONSTRAINT payments_payment_method_check
        CHECK (payment_method IN ('cash', 'card', 'esewa', 'khalti', 'fonepay', 'bank_transfer', 'other', 'phonepe', 'online'))
      `);
    } catch (constraintError) {
      console.log('⚠️ Payment method constraint already updated:', constraintError.message);
    }
    
    // Insert payment record
    const result = await query(`
      INSERT INTO payments (order_id, payment_method, amount, invoice_number, amount_received, change_given, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `, [
      order_id, 
      payment_method, 
      amount, 
      invoice_number || `INV-${Date.now()}`,
      amount_received || amount, 
      change_given || 0
    ]);
    
    const payment = result.rows[0];
    
    // Update order payment status
    await query(`
      UPDATE orders 
      SET payment_status = 'paid', payment_method = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [payment_method, order_id]);
    
    // Record in daybook transactions ONLY if skip_daybook is not true
    if (!skip_daybook) {
      const transactionType = payment_method === 'cash' ? 'cash_payment' :
                             payment_method === 'card' ? 'card_payment' :
                             payment_method === 'esewa' ? 'esewa_payment' :
                             payment_method === 'khalti' ? 'khalti_payment' :
                             payment_method === 'fonepay' ? 'fonepay_payment' :
                             'online_payment';
      
      const description = notes || `${payment_method.toUpperCase()} payment - Order #${order.order_number}${transaction_id ? ` - ${transaction_id}` : ''}`;
      
      await query(`
        INSERT INTO daybook_transactions (
          transaction_date, transaction_type, category, amount,
          description, order_id, created_at
        )
        VALUES (
          CURRENT_DATE, $1, 'sales', $2, $3, $4, NOW()
        )
        ON CONFLICT DO NOTHING
      `, [
        transactionType,
        amount,
        description,
        order_id
      ]);
      
      console.log(`💰 Recorded in daybook: ${transactionType}`);
    } else {
      console.log(`ℹ️  Skipped daybook entry (already recorded by order status update)`);
    }
    
    console.log(`✅ Payment created for order ${order_id}: ${payment_method} - NPR ${amount}`);
    
    res.json({ 
      success: true,
      payment: payment,
      message: 'Payment recorded successfully'
    });
  } catch (error) {
    console.error('❌ Error creating payment:', error.message);
    console.error('❌ Error details:', error);
    res.status(500).json({ 
      error: 'Failed to create payment',
      details: error.message,
      code: error.code
    });
  }
});

app.get('/api/payments', async (req, res) => {
  try {
    const result = await query('SELECT * FROM payments ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Daybook API endpoints - IMPORTANT: Specific routes must come before parameterized routes

// Get daybook summary for a specific date (used by reception page)
app.get('/api/daybook/summary', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const summaryResult = await query(`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'opening_balance'), 0)::numeric AS opening_balance,
        COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'closing_balance'), 0)::numeric AS closing_balance,
        COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'cash_payment'),   0)::numeric AS cash_payments,
        COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'card_payment'),   0)::numeric AS card_payments,
        COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'online_payment'), 0)::numeric AS online_payments,
        COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'esewa_payment'),  0)::numeric AS esewa_payments,
        COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'khalti_payment'), 0)::numeric AS khalti_payments,
        COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'fonepay_payment'), 0)::numeric AS fonepay_payments,
        COALESCE(SUM(amount) FILTER (WHERE transaction_type IN ('cash_payment','card_payment','online_payment','esewa_payment','khalti_payment','fonepay_payment')), 0)::numeric AS total_income,
        COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'cash_handover'),  0)::numeric AS cash_handovers,
        COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'cash_returned'),  0)::numeric AS cash_returned,
        COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'cash_in'),        0)::numeric AS cash_in,
        COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'expense'),        0)::numeric AS expenses,
        COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'adjustment'),     0)::numeric AS adjustments,
        COUNT(*) FILTER (WHERE transaction_type IN ('cash_payment','card_payment','online_payment','esewa_payment','khalti_payment','fonepay_payment'))::int AS transaction_count,
        COUNT(*)::int AS total_entries
      FROM daybook_transactions
      WHERE transaction_date = $1
    `, [targetDate]);

    const s = summaryResult.rows[0];
    const f = (k) => parseFloat(s[k] || 0);
    const total_sales = f('cash_payments') + f('card_payments') + f('online_payments') + f('esewa_payments') + f('khalti_payments') + f('fonepay_payments');
    // Standard cash drawer formula:
    // expected_cash = opening + cash_sales + cash_in - cash_handovers - cash_returned - expenses + adjustments
    const expected_closing =
      f('opening_balance') + f('cash_payments') + f('cash_in')
      - f('cash_handovers') - f('cash_returned') - f('expenses') + f('adjustments');

    res.json({
      data: {
        ...s,
        total_sales,
        calculated_closing_balance: expected_closing,
        expected_closing,
      }
    });
  } catch (error) {
    console.error('❌ Error fetching daybook summary:', error);
    res.status(500).json({ error: 'Failed to fetch daybook summary', details: error.message });
  }
});

// Sync missing payments to daybook (manual sync endpoint)
app.post('/api/daybook/sync-payments', authenticateToken, async (req, res) => {
  try {
    const { date } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    console.log(`🔄 Syncing payments to daybook for date: ${targetDate}`);
    
    // First, ensure database constraint allows QR payment methods
    try {
      await query(`
        ALTER TABLE daybook_transactions 
        DROP CONSTRAINT IF EXISTS daybook_transactions_payment_method_check
      `);
      await query(`
        ALTER TABLE daybook_transactions 
        ADD CONSTRAINT daybook_transactions_payment_method_check 
        CHECK (payment_method IN ('cash', 'card', 'online', 'esewa', 'khalti', 'fonepay') OR payment_method IS NULL)
      `);
      
      await query(`
        ALTER TABLE daybook_transactions 
        DROP CONSTRAINT IF EXISTS daybook_transactions_transaction_type_check
      `);
      await query(`
        ALTER TABLE daybook_transactions 
        ADD CONSTRAINT daybook_transactions_transaction_type_check 
        CHECK (transaction_type IN (
          'opening_balance', 'closing_balance', 'cash_payment', 'card_payment', 'online_payment',
          'esewa_payment', 'khalti_payment', 'fonepay_payment',
          'cash_in', 'cash_handover', 'cash_returned', 'expense', 'adjustment', 'day_reopened'
        ))
      `);
      console.log('✅ Database constraint updated for QR payments');
    } catch (constraintError) {
      console.log('⚠️ Constraint already updated:', constraintError.message);
    }
    
    // Get all paid orders for the date that are not in daybook
    const missingPayments = await query(`
      SELECT o.id, o.payment_method, o.payment_status, o.total, o.created_at
      FROM orders o
      LEFT JOIN daybook_transactions dt ON dt.order_id = o.id
      WHERE o.payment_status = 'paid'
        AND o.created_at::date = $1::date
        AND dt.id IS NULL
      ORDER BY o.created_at
    `, [targetDate]);
    
    let syncedCount = 0;
    let syncedAmount = 0;
    
    for (const order of missingPayments.rows) {
      // Map payment method to transaction type
      let transactionType;
      switch(order.payment_method) {
        case 'cash':
          transactionType = 'cash_payment';
          break;
        case 'card':
          transactionType = 'card_payment';
          break;
        case 'esewa':
          transactionType = 'esewa_payment';
          break;
        case 'khalti':
          transactionType = 'khalti_payment';
          break;
        case 'fonepay':
          transactionType = 'fonepay_payment';
          break;
        default:
          transactionType = 'online_payment';
      }
      
      await query(`
        INSERT INTO daybook_transactions (
          transaction_date, transaction_type, category, amount, description, order_id, payment_method, created_at
        )
        VALUES (DATE($1), $2, 'sales', $3, $4, $5, $6, $7)
      `, [
        order.created_at,
        transactionType,
        order.total,
        `${order.payment_method.toUpperCase()} payment - Order #${order.id} (synced)`,
        order.id,
        order.payment_method,
        order.created_at
      ]);
      
      syncedCount++;
      syncedAmount += parseFloat(order.total);
      console.log(`  ✅ Synced Order #${order.id}: ${transactionType} NPR ${parseFloat(order.total).toLocaleString()}`);
    }
    
    // Also fix any existing transactions with wrong types
    await query(`
      UPDATE daybook_transactions
      SET transaction_type = 'esewa_payment'
      WHERE payment_method = 'esewa' AND transaction_type != 'esewa_payment'
    `);
    await query(`
      UPDATE daybook_transactions
      SET transaction_type = 'khalti_payment'
      WHERE payment_method = 'khalti' AND transaction_type != 'khalti_payment'
    `);
    await query(`
      UPDATE daybook_transactions
      SET transaction_type = 'fonepay_payment'
      WHERE payment_method = 'fonepay' AND transaction_type != 'fonepay_payment'
    `);
    console.log('✅ Fixed existing transaction types');
    
    res.json({
      success: true,
      message: `Synced ${syncedCount} payments`,
      synced_count: syncedCount,
      synced_amount: syncedAmount
    });
  } catch (error) {
    console.error('❌ Error syncing payments:', error);
    res.status(500).json({ error: 'Failed to sync payments', details: error.message });
  }
});

// Add QR payment methods to constraint (one-time migration endpoint)
app.post('/api/daybook/add-qr-payment-constraint', authenticateToken, async (req, res) => {
  try {
    console.log('🔧 Adding QR payment methods to database constraints...');
    
    // Drop the old constraint
    await query(`
      ALTER TABLE daybook_transactions 
      DROP CONSTRAINT IF EXISTS daybook_transactions_payment_method_check
    `);
    
    // Add new constraint with QR payment methods
    await query(`
      ALTER TABLE daybook_transactions 
      ADD CONSTRAINT daybook_transactions_payment_method_check 
      CHECK (payment_method IN ('cash', 'card', 'online', 'esewa', 'khalti', 'fonepay') OR payment_method IS NULL)
    `);
    
    console.log('✅ Successfully updated database constraints!');
    
    res.json({
      success: true,
      message: 'QR payment methods added to constraint'
    });
  } catch (error) {
    console.error('❌ Error updating constraints:', error);
    res.status(500).json({ error: 'Failed to update constraints', details: error.message });
  }
});

// Fix QR payment transaction types (one-time migration endpoint)
app.post('/api/daybook/fix-qr-payment-types', authenticateToken, async (req, res) => {
  try {
    console.log('🔧 Fixing QR payment transaction types...');
    
    // Update esewa payments
    const esewaResult = await query(`
      UPDATE daybook_transactions
      SET transaction_type = 'esewa_payment'
      WHERE payment_method = 'esewa'
        AND transaction_type != 'esewa_payment'
      RETURNING id, order_id, payment_method
    `);
    
    // Update khalti payments
    const khaltiResult = await query(`
      UPDATE daybook_transactions
      SET transaction_type = 'khalti_payment'
      WHERE payment_method = 'khalti'
        AND transaction_type != 'khalti_payment'
      RETURNING id, order_id, payment_method
    `);
    
    // Update fonepay payments
    const fonepayResult = await query(`
      UPDATE daybook_transactions
      SET transaction_type = 'fonepay_payment'
      WHERE payment_method = 'fonepay'
        AND transaction_type != 'fonepay_payment'
      RETURNING id, order_id, payment_method
    `);
    
    const totalFixed = esewaResult.rowCount + khaltiResult.rowCount + fonepayResult.rowCount;
    
    console.log(`✅ Fixed ${esewaResult.rowCount} eSewa, ${khaltiResult.rowCount} Khalti, ${fonepayResult.rowCount} Fonepay transactions`);
    
    res.json({
      success: true,
      message: `Fixed ${totalFixed} transactions`,
      fixed: {
        esewa: esewaResult.rowCount,
        khalti: khaltiResult.rowCount,
        fonepay: fonepayResult.rowCount,
        total: totalFixed
      }
    });
  } catch (error) {
    console.error('❌ Error fixing payment types:', error);
    res.status(500).json({ error: 'Failed to fix payment types', details: error.message });
  }
});

// Download daybook data as CSV
app.get('/api/daybook/download', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const startDate = start_date || new Date().toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];
    
    console.log(`📥 Downloading daybook data from ${startDate} to ${endDate}`);
    
    // Get all transactions for the date range
    const transactions = await query(`
      SELECT 
        transaction_date,
        transaction_type,
        category,
        amount,
        description,
        order_id,
        created_at
      FROM daybook_transactions 
      WHERE transaction_date BETWEEN $1 AND $2
      ORDER BY transaction_date, created_at
    `, [startDate, endDate]);
    
    // Create CSV content
    let csv = 'Date,Type,Category,Amount,Description,Order ID,Created At\n';
    
    transactions.rows.forEach(row => {
      csv += `${row.transaction_date},${row.transaction_type},${row.category || 'N/A'},${row.amount},"${row.description || ''}",${row.order_id || 'N/A'},${row.created_at}\n`;
    });
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=daybook_${startDate}_to_${endDate}.csv`);
    res.send(csv);
    
    console.log(`✅ Downloaded ${transactions.rows.length} transactions`);
  } catch (error) {
    console.error('❌ Error downloading daybook:', error);
    res.status(500).json({ error: 'Failed to download daybook', details: error.message });
  }
});

// Get recent transactions for monitoring
app.get('/api/daybook/recent-transactions', async (req, res) => {
  try {
    const { limit = 50, date, type } = req.query;
    const params = [];
    const where = [];
    if (date) { params.push(date); where.push(`transaction_date = $${params.length}`); }
    if (type) { params.push(type); where.push(`transaction_type = $${params.length}`); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    params.push(parseInt(limit, 10) || 50);

    const result = await query(`
      SELECT id, transaction_date, transaction_type, category, amount, description,
             order_id, payment_method, reference_id, created_by, created_at
      FROM daybook_transactions
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT $${params.length}
    `, params);

    res.json({ data: result.rows });
  } catch (error) {
    console.error('❌ Error fetching recent transactions:', error);
    res.status(500).json({ error: 'Failed to fetch recent transactions', details: error.message });
  }
});

// Delete a daybook transaction (admin)
app.delete('/api/daybook/transaction/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { rowCount } = await query('DELETE FROM daybook_transactions WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting daybook transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction', details: error.message });
  }
});

app.post('/api/daybook/transaction', authenticateToken, async (req, res) => {
  try {
    const {
      transaction_type, amount, description, category,
      date, order_id, payment_method, reference,
    } = req.body || {};

    if (!transaction_type || amount === undefined || amount === null) {
      return res.status(400).json({ error: 'transaction_type and amount are required' });
    }

    const txDate = date ? String(date).split('T')[0] : new Date().toISOString().split('T')[0];

    const result = await query(`
      INSERT INTO daybook_transactions
        (transaction_date, transaction_type, category, amount, description, order_id, payment_method, reference_id, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
    `, [
      txDate,
      transaction_type,
      category || 'other',
      Number(amount),
      description || null,
      order_id || null,
      payment_method || null,
      reference || null,
      req.user?.id || null,
    ]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating daybook transaction:', error.message);
    res.status(500).json({ error: 'Failed to create daybook transaction', details: error.message });
  }
});

// Record cash handover transaction
app.post('/api/daybook/handover', authenticateToken, async (req, res) => {
  try {
    const { recipient, amount, reason, date } = req.body || {};
    if (!recipient || !amount) {
      return res.status(400).json({ error: 'recipient and amount are required' });
    }
    const txDate = date ? String(date).split('T')[0] : new Date().toISOString().split('T')[0];
    const description = `Cash handover to ${recipient}${reason ? ' - ' + reason : ''}`;

    const result = await query(`
      INSERT INTO daybook_transactions
        (transaction_date, transaction_type, category, amount, description, created_by, created_at)
      VALUES ($1, 'cash_handover', 'cash_drawer', $2, $3, $4, NOW())
      RETURNING *
    `, [txDate, Number(amount), description, req.user?.id || null]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating handover transaction:', error.message);
    res.status(500).json({ error: 'Failed to create daybook transaction', details: error.message });
  }
});

app.put('/api/daybook/opening-balance', authenticateToken, async (req, res) => {
  try {
    const { date, opening_balance, amount } = req.body || {};
    const targetDate = date ? String(date).split('T')[0] : new Date().toISOString().split('T')[0];
    const value = Number(opening_balance ?? amount ?? 0);

    // Delete any existing opening_balance for this day, then insert fresh.
    await query(`
      DELETE FROM daybook_transactions
      WHERE transaction_type = 'opening_balance' AND transaction_date = $1
    `, [targetDate]);

    const result = await query(`
      INSERT INTO daybook_transactions
        (transaction_date, transaction_type, category, amount, description, created_by, created_at)
      VALUES ($1, 'opening_balance', 'cash_drawer', $2, $3, $4, NOW())
      RETURNING *
    `, [targetDate, value, `Opening balance for ${targetDate}`, req.user?.id || null]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating opening balance:', error.message);
    res.status(500).json({ error: 'Failed to update opening balance', details: error.message });
  }
});

// Back-compat: frontend calls POST /api/daybook/opening-balance — accept it too.
app.post('/api/daybook/opening-balance', authenticateToken, async (req, res) => {
  try {
    const { date, opening_balance, amount } = req.body || {};
    const targetDate = date ? String(date).split('T')[0] : new Date().toISOString().split('T')[0];
    const value = Number(opening_balance ?? amount ?? 0);
    await query(`
      DELETE FROM daybook_transactions
      WHERE transaction_type = 'opening_balance' AND transaction_date = $1
    `, [targetDate]);
    const result = await query(`
      INSERT INTO daybook_transactions
        (transaction_date, transaction_type, category, amount, description, created_by, created_at)
      VALUES ($1, 'opening_balance', 'cash_drawer', $2, $3, $4, NOW())
      RETURNING *
    `, [targetDate, value, `Opening balance for ${targetDate}`, req.user?.username || null]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error (POST) opening-balance:', error.message);
    res.status(500).json({ error: 'Failed to update opening balance', details: error.message });
  }
});

// Get daybook data for a specific date - MUST come after specific routes
app.get('/api/daybook/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    // Get daybook summary for the date with proper calculations
    const summaryResult = await query(`
      SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'opening_balance' THEN amount ELSE 0 END), 0) as opening_balance,
        COALESCE(SUM(CASE WHEN transaction_type = 'cash_payment' THEN amount ELSE 0 END), 0) as cash_payments,
        COALESCE(SUM(CASE WHEN transaction_type = 'card_payment' THEN amount ELSE 0 END), 0) as card_payments,
        COALESCE(SUM(CASE WHEN transaction_type = 'online_payment' THEN amount ELSE 0 END), 0) as online_payments,
        COALESCE(SUM(CASE WHEN transaction_type = 'esewa_payment' THEN amount ELSE 0 END), 0) as esewa_payments,
        COALESCE(SUM(CASE WHEN transaction_type = 'khalti_payment' THEN amount ELSE 0 END), 0) as khalti_payments,
        COALESCE(SUM(CASE WHEN transaction_type = 'fonepay_payment' THEN amount ELSE 0 END), 0) as fonepay_payments,
        COALESCE(SUM(CASE WHEN transaction_type = 'cash_returned' THEN amount ELSE 0 END), 0) as cash_returned,
        COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) as expenses,
        COALESCE(SUM(CASE WHEN transaction_type = 'closing_balance' THEN amount ELSE 0 END), 0) as recorded_closing_balance
      FROM daybook_transactions 
      WHERE transaction_date = $1
    `, [date]);
    
    const summary = summaryResult.rows[0] || {
      opening_balance: 0,
      cash_payments: 0,
      card_payments: 0,
      online_payments: 0,
      esewa_payments: 0,
      khalti_payments: 0,
      fonepay_payments: 0,
      cash_returned: 0,
      expenses: 0,
      recorded_closing_balance: 0
    };
    
    // Calculate totals according to your formula:
    // Opening Balance + Total Cash Sales - Cash Returned - Expenses = Closing Balance
    // Total Sales = Total Cash Sales + Total Card Sales + Total Online Payment Sales
    const total_sales = parseFloat(summary.cash_payments) + 
                       parseFloat(summary.card_payments) + 
                       parseFloat(summary.online_payments);
    
    const calculated_closing_balance = parseFloat(summary.opening_balance) + 
                                     parseFloat(summary.cash_payments) - 
                                     parseFloat(summary.cash_returned) - 
                                     parseFloat(summary.expenses);
    
    // Get all transactions for the date
    const transactionsResult = await query(`
      SELECT * FROM daybook_transactions 
      WHERE transaction_date = $1 
      ORDER BY created_at DESC
    `, [date]);

    res.json({
      summary: {
        ...summary,
        total_sales,
        calculated_closing_balance,
        // Include both recorded and calculated closing balance
        closing_balance: summary.recorded_closing_balance || calculated_closing_balance
      },
      transactions: transactionsResult.rows
    });
  } catch (error) {
    console.error('Error fetching daybook data:', error);
    res.status(500).json({ error: 'Failed to fetch daybook data' });
  }
});

// Day Close API endpoint - Close the current day and prepare for next day
app.post('/api/daybook/close-day', async (req, res) => {
  try {
    const { closing_balance, cash_count, notes, date } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    console.log('🔒 Day close requested for:', targetDate);
    
    // Safety check: Prevent rapid consecutive operations (within 5 seconds)
    const recentOperations = await query(`
      SELECT created_at FROM daybook_transactions 
      WHERE transaction_type IN ('closing_balance', 'day_reopened')
      AND transaction_date = $1
      AND created_at > NOW() - INTERVAL '5 seconds'
      ORDER BY created_at DESC
      LIMIT 1
    `, [targetDate]);
    
    if (recentOperations.rows.length > 0) {
      return res.status(429).json({ 
        error: 'Operation too frequent', 
        message: 'Please wait 5 seconds between day close/open operations to prevent accidental actions.' 
      });
    }
    
    // Check if day is already closed
    const existingClose = await query(`
      SELECT id FROM daybook_transactions 
      WHERE transaction_type = 'closing_balance' 
      AND transaction_date = $1
    `, [targetDate]);
    
    if (existingClose.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Day already closed', 
        message: 'This day has already been closed. Cannot close again.' 
      });
    }
    
    // Get current day summary
    const summaryResult = await query(`
      SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'opening_balance' THEN amount ELSE 0 END), 0) as opening_balance,
        COALESCE(SUM(CASE WHEN transaction_type = 'cash_payment' THEN amount ELSE 0 END), 0) as cash_payments,
        COALESCE(SUM(CASE WHEN transaction_type = 'card_payment' THEN amount ELSE 0 END), 0) as card_payments,
        COALESCE(SUM(CASE WHEN transaction_type = 'online_payment' THEN amount ELSE 0 END), 0) as online_payments,
        COALESCE(SUM(CASE WHEN transaction_type = 'esewa_payment' THEN amount ELSE 0 END), 0) as esewa_payments,
        COALESCE(SUM(CASE WHEN transaction_type = 'khalti_payment' THEN amount ELSE 0 END), 0) as khalti_payments,
        COALESCE(SUM(CASE WHEN transaction_type = 'fonepay_payment' THEN amount ELSE 0 END), 0) as fonepay_payments,
        COALESCE(SUM(CASE WHEN transaction_type = 'cash_handover' THEN amount ELSE 0 END), 0) as cash_handovers,
        COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) as expenses,
        COUNT(DISTINCT order_id) as total_orders
      FROM daybook_transactions 
      WHERE transaction_date = $1
    `, [targetDate]);
    
    const summary = summaryResult.rows[0];
    
    // Calculate expected closing balance
    const expected_closing = parseFloat(summary.opening_balance) + 
                           parseFloat(summary.cash_payments) - 
                           parseFloat(summary.cash_handovers) - 
                           parseFloat(summary.expenses);
    
    const actual_closing = parseFloat(closing_balance || 0);
    const variance = actual_closing - expected_closing;
    
    // Record closing balance transaction
    const closingDescription = `Day close - Expected: Rs.${expected_closing.toFixed(2)}, Actual: Rs.${actual_closing.toFixed(2)}, Variance: Rs.${variance.toFixed(2)}${cash_count ? `, Cash count: ${cash_count}` : ''}${notes ? `, Notes: ${notes}` : ''}`;
    
    await query(`
      INSERT INTO daybook_transactions (transaction_date, transaction_type, category, amount, description, created_at)
      VALUES ($1, 'closing_balance', 'daily_operations', $2, $3, $4)
    `, [targetDate, actual_closing, closingDescription, new Date()]);
    
    // Create opening balance for next day (if variance exists, carry it forward)
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];
    
    // Check if next day opening balance already exists
    const nextDayOpening = await query(`
      SELECT id FROM daybook_transactions 
      WHERE transaction_type = 'opening_balance' 
      AND transaction_date = $1
    `, [nextDayStr]);
    
    if (nextDayOpening.rows.length === 0) {
      await query(`
        INSERT INTO daybook_transactions (transaction_date, transaction_type, category, amount, description, created_at)
        VALUES ($1, 'opening_balance', 'daily_operations', $2, $3, $4)
      `, [nextDayStr, actual_closing, `Opening balance carried forward from ${targetDate}`, nextDay]);
      
      console.log(`✅ Next day opening balance set: Rs.${actual_closing.toFixed(2)}`);
    }
    
    // Generate daily report
    const dailyReport = {
      date: targetDate,
      opening_balance: parseFloat(summary.opening_balance),
      cash_sales: parseFloat(summary.cash_payments),
      card_sales: parseFloat(summary.card_payments),
      online_sales: parseFloat(summary.online_payments),
      esewa_sales: parseFloat(summary.esewa_payments || 0),
      khalti_sales: parseFloat(summary.khalti_payments || 0),
      fonepay_sales: parseFloat(summary.fonepay_payments || 0),
      total_sales: parseFloat(summary.cash_payments) + parseFloat(summary.card_payments) + parseFloat(summary.online_payments) + parseFloat(summary.esewa_payments || 0) + parseFloat(summary.khalti_payments || 0) + parseFloat(summary.fonepay_payments || 0),
      cash_handovers: parseFloat(summary.cash_handovers),
      expenses: parseFloat(summary.expenses),
      expected_closing: expected_closing,
      actual_closing: actual_closing,
      variance: variance,
      total_orders: parseInt(summary.total_orders),
      status: 'closed',
      closed_at: new Date().toISOString(),
      notes: notes || ''
    };
    
    console.log('✅ Day closed successfully:', dailyReport);
    
    const response = {
      success: true,
      message: 'Day closed successfully',
      report: dailyReport
    };
    
    console.log('📤 Sending Day Close response:', response);
    res.json(response);
    
  } catch (error) {
    console.error('❌ Error closing day:', error);
    res.status(500).json({ 
      error: 'Failed to close day', 
      details: error.message 
    });
  }
});

// Get day status (open/closed)
app.get('/api/daybook/day-status/:date?', async (req, res) => {
  try {
    const targetDate = req.params.date || new Date().toISOString().split('T')[0];
    
    const closingCheck = await query(`
      SELECT id, amount, description, created_at 
      FROM daybook_transactions 
      WHERE transaction_type = 'closing_balance' 
      AND transaction_date = $1
    `, [targetDate]);
    
    const openingCheck = await query(`
      SELECT id, amount, description, created_at 
      FROM daybook_transactions 
      WHERE transaction_type = 'opening_balance' 
      AND transaction_date = $1
    `, [targetDate]);
    
    const isClosed = closingCheck.rows.length > 0;
    const hasOpening = openingCheck.rows.length > 0;
    
    res.json({
      date: targetDate,
      status: isClosed ? 'closed' : 'open',
      is_closed: isClosed,
      has_opening: hasOpening,
      closing_info: isClosed ? closingCheck.rows[0] : null,
      opening_info: hasOpening ? openingCheck.rows[0] : null
    });
    
  } catch (error) {
    console.error('❌ Error checking day status:', error);
    res.status(500).json({ error: 'Failed to check day status' });
  }
});

// Open Day API endpoint - Reopen a closed day for additional transactions
app.post('/api/daybook/open-day', async (req, res) => {
  try {
    const { date, reason } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    console.log('🔓 Day open requested for:', targetDate);
    
    // Safety check: Temporarily disabled for testing
    // const recentOperations = await query(`
    //   SELECT created_at FROM daybook_transactions 
    //   WHERE transaction_type IN ('closing_balance', 'day_reopened')
    //   AND transaction_date = $1
    //   AND created_at > NOW() - INTERVAL '5 seconds'
    //   ORDER BY created_at DESC
    //   LIMIT 1
    // `, [targetDate]);
    
    // if (recentOperations.rows.length > 0) {
    //   return res.status(429).json({ 
    //     error: 'Operation too frequent', 
    //     message: 'Please wait 5 seconds between day close/open operations to prevent accidental actions.' 
    //   });
    // }
    
    // Check if day is actually closed
    const existingClose = await query(`
      SELECT id, amount, description FROM daybook_transactions 
      WHERE transaction_type = 'closing_balance' 
      AND transaction_date = $1
    `, [targetDate]);
    
    if (existingClose.rows.length === 0) {
      return res.status(400).json({ 
        error: 'Day not closed', 
        message: 'This day is not closed yet. No need to reopen.' 
      });
    }
    
    const closingInfo = existingClose.rows[0];
    
    // Record day reopening transaction
    const reopenDescription = `Day reopened - Previous closing: Rs.${parseFloat(closingInfo.amount).toFixed(2)}${reason ? `, Reason: ${reason}` : ''}, Reopened at: ${new Date().toLocaleString()}`;
    
    await query(`
      INSERT INTO daybook_transactions (transaction_date, transaction_type, category, amount, description, created_at)
      VALUES ($1, 'day_reopened', 'daily_operations', $2, $3, $4)
    `, [targetDate, parseFloat(closingInfo.amount), reopenDescription, new Date()]);
    
    // Remove the closing balance record to "unclosed" the day
    await query(`
      DELETE FROM daybook_transactions 
      WHERE transaction_type = 'closing_balance' 
      AND transaction_date = $1
    `, [targetDate]);
    
    // Also remove next day's opening balance if it exists (will be recreated when day is closed again)
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];
    
    await query(`
      DELETE FROM daybook_transactions 
      WHERE transaction_type = 'opening_balance' 
      AND transaction_date = $1
      AND description LIKE '%carried forward from ${targetDate}%'
    `, [nextDayStr]);
    
    console.log('✅ Day reopened successfully:', targetDate);
    
    const response = {
      success: true,
      message: 'Day reopened successfully',
      reopened_date: targetDate,
      previous_closing: parseFloat(closingInfo.amount),
      reopened_at: new Date().toISOString()
    };
    
    console.log('📤 Sending Day Open response:', response);
    res.json(response);
    
  } catch (error) {
    console.error('❌ Error reopening day:', error);
    res.status(500).json({ 
      error: 'Failed to reopen day', 
      details: error.message 
    });
  }
});

// Catch-all handler for React routing in production (must be before error handlers)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    // Only serve index.html for non-API routes
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
      res.status(404).json({ error: 'API endpoint not found' });
    }
  });
}

// ============ TABLE CALLS ENDPOINTS ============

// Create a table call (from client/table)
app.post('/api/table-calls', async (req, res) => {
  try {
    const { tableId, reason = 'Service' } = req.body;
    
    // Get dynamic table count from settings
    const tableCountResult = await query(
      `SELECT setting_value FROM restaurant_settings WHERE setting_key = 'table_count'`
    );
    const maxTables = tableCountResult.rows[0]?.setting_value 
      ? parseInt(tableCountResult.rows[0].setting_value) 
      : 25;
    
    if (!tableId || tableId < 1 || tableId > maxTables) {
      return res.status(400).json({ error: 'Invalid table ID' });
    }

    const result = await query(
      `INSERT INTO table_calls (table_id, reason, status) 
       VALUES ($1, $2, 'pending') 
       RETURNING *`,
      [tableId, reason]
    );

    const call = result.rows[0];
    
    // Emit to admin via socket.io
    io.emit('tableCall', {
      id: call.id,
      tableId: call.table_id,
      reason: call.reason,
      status: call.status,
      createdAt: call.created_at
    });

    res.json({ success: true, call });
  } catch (error) {
    console.error('❌ Error creating table call:', error);
    res.status(500).json({ error: 'Failed to create table call' });
  }
});

// Get all pending table calls (for admin)
app.get('/api/table-calls', authenticateToken, requireStaffRole([STAFF_ROLES.MANAGER, STAFF_ROLES.WAITER]), async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM table_calls 
       WHERE status IN ('pending', 'responded') 
       ORDER BY created_at DESC`
    );

    res.json({ success: true, calls: result.rows });
  } catch (error) {
    console.error('❌ Error fetching table calls:', error);
    res.status(500).json({ error: 'Failed to fetch table calls' });
  }
});

// Respond to a table call (mark as responded)
app.put('/api/table-calls/:callId/respond', authenticateToken, requireStaffRole([STAFF_ROLES.MANAGER, STAFF_ROLES.WAITER]), async (req, res) => {
  try {
    const { callId } = req.params;
    
    const result = await query(
      `UPDATE table_calls 
       SET status = 'responded', responded_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [callId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Call not found' });
    }

    const call = result.rows[0];
    
    // Emit update to all clients
    io.emit('callResponded', {
      id: call.id,
      tableId: call.table_id,
      status: call.status
    });

    res.json({ success: true, call });
  } catch (error) {
    console.error('❌ Error responding to call:', error);
    res.status(500).json({ error: 'Failed to respond to call' });
  }
});

// Resolve a table call (mark as resolved)
app.put('/api/table-calls/:callId/resolve', authenticateToken, requireStaffRole([STAFF_ROLES.MANAGER, STAFF_ROLES.WAITER]), async (req, res) => {
  try {
    const { callId } = req.params;
    const { notes } = req.body;
    
    const result = await query(
      `UPDATE table_calls 
       SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, notes = $2 
       WHERE id = $1 
       RETURNING *`,
      [callId, notes || null]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Call not found' });
    }

    const call = result.rows[0];
    
    // Emit update to all clients
    io.emit('callResolved', {
      id: call.id,
      tableId: call.table_id,
      status: call.status
    });

    res.json({ success: true, call });
  } catch (error) {
    console.error('❌ Error resolving call:', error);
    res.status(500).json({ error: 'Failed to resolve call' });
  }
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(globalErrorHandler);

const PORT = process.env.PORT || 3000;

// Initialize settings cache before starting server
settingsLoader.refresh().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Restaurant Backend Server running on port ${PORT}`);
    console.log(`📍 Health check available at: http://localhost:${PORT}/health`);
    console.log(`🌐 API endpoints available at: http://localhost:${PORT}/api/`);
  });
}).catch(err => {
  console.error('❌ Failed to initialize settings:', err);
  process.exit(1);
});
