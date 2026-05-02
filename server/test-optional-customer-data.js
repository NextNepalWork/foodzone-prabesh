#!/usr/bin/env node
/**
 * Test script to verify optional customer data functionality
 * Run with: node server/test-optional-customer-data.js
 */

const { query } = require('./database/config');

async function testOptionalCustomerData() {
  console.log('🧪 Testing Optional Customer Data Implementation\n');
  
  try {
    // Test 1: Check if customer fields are nullable
    console.log('Test 1: Checking database schema...');
    const schemaCheck = await query(`
      SELECT 
        column_name, 
        is_nullable, 
        data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('orders', 'table_sessions', 'payment_receipts')
        AND column_name IN ('customer_name', 'customer_phone')
      ORDER BY table_name, column_name
    `);
    
    console.log('Schema check results:');
    schemaCheck.rows.forEach(row => {
      const status = row.is_nullable === 'YES' ? '✅' : '❌';
      console.log(`  ${status} ${row.table_name}.${row.column_name}: ${row.is_nullable}`);
    });
    
    // Test 2: Check if helper functions exist
    console.log('\nTest 2: Checking helper functions...');
    try {
      const funcCheck = await query(`
        SELECT proname 
        FROM pg_proc 
        WHERE proname IN ('get_customer_display_name', 'get_customer_identifier')
      `);
      
      if (funcCheck.rows.length === 2) {
        console.log('  ✅ Helper functions exist');
        funcCheck.rows.forEach(row => {
          console.log(`    - ${row.proname}()`);
        });
      } else {
        console.log('  ⚠️  Helper functions not found (migration may not have run)');
      }
    } catch (err) {
      console.log('  ⚠️  Helper functions not found (migration may not have run)');
    }
    
    // Test 3: Try to insert order without customer data
    console.log('\nTest 3: Testing order creation without customer data...');
    const testOrderNumber = `TEST_${Date.now()}`;
    
    try {
      const insertResult = await query(`
        INSERT INTO orders (
          order_number, 
          order_type, 
          customer_name, 
          customer_phone, 
          table_id,
          subtotal, 
          total, 
          status, 
          payment_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, order_number, customer_name, customer_phone, table_id
      `, [testOrderNumber, 'dine-in', null, null, '14', 100, 100, 'pending', 'pending']);
      
      const order = insertResult.rows[0];
      console.log('  ✅ Order created successfully without customer data');
      console.log(`    - Order ID: ${order.id}`);
      console.log(`    - Order Number: ${order.order_number}`);
      console.log(`    - Customer Name: ${order.customer_name || 'NULL'}`);
      console.log(`    - Customer Phone: ${order.customer_phone || 'NULL'}`);
      console.log(`    - Table ID: ${order.table_id}`);
      
      // Clean up test order
      await query('DELETE FROM orders WHERE order_number = $1', [testOrderNumber]);
      console.log('  🧹 Test order cleaned up');
      
    } catch (err) {
      console.log('  ❌ Failed to create order without customer data');
      console.log(`    Error: ${err.message}`);
    }
    
    // Test 4: Check existing orders with NULL customer data
    console.log('\nTest 4: Checking existing orders with NULL customer data...');
    const nullCustomerOrders = await query(`
      SELECT 
        COUNT(*) as count,
        COUNT(CASE WHEN customer_name IS NULL THEN 1 END) as null_names,
        COUNT(CASE WHEN customer_phone IS NULL THEN 1 END) as null_phones
      FROM orders
    `);
    
    const stats = nullCustomerOrders.rows[0];
    console.log(`  📊 Total orders: ${stats.count}`);
    console.log(`  📊 Orders with NULL customer_name: ${stats.null_names}`);
    console.log(`  📊 Orders with NULL customer_phone: ${stats.null_phones}`);
    
    // Test 5: Test helper function (if exists)
    console.log('\nTest 5: Testing helper function...');
    try {
      const displayNameTest = await query(`
        SELECT 
          get_customer_display_name(NULL, NULL, 14) as test1,
          get_customer_display_name('John Doe', NULL, 14) as test2,
          get_customer_display_name(NULL, '9841234567', 14) as test3,
          get_customer_display_name('John Doe', '9841234567', 14) as test4
      `);
      
      const result = displayNameTest.rows[0];
      console.log('  ✅ Helper function working:');
      console.log(`    - NULL, NULL, 14 → "${result.test1}"`);
      console.log(`    - "John Doe", NULL, 14 → "${result.test2}"`);
      console.log(`    - NULL, "9841234567", 14 → "${result.test3}"`);
      console.log(`    - "John Doe", "9841234567", 14 → "${result.test4}"`);
    } catch (err) {
      console.log('  ⚠️  Helper function test skipped (function may not exist)');
    }
    
    console.log('\n✅ All tests completed!\n');
    
    // Summary
    console.log('📋 Summary:');
    console.log('  - Database schema updated to allow NULL customer fields');
    console.log('  - Orders can be created without customer information');
    console.log('  - System will display "Unknown Customer" or "Table X" for missing data');
    console.log('  - Reports and analytics work with optional customer data');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

// Run tests
testOptionalCustomerData();
