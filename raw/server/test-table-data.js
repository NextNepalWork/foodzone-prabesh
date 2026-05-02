const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testTableData() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Testing table data retrieval...\n');
    
    // Get active orders with items
    const ordersResult = await client.query(`
      SELECT o.id, o.order_number, o.table_id, o.customer_name, o.customer_phone, o.phone, 
             o.status, o.total, o.total_amount, o.created_at,
             oi.item_name, oi.menu_item_name, oi.quantity, oi.price, oi.subtotal
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.order_type IN ('dine-in', 'dine_in')
      AND o.status IN ('pending', 'preparing', 'ready')
      AND o.table_id IS NOT NULL
      ORDER BY o.table_id, o.created_at
      LIMIT 20
    `);
    
    console.log(`📊 Found ${ordersResult.rows.length} order rows\n`);
    
    if (ordersResult.rows.length === 0) {
      console.log('❌ No active dine-in orders found!');
      console.log('\n💡 To test the table details modal:');
      console.log('   1. Create a new order from the customer menu');
      console.log('   2. Make sure it\'s a dine-in order with a table number');
      console.log('   3. The order should be in pending/preparing/ready status');
      return;
    }
    
    // Show sample data
    console.log('📋 Sample order data:');
    const sampleRow = ordersResult.rows[0];
    console.log('   Order ID:', sampleRow.id);
    console.log('   Order Number:', sampleRow.order_number);
    console.log('   Table ID:', sampleRow.table_id);
    console.log('   Customer:', sampleRow.customer_name);
    console.log('   Status:', sampleRow.status);
    console.log('   Total:', sampleRow.total);
    console.log('   Total Amount:', sampleRow.total_amount);
    console.log('   Item Name:', sampleRow.item_name);
    console.log('   Menu Item Name:', sampleRow.menu_item_name);
    console.log('   Quantity:', sampleRow.quantity);
    console.log('   Price:', sampleRow.price);
    console.log('   Subtotal:', sampleRow.subtotal);
    
    // Group by table
    const ordersByTable = {};
    ordersResult.rows.forEach(row => {
      const tableId = row.table_id;
      if (!tableId) return;
      
      if (!ordersByTable[tableId]) {
        ordersByTable[tableId] = {
          orders: [],
          customer_name: row.customer_name || 'Unknown',
          customer_phone: row.phone || row.customer_phone || '',
          created_at: row.created_at
        };
      }
      
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
    
    // Show grouped data
    console.log('\n📊 Grouped by table:');
    Object.keys(ordersByTable).forEach(tableId => {
      const tableData = ordersByTable[tableId];
      const totalAmount = tableData.orders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
      
      console.log(`\n🪑 Table ${tableId}:`);
      console.log(`   Customer: ${tableData.customer_name}`);
      console.log(`   Total Amount: NPR ${totalAmount.toFixed(2)}`);
      console.log(`   Orders: ${tableData.orders.length}`);
      
      tableData.orders.forEach((order, index) => {
        console.log(`\n   Order ${index + 1}: #${order.order_number}`);
        console.log(`      Status: ${order.status}`);
        console.log(`      Total: NPR ${order.total.toFixed(2)}`);
        console.log(`      Items: ${order.items.length}`);
        
        order.items.forEach((item, itemIndex) => {
          console.log(`         ${itemIndex + 1}. ${item.name} x${item.quantity} @ NPR ${item.price} = NPR ${item.subtotal}`);
        });
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

testTableData();
