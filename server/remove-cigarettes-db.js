// Script to remove cigarette items from database
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function removeCigarettes() {
  try {
    console.log('🔍 Checking for cigarette items...');
    
    // Check what will be deleted
    const checkResult = await pool.query(
      "SELECT id, name, category, price FROM menu_items WHERE LOWER(category) = 'cigarette' ORDER BY id"
    );
    
    if (checkResult.rows.length === 0) {
      console.log('✅ No cigarette items found');
      await pool.end();
      return;
    }
    
    console.log(`\n📋 Found ${checkResult.rows.length} cigarette items:`);
    checkResult.rows.forEach(item => {
      console.log(`  - [${item.id}] ${item.name} (${item.category}) - NPR ${item.price}`);
    });
    
    // Delete cigarette items
    console.log('\n🗑️  Deleting cigarette items...');
    const deleteResult = await pool.query(
      "DELETE FROM menu_items WHERE LOWER(category) = 'cigarette'"
    );
    
    console.log(`✅ Successfully deleted ${deleteResult.rowCount} items`);
    
    // Show remaining categories
    const categoriesResult = await pool.query(
      "SELECT DISTINCT category FROM menu_items ORDER BY category"
    );
    
    console.log(`\n📊 Remaining categories (${categoriesResult.rows.length}):`);
    categoriesResult.rows.forEach(row => {
      console.log(`  - ${row.category}`);
    });
    
    console.log('\n🎉 Done! Refresh your menu page to see the changes.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

removeCigarettes();
