const { query } = require('./database/config');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function testEndpoint(name, queryText, params = []) {
  try {
    console.log(`\n🧪 Testing: ${name}`);
    const result = await query(queryText, params);
    console.log(`✅ ${name}: ${result.rows.length} rows`);
    if (result.rows.length > 0) {
      console.log(`   Sample:`, JSON.stringify(result.rows[0]).substring(0, 100));
    }
    return { name, status: 'OK', rows: result.rows.length };
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    return { name, status: 'FAIL', error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Testing all report queries...\n');
  
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const tests = [
    // Overview
    ['Overview Stats', `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(AVG(total), 0) as avg_order_value,
        COUNT(DISTINCT customer_id) as unique_customers
      FROM orders
      WHERE payment_status = 'paid'
        AND created_at::date BETWEEN $1 AND $2
    `, [thirtyDaysAgo, today]],
    
    // Sales Trend
    ['Sales Trend', `
      SELECT 
        DATE(created_at) as bucket,
        COUNT(*) as orders,
        COALESCE(SUM(total), 0) as revenue
      FROM orders
      WHERE payment_status = 'paid'
        AND created_at::date BETWEEN $1 AND $2
      GROUP BY DATE(created_at)
      ORDER BY bucket
      LIMIT 5
    `, [thirtyDaysAgo, today]],
    
    // Payment Mix
    ['Payment Mix', `
      SELECT 
        payment_method as method,
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as amount
      FROM orders
      WHERE payment_status = 'paid'
        AND created_at::date BETWEEN $1 AND $2
      GROUP BY payment_method
    `, [thirtyDaysAgo, today]],
    
    // Category Breakdown
    ['Category Breakdown', `
      SELECT 
        m.category,
        COUNT(oi.id) as items_sold,
        COALESCE(SUM(oi.quantity * oi.price), 0) as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN menu_items m ON oi.menu_item_id = m.id
      WHERE o.payment_status = 'paid'
        AND o.created_at::date BETWEEN $1 AND $2
      GROUP BY m.category
      LIMIT 5
    `, [thirtyDaysAgo, today]],
    
    // Top Items
    ['Top Items', `
      SELECT 
        m.name,
        m.category,
        SUM(oi.quantity) as total_quantity,
        COALESCE(SUM(oi.quantity * oi.price), 0) as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN menu_items m ON oi.menu_item_id = m.id
      WHERE o.payment_status = 'paid'
        AND o.created_at::date BETWEEN $1 AND $2
      GROUP BY m.id, m.name, m.category
      ORDER BY revenue DESC
      LIMIT 5
    `, [thirtyDaysAgo, today]],
    
    // Customers
    ['Customers', `
      SELECT 
        COALESCE(c.name, 'Guest') as name,
        c.phone,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.total), 0) as total_spent
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.payment_status = 'paid'
        AND o.created_at::date BETWEEN $1 AND $2
      GROUP BY COALESCE(c.name, 'Guest'), c.phone
      ORDER BY total_spent DESC
      LIMIT 5
    `, [thirtyDaysAgo, today]],
    
    // Expenses
    ['Expenses', `
      SELECT 
        id, transaction_date, category, description, amount
      FROM daybook_transactions
      WHERE transaction_type = 'expense'
        AND transaction_date BETWEEN $1 AND $2
      ORDER BY transaction_date DESC
      LIMIT 5
    `, [thirtyDaysAgo, today]],
    
    // Inventory
    ['Inventory', `
      SELECT id, name, unit,
             COALESCE(current_stock, 0) AS stock,
             COALESCE(cost_per_unit, 0) AS unit_cost
      FROM ingredients
      WHERE is_active IS NOT FALSE
      LIMIT 5
    `],
    
    // Heatmap
    ['Heatmap', `
      SELECT EXTRACT(DOW FROM created_at)::int AS dow,
             EXTRACT(HOUR FROM created_at)::int AS hour,
             COUNT(*)::int AS orders
      FROM orders
      WHERE created_at::date BETWEEN $1 AND $2
      GROUP BY dow, hour
      LIMIT 5
    `, [thirtyDaysAgo, today]],
    
    // Table Performance
    ['Table Performance', `
      SELECT table_id,
             COUNT(*)::int AS orders,
             COALESCE(SUM(total), 0) AS revenue
      FROM orders
      WHERE order_type = 'dine-in'
        AND table_id IS NOT NULL
        AND created_at::date BETWEEN $1 AND $2
      GROUP BY table_id
      LIMIT 5
    `, [thirtyDaysAgo, today]],
  ];
  
  const results = [];
  for (const [name, sql, params] of tests) {
    const result = await testEndpoint(name, sql, params);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n\n📊 Summary:');
  const passed = results.filter(r => r.status === 'OK').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
