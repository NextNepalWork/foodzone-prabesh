const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const newMenu = [
  // MOMO
  { name: 'Veg Steam Momo', category: 'MOMO', price: 120, description: 'Steamed vegetable dumplings', is_vegetarian: true },
  { name: 'Veg Fried Momo', category: 'MOMO', price: 140, description: 'Fried vegetable dumplings', is_vegetarian: true },
  { name: 'Veg Jhol Momo', category: 'MOMO', price: 150, description: 'Vegetable dumplings in soup', is_vegetarian: true },
  { name: 'Veg C Momo', category: 'MOMO', price: 160, description: 'Vegetable chili momo', is_vegetarian: true, is_spicy: true },
  { name: 'Veg Kothey Momo', category: 'MOMO', price: 150, description: 'Pan-fried vegetable dumplings', is_vegetarian: true },
  { name: 'Chicken Steam Momo', category: 'MOMO', price: 140, description: 'Steamed chicken dumplings' },
  { name: 'Chicken Fried Momo', category: 'MOMO', price: 160, description: 'Fried chicken dumplings' },
  { name: 'Chicken Jhol Momo', category: 'MOMO', price: 170, description: 'Chicken dumplings in soup' },
  { name: 'Chicken C Momo', category: 'MOMO', price: 180, description: 'Chicken chili momo', is_spicy: true },
  { name: 'Chicken Kothey Momo', category: 'MOMO', price: 170, description: 'Pan-fried chicken dumplings' },
  { name: 'Buff Steam Momo', category: 'MOMO', price: 140, description: 'Steamed buffalo dumplings' },
  { name: 'Buff Fried Momo', category: 'MOMO', price: 160, description: 'Fried buffalo dumplings' },
  { name: 'Buff Jhol Momo', category: 'MOMO', price: 170, description: 'Buffalo dumplings in soup' },
  { name: 'Buff C Momo', category: 'MOMO', price: 180, description: 'Buffalo chili momo', is_spicy: true },
  { name: 'Buff Kothey Momo', category: 'MOMO', price: 170, description: 'Pan-fried buffalo dumplings' },

  // CHOWMEIN
  { name: 'Veg Chowmein', category: 'CHOWMEIN', price: 120, description: 'Stir-fried vegetable noodles', is_vegetarian: true },
  { name: 'Egg Chowmein', category: 'CHOWMEIN', price: 140, description: 'Stir-fried noodles with egg' },
  { name: 'Chicken Chowmein', category: 'CHOWMEIN', price: 160, description: 'Stir-fried noodles with chicken' },
  { name: 'Buff Chowmein', category: 'CHOWMEIN', price: 160, description: 'Stir-fried noodles with buffalo' },
  { name: 'Mixed Chowmein', category: 'CHOWMEIN', price: 180, description: 'Stir-fried noodles with mixed meat' },

  // THUKPA
  { name: 'Veg Thukpa', category: 'THUKPA', price: 130, description: 'Vegetable noodle soup', is_vegetarian: true },
  { name: 'Egg Thukpa', category: 'THUKPA', price: 150, description: 'Noodle soup with egg' },
  { name: 'Chicken Thukpa', category: 'THUKPA', price: 170, description: 'Noodle soup with chicken' },
  { name: 'Buff Thukpa', category: 'THUKPA', price: 170, description: 'Noodle soup with buffalo' },
  { name: 'Mixed Thukpa', category: 'THUKPA', price: 190, description: 'Noodle soup with mixed meat' },

  // SOUP
  { name: 'Veg Soup', category: 'SOUP', price: 100, description: 'Vegetable soup', is_vegetarian: true },
  { name: 'Chicken Soup', category: 'SOUP', price: 120, description: 'Chicken soup' },
  { name: 'Mushroom Soup', category: 'SOUP', price: 130, description: 'Creamy mushroom soup', is_vegetarian: true },
  { name: 'Hot & Sour Soup', category: 'SOUP', price: 120, description: 'Spicy and tangy soup', is_spicy: true },

  // FRIED RICE
  { name: 'Veg Fried Rice', category: 'FRIED RICE', price: 130, description: 'Stir-fried rice with vegetables', is_vegetarian: true },
  { name: 'Egg Fried Rice', category: 'FRIED RICE', price: 150, description: 'Stir-fried rice with egg' },
  { name: 'Chicken Fried Rice', category: 'FRIED RICE', price: 170, description: 'Stir-fried rice with chicken' },
  { name: 'Buff Fried Rice', category: 'FRIED RICE', price: 170, description: 'Stir-fried rice with buffalo' },
  { name: 'Mixed Fried Rice', category: 'FRIED RICE', price: 190, description: 'Stir-fried rice with mixed meat' },

  // BIRYANI
  { name: 'Veg Biryani', category: 'BIRYANI', price: 150, description: 'Aromatic vegetable rice', is_vegetarian: true },
  { name: 'Egg Biryani', category: 'BIRYANI', price: 170, description: 'Aromatic rice with boiled egg' },
  { name: 'Chicken Biryani', category: 'BIRYANI', price: 200, description: 'Aromatic rice with chicken' },
  { name: 'Buff Biryani', category: 'BIRYANI', price: 200, description: 'Aromatic rice with buffalo' },
  { name: 'Mutton Biryani', category: 'BIRYANI', price: 250, description: 'Aromatic rice with mutton' },

  // PIZZA
  { name: 'Margherita Pizza', category: 'PIZZA', price: 250, description: 'Classic tomato and cheese pizza', is_vegetarian: true },
  { name: 'Veg Pizza', category: 'PIZZA', price: 280, description: 'Pizza with assorted vegetables', is_vegetarian: true },
  { name: 'Chicken Pizza', category: 'PIZZA', price: 320, description: 'Pizza with chicken toppings' },
  { name: 'Pepperoni Pizza', category: 'PIZZA', price: 350, description: 'Pizza with pepperoni' },
  { name: 'BBQ Chicken Pizza', category: 'PIZZA', price: 340, description: 'Pizza with BBQ chicken' },

  // BURGER
  { name: 'Veg Burger', category: 'BURGER', price: 120, description: 'Vegetable patty burger', is_vegetarian: true },
  { name: 'Chicken Burger', category: 'BURGER', price: 150, description: 'Chicken patty burger' },
  { name: 'Buff Burger', category: 'BURGER', price: 150, description: 'Buffalo patty burger' },
  { name: 'Cheese Burger', category: 'BURGER', price: 170, description: 'Burger with extra cheese' },
  { name: 'Double Patty Burger', category: 'BURGER', price: 200, description: 'Burger with double patty' },

  // SANDWICH
  { name: 'Veg Sandwich', category: 'SANDWICH', price: 100, description: 'Vegetable sandwich', is_vegetarian: true },
  { name: 'Chicken Sandwich', category: 'SANDWICH', price: 130, description: 'Chicken sandwich' },
  { name: 'Egg Sandwich', category: 'SANDWICH', price: 110, description: 'Egg sandwich' },
  { name: 'Club Sandwich', category: 'SANDWICH', price: 160, description: 'Triple-decker sandwich' },
  { name: 'Grilled Sandwich', category: 'SANDWICH', price: 120, description: 'Grilled vegetable sandwich', is_vegetarian: true },

  // DRINKS
  { name: 'Coke', category: 'DRINKS', price: 60, description: 'Coca-Cola', is_vegetarian: true },
  { name: 'Sprite', category: 'DRINKS', price: 60, description: 'Lemon-lime soda', is_vegetarian: true },
  { name: 'Fanta', category: 'DRINKS', price: 60, description: 'Orange soda', is_vegetarian: true },
  { name: 'Mineral Water', category: 'DRINKS', price: 40, description: 'Bottled water', is_vegetarian: true },
  { name: 'Fresh Lime Soda', category: 'DRINKS', price: 80, description: 'Fresh lime with soda', is_vegetarian: true },
  { name: 'Mango Juice', category: 'DRINKS', price: 100, description: 'Fresh mango juice', is_vegetarian: true },
  { name: 'Orange Juice', category: 'DRINKS', price: 100, description: 'Fresh orange juice', is_vegetarian: true },
  { name: 'Apple Juice', category: 'DRINKS', price: 100, description: 'Fresh apple juice', is_vegetarian: true },
  { name: 'Lassi', category: 'DRINKS', price: 80, description: 'Traditional yogurt drink', is_vegetarian: true },
  { name: 'Tea', category: 'DRINKS', price: 30, description: 'Hot tea', is_vegetarian: true },
  { name: 'Coffee', category: 'DRINKS', price: 50, description: 'Hot coffee', is_vegetarian: true },
];

async function replaceMenu() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️ Starting menu replacement...');
    
    // Start transaction
    await client.query('BEGIN');
    
    // Delete all existing menu items
    const deleteResult = await client.query('DELETE FROM menu_items');
    console.log(`✅ Deleted ${deleteResult.rowCount} old menu items`);
    
    // Insert new menu items
    let insertedCount = 0;
    for (const item of newMenu) {
      await client.query(`
        INSERT INTO menu_items (
          name, category, price, description, 
          is_available, is_vegetarian, is_spicy, 
          preparation_time
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        item.name,
        item.category,
        item.price,
        item.description,
        true, // is_available
        item.is_vegetarian || false,
        item.is_spicy || false,
        15 // default preparation time in minutes
      ]);
      insertedCount++;
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log(`✅ Successfully inserted ${insertedCount} new menu items`);
    console.log('✅ Menu replacement completed!');
    
    // Display summary by category
    console.log('\n📊 Menu Summary:');
    const categories = [...new Set(newMenu.map(item => item.category))];
    for (const category of categories) {
      const count = newMenu.filter(item => item.category === category).length;
      console.log(`   ${category}: ${count} items`);
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error replacing menu:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
replaceMenu()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
