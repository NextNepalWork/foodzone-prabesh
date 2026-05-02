const { query } = require('./database/config');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function seedData() {
  try {
    console.log('🌱 Seeding test data...\n');
    
    // Check if we have any orders
    const orderCheck = await query('SELECT COUNT(*) as count FROM orders');
    const orderCount = parseInt(orderCheck.rows[0].count);
    console.log(`📊 Current orders: ${orderCount}`);
    
    if (orderCount === 0) {
      console.log('⚠️  No orders found. Reports will be empty.');
      console.log('💡 Tip: Create some orders through the POS system first.');
    }
    
    // Check menu items
    const menuCheck = await query('SELECT COUNT(*) as count FROM menu_items');
    const menuCount = parseInt(menuCheck.rows[0].count);
    console.log(`🍽️  Menu items: ${menuCount}`);
    
    // Check customers
    const customerCheck = await query('SELECT COUNT(*) as count FROM customers');
    const customerCount = parseInt(customerCheck.rows[0].count);
    console.log(`👥 Customers: ${customerCount}`);
    
    // Check expenses
    const expenseCheck = await query(`
      SELECT COUNT(*) as count 
      FROM daybook_transactions 
      WHERE transaction_type = 'expense'
    `);
    const expenseCount = parseInt(expenseCheck.rows[0].count);
    console.log(`💸 Expenses: ${expenseCount}`);
    
    // Check ingredients
    const ingredientCheck = await query('SELECT COUNT(*) as count FROM ingredients');
    const ingredientCount = parseInt(ingredientCheck.rows[0].count);
    console.log(`🥕 Ingredients: ${ingredientCount}`);
    
    console.log('\n✅ Database check complete!');
    console.log('\n📝 Summary:');
    console.log(`   - Orders: ${orderCount > 0 ? '✅' : '❌ Empty'}`);
    console.log(`   - Menu: ${menuCount > 0 ? '✅' : '❌ Empty'}`);
    console.log(`   - Customers: ${customerCount > 0 ? '✅' : '⚠️  Optional'}`);
    console.log(`   - Expenses: ${expenseCount > 0 ? '✅' : '⚠️  Optional'}`);
    console.log(`   - Ingredients: ${ingredientCount > 0 ? '✅' : '⚠️  Optional'}`);
    
    if (orderCount === 0) {
      console.log('\n💡 To see reports with data:');
      console.log('   1. Open the POS system');
      console.log('   2. Create some test orders');
      console.log('   3. Mark them as paid');
      console.log('   4. Refresh the reports page');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

seedData();
