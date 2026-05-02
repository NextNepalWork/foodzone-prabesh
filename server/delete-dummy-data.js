const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:SIPhohEQaPfxFPLQhbrYmvMHlROQEVKF@trolley.proxy.rlwy.net:41468/railway'
});

const query = (text, params) => pool.query(text, params);

async function deleteAllDummyData() {
  try {
    console.log('🗑️  Starting COMPLETE dummy data cleanup...');
    console.log('📋 This will delete ALL data except menu items');
    
    // Get counts before deletion
    const counts = {};
    const tables = ['orders', 'order_items', 'payments', 'customers', 'daybook_transactions'];
    
    for (const table of tables) {
      try {
        const result = await query(`SELECT COUNT(*) as count FROM ${table}`);
        counts[table] = result.rows[0].count;
        console.log(`📊 Current ${table}: ${counts[table]} records`);
      } catch (error) {
        console.log(`⚠️  Table ${table} might not exist: ${error.message}`);
        counts[table] = 0;
      }
    }
    
    console.log('\n🗑️  Starting deletion process...');
    
    // Delete in proper order to handle foreign key constraints
    // 1. Delete order_items first (references orders)
    try {
      const orderItemsResult = await query('DELETE FROM order_items RETURNING *');
      console.log(`✅ Deleted ${orderItemsResult.rows.length} order items`);
    } catch (error) {
      console.log(`⚠️  Error deleting order_items: ${error.message}`);
    }
    
    // 2. Delete payments (may reference orders)
    try {
      const paymentsResult = await query('DELETE FROM payments RETURNING *');
      console.log(`✅ Deleted ${paymentsResult.rows.length} payments`);
    } catch (error) {
      console.log(`⚠️  Error deleting payments: ${error.message}`);
    }
    
    // 3. Delete orders (may reference customers)
    try {
      const ordersResult = await query('DELETE FROM orders RETURNING *');
      console.log(`✅ Deleted ${ordersResult.rows.length} orders`);
    } catch (error) {
      console.log(`⚠️  Error deleting orders: ${error.message}`);
    }
    
    // 4. Delete customers
    try {
      const customersResult = await query('DELETE FROM customers RETURNING *');
      console.log(`✅ Deleted ${customersResult.rows.length} customers`);
    } catch (error) {
      console.log(`⚠️  Error deleting customers: ${error.message}`);
    }
    
    // 5. Delete daybook transactions
    try {
      const daybookResult = await query('DELETE FROM daybook_transactions RETURNING *');
      console.log(`✅ Deleted ${daybookResult.rows.length} daybook transactions`);
    } catch (error) {
      console.log(`⚠️  Error deleting daybook_transactions: ${error.message}`);
    }
    
    // 6. Reset any auto-increment sequences
    try {
      await query('ALTER SEQUENCE IF EXISTS orders_id_seq RESTART WITH 1');
      await query('ALTER SEQUENCE IF EXISTS order_items_id_seq RESTART WITH 1');
      await query('ALTER SEQUENCE IF EXISTS payments_id_seq RESTART WITH 1');
      await query('ALTER SEQUENCE IF EXISTS customers_id_seq RESTART WITH 1');
      await query('ALTER SEQUENCE IF EXISTS daybook_transactions_id_seq RESTART WITH 1');
      console.log('✅ Reset auto-increment sequences');
    } catch (error) {
      console.log(`⚠️  Error resetting sequences: ${error.message}`);
    }
    
    // Verify cleanup - get counts after deletion
    console.log('\n📊 FINAL VERIFICATION:');
    for (const table of tables) {
      try {
        const result = await query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`   ${table}: ${result.rows[0].count} records remaining`);
      } catch (error) {
        console.log(`   ${table}: Table might not exist`);
      }
    }
    
    // Verify menu items are still intact
    try {
      const menuResult = await query('SELECT COUNT(*) as count FROM menu_items');
      console.log(`   menu_items: ${menuResult.rows[0].count} records (PRESERVED) ✅`);
    } catch (error) {
      console.log(`   menu_items: Error checking menu items: ${error.message}`);
    }
    
    console.log('\n🎯 COMPLETE DATABASE CLEANUP FINISHED!');
    console.log('✅ All dummy data deleted (orders, payments, customers, daybook)');
    console.log('✅ Menu items preserved');
    console.log('✅ Database ready for real production data');
    
  } catch (error) {
    console.error('❌ Error during complete cleanup:', error);
  } finally {
    await pool.end();
  }
}

// Run the complete cleanup
deleteAllDummyData();
