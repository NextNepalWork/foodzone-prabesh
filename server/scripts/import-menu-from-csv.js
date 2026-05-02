const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Database configuration - same as server
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 1 // Use only 1 connection for this script
});

async function importMenuFromCSV() {
  const client = await pool.connect();
  
  try {
    console.log('📖 Reading CSV file...');
    const csvPath = path.join(__dirname, 'foodzone-menu.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse CSV
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    
    console.log('🗑️ Starting menu replacement...');
    
    // Start transaction
    await client.query('BEGIN');
    
    // First, update order_items to remove references to old menu items
    const updateOrderItemsResult = await client.query('UPDATE order_items SET menu_item_id = NULL WHERE menu_item_id IS NOT NULL');
    console.log(`✅ Updated ${updateOrderItemsResult.rowCount} order items to remove menu references`);
    
    // Delete all existing menu items
    const deleteResult = await client.query('DELETE FROM menu_items');
    console.log(`✅ Deleted ${deleteResult.rowCount} old menu items`);
    
    // Insert new menu items
    let insertedCount = 0;
    const categoryCount = {};
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',');
      if (values.length < 7) continue;
      
      const [name, category, price, description, is_vegetarian, is_spicy, preparation_time] = values;
      
      await client.query(`
        INSERT INTO menu_items (
          name, category, price, description, 
          is_available, is_vegetarian, is_spicy, 
          preparation_time
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        name,
        category,
        parseFloat(price),
        description,
        true, // is_available
        is_vegetarian === 'true',
        is_spicy === 'true',
        parseInt(preparation_time)
      ]);
      
      insertedCount++;
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    }
    
    // Commit transaction (constraints will be checked at commit time)
    await client.query('COMMIT');
    console.log('✅ Transaction committed successfully');
    
    console.log(`\n✅ Successfully inserted ${insertedCount} new menu items`);
    console.log('✅ Menu replacement completed!');
    
    // Display summary by category
    console.log('\n📊 Menu Summary by Category:');
    const sortedCategories = Object.keys(categoryCount).sort();
    for (const category of sortedCategories) {
      console.log(`   ${category}: ${categoryCount[category]} items`);
    }
    
    console.log(`\n📈 Total Categories: ${sortedCategories.length}`);
    console.log(`📈 Total Items: ${insertedCount}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error importing menu:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
importMenuFromCSV()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    console.log('🔄 Please refresh your admin panel to see the new menu');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
